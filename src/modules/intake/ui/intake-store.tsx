"use client";

/* Estado en memoria de la recepción (boletas y bandeja de documentos) mientras no hay persistencia. Se reinicia al recargar. */

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, type ReactNode } from "react";
import { currentUser } from "@/modules/access";
import { useCatalogs, type CatalogKind } from "@/modules/catalogs";
import { toPageImages } from "@/shared/document-pages";
import { emptyFields } from "../domain/fields";
import { canTransition, findDuplicateTicket, isEditable, validateDecision, type TicketDecision } from "../domain/rules";
import type { FieldPath, HistoryEntry, IntakeDocument, Ticket, TicketFields, TicketReadings } from "../domain/types";
import { seedState } from "../mock/seed";
import { requestExtraction } from "../ocr/client";
import { resolveReadings, type ResolveCatalogs } from "../ocr/resolve";
import { useSuppliers } from "./suppliers-store";

export const ACCEPTED_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
export const MAX_FILE_BYTES = 20 * 1024 * 1024;
const CONCURRENCY = 3;

const FIELD_BY_KIND: Record<CatalogKind, keyof TicketFields> = {
  issuers: "issuerId",
  sites: "siteId",
  campaigns: "campaignId",
  products: "productId",
};

type State = { tickets: Ticket[]; documents: IntakeDocument[] };

type Action =
  | { type: "add-documents"; documents: IntakeDocument[] }
  | { type: "update-document"; id: string; patch: Partial<IntakeDocument> }
  | { type: "remove-document"; id: string }
  | { type: "add-ticket"; ticket: Ticket }
  | { type: "remove-ticket"; id: string }
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
    case "remove-ticket":
      return { ...state, tickets: state.tickets.filter((ticket) => ticket.id !== action.id) };
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
  discardDocument: (id: string) => void;
  saveDraft: (id: string, fields: TicketFields, verified: FieldPath[]) => void;
  submitForReview: (id: string, fields: TicketFields, verified: FieldPath[], comment: string) => void;
  decideTicket: (id: string, decision: TicketDecision, comment: string) => string | null;
};

const IntakeContext = createContext<IntakeContextValue | null>(null);

export function IntakeProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const stateRef = useRef(state);
  const sequenceRef = useRef(4821);
  // Boletas creadas que todavía no llegaron a stateRef: evita que dos páginas procesadas a la vez no se detecten como duplicadas.
  const pendingTicketsRef = useRef<Ticket[]>([]);
  const queueRef = useRef<{ doc: IntakeDocument; attempt: number }[]>([]);
  const activeRef = useRef(0);
  const catalogs = useCatalogs();
  const { suppliers, registerReferenceCheck: registerSupplierCheck } = useSuppliers();
  const { registerReferenceCheck: registerCatalogCheck } = catalogs;
  const catalogsRef = useRef<ResolveCatalogs>({ issuers: [], sites: [], products: [], campaigns: [], suppliers: [] });

  useEffect(() => {
    catalogsRef.current = {
      issuers: catalogs.issuers,
      sites: catalogs.sites,
      products: catalogs.products,
      campaigns: catalogs.campaigns,
      suppliers,
    };
  }, [catalogs.issuers, catalogs.sites, catalogs.products, catalogs.campaigns, suppliers]);

  useEffect(
    () => registerCatalogCheck((kind, id) => stateRef.current.tickets.some((ticket) => ticket.fields[FIELD_BY_KIND[kind]] === id)),
    [registerCatalogCheck],
  );

  useEffect(
    () => registerSupplierCheck((id) => stateRef.current.tickets.some((ticket) => ticket.fields.supplierId === id)),
    [registerSupplierCheck],
  );

  useEffect(() => {
    stateRef.current = state;
    pendingTicketsRef.current = pendingTicketsRef.current.filter((pending) => !state.tickets.some((ticket) => ticket.id === pending.id));
  }, [state]);

  const createTicket = useCallback((doc: IntakeDocument, fields: TicketFields, suggestions: Ticket["suggestions"], ocr: Ticket["ocr"], readings?: TicketReadings) => {
    const code = `BL-2026-${String(sequenceRef.current++).padStart(5, "0")}`;
    const now = new Date().toISOString();
    const ticket: Ticket = {
      id: code.toLowerCase(),
      code,
      status: "draft",
      ocr,
      fields: { ...fields, officeArrivalDate: now.slice(0, 10) },
      suggestions,
      readings,
      verified: [],
      document: {
        name: doc.source && doc.source.pageCount > 1 ? `${doc.name} · pág. ${doc.source.page}` : doc.name,
        kind: doc.kind,
        url: doc.url,
        sha256: doc.sha256,
        sizeBytes: doc.sizeBytes,
      },
      history: [
        entry("created", { to: "draft" }),
        ocr === "suggested" ? entry("ocr_suggested", {}, "Sistema") : entry("ocr_failed", { comment: doc.error }, "Sistema"),
      ],
      createdAt: now,
      updatedAt: now,
    };
    pendingTicketsRef.current.push(ticket);
    dispatch({ type: "add-ticket", ticket });
    return ticket.id;
  }, []);

  const process = useCallback(
    async (doc: IntakeDocument, attempt: number) => {
      dispatch({ type: "update-document", id: doc.id, patch: { status: "processing", attempts: attempt, error: undefined } });
      const image = await fetch(doc.url).then((response) => response.blob());
      const result = await requestExtraction(image);
      if (!result.ok) {
        dispatch({ type: "update-document", id: doc.id, patch: { status: "failed", error: result.error } });
        return;
      }
      const resolved = resolveReadings(result.readings, result.fields, result.suggestions, catalogsRef.current);
      const duplicateOf = findDuplicateTicket([...stateRef.current.tickets, ...pendingTicketsRef.current], resolved.fields);
      if (duplicateOf) {
        dispatch({
          type: "update-document",
          id: doc.id,
          patch: { status: "duplicate", duplicateOfTicketId: duplicateOf, format: result.format, usage: result.usage },
        });
        return;
      }
      const ticketId = createTicket(doc, resolved.fields, resolved.suggestions, "suggested", result.readings);
      dispatch({ type: "update-document", id: doc.id, patch: { status: "suggested", ticketId, format: result.format, usage: result.usage } });
    },
    [createTicket],
  );

  const runWorker = useCallback(async () => {
    activeRef.current += 1;
    try {
      for (let next = queueRef.current.shift(); next; next = queueRef.current.shift()) {
        const { doc, attempt } = next;
        await process(doc, attempt).catch(() =>
          dispatch({ type: "update-document", id: doc.id, patch: { status: "failed", error: "No se pudo procesar la página." } }),
        );
      }
    } finally {
      activeRef.current -= 1;
    }
  }, [process]);

  const enqueue = useCallback(
    (doc: IntakeDocument, attempt: number) => {
      queueRef.current.push({ doc, attempt });
      if (activeRef.current < CONCURRENCY) void runWorker();
    },
    [runWorker],
  );

  const uploadFiles = useCallback(
    async (files: File[]) => {
      const rejected: RejectedFile[] = [];
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
        const base = { name: file.name, sha256: hash, attempts: 0, uploadedAt: new Date().toISOString() };

        if (known.has(hash)) {
          dispatch({
            type: "add-documents",
            documents: [
              {
                ...base,
                id: uid("doc"),
                kind: file.type === "application/pdf" ? "pdf" : "image",
                url: URL.createObjectURL(file),
                sizeBytes: file.size,
                status: "duplicate",
                duplicateOfTicketId: known.get(hash),
              },
            ],
          });
          continue;
        }
        known.set(hash, undefined);

        let pages: Blob[];
        try {
          pages = await toPageImages(file);
        } catch {
          rejected.push({ name: file.name, reason: "No se pudo leer el archivo." });
          continue;
        }
        const documents: IntakeDocument[] = pages.map((page, index) => ({
          ...base,
          id: uid("doc"),
          kind: "image",
          url: URL.createObjectURL(page),
          sizeBytes: page.size,
          status: "uploaded",
          source: { fileName: file.name, page: index + 1, pageCount: pages.length },
        }));
        dispatch({ type: "add-documents", documents });
        for (const doc of documents) enqueue(doc, 1);
      }
      return rejected;
    },
    [enqueue],
  );

  const retryDocument = useCallback(
    (id: string) => {
      const doc = stateRef.current.documents.find((item) => item.id === id);
      if (doc && doc.status === "failed" && !doc.ticketId) enqueue(doc, doc.attempts + 1);
    },
    [enqueue],
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

  const discardDocument = useCallback((id: string) => {
    const doc = stateRef.current.documents.find((item) => item.id === id);
    if (!doc) return;
    const ticket = stateRef.current.tickets.find((item) => item.id === doc.ticketId);
    if (ticket && ticket.status !== "draft") return;
    if (ticket) dispatch({ type: "remove-ticket", id: ticket.id });
    dispatch({ type: "remove-document", id });
  }, []);

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

  const decideTicket = useCallback((id: string, decision: TicketDecision, comment: string) => {
    const ticket = stateRef.current.tickets.find((item) => item.id === id);
    if (!ticket) return "Boleta no encontrada.";
    if (!currentUser.canDecideTickets) return "No tienes permiso para resolver boletas.";
    const error = validateDecision(ticket.status, decision, comment);
    if (error) return error;
    dispatch({
      type: "update-ticket",
      id,
      update: (current) =>
        canTransition(current.status, decision)
          ? {
              ...current,
              status: decision,
              updatedAt: new Date().toISOString(),
              history: [...current.history, entry(decision, { from: current.status, to: decision, comment: comment.trim() || undefined })],
            }
          : current,
    });
    return null;
  }, []);

  const value = useMemo(
    () => ({
      tickets: state.tickets,
      documents: state.documents,
      uploadFiles,
      retryDocument,
      startManualEntry,
      removeDocument,
      discardDocument,
      saveDraft,
      submitForReview,
      decideTicket,
    }),
    [state.tickets, state.documents, uploadFiles, retryDocument, startManualEntry, removeDocument, discardDocument, saveDraft, submitForReview, decideTicket],
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
