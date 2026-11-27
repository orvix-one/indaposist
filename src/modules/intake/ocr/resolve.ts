/* Convierte las lecturas impresas de una boleta en ids de los catálogos vigentes (emisor, acopio, campaña, producto y proveedor). */

import { setFieldValue } from "../domain/rules.ts";
import { normalizeTaxId } from "../domain/supplier.ts";
import type { FieldPath, Suggestions, TicketFields, TicketReadings } from "../domain/types.ts";
import { CONFIDENCE } from "./map.ts";

type Named = { id: string; name: string; active: boolean };
type CampaignRow = { id: string; productId: string; startDate: string; endDate: string; status: "open" | "closed" };
type SupplierRow = Named & { taxId: string };

export type ResolveCatalogs = {
  issuers: Named[];
  sites: Named[];
  products: Named[];
  campaigns: CampaignRow[];
  suppliers: SupplierRow[];
};

const GENERIC_WORDS = new Set(["BALANZA", "ACOPIO", "CENTRO", "SRL", "LTDA"]);

function words(value: string): string[] {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .split(/[^A-Z0-9]+/)
    .filter((word) => word.length >= 3 && !GENERIC_WORDS.has(word));
}

function matchByName<T extends Named>(rows: T[], text: string): T | undefined {
  const read = new Set(words(text));
  if (read.size === 0) return undefined;
  const matches = rows.filter((row) => {
    const own = words(row.name);
    return row.active && own.length > 0 && own.every((word) => read.has(word));
  });
  return matches.length === 1 ? matches[0] : undefined;
}

function sameName(a: string, b: string): boolean {
  const left = words(a).join(" ");
  return left !== "" && left === words(b).join(" ");
}

export function resolveReadings(
  readings: TicketReadings,
  fields: TicketFields,
  suggestions: Suggestions,
  catalogs: ResolveCatalogs,
): { fields: TicketFields; suggestions: Suggestions } {
  let nextFields = fields;
  const nextSuggestions: Suggestions = { ...suggestions };
  const suggest = (path: FieldPath, id: string | undefined, confidence: number) => {
    if (!id) return;
    nextFields = setFieldValue(nextFields, path, id);
    nextSuggestions[path] = { value: id, confidence };
  };

  const site = matchByName(catalogs.sites, readings.site);
  suggest("siteId", site?.id, CONFIDENCE.read);

  const issuerText = readings.format === "cargill" ? "CARGILL PROLEA" : readings.format === "indapo" ? readings.site : "";
  suggest("issuerId", matchByName(catalogs.issuers, issuerText)?.id, CONFIDENCE.read);

  const day = fields.weighedAt.slice(0, 10);
  const campaigns = day
    ? catalogs.campaigns.filter((row) => row.status === "open" && row.startDate <= day && day <= row.endDate)
    : [];
  if (campaigns.length === 1) {
    const dateConfidence = suggestions.weighedAt?.confidence ?? CONFIDENCE.read;
    suggest("campaignId", campaigns[0].id, Math.min(dateConfidence, CONFIDENCE.read));
    const product = catalogs.products.find((row) => row.id === campaigns[0].productId && row.active);
    suggest("productId", product?.id, CONFIDENCE.read);
  } else {
    const activeProducts = catalogs.products.filter((row) => row.active);
    if (activeProducts.length === 1) suggest("productId", activeProducts[0].id, CONFIDENCE.inferred);
  }

  const taxId = normalizeTaxId(readings.supplierTaxId);
  const active = catalogs.suppliers.filter((row) => row.active);
  const byTaxId = taxId ? active.find((row) => normalizeTaxId(row.taxId).replace(/^(NIT|CI)/, "") === taxId.replace(/^(NIT|CI)/, "")) : undefined;
  if (byTaxId) suggest("supplierId", byTaxId.id, CONFIDENCE.read);
  else {
    const byName = active.filter((row) => sameName(row.name, readings.supplierName));
    if (byName.length === 1) suggest("supplierId", byName[0].id, CONFIDENCE.inferred);
  }

  return { fields: nextFields, suggestions: nextSuggestions };
}
