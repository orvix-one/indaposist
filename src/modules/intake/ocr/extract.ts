import type { ExtractionUsage } from "../domain/types";
import { mapExtraction, parseRawExtraction, type MappedExtraction } from "./map";
import { EXTRACTION_PROMPT } from "./prompt";
import { extractionSchema } from "./schema";
import { extractionConfig } from "./providers";
import type { ExtractionResult } from "./types";

export type PageImage = { data: Uint8Array; mediaType: string };

export async function extractTicket(image: PageImage): Promise<ExtractionResult> {
  const { provider, model, fallbackModel } = extractionConfig();
  const usage: ExtractionUsage = { inputTokens: 0, outputTokens: 0, costUsd: 0, attempts: 0 };

  const attempt = async (modelId: string): Promise<MappedExtraction | null> => {
    const response = await provider.extract({
      image: image.data,
      mediaType: image.mediaType,
      prompt: EXTRACTION_PROMPT,
      schema: extractionSchema,
      model: modelId,
    });
    usage.attempts += 1;
    usage.inputTokens += response.usage.inputTokens;
    usage.outputTokens += response.usage.outputTokens;
    usage.costUsd = usage.costUsd === null || response.usage.costUsd === null ? null : usage.costUsd + response.usage.costUsd;
    const raw = parseRawExtraction(response.data);
    return raw ? mapExtraction(raw) : null;
  };

  let result = await attempt(model);
  if (fallbackModel && (!result || result.issues.length > 0)) {
    const retry = await attempt(fallbackModel);
    if (retry && (!result || retry.issues.length <= result.issues.length)) result = retry;
  }

  if (!result) return { ok: false, error: "El OCR no devolvió una lectura válida." };
  return { ok: true, format: result.format, fields: result.fields, suggestions: result.suggestions, readings: result.readings, usage };
}
