import type { ExtractionResult } from "./types";

export async function requestExtraction(image: Blob): Promise<ExtractionResult> {
  const body = new FormData();
  body.append("image", image, "pagina.jpg");
  try {
    const response = await fetch("/api/intake/extract", { method: "POST", body });
    const result = (await response.json().catch(() => null)) as ExtractionResult | null;
    if (!result) return { ok: false, error: "El OCR no respondió." };
    return result;
  } catch {
    return { ok: false, error: "Sin conexión con el OCR." };
  }
}
