// Ruta relativa con extensión: los tests de dominio corren con node --test, que no resuelve el alias @/.
import type { Currency } from "../../../shared/money.ts";

export type TicketStatus = "draft" | "in_review" | "approved" | "observed" | "rejected";

export type DocumentStatus = "uploaded" | "processing" | "suggested" | "failed" | "reviewed" | "duplicate";

export type DocumentKind = "image" | "pdf";

export type OcrOutcome = "suggested" | "manual";

export type TicketFormat = "indapo" | "cargill" | "unknown";

export type ExtractionUsage = { inputTokens: number; outputTokens: number; costUsd: number | null; attempts: number };

/**
 * Origen de un documento que salió de un archivo de varias páginas.
 * `pages` lista las páginas que lo forman (más de una si se unieron); `page` es la primera.
 * `fileSha256` es la huella del archivo original; la del documento es la de su propia imagen.
 */
export type DocumentSource = { fileName: string; fileSha256: string; page: number; pages: number[]; pageCount: number };

export type TicketReadings = {
  format: TicketFormat;
  site: string;
  supplierName: string;
  supplierTaxId: string;
};

export const QUALITY_KEYS = ["moisture", "impurity", "damaged", "broken", "green", "other"] as const;
export type QualityKey = (typeof QUALITY_KEYS)[number];

export type QualityRow = { percent: string; discountKg: string };

export type DocumentType = "original" | "photocopy" | "";
export type Modality = "open" | "closed" | "";
export type { Currency };

export const QUANTITY_UNITS = ["t", "kg"] as const;
export type QuantityUnit = (typeof QUANTITY_UNITS)[number];

export type TicketFields = {
  issuerId: string;
  siteId: string;
  campaignId: string;
  productId: string;
  analysisNumber: string;
  entryNumber: string;
  scaleTicket: string;
  folio: string;
  weighedAt: string;
  owner: string;
  supplierId: string;
  origin: string;
  driver: string;
  driverId: string;
  vehicle: string;
  plate: string;
  grossKg: string;
  tareKg: string;
  netKg: string;
  discountKg: string;
  liquidKg: string;
  quality: Record<QualityKey, QualityRow>;
  officeArrivalDate: string;
  documentType: DocumentType;
  archived: boolean;
  archiveLocation: string;
  modality: Modality;
  quantity: string;
  quantityUnit: QuantityUnit;
  price: string;
  currency: Currency;
  notes: string;
};

export type ScalarField = Exclude<
  keyof TicketFields,
  "quality" | "archived" | "documentType" | "modality" | "currency" | "quantityUnit"
>;

export type QualityPath = `quality.${QualityKey}.${keyof QualityRow}`;

export type FieldPath = ScalarField | QualityPath | "documentType" | "modality" | "currency" | "quantityUnit";

export type Suggestion = { value: string; confidence: number };

export type Suggestions = Partial<Record<FieldPath, Suggestion>>;

export type DocumentRef = {
  name: string;
  kind: DocumentKind;
  url: string;
  sha256: string;
  /** Huella del archivo original cuando el documento es una o más páginas de un PDF. */
  fileSha256?: string;
  sizeBytes: number;
  synthetic?: boolean;
};

export type HistoryAction = "created" | "ocr_suggested" | "ocr_failed" | "draft_saved" | "submitted" | "approved" | "observed" | "rejected";

export type HistoryEntry = {
  id: string;
  at: string;
  actor: string;
  action: HistoryAction;
  from?: TicketStatus;
  to?: TicketStatus;
  comment?: string;
};

export type Ticket = {
  id: string;
  code: string;
  status: TicketStatus;
  ocr: OcrOutcome;
  fields: TicketFields;
  suggestions: Suggestions;
  readings?: TicketReadings;
  verified: FieldPath[];
  document: DocumentRef | null;
  history: HistoryEntry[];
  createdAt: string;
  updatedAt: string;
};

export type IntakeDocument = {
  id: string;
  name: string;
  kind: DocumentKind;
  url: string;
  sizeBytes: number;
  sha256: string;
  status: DocumentStatus;
  attempts: number;
  uploadedAt: string;
  ticketId?: string;
  duplicateOfTicketId?: string;
  error?: string;
  source?: DocumentSource;
  format?: TicketFormat;
  usage?: ExtractionUsage;
};
