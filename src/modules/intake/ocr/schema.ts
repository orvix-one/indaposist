/* Esquema neutro (JSON Schema) de lo que el servicio de lectura devuelve por página, antes de mapearlo a la boleta. */

export const TEXT_FIELDS = [
  "site",
  "campaign",
  "product",
  "analysisNumber",
  "entryNumber",
  "scaleTicket",
  "folio",
  "weighedAt",
  "owner",
  "supplierName",
  "supplierTaxId",
  "origin",
  "driver",
  "driverId",
  "vehicle",
  "plate",
  "notes",
] as const;

export const AMOUNT_FIELDS = ["grossKg", "tareKg", "netKg", "discountKg", "liquidKg"] as const;

export const UNCERTAIN_FIELDS = [...TEXT_FIELDS, ...AMOUNT_FIELDS, "quality", "modality", "price"] as const;

export type TextField = (typeof TEXT_FIELDS)[number];
export type AmountField = (typeof AMOUNT_FIELDS)[number];
export type UncertainField = (typeof UNCERTAIN_FIELDS)[number];

export type RawQualityRow = { name: string; value: number | null; discountPercent: number | null; discountKg: number | null };

export type RawExtraction = Record<TextField, string> &
  Record<AmountField, number | null> & {
    format: "indapo" | "cargill" | "unknown";
    quality: RawQualityRow[];
    modality: "open" | "closed" | "none";
    price: number | null;
    currency: "BOB" | "USD" | "none";
    uncertain: UncertainField[];
  };

const text = { type: "string" };
const amount = { anyOf: [{ type: "number" }, { type: "null" }] };

export const extractionSchema = {
  type: "object",
  properties: {
    format: { type: "string", enum: ["indapo", "cargill", "unknown"] },
    ...Object.fromEntries(TEXT_FIELDS.map((name) => [name, text])),
    ...Object.fromEntries(AMOUNT_FIELDS.map((name) => [name, amount])),
    quality: {
      type: "array",
      items: {
        type: "object",
        properties: { name: text, value: amount, discountPercent: amount, discountKg: amount },
        required: ["name", "value", "discountPercent", "discountKg"],
      },
    },
    modality: { type: "string", enum: ["open", "closed", "none"] },
    price: amount,
    currency: { type: "string", enum: ["BOB", "USD", "none"] },
    uncertain: { type: "array", items: { type: "string", enum: [...UNCERTAIN_FIELDS] } },
  },
  required: ["format", ...TEXT_FIELDS, ...AMOUNT_FIELDS, "quality", "modality", "price", "currency", "uncertain"],
} as const;
