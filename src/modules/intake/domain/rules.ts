import type { FieldPath, QualityKey, Suggestions, Ticket, TicketFields, TicketStatus } from "./types.ts";
import { QUALITY_KEYS } from "./types.ts";

export const CONFIDENCE_THRESHOLD = 0.85;

// Absorbe el redondeo de los descuentos de calidad impresos con decimales; valor provisorio hasta que Administración lo confirme.
export const WEIGHT_TOLERANCE_KG = 1;

export const SUBMIT_REQUIRED: FieldPath[] = [
  "issuerId",
  "siteId",
  "campaignId",
  "productId",
  "scaleTicket",
  "weighedAt",
  "supplierId",
  "plate",
  "grossKg",
  "tareKg",
  "netKg",
  "liquidKg",
  "officeArrivalDate",
  "documentType",
];

const TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  draft: ["in_review"],
  in_review: ["approved", "observed", "rejected"],
  observed: ["in_review"],
  approved: [],
  rejected: [],
};

export function canTransition(from: TicketStatus, to: TicketStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export type TicketDecision = "approved" | "observed" | "rejected";

/* Observar y rechazar exigen motivo; aprobar admite un comentario opcional. */
export function validateDecision(from: TicketStatus, decision: TicketDecision, comment: string): string | null {
  if (!canTransition(from, decision)) return "La boleta no está en revisión.";
  if (decision !== "approved" && comment.trim() === "") return "Indica el motivo.";
  return null;
}

export function isEditable(status: TicketStatus): boolean {
  return status === "draft" || status === "observed";
}

export function parseDecimal(raw: string): number | null {
  const value = raw.trim().replace(/\s/g, "");
  if (value === "") return null;
  let normalized: string;
  if (value.includes(",")) normalized = value.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(value)) normalized = value.replace(/\./g, "");
  else normalized = value;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function getFieldValue(fields: TicketFields, path: FieldPath): string {
  if (path.startsWith("quality.")) {
    const [, key, column] = path.split(".") as [string, QualityKey, "percent" | "discountKg"];
    return fields.quality[key][column];
  }
  return String(fields[path as keyof TicketFields] ?? "");
}

export function setFieldValue(fields: TicketFields, path: FieldPath, value: string): TicketFields {
  if (path.startsWith("quality.")) {
    const [, key, column] = path.split(".") as [string, QualityKey, "percent" | "discountKg"];
    return { ...fields, quality: { ...fields.quality, [key]: { ...fields.quality[key], [column]: value } } };
  }
  return { ...fields, [path]: value };
}

export type WeightCheck = { expected: number | null; actual: number | null; ok: boolean };

function check(expected: number | null, actual: number | null): WeightCheck {
  if (expected === null || actual === null) return { expected, actual, ok: true };
  return { expected, actual, ok: Math.abs(expected - actual) <= WEIGHT_TOLERANCE_KG };
}

export function qualityDiscountTotal(fields: TicketFields): number | null {
  const values = QUALITY_KEYS.map((key) => parseDecimal(fields.quality[key].discountKg));
  if (values.every((value) => value === null)) return null;
  return values.reduce<number>((sum, value) => sum + (value ?? 0), 0);
}

export function weightChecks(fields: TicketFields) {
  const gross = parseDecimal(fields.grossKg);
  const tare = parseDecimal(fields.tareKg);
  const net = parseDecimal(fields.netKg);
  const discount = parseDecimal(fields.discountKg);
  const liquid = parseDecimal(fields.liquidKg);
  const qualityTotal = qualityDiscountTotal(fields);

  return {
    net: check(gross !== null && tare !== null ? gross - tare : null, net),
    discount: check(qualityTotal, discount),
    liquid: check(net !== null && discount !== null ? net - discount : null, liquid),
  };
}

export function lowConfidenceFields(suggestions: Suggestions): FieldPath[] {
  return (Object.entries(suggestions) as [FieldPath, { confidence: number }][])
    .filter(([, suggestion]) => suggestion.confidence < CONFIDENCE_THRESHOLD)
    .map(([path]) => path);
}

export function pendingVerification(ticket: Pick<Ticket, "suggestions">, fields: TicketFields, verified: FieldPath[]): FieldPath[] {
  return lowConfidenceFields(ticket.suggestions).filter((path) => {
    if (verified.includes(path)) return false;
    return getFieldValue(fields, path) === ticket.suggestions[path]?.value;
  });
}

export type SubmitIssues = {
  fieldErrors: Partial<Record<FieldPath, string>>;
  pending: FieldPath[];
};

export function validateForSubmit(
  ticket: Pick<Ticket, "suggestions">,
  fields: TicketFields,
  verified: FieldPath[],
): SubmitIssues {
  const fieldErrors: Partial<Record<FieldPath, string>> = {};

  for (const path of SUBMIT_REQUIRED) {
    if (getFieldValue(fields, path).trim() === "") fieldErrors[path] = "Campo obligatorio.";
  }
  if (fields.archived && fields.archiveLocation.trim() === "") {
    fieldErrors.archiveLocation = "Indica dónde se archivó el original.";
  }

  const numeric: FieldPath[] = ["grossKg", "tareKg", "netKg", "discountKg", "liquidKg"];
  for (const path of numeric) {
    const raw = getFieldValue(fields, path);
    if (raw.trim() !== "" && parseDecimal(raw) === null) fieldErrors[path] = "Número no válido.";
  }

  const checks = weightChecks(fields);
  if (!checks.net.ok) fieldErrors.netKg ??= "No coincide con bruto − tara.";
  if (!checks.discount.ok) fieldErrors.discountKg ??= "No coincide con la suma de la tabla de calidad.";
  if (!checks.liquid.ok) fieldErrors.liquidKg ??= "No coincide con neto − descuento.";

  return { fieldErrors, pending: pendingVerification(ticket, fields, verified) };
}

export function hasIssues(issues: SubmitIssues): boolean {
  return Object.keys(issues.fieldErrors).length > 0 || issues.pending.length > 0;
}

function identityPart(raw: string): string {
  return raw.replace(/[\s.\-]/g, "").replace(/^0+/, "").toUpperCase();
}

export function findDuplicateTicket(
  tickets: Pick<Ticket, "id" | "fields">[],
  fields: Pick<TicketFields, "issuerId" | "scaleTicket" | "folio">,
): string | undefined {
  if (!fields.issuerId) return undefined;
  const keys = (["scaleTicket", "folio"] as const)
    .map((name) => [name, identityPart(fields[name])] as const)
    .filter(([, value]) => value !== "");
  if (keys.length === 0) return undefined;
  const [name, value] = keys[0];
  return tickets.find((ticket) => ticket.fields.issuerId === fields.issuerId && identityPart(ticket.fields[name]) === value)?.id;
}
