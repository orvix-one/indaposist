import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeTaxId, validateSupplier, type Supplier } from "./supplier.ts";

const at = "2026-11-01T12:00:00.000Z";
const existing: Supplier[] = [
  { id: "s1", name: "Agropecuaria San Julián", taxId: "NIT 1028374019", active: true, createdAt: at, updatedAt: at },
];

describe("validateSupplier", () => {
  it("acepta un proveedor nuevo", () => {
    assert.deepEqual(validateSupplier({ name: "Nuevo", taxId: "CI 123 SC", active: true }, existing), { ok: true });
  });

  it("exige nombre y documento", () => {
    const result = validateSupplier({ name: " ", taxId: " ", active: true }, existing);
    assert.ok(!result.ok);
    assert.deepEqual(Object.keys(result.errors).sort(), ["name", "taxId"]);
  });

  it("rechaza NIT duplicado aunque cambie el formato", () => {
    const result = validateSupplier({ name: "Otro", taxId: "nit 1028.374.019", active: true }, existing);
    assert.ok(!result.ok && result.errors.taxId?.includes("Agropecuaria San Julián"));
  });

  it("permite conservar el propio documento al editar", () => {
    assert.deepEqual(validateSupplier({ name: "Renombrado", taxId: "NIT 1028374019", active: false }, existing, "s1"), { ok: true });
  });
});

describe("normalizeTaxId", () => {
  it("ignora espacios, puntos, guiones y mayúsculas", () => {
    assert.equal(normalizeTaxId("ci 5.928-374 sc"), "CI5928374SC");
  });
});
