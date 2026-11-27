/* Adaptador OCR simulado: misma interfaz que tendrá el real (IND-00.07/IND-02.09). Los valores sugeridos son inventados y no provienen del archivo. */

import type { FieldPath, Suggestions, TicketFields } from "../domain/types";
import { generateFields, generateSuggestions } from "./generate";

export type OcrResult =
  | { ok: true; fields: TicketFields; suggestions: Suggestions }
  | { ok: false; error: string };

export type OcrAdapter = (input: { sha256: string; attempt: number; now: Date }) => Promise<OcrResult>;

const LOW_CONFIDENCE_SETS: FieldPath[][] = [
  ["plate", "quality.moisture.percent"],
  ["tareKg", "driverId", "folio"],
  ["analysisNumber"],
  [],
];

export const simulatedOcr: OcrAdapter = async ({ sha256, attempt, now }) => {
  const seed = parseInt(sha256.slice(0, 8), 16) || 1;
  await new Promise((resolve) => setTimeout(resolve, 1400 + (seed % 1600)));

  if (attempt === 1 && seed % 4 === 0) {
    return { ok: false, error: "El OCR no respondió a tiempo." };
  }

  const pad = (value: number) => String(value).padStart(2, "0");
  const weighedAt = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(Math.max(6, now.getHours() - 2))}:${pad(now.getMinutes())}`;
  const fields = generateFields(seed, { weighedAt });
  const suggestions = generateSuggestions(seed, fields, LOW_CONFIDENCE_SETS[seed % LOW_CONFIDENCE_SETS.length]);
  return { ok: true, fields, suggestions };
};
