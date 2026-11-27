/* Genera la imagen SVG de una boleta de balanza sintética para probar el visor y la revisión sin documentos reales. */

import { parseDecimal } from "../domain/rules";
import type { QualityKey, TicketFields } from "../domain/types";
import { QUALITY_KEYS } from "../domain/types";
import { campaigns, catalogName, issuers, products, sites, supplierById } from "./catalogs";

const QUALITY_PRINT: Record<QualityKey, string> = {
  moisture: "HUMEDAD",
  impurity: "IMPUREZA",
  damaged: "GRANO DAÑADO",
  broken: "GRANO QUEBRADO",
  green: "GRANO VERDE",
  other: "OTROS",
};

function escape(value: string): string {
  return value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
}

function kg(raw: string): string {
  const value = parseDecimal(raw);
  return value === null ? "" : new Intl.NumberFormat("es-BO", { maximumFractionDigits: 0 }).format(value);
}

function printedDate(raw: string): string {
  if (!raw) return "";
  const [date, time = ""] = raw.split("T");
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year} ${time}`;
}

export function renderScanSvg(fields: TicketFields, options: { tilt?: number; copy?: boolean } = {}): string {
  const ink = "#23272e";
  const faint = "#5b616b";
  const width = 850;
  const height = 1100;
  const tilt = options.tilt ?? -0.5;
  const supplier = supplierById(fields.supplierId);

  const info: [string, string][] = [
    ["FECHA/HORA", printedDate(fields.weighedAt)],
    ["NRO. INGRESO", fields.entryNumber],
    ["ANÁLISIS NRO.", fields.analysisNumber],
    ["PRODUCTO", catalogName(products, fields.productId).toUpperCase()],
    ["CAMPAÑA", catalogName(campaigns, fields.campaignId).toUpperCase()],
    ["ACOPIO", catalogName(sites, fields.siteId).toUpperCase()],
    ["PROPIETARIO", fields.owner.toUpperCase()],
    ["PROVEEDOR", (supplier?.name ?? "").toUpperCase()],
    ["PROCEDENCIA", fields.origin.toUpperCase()],
    ["CONDUCTOR", fields.driver.toUpperCase()],
    ["C.I.", fields.driverId],
    ["VEHÍCULO", fields.vehicle.toUpperCase()],
    ["PLACA", fields.plate],
  ];

  const weights: [string, string][] = [
    ["PESO BRUTO", kg(fields.grossKg)],
    ["TARA", kg(fields.tareKg)],
    ["PESO NETO", kg(fields.netKg)],
    ["DESCUENTO", kg(fields.discountKg)],
    ["PESO LÍQUIDO", kg(fields.liquidKg)],
  ];

  const infoRows = info
    .map(
      ([label, value], index) =>
        `<text x="70" y="${262 + index * 30}" fill="${faint}" font-size="15">${escape(label)}</text>` +
        `<text x="250" y="${262 + index * 30}" fill="${ink}" font-size="17">: ${escape(value)}</text>`,
    )
    .join("");

  const weightRows = weights
    .map(([label, value], index) => {
      const y = 712 + index * 34;
      const strong = index === 4 ? ' font-weight="700"' : "";
      return (
        `<text x="90" y="${y}" fill="${ink}" font-size="18"${strong}>${escape(label)}</text>` +
        `<text x="420" y="${y}" fill="${ink}" font-size="20" text-anchor="end"${strong}>${escape(value)}</text>` +
        `<text x="432" y="${y}" fill="${faint}" font-size="14">KG</text>`
      );
    })
    .join("");

  const qualityRows = QUALITY_KEYS.map((key, index) => {
    const y = 728 + index * 28;
    const row = fields.quality[key];
    return (
      `<text x="500" y="${y}" fill="${ink}" font-size="14">${QUALITY_PRINT[key]}</text>` +
      `<text x="680" y="${y}" fill="${ink}" font-size="15" text-anchor="end">${escape(row.percent)}</text>` +
      `<text x="785" y="${y}" fill="${ink}" font-size="15" text-anchor="end">${escape(kg(row.discountKg))}</text>`
    );
  }).join("");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
<defs>
<filter id="paper"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7"/><feColorMatrix values="0 0 0 0 0.45  0 0 0 0 0.42  0 0 0 0 0.36  0 0 0 0.07 0"/><feComposite in2="SourceGraphic" operator="in"/></filter>
</defs>
<rect width="100%" height="100%" fill="#e9e7df"/>
<g transform="rotate(${tilt} ${width / 2} ${height / 2})" font-family="'Courier New', Courier, monospace">
<rect x="30" y="30" width="790" height="1040" fill="#fbfaf4"/>
<rect x="30" y="30" width="790" height="1040" filter="url(#paper)"/>
<text x="70" y="98" fill="${ink}" font-size="30" font-weight="700" letter-spacing="2">BOLETA DE PESAJE</text>
<text x="70" y="128" fill="${faint}" font-size="16">${escape(catalogName(issuers, fields.issuerId).toUpperCase())} · SISTEMA DE BALANZA</text>
<text x="780" y="92" fill="${ink}" font-size="15" text-anchor="end">TIQUETE N°</text>
<text x="780" y="120" fill="#8a1f1a" font-size="26" font-weight="700" text-anchor="end">${escape(fields.scaleTicket)}</text>
<text x="780" y="146" fill="${faint}" font-size="14" text-anchor="end">FOLIO ${escape(fields.folio)}</text>
<line x1="70" y1="172" x2="780" y2="172" stroke="${ink}" stroke-width="1.5"/>
<line x1="70" y1="176" x2="780" y2="176" stroke="${ink}" stroke-width="0.6"/>
<text x="70" y="216" fill="${ink}" font-size="15" font-weight="700">DATOS DEL INGRESO</text>
${infoRows}
<line x1="70" y1="652" x2="780" y2="652" stroke="${ink}" stroke-width="0.8" stroke-dasharray="4 4"/>
<text x="90" y="684" fill="${ink}" font-size="15" font-weight="700">PESAJE</text>
<rect x="70" y="664" width="400" height="216" fill="none" stroke="${ink}" stroke-width="1"/>
${weightRows}
<text x="500" y="684" fill="${ink}" font-size="15" font-weight="700">ANÁLISIS DE CALIDAD</text>
<text x="680" y="704" fill="${faint}" font-size="12" text-anchor="end">%</text>
<text x="785" y="704" fill="${faint}" font-size="12" text-anchor="end">DESC. KG</text>
<rect x="490" y="664" width="310" height="216" fill="none" stroke="${ink}" stroke-width="1"/>
${qualityRows}
<line x1="110" y1="990" x2="350" y2="990" stroke="${ink}" stroke-width="0.8"/>
<text x="230" y="1012" fill="${faint}" font-size="13" text-anchor="middle">BALANCERO</text>
<line x1="500" y1="990" x2="740" y2="990" stroke="${ink}" stroke-width="0.8"/>
<text x="620" y="1012" fill="${faint}" font-size="13" text-anchor="middle">CONDUCTOR</text>
<path d="M600 930 c 30 -30 60 10 90 -12 s 40 -6 60 4" fill="none" stroke="#2b3f8c" stroke-width="1.6" opacity="0.7"/>
${options.copy ? `<text x="425" y="560" fill="#8a1f1a" opacity="0.16" font-size="96" font-weight="700" text-anchor="middle" transform="rotate(-24 425 560)">COPIA</text>` : `<text x="780" y="1050" fill="${faint}" font-size="12" text-anchor="end">ORIGINAL</text>`}
</g>
</svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
