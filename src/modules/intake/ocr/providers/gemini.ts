/* Único punto que conoce a Gemini: traduce el pedido neutro de extracción a la API de Google y devuelve uso y costo. */

import { GoogleGenAI } from "@google/genai";
import { ExtractionUnavailableError, type ExtractionProvider } from "../provider";

// Precios de lista estimados (USD por millón de tokens); confirmar en la página oficial.
const PRICES: { match: RegExp; input: number; output: number }[] = [
  { match: /flash-lite/, input: 0.3, output: 2.5 },
  { match: /flash/, input: 1.5, output: 7.5 },
];

function costUsd(model: string, inputTokens: number, outputTokens: number): number | null {
  const price = PRICES.find((entry) => entry.match.test(model));
  return price ? (inputTokens * price.input + outputTokens * price.output) / 1_000_000 : null;
}

export function createGeminiProvider(): ExtractionProvider {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new ExtractionUnavailableError("Falta GEMINI_API_KEY.");
  const client = new GoogleGenAI({ apiKey });

  return {
    async extract({ image, mediaType, prompt, schema, model }) {
      const response = await client.models.generateContent({
        model,
        contents: [
          {
            role: "user",
            parts: [{ inlineData: { mimeType: mediaType, data: Buffer.from(image).toString("base64") } }, { text: prompt }],
          },
        ],
        config: { responseMimeType: "application/json", responseJsonSchema: schema, temperature: 0 },
      });

      const usage = response.usageMetadata;
      const inputTokens = usage?.promptTokenCount ?? 0;
      const outputTokens = (usage?.candidatesTokenCount ?? 0) + (usage?.thoughtsTokenCount ?? 0);
      const text = response.text;
      let data: unknown = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = null;
      }
      return { data, usage: { inputTokens, outputTokens, costUsd: costUsd(model, inputTokens, outputTokens) } };
    },
  };
}
