export type ExtractionRequest = {
  image: Uint8Array;
  mediaType: string;
  prompt: string;
  schema: Record<string, unknown>;
  model: string;
};

export type ExtractionResponse = {
  data: unknown;
  usage: { inputTokens: number; outputTokens: number; costUsd: number | null };
};

export type ExtractionProvider = { extract(request: ExtractionRequest): Promise<ExtractionResponse> };

export class ExtractionUnavailableError extends Error {
  name = "ExtractionUnavailableError";
}
