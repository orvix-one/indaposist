import type { Tone } from "@/shared/ui";
import { parseDecimal } from "../domain/rules";
import type { DocumentStatus, FieldPath, HistoryAction, QualityKey, TicketStatus } from "../domain/types";

export const ticketStatusMeta: Record<TicketStatus, { label: string; tone: Tone }> = {
  draft: { label: "Borrador", tone: "neutral" },
  in_review: { label: "En revisión", tone: "info" },
  approved: { label: "Aprobada", tone: "success" },
  observed: { label: "Observada", tone: "warning" },
  rejected: { label: "Rechazada", tone: "danger" },
};

export const documentStatusMeta: Record<DocumentStatus, { label: string; tone: Tone }> = {
  uploaded: { label: "Subido", tone: "neutral" },
  processing: { label: "En proceso", tone: "info" },
  suggested: { label: "Sugerido", tone: "accent" },
  failed: { label: "Fallido", tone: "danger" },
  reviewed: { label: "Revisado", tone: "success" },
  duplicate: { label: "Duplicado", tone: "warning" },
};

export const historyLabels: Record<HistoryAction, string> = {
  created: "Creó la boleta",
  ocr_suggested: "OCR completó las sugerencias",
  ocr_failed: "OCR sin resultado; carga manual",
  draft_saved: "Guardó el borrador",
  submitted: "Envió a revisión",
  approved: "Aprobó la boleta",
  observed: "Observó la boleta",
  rejected: "Rechazó la boleta",
};

export const qualityLabels: Record<QualityKey, string> = {
  moisture: "Humedad",
  impurity: "Impureza",
  damaged: "Granos dañados",
  broken: "Granos quebrados",
  green: "Granos verdes",
  other: "Otros",
};

const scalarLabels: Record<string, string> = {
  issuerId: "Emisor",
  siteId: "Acopio",
  campaignId: "Campaña",
  productId: "Producto",
  analysisNumber: "Análisis nro.",
  entryNumber: "Nro. ingreso",
  scaleTicket: "Tiquete de balanza",
  folio: "Folio",
  weighedAt: "Fecha y hora de pesaje",
  owner: "Propietario",
  supplierId: "Proveedor",
  origin: "Procedencia",
  driver: "Conductor",
  driverId: "CI del conductor",
  vehicle: "Vehículo",
  plate: "Placa",
  grossKg: "Peso bruto",
  tareKg: "Tara",
  netKg: "Peso neto",
  discountKg: "Descuento",
  liquidKg: "Peso líquido",
  officeArrivalDate: "Llegada a oficina",
  documentType: "Tipo de documento",
  archiveLocation: "Ubicación del archivo",
  modality: "Modalidad",
  price: "Precio",
  currency: "Moneda",
  exchangeRate: "Tipo de cambio",
  notes: "Observaciones",
};

export function fieldLabel(path: FieldPath): string {
  if (path.startsWith("quality.")) {
    const [, key, column] = path.split(".") as [string, QualityKey, string];
    return `${qualityLabels[key]} (${column === "percent" ? "%" : "desc. kg"})`;
  }
  return scalarLabels[path] ?? path;
}

export function fieldId(path: FieldPath): string {
  return `field-${path.replace(/\./g, "-")}`;
}

const kgFormat = new Intl.NumberFormat("es-BO", { maximumFractionDigits: 0, useGrouping: "always" });

export function formatKg(value: number | null): string {
  return value === null ? "—" : kgFormat.format(value);
}

export function formatKgRaw(raw: string): string {
  return formatKg(parseDecimal(raw));
}

const dateFormat = new Intl.DateTimeFormat("es-BO", { day: "2-digit", month: "short", year: "numeric", timeZone: "America/La_Paz" });
const timeFormat = new Intl.DateTimeFormat("es-BO", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/La_Paz" });

export function formatBusinessDate(value: string): string {
  if (!value) return "—";
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return dateFormat.format(new Date(Date.UTC(year, month - 1, day, 12)));
}

export function formatInstant(iso: string): string {
  const date = new Date(iso);
  return `${dateFormat.format(date)} · ${timeFormat.format(date)}`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}
