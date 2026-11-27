import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CONFIDENCE, arithmeticIssues, mapExtraction, parseRawExtraction, qualityKeyFor } from "./map.ts";

const indapo = {
  format: "indapo",
  site: "SAN JULIAN",
  campaign: "VER-26",
  product: "SOYA",
  analysisNumber: "356",
  entryNumber: "364",
  scaleTicket: "1369",
  folio: "0006404",
  weighedAt: "2026-04-17",
  owner: "ALFREDO TOLEDO MONTENEGRO",
  supplierName: "Alfredo Toledo Montenegro",
  supplierTaxId: "",
  origin: "BRECHA",
  driver: "DANIEL BARBOSA VACA",
  driverId: "3229474",
  vehicle: "VOLVO BLANCO",
  plate: "1237-YAG",
  notes: "",
  grossKg: 68430,
  tareKg: 19740,
  netKg: 48690,
  discountKg: 2142,
  liquidKg: 46548,
  quality: [
    { name: "HUMEDAD", value: 16.3, discountPercent: 3.3, discountKg: 1606.77 },
    { name: "IMPUREZAS", value: 1.3, discountPercent: 0.3, discountKg: 146.07 },
    { name: "PARTIDO", value: 6.3, discountPercent: 0, discountKg: 0 },
    { name: "DAÑADO", value: 9.6, discountPercent: 0.8, discountKg: 389.52 },
    { name: "GRANO OTRO COLOR", value: 0, discountPercent: 0, discountKg: 0 },
    { name: "GRANO ENFERMO", value: 0.9, discountPercent: 0, discountKg: 0 },
    { name: "GRANO VERDE", value: 0.8, discountPercent: 0, discountKg: 0 },
  ],
  modality: "none",
  price: null,
  currency: "none",
  uncertain: [],
};

const cargill = {
  ...indapo,
  format: "cargill",
  site: "",
  campaign: "2025/2026",
  product: "BOLIVIAN SOYBEANS - 6322BO",
  analysisNumber: "",
  entryNumber: "131",
  scaleTicket: "88445",
  folio: "0636226104760",
  weighedAt: "2026-04-13T20:58",
  owner: "INDAPO SRL",
  supplierName: "JUANA MARTINEZ",
  vehicle: "",
  plate: "1285BKK",
  notes: "JUANA MARTINEZ · B-98 · Cerrado 402 $",
  grossKg: 55540,
  tareKg: 16120,
  netKg: 39420,
  discountKg: 2030,
  liquidKg: 37390,
  quality: [
    { name: "HUMEDAD", value: 15.1, discountPercent: 2.1, discountKg: 828 },
    { name: "MATERIAS EXTRA#AS", value: 2.2, discountPercent: 1.2, discountKg: 473 },
    { name: "GRANOS DA#ADOS", value: 9.1, discountPercent: 0.55, discountKg: 217 },
    { name: "GRANOS DA#ADOS POR CALOR", value: 1.8, discountPercent: 1.3, discountKg: 512 },
  ],
  modality: "closed",
  price: 402,
  currency: "USD",
  uncertain: ["supplierName", "price"],
};

describe("mapExtraction", () => {
  it("mapea una boleta INDAPO y deja los textos de catálogo como lecturas", () => {
    const raw = parseRawExtraction(indapo);
    assert.ok(raw);
    const { fields, suggestions, readings, issues } = mapExtraction(raw);
    assert.equal(fields.issuerId, "");
    assert.equal(fields.supplierId, "");
    assert.equal(fields.owner, "ALFREDO TOLEDO MONTENEGRO");
    assert.deepEqual(readings, {
      format: "indapo",
      site: "SAN JULIAN",
      supplierName: "Alfredo Toledo Montenegro",
      supplierTaxId: "",
    });
    assert.equal(fields.grossKg, "68.430");
    assert.equal(fields.quality.moisture.discountKg, "1.606,77");
    assert.equal(fields.quality.moisture.percent, "16,3");
    assert.equal(fields.weighedAt, "2026-04-17T00:00");
    assert.equal(suggestions.weighedAt?.confidence, CONFIDENCE.inferred);
    assert.deepEqual(issues, []);
  });

  it("suma en Otros los factores sin equivalente", () => {
    const raw = parseRawExtraction(indapo);
    assert.ok(raw);
    const { fields } = mapExtraction(raw);
    assert.equal(fields.quality.other.percent, "0,9");
    assert.equal(fields.quality.broken.percent, "6,3");
  });

  it("mapea Cargill: proveedor escrito a mano como lectura, titular impreso aparte y precio dudoso", () => {
    const raw = parseRawExtraction(cargill);
    assert.ok(raw);
    const { fields, suggestions, readings, issues } = mapExtraction(raw);
    assert.equal(readings.format, "cargill");
    assert.equal(readings.supplierName, "JUANA MARTINEZ");
    assert.equal(fields.owner, "INDAPO SRL");
    assert.equal(suggestions.price?.confidence, CONFIDENCE.uncertain);
    assert.equal(fields.quality.damaged.discountKg, "729");
    assert.equal(fields.modality, "closed");
    assert.equal(fields.price, "402");
    assert.equal(fields.currency, "USD");
    assert.match(fields.notes, /Cerrado 402/);
    assert.deepEqual(issues, []);
  });

  it("tolera el redondeo entre la suma de factores y el total impreso", () => {
    const raw = parseRawExtraction(indapo);
    assert.ok(raw);
    assert.deepEqual(arithmeticIssues(mapExtraction(raw).fields), []);
  });

  it("baja la confianza de los pesos cuando las cuentas no cierran", () => {
    const raw = parseRawExtraction({ ...indapo, tareKg: 19470 });
    assert.ok(raw);
    const { suggestions, issues } = mapExtraction(raw);
    assert.ok(issues.includes("tareKg"));
    assert.equal(suggestions.tareKg?.confidence, CONFIDENCE.arithmetic);
    assert.equal(suggestions.plate?.confidence, CONFIDENCE.read);
  });
});

describe("parseRawExtraction", () => {
  it("rechaza lo que no es objeto y completa valores faltantes", () => {
    assert.equal(parseRawExtraction("texto"), null);
    const raw = parseRawExtraction({ format: "otro", grossKg: "68430", uncertain: ["plate", "inventado"] });
    assert.ok(raw);
    assert.equal(raw.format, "unknown");
    assert.equal(raw.grossKg, null);
    assert.deepEqual(raw.uncertain, ["plate"]);
  });
});

describe("qualityKeyFor", () => {
  it("reconoce los nombres de ambos formatos", () => {
    assert.equal(qualityKeyFor("GRANOS QUEBRADOS/PARTIDOS"), "broken");
    assert.equal(qualityKeyFor("QUEMADOS"), "damaged");
    assert.equal(qualityKeyFor("GRANOS DE OTROS COLORES"), "other");
    assert.equal(qualityKeyFor("GRANOS ATACADOS P/ENFERME"), "other");
  });
});
