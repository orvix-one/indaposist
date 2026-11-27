export type TicketStatus = "draft" | "in_review" | "approved" | "observed" | "rejected";

export type DocumentStatus = "uploaded" | "processing" | "suggested" | "failed" | "reviewed" | "duplicate";

export type DocumentKind = "image" | "pdf";

export type OcrOutcome = "suggested" | "manual";

export type TicketFormat = "indapo" | "cargill" | "unknown";

export type ExtractionUsage = { inputTokens: number; outputTokens: number; costUsd: number | null; attempts: number };

export type DocumentSource = { fileName: string; page: number; pageCount: number };

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
export type Currency = "BOB" | "USD";

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
  price: string;
  currency: Currency;
  exchangeRate: string;
  notes: string;
};

export type ScalarField = Exclude<
  keyof TicketFields,
  "quality" | "archived" | "documentType" | "modality" | "currency"
>;

export type QualityPath = `quality.${QualityKey}.${keyof QualityRow}`;

export type FieldPath = ScalarField | QualityPath | "documentType" | "modality" | "currency";

export type Suggestion = { value: string; confidence: number };

export type Suggestions = Partial<Record<FieldPath, Suggestion>>;

export type DocumentRef = {
  name: string;
  kind: DocumentKind;
  url: string;
  sha256: string;
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
