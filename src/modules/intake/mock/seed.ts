/* Estado inicial sintético de la recepción: boletas en todos los estados y la bandeja del último lote. Fechas fijas para que servidor y cliente rendericen igual. */

import { emptyFields } from "../domain/fields";
import type { FieldPath, HistoryEntry, IntakeDocument, Ticket, TicketStatus } from "../domain/types";
import { currentUser } from "./catalogs";
import { generateFields, generateSuggestions, misread } from "./generate";
import { renderScanSvg } from "./scan";

type SeedSpec = {
  seed: number;
  status: TicketStatus;
  weighedAt: string;
  office: string;
  ocr?: "suggested" | "manual";
  lowConfidence?: FieldPath[];
  misreadTare?: boolean;
  photocopy?: boolean;
  batch?: boolean;
};

const SPECS: SeedSpec[] = [
  { seed: 101, status: "draft", weighedAt: "2026-11-26T07:42", office: "2026-11-26", ocr: "suggested", lowConfidence: ["tareKg", "plate", "quality.moisture.percent", "driverId"], misreadTare: true, batch: true },
  { seed: 102, status: "draft", weighedAt: "2026-11-26T08:15", office: "2026-11-26", ocr: "suggested", lowConfidence: ["folio", "quality.impurity.discountKg"], batch: true },
  { seed: 103, status: "draft", weighedAt: "2026-11-26T09:03", office: "2026-11-26", ocr: "suggested", lowConfidence: [], batch: true },
  { seed: 104, status: "draft", weighedAt: "2026-11-25T16:20", office: "2026-11-26", ocr: "manual", batch: true },
  { seed: 105, status: "in_review", weighedAt: "2026-11-25T14:10", office: "2026-11-26", batch: true },
  { seed: 106, status: "in_review", weighedAt: "2026-11-25T11:32", office: "2026-11-25", batch: true },
  { seed: 107, status: "in_review", weighedAt: "2026-11-25T09:48", office: "2026-11-25" },
  { seed: 108, status: "observed", weighedAt: "2026-11-24T15:05", office: "2026-11-25" },
  { seed: 109, status: "approved", weighedAt: "2026-11-24T10:22", office: "2026-11-24" },
  { seed: 110, status: "approved", weighedAt: "2026-11-23T17:40", office: "2026-11-24", photocopy: true },
  { seed: 111, status: "approved", weighedAt: "2026-11-23T08:55", office: "2026-11-23" },
  { seed: 112, status: "approved", weighedAt: "2026-11-22T13:18", office: "2026-11-23" },
  { seed: 113, status: "rejected", weighedAt: "2026-11-22T09:30", office: "2026-11-22" },
  { seed: 114, status: "approved", weighedAt: "2026-11-21T12:06", office: "2026-11-22" },
];

const SUPERVISOR = "Jorge Antelo";

function history(spec: SeedSpec, code: string): HistoryEntry[] {
  const at = (time: string) => `${spec.office}T${time}:00-04:00`;
  const entries: HistoryEntry[] = [
    { id: `${code}-1`, at: at("09:12"), actor: currentUser.name, action: "created", to: "draft" },
  ];
  if (spec.ocr === "manual") {
    entries.push({ id: `${code}-2`, at: at("09:13"), actor: "Sistema", action: "ocr_failed", comment: "Documento ilegible para el OCR." });
    return entries;
  }
  entries.push({ id: `${code}-2`, at: at("09:13"), actor: "Sistema", action: "ocr_suggested" });
  if (spec.status === "draft") return entries;
  entries.push({ id: `${code}-3`, at: at("10:04"), actor: currentUser.name, action: "submitted", from: "draft", to: "in_review" });
  if (spec.status === "in_review") return entries;
  const decisions: Partial<Record<TicketStatus, HistoryEntry>> = {
    approved: { id: `${code}-4`, at: at("15:30"), actor: SUPERVISOR, action: "approved", from: "in_review", to: "approved" },
    observed: {
      id: `${code}-4`,
      at: at("15:30"),
      actor: SUPERVISOR,
      action: "observed",
      from: "in_review",
      to: "observed",
      comment: "La placa no coincide con la registrada para el proveedor. Verificar con balanza.",
    },
    rejected: {
      id: `${code}-4`,
      at: at("15:30"),
      actor: SUPERVISOR,
      action: "rejected",
      from: "in_review",
      to: "rejected",
      comment: "Boleta de otra campaña cargada por error.",
    },
  };
  const decision = decisions[spec.status];
  if (decision) entries.push(decision);
  return entries;
}

function buildTicket(spec: SeedSpec, index: number): Ticket {
  const code = `BL-2026-${String(4820 - index).padStart(5, "0")}`;
  const truth = generateFields(spec.seed, { weighedAt: spec.weighedAt });
  const scan = renderScanSvg(truth, { tilt: index % 2 ? 0.6 : -0.5, copy: spec.photocopy });
  const isDraft = spec.status === "draft";

  const reviewed = {
    ...truth,
    officeArrivalDate: spec.office,
    documentType: spec.photocopy ? ("photocopy" as const) : ("original" as const),
    archived: spec.status !== "in_review",
    archiveLocation: spec.status !== "in_review" ? `Archivador A-${(index % 4) + 1}, carpeta ${spec.office.slice(5)}` : "",
    modality: index % 3 === 0 ? ("open" as const) : ("closed" as const),
    price: index % 3 === 0 ? "" : "2.150,00",
  };

  let fields = isDraft ? { ...emptyFields(), officeArrivalDate: spec.office } : reviewed;
  let suggestions = {};

  if (spec.ocr !== "manual") {
    const ocrFields = spec.misreadTare ? { ...truth, tareKg: misread(truth.tareKg) } : truth;
    suggestions = generateSuggestions(spec.seed, ocrFields, spec.lowConfidence ?? []);
    if (isDraft) fields = { ...ocrFields, officeArrivalDate: spec.office };
  }

  return {
    id: code.toLowerCase(),
    code,
    status: spec.status,
    ocr: spec.ocr ?? "suggested",
    fields,
    suggestions,
    verified: [],
    document: {
      name: `escaneo-${truth.scaleTicket}.svg`,
      kind: "image",
      url: scan,
      sha256: `seed${spec.seed}`.padEnd(64, "0"),
      sizeBytes: 180_000 + spec.seed * 913,
      synthetic: true,
    },
    history: history(spec, code),
    createdAt: `${spec.office}T09:12:00-04:00`,
    updatedAt: `${spec.office}T09:13:00-04:00`,
  };
}

export function seedState(): { tickets: Ticket[]; documents: IntakeDocument[] } {
  const tickets = SPECS.map(buildTicket);
  const documents: IntakeDocument[] = SPECS.flatMap((spec, index) => {
    if (!spec.batch) return [];
    const ticket = tickets[index];
    const document = ticket.document!;
    return [
      {
        id: `doc-${ticket.id}`,
        name: document.name,
        kind: document.kind,
        url: document.url,
        sizeBytes: document.sizeBytes,
        sha256: document.sha256,
        status: spec.status !== "draft" ? "reviewed" : spec.ocr === "manual" ? "failed" : "suggested",
        attempts: 1,
        uploadedAt: ticket.createdAt,
        ticketId: ticket.id,
        error: spec.ocr === "manual" ? "El OCR no pudo leer el documento." : undefined,
      },
    ];
  });
  return { tickets, documents };
}
