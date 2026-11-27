"use client";

/* Estado en memoria de la recepción (boletas y bandeja de documentos) mientras no hay persistencia. Se reinicia al recargar. */

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, type ReactNode } from "react";
import { emptyFields } from "../domain/fields";
import { canTransition, isEditable } from "../domain/rules";
import type { DocumentKind, FieldPath, HistoryEntry, IntakeDocument, Ticket, TicketFields } from "../domain/types";
import { currentUser } from "../mock/catalogs";
import { simulatedOcr } from "../mock/ocr";
import { seedState } from "../mock/seed";

export const ACCEPTED_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
export const MAX_FILE_BYTES = 20 * 1024 * 1024;

type State = { tickets: Ticket[]; documents: IntakeDocument[] };

type Action =
  | { type: "add-documents"; documents: IntakeDocument[] }
  | { type: "update-document"; id: string; patch: Partial<IntakeDocument> }
  | { type: "remove-document"; id: string }
  | { type: "add-ticket"; ticket: Ticket }
  | { type: "update-ticket"; id: string; update: (ticket: Ticket) => Ticket };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "add-documents":
      return { ...state, documents: [...action.documents, ...state.documents] };
    case "update-document":
      return {
        ...state,
        documents: state.documents.map((doc) => (doc.id === action.id ? { ...doc, ...action.patch } : doc)),
      };
    case "remove-document":
      return { ...state, documents: state.documents.filter((doc) => doc.id !== action.id) };
    case "add-ticket":
      return { ...state, tickets: [action.ticket, ...state.tickets] };
    case "update-ticket":
      return {
        ...state,
        tickets: state.tickets.map((ticket) => (ticket.id === action.id ? action.update(ticket) : ticket)),
      };
  }
}

function initialState(): State {
  return seedState();
}

async function sha256(file: File): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function uid(prefix: string) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

function entry(action: HistoryEntry["action"], extra: Partial<HistoryEntry> = {}, actor = currentUser.name): HistoryEntry {
  return { id: uid("h"), at: new Date().toISOString(), actor, action, ...extra };
}

export type RejectedFile = { name: string; reason: string };

type IntakeContextValue = {
  tickets: Ticket[];
  documents: IntakeDocument[];
  uploadFiles: (files: File[]) => Promise<RejectedFile[]>;
  retryDocument: (id: string) => void;
  startManualEntry: (id: string) => string | null;
  removeDocument: (id: string) => void;
  saveDraft: (id: string, fields: TicketFields, verified: FieldPath[]) => void;
  submitForReview: (id: string, fields: TicketFields, verified: FieldPath[], comment: string) => void;
};

const IntakeContext = createContext<IntakeContextValue | null>(null);

export function IntakeProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const stateRef = useRef(state);
  const sequenceRef = useRef(4821);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const createTicket = useCallback((doc: IntakeDocument, fields: TicketFields, suggestions: Ticket["suggestions"], ocr: Ticket["ocr"]) => {
    const code = `BL-2026-${String(sequenceRef.current++).padStart(5, "0")}`;
    const now = new Date().toISOString();
    const ticket: Ticket = {
      id: code.toLowerCase(),
      code,
      status: "draft",
      ocr,
      fields: { ...fields, officeArrivalDate: now.slice(0, 10) },
      suggestions,
      verified: [],
      document: { name: doc.name, kind: doc.kind, url: doc.url, sha256: doc.sha256, sizeBytes: doc.sizeBytes },
      history: [
        entry("created", { to: "draft" }),
        ocr === "suggested" ? entry("ocr_suggested", {}, "Sistema") : entry("ocr_failed", { comment: doc.error }, "Sistema"),
      ],
      createdAt: now,
      updatedAt: now,
    };
    dispatch({ type: "add-ticket", ticket });
    return ticket.id;
  }, []);

  const process = useCallback(
    async (doc: IntakeDocument, attempt: number) => {
      dispatch({ type: "update-document", id: doc.id, patch: { status: "processing", attempts: attempt, error: undefined } });
      const result = await simulatedOcr({ sha256: doc.sha256, attempt, now: new Date() });
      if (!result.ok) {
        dispatch({ type: "update-document", id: doc.id, patch: { status: "failed", error: result.error } });
        return;
      }
      const ticketId = createTicket(doc, result.fields, result.suggestions, "suggested");
      dispatch({ type: "update-document", id: doc.id, patch: { status: "suggested", ticketId } });
    },
    [createTicket],
  );

  const uploadFiles = useCallback(
    async (files: File[]) => {
      const rejected: RejectedFile[] = [];
      const accepted: IntakeDocument[] = [];
      const known = new Map<string, string | undefined>();
      for (const ticket of stateRef.current.tickets) if (ticket.document) known.set(ticket.document.sha256, ticket.id);
      for (const doc of stateRef.current.documents) if (!known.has(doc.sha256)) known.set(doc.sha256, doc.ticketId);

      for (const file of files) {
        if (!ACCEPTED_TYPES.includes(file.type)) {
          rejected.push({ name: file.name, reason: "Formato no admitido." });
          continue;
        }
        if (file.size > MAX_FILE_BYTES) {
          rejected.push({ name: file.name, reason: "Supera los 20 MB." });
          continue;
        }
        const hash = await sha256(file);
        const kind: DocumentKind = file.type === "application/pdf" ? "pdf" : "image";
        const duplicate = known.has(hash);
        const doc: IntakeDocument = {
          id: uid("doc"),
          name: file.name,
          kind,
          url: URL.createObjectURL(file),
          sizeBytes: file.size,
          sha256: hash,
          status: duplicate ? "duplicate" : "uploaded",
          attempts: 0,
          uploadedAt: new Date().toISOString(),
          duplicateOfTicketId: duplicate ? known.get(hash) : undefined,
        };
        if (!duplicate) known.set(hash, undefined);
        accepted.push(doc);
      }

      if (accepted.length > 0) dispatch({ type: "add-documents", documents: accepted });
      for (const doc of accepted) if (doc.status === "uploaded") void process(doc, 1);
      return rejected;
    },
    [process],
  );

  const retryDocument = useCallback(
    (id: string) => {
      const doc = stateRef.current.documents.find((item) => item.id === id);
      if (doc && doc.status === "failed" && !doc.ticketId) void process(doc, doc.attempts + 1);
    },
    [process],
  );

  const startManualEntry = useCallback(
    (id: string) => {
      const doc = stateRef.current.documents.find((item) => item.id === id);
      if (!doc) return null;
      if (doc.ticketId) return doc.ticketId;
      const ticketId = createTicket(doc, emptyFields(), {}, "manual");
      dispatch({ type: "update-document", id, patch: { ticketId } });
      return ticketId;
    },
    [createTicket],
  );

  const removeDocument = useCallback((id: string) => dispatch({ type: "remove-document", id }), []);

  const saveDraft = useCallback((id: string, fields: TicketFields, verified: FieldPath[]) => {
    dispatch({
      type: "update-ticket",
      id,
      update: (ticket) =>
        isEditable(ticket.status)
          ? {
              ...ticket,
              fields,
              verified,
              updatedAt: new Date().toISOString(),
              history: [...ticket.history, entry("draft_saved")],
            }
          : ticket,
    });
  }, []);

  const submitForReview = useCallback((id: string, fields: TicketFields, verified: FieldPath[], comment: string) => {
    dispatch({
      type: "update-ticket",
      id,
      update: (ticket) =>
        canTransition(ticket.status, "in_review")
          ? {
              ...ticket,
              fields,
              verified,
              status: "in_review",
              updatedAt: new Date().toISOString(),
              history: [
                ...ticket.history,
                entry("submitted", { from: ticket.status, to: "in_review", comment: comment.trim() || undefined }),
              ],
            }
          : ticket,
    });
    const doc = stateRef.current.documents.find((item) => item.ticketId === id);
    if (doc) dispatch({ type: "update-document", id: doc.id, patch: { status: "reviewed" } });
  }, []);

  const value = useMemo(
    () => ({
      tickets: state.tickets,
      documents: state.documents,
      uploadFiles,
      retryDocument,
      startManualEntry,
      removeDocument,
      saveDraft,
      submitForReview,
    }),
    [state.tickets, state.documents, uploadFiles, retryDocument, startManualEntry, removeDocument, saveDraft, submitForReview],
  );

  return <IntakeContext.Provider value={value}>{children}</IntakeContext.Provider>;
}

export function useIntake(): IntakeContextValue {
  const context = useContext(IntakeContext);
  if (!context) throw new Error("useIntake requiere IntakeProvider.");
  return context;
}

export function useIntakeSummary() {
  const { tickets } = useIntake();
  return useMemo(() => ({ drafts: tickets.filter((ticket) => ticket.status === "draft").length }), [tickets]);
}
