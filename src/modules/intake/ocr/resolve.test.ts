import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { emptyFields } from "../domain/fields.ts";
import type { TicketReadings } from "../domain/types.ts";
import { CONFIDENCE } from "./map.ts";
import { resolveReadings, type ResolveCatalogs } from "./resolve.ts";

const named = (id: string, name: string, active = true) => ({ id, name, active });

const catalogs: ResolveCatalogs = {
  issuers: [named("sj", "Balanza San Julián"), named("cc", "Balanza Cuatro Cañadas"), named("pc", "Proléa/Cargill")],
  sites: [named("sj", "Acopio San Julián"), named("cc", "Acopio Cuatro Cañadas")],
  products: [named("soy", "Soya en grano")],
  campaigns: [
    { id: "v26", productId: "soy", startDate: "2026-03-01", endDate: "2026-06-30", status: "open" },
    { id: "i26", productId: "soy", startDate: "2026-09-01", endDate: "2026-11-30", status: "open" },
  ],
  suppliers: [
    { ...named("s1", "Alfredo Toledo Montenegro"), taxId: "CI 3229474 SC" },
    { ...named("s2", "Juana Martínez"), taxId: "NIT 1028374019" },
    { ...named("s3", "Proveedor Inactivo", false), taxId: "NIT 999" },
  ],
};

const readings = (overrides: Partial<TicketReadings> = {}): TicketReadings => ({
  format: "indapo",
  site: "SAN JULIAN",
  supplierName: "",
  supplierTaxId: "",
  ...overrides,
});

const at = (weighedAt: string) => ({ ...emptyFields(), weighedAt });

describe("resolveReadings", () => {
  it("resuelve emisor y acopio por nombre, y campaña y producto por la fecha de pesaje", () => {
    const { fields, suggestions } = resolveReadings(readings(), at("2026-04-17T08:00"), {}, catalogs);
    assert.equal(fields.issuerId, "sj");
    assert.equal(fields.siteId, "sj");
    assert.equal(fields.campaignId, "v26");
    assert.equal(fields.productId, "soy");
    assert.equal(suggestions.campaignId?.confidence, CONFIDENCE.read);
  });

  it("usa el formato Cargill para el emisor aunque no haya acopio impreso", () => {
    const { fields } = resolveReadings(readings({ format: "cargill", site: "" }), at("2026-04-13T20:58"), {}, catalogs);
    assert.equal(fields.issuerId, "pc");
    assert.equal(fields.siteId, "");
  });

  it("no elige campaña si la fecha cae fuera de todas", () => {
    const { fields } = resolveReadings(readings(), at("2026-08-01T10:00"), {}, catalogs);
    assert.equal(fields.campaignId, "");
    assert.equal(fields.productId, "soy");
  });

  it("encuentra al proveedor por NIT/CI y, si no, por nombre con confianza menor", () => {
    const byTax = resolveReadings(readings({ supplierTaxId: "1028374019" }), at(""), {}, catalogs);
    assert.equal(byTax.fields.supplierId, "s2");
    assert.equal(byTax.suggestions.supplierId?.confidence, CONFIDENCE.read);

    const byName = resolveReadings(readings({ supplierName: "JUANA MARTINEZ" }), at(""), {}, catalogs);
    assert.equal(byName.fields.supplierId, "s2");
    assert.equal(byName.suggestions.supplierId?.confidence, CONFIDENCE.inferred);
  });

  it("no asigna proveedores inactivos ni desconocidos", () => {
    assert.equal(resolveReadings(readings({ supplierTaxId: "NIT 999" }), at(""), {}, catalogs).fields.supplierId, "");
    assert.equal(resolveReadings(readings({ supplierName: "Nadie" }), at(""), {}, catalogs).fields.supplierId, "");
  });
});
