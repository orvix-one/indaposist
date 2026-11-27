// pdf.js 6 decodifica imágenes CCITT, JBIG2 y JPEG 2000 con WASM; sin esta ruta, los escaneos salen en blanco.
export const PDF_WASM_URL = "/pdfjs/wasm/";

let pdfjsPromise: Promise<typeof import("pdfjs-dist")> | null = null;

export function loadPdfjs() {
  pdfjsPromise ??= import("pdfjs-dist").then((pdfjs) => {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
    return pdfjs;
  });
  return pdfjsPromise;
}
