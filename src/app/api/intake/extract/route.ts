import { ExtractionUnavailableError, extractTicket } from "@/modules/intake/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 4 * 1024 * 1024;

function failure(status: number, error: string) {
  return Response.json({ ok: false, error }, { status });
}

export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  const image = form?.get("image");
  if (!(image instanceof File)) return failure(400, "Falta la imagen de la página.");
  if (!ACCEPTED.includes(image.type)) return failure(415, "Formato de imagen no admitido.");
  if (image.size > MAX_BYTES) return failure(413, "La página supera los 4 MB.");

  try {
    const result = await extractTicket({ data: new Uint8Array(await image.arrayBuffer()), mediaType: image.type });
    return Response.json(result, { status: result.ok ? 200 : 502 });
  } catch (error) {
    if (error instanceof ExtractionUnavailableError) {
      console.error("intake.extract unavailable:", error.message);
      return failure(503, "La lectura automática no está configurada.");
    }
    const status = (error as { status?: unknown })?.status;
    console.error("intake.extract failed:", error instanceof Error ? error.name : "unknown", typeof status === "number" ? status : "");
    return failure(502, "La lectura automática no respondió. Reintenta o carga manual.");
  }
}
