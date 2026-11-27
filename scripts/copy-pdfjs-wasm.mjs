/* Copia los decodificadores WASM de pdf.js a public/ para que el navegador lea escaneos CCITT, JBIG2 y JPEG 2000. */

import { cpSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";

const source = fileURLToPath(new URL("../node_modules/pdfjs-dist/wasm/", import.meta.url));
const target = fileURLToPath(new URL("../public/pdfjs/wasm/", import.meta.url));

rmSync(target, { recursive: true, force: true });
cpSync(source, target, { recursive: true });
