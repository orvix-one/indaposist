import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { EMPTY_SUPPLIER, cleanSupplier, hasRua, matchesSupplier, normalizeTaxId, validateSupplier, type Supplier, type SupplierInput } from "./supplier.ts";

const at = "2026-11-01T12:00:00.000Z";
const existing: Supplier[] = [
  { ...EMPTY_SUPPLIER, id: "s1", name: "Agropecuaria San Julián", taxId: "NIT 1028374019", rua: "RUA-001234", createdAt: at, updatedAt: at },
];

const input = (values: Partial<SupplierInput>): SupplierInput => ({ ...EMPTY_SUPPLIER, ...values });

describe("validateSupplier", () => {
  it("acepta un proveedor nuevo", () => {
    assert.deepEqual(validateSupplier(input({ name: "Nuevo", taxId: "CI 123 SC" }), existing), { ok: true });
  });

  it("exige nombre y documento", () => {
    const result = validateSupplier(input({ name: " ", taxId: " " }), existing);
    assert.ok(!result.ok);
    assert.deepEqual(Object.keys(result.errors).sort(), ["name", "taxId"]);
  });

  it("rechaza NIT duplicado aunque cambie el formato", () => {
    const result = validateSupplier(input({ name: "Otro", taxId: "nit 1028.374.019" }), existing);
    assert.ok(!result.ok && result.errors.taxId?.includes("Agropecuaria San Julián"));
  });

  it("permite conservar el propio documento y RUA al editar", () => {
    assert.deepEqual(validateSupplier(input({ name: "Renombrado", taxId: "NIT 1028374019", rua: "rua 001234", active: false }), existing, "s1"), { ok: true });
  });

  it("rechaza un RUA ya usado por otro proveedor", () => {
    const result = validateSupplier(input({ name: "Otro", taxId: "CI 9 SC", rua: "rua 001234" }), existing);
    assert.ok(!result.ok && result.errors.rua?.includes("Agropecuaria San Julián"));
  });

  it("valida el teléfono solo si se ingresa", () => {
    assert.deepEqual(validateSupplier(input({ name: "A", taxId: "CI 1", phone: "+591 721-45678" }), existing), { ok: true });
    const result = validateSupplier(input({ name: "A", taxId: "CI 1", phone: "llamar" }), existing);
    assert.ok(!result.ok && result.errors.phone);
  });
});

describe("búsqueda y RUA", () => {
  const supplier = existing[0];

  it("encuentra por nombre, NIT o RUA", () => {
    assert.ok(matchesSupplier(supplier, "san julián"));
    assert.ok(matchesSupplier(supplier, "1028.374"));
    assert.ok(matchesSupplier(supplier, "001234"));
    assert.ok(matchesSupplier(supplier, ""));
    assert.equal(matchesSupplier(supplier, "Quiroga"), false);
  });

  it("indica si tiene RUA", () => {
    assert.ok(hasRua(supplier));
    assert.equal(hasRua({ rua: "  " }), false);
  });

  it("limpia espacios sobrantes", () => {
    assert.equal(cleanSupplier(input({ name: "  Hnos.   Quiroga ", phone: " 721 " })).name, "Hnos. Quiroga");
  });
});

describe("normalizeTaxId", () => {
  it("ignora espacios, puntos, guiones y mayúsculas", () => {
    assert.equal(normalizeTaxId("ci 5.928-374 sc"), "CI5928374SC");
  });
});
