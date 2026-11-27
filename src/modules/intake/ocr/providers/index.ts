import { ExtractionUnavailableError, type ExtractionProvider } from "../provider";
import { createGeminiProvider } from "./gemini";

export type ExtractionConfig = { provider: ExtractionProvider; model: string; fallbackModel: string | null };

const FACTORIES: Record<string, () => ExtractionProvider> = {
  gemini: createGeminiProvider,
};

let cached: ExtractionConfig | null = null;

export function extractionConfig(): ExtractionConfig {
  if (cached) return cached;
  const name = process.env.OCR_PROVIDER ?? "";
  const model = process.env.OCR_MODEL ?? "";
  const factory = FACTORIES[name];
  if (!factory) throw new ExtractionUnavailableError(`OCR_PROVIDER no reconocido: "${name}".`);
  if (!model) throw new ExtractionUnavailableError("Falta OCR_MODEL.");
  const fallback = process.env.OCR_MODEL_FALLBACK ?? "";
  cached = { provider: factory(), model, fallbackModel: fallback && fallback !== model ? fallback : null };
  return cached;
}
