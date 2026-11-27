/* Traduce la lectura cruda de una página a campos de boleta y sugerencias con confianza, sin depender del servicio usado. */

import { emptyFields } from "../domain/fields.ts";
import { parseDecimal, setFieldValue } from "../domain/rules.ts";
import type { FieldPath, QualityKey, Suggestions, TicketFields, TicketFormat, TicketReadings } from "../domain/types.ts";
import { QUALITY_KEYS } from "../domain/types.ts";
import { AMOUNT_FIELDS, TEXT_FIELDS, UNCERTAIN_FIELDS, type RawExtraction, type RawQualityRow, type UncertainField } from "./schema.ts";

export const CONFIDENCE = { read: 0.95, inferred: 0.7, uncertain: 0.6, arithmetic: 0.5 } as const;

// Las boletas imprimen los descuentos por factor con decimales y el total redondeado.
const ROUNDING_KG = 1;

const kgFormat = new Intl.NumberFormat("es-BO", { maximumFractionDigits: 2 });
const percentFormat = new Intl.NumberFormat("es-BO", { minimumFractionDigits: 1, maximumFractionDigits: 2 });

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : typeof value === "number" ? String(value) : "";
}

function asAmount(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function oneOf<T extends string>(value: unknown, options: readonly T[], fallback: T): T {
  return options.includes(value as T) ? (value as T) : fallback;
}

export function parseRawExtraction(data: unknown): RawExtraction | null {
  if (!data || typeof data !== "object") return null;
  const source = data as Record<string, unknown>;
  const quality = Array.isArray(source.quality) ? source.quality : [];
  const uncertain = Array.isArray(source.uncertain) ? source.uncertain : [];
  return {
    ...(Object.fromEntries(TEXT_FIELDS.map((name) => [name, asText(source[name])])) as Record<(typeof TEXT_FIELDS)[number], string>),
    ...(Object.fromEntries(AMOUNT_FIELDS.map((name) => [name, asAmount(source[name])])) as Record<(typeof AMOUNT_FIELDS)[number], number | null>),
    format: oneOf(source.format, ["indapo", "cargill", "unknown"] as const, "unknown"),
    quality: quality
      .filter((row): row is Record<string, unknown> => !!row && typeof row === "object")
      .map((row) => ({
        name: asText(row.name),
        value: asAmount(row.value),
        discountPercent: asAmount(row.discountPercent),
        discountKg: asAmount(row.discountKg),
      })),
    modality: oneOf(source.modality, ["open", "closed", "none"] as const, "none"),
    price: asAmount(source.price),
    currency: oneOf(source.currency, ["BOB", "USD", "none"] as const, "none"),
    uncertain: uncertain.filter((name): name is UncertainField => UNCERTAIN_FIELDS.includes(name as UncertainField)),
  };
}

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/#/g, "N")
    .toUpperCase();
}

export function qualityKeyFor(name: string): QualityKey {
  const label = normalize(name);
  if (label.includes("HUMEDAD")) return "moisture";
  if (label.includes("IMPUREZA") || label.includes("MATERIA")) return "impurity";
  if (label.includes("VERDE")) return "green";
  if (label.includes("PARTIDO") || label.includes("QUEBRADO")) return "broken";
  if (label.includes("QUEMADO") || label.includes("DANADO")) return "damaged";
  return "other";
}

function weighedAtFor(raw: string): { value: string; exact: boolean } {
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(raw)) return { value: raw, exact: true };
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return { value: `${raw}T00:00`, exact: false };
  return { value: "", exact: false };
}

function sumRows(rows: RawQualityRow[], pick: (row: RawQualityRow) => number | null): number | null {
  const values = rows.map(pick).filter((value): value is number => value !== null);
  return values.length === 0 ? null : values.reduce((sum, value) => sum + value, 0);
}

export function arithmeticIssues(fields: TicketFields): FieldPath[] {
  const gross = parseDecimal(fields.grossKg);
  const tare = parseDecimal(fields.tareKg);
  const net = parseDecimal(fields.netKg);
  const discount = parseDecimal(fields.discountKg);
  const liquid = parseDecimal(fields.liquidKg);
  const qualityKg = QUALITY_KEYS.map((key) => parseDecimal(fields.quality[key].discountKg));
  const qualityTotal = qualityKg.every((value) => value === null) ? null : qualityKg.reduce<number>((sum, value) => sum + (value ?? 0), 0);
  const off = (expected: number | null, actual: number | null) =>
    expected !== null && actual !== null && Math.abs(expected - actual) > ROUNDING_KG;

  const issues = new Set<FieldPath>();
  if (off(gross !== null && tare !== null ? gross - tare : null, net)) ["grossKg", "tareKg", "netKg"].forEach((path) => issues.add(path as FieldPath));
  if (off(qualityTotal, discount)) {
    issues.add("discountKg");
    QUALITY_KEYS.forEach((key) => issues.add(`quality.${key}.discountKg`));
  }
  if (off(net !== null && discount !== null ? net - discount : null, liquid)) ["netKg", "discountKg", "liquidKg"].forEach((path) => issues.add(path as FieldPath));
  return [...issues];
}

export type MappedExtraction = {
  format: TicketFormat;
  fields: TicketFields;
  suggestions: Suggestions;
  readings: TicketReadings;
  issues: FieldPath[];
};

export function mapExtraction(raw: RawExtraction): MappedExtraction {
  const uncertain = new Set(raw.uncertain);
  let fields = emptyFields();
  const suggestions: Suggestions = {};

  const suggest = (path: FieldPath, value: string, confidence: number) => {
    if (value === "") return;
    fields = setFieldValue(fields, path, value);
    suggestions[path] = { value, confidence };
  };
  const level = (name: UncertainField, exact = true) =>
    uncertain.has(name) ? CONFIDENCE.uncertain : exact ? CONFIDENCE.read : CONFIDENCE.inferred;

  for (const name of ["analysisNumber", "entryNumber", "scaleTicket", "folio", "owner", "origin", "driver", "driverId", "vehicle", "plate"] as const) {
    suggest(name, raw[name], level(name));
  }

  const weighedAt = weighedAtFor(raw.weighedAt);
  suggest("weighedAt", weighedAt.value, level("weighedAt", weighedAt.exact));

  for (const name of AMOUNT_FIELDS) {
    const value = raw[name];
    suggest(name, value === null ? "" : kgFormat.format(value), level(name));
  }

  const rowsByKey = new Map<QualityKey, RawQualityRow[]>();
  for (const row of raw.quality) {
    const key = qualityKeyFor(row.name);
    rowsByKey.set(key, [...(rowsByKey.get(key) ?? []), row]);
  }
  for (const [key, rows] of rowsByKey) {
    const percent = sumRows(rows, (row) => row.value);
    const discount = sumRows(rows, (row) => row.discountKg);
    const confidence = level("quality", rows.length === 1);
    suggest(`quality.${key}.percent`, percent === null ? "" : percentFormat.format(percent), confidence);
    suggest(`quality.${key}.discountKg`, discount === null ? "" : kgFormat.format(discount), confidence);
  }

  if (raw.modality !== "none") suggest("modality", raw.modality, CONFIDENCE.uncertain);
  if (raw.price !== null) suggest("price", kgFormat.format(raw.price), CONFIDENCE.uncertain);
  if (raw.currency !== "none") suggest("currency", raw.currency, CONFIDENCE.uncertain);

  suggest("notes", raw.notes, CONFIDENCE.uncertain);

  const issues = arithmeticIssues(fields);
  for (const path of issues) {
    const current = suggestions[path];
    if (current) suggestions[path] = { ...current, confidence: Math.min(current.confidence, CONFIDENCE.arithmetic) };
  }

  const readings: TicketReadings = {
    format: raw.format,
    site: raw.site,
    supplierName: raw.supplierName || raw.owner,
    supplierTaxId: raw.supplierTaxId,
  };

  return { format: raw.format, fields, suggestions, readings, issues };
}
