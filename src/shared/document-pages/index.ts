/* Convierte un PDF o una imagen en una imagen JPEG por página, reducida para enviarla a un servicio de lectura. */

import { PDF_WASM_URL, loadPdfjs } from "./pdfjs";

export { PDF_WASM_URL, loadPdfjs };

type Options = { maxSide?: number; quality?: number };

const DEFAULTS: Required<Options> = { maxSide: 1600, quality: 0.85 };

function canvasToJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("No se pudo generar la imagen."))), "image/jpeg", quality);
  });
}

function sizedCanvas(width: number, height: number, maxSide: number) {
  const scale = Math.min(1, maxSide / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  return canvas;
}

async function pdfPages(file: Blob, { maxSide, quality }: Required<Options>): Promise<Blob[]> {
  const pdfjs = await loadPdfjs();
  const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()), wasmUrl: PDF_WASM_URL });
  try {
    const doc = await task.promise;
    const pages: Blob[] = [];
    for (let number = 1; number <= doc.numPages; number++) {
      const page = await doc.getPage(number);
      const base = page.getViewport({ scale: 1 });
      const scale = maxSide / Math.max(base.width, base.height);
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas no disponible.");
      context.fillStyle = "#fff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvas, canvasContext: context, viewport }).promise;
      pages.push(await canvasToJpeg(canvas, quality));
      page.cleanup();
    }
    return pages;
  } finally {
    void task.destroy();
  }
}

async function imagePage(file: Blob, { maxSide, quality }: Required<Options>): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const canvas = sizedCanvas(bitmap.width, bitmap.height, maxSide);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas no disponible.");
  context.fillStyle = "#fff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvasToJpeg(canvas, quality);
}

export async function toPageImages(file: Blob, options: Options = {}): Promise<Blob[]> {
  const settings = { ...DEFAULTS, ...options };
  if (file.type === "application/pdf") return pdfPages(file, settings);
  return [await imagePage(file, settings)];
}
