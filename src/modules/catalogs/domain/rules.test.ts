import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { campaignsUsingProduct, isSelectable, normalizeName, validateCampaign, validateNamed } from "./rules.ts";
import type { Campaign, CampaignInput, Product } from "./types.ts";

const at = "2026-11-01T12:00:00.000Z";
const product = (id: string, active = true): Product => ({ id, name: `Producto ${id}`, active, createdAt: at, updatedAt: at });
const campaign = (overrides: Partial<Campaign> = {}): Campaign => ({
  id: "v26",
  name: "Verano 2025/26",
  productId: "soy",
  startDate: "2026-02-01",
  endDate: "2026-07-31",
  status: "open",
  createdAt: at,
  updatedAt: at,
  ...overrides,
});
const input = (overrides: Partial<CampaignInput> = {}): CampaignInput => ({
  name: "Invierno 2026",
  productId: "soy",
  startDate: "2026-08-01",
  endDate: "2026-12-31",
  status: "open",
  ...overrides,
});

describe("normalizeName", () => {
  it("ignora mayúsculas y espacios repetidos", () => {
    assert.equal(normalizeName("  Acopio   SAN Julián "), "acopio san julián");
  });
});

describe("validateNamed", () => {
  const existing = [{ id: "sj", name: "Acopio San Julián", active: true, createdAt: at, updatedAt: at }];

  it("exige nombre", () => {
    assert.deepEqual(validateNamed({ name: "  ", active: true }, existing), { ok: false, errors: { name: "Ingresa un nombre." } });
  });

  it("rechaza duplicados normalizados", () => {
    const result = validateNamed({ name: "acopio  san julián", active: true }, existing);
    assert.equal(result.ok, false);
  });

  it("permite conservar el propio nombre al editar", () => {
    assert.deepEqual(validateNamed({ name: "Acopio San Julián", active: false }, existing, "sj"), { ok: true });
  });
});

describe("validateCampaign", () => {
  const context = { campaigns: [campaign()], products: [product("soy"), product("old", false)] };

  it("acepta una campaña válida", () => {
    assert.deepEqual(validateCampaign(input(), context), { ok: true });
  });

  it("rechaza fin anterior al inicio", () => {
    const result = validateCampaign(input({ startDate: "2026-08-01", endDate: "2026-07-31" }), context);
    assert.ok(!result.ok && result.errors.endDate);
  });

  it("acepta inicio y fin el mismo día", () => {
    assert.deepEqual(validateCampaign(input({ startDate: "2026-08-01", endDate: "2026-08-01" }), context), { ok: true });
  });

  it("rechaza producto inactivo en campañas nuevas", () => {
    const result = validateCampaign(input({ productId: "old" }), context);
    assert.ok(!result.ok && result.errors.productId === "El producto está inactivo.");
  });

  it("permite editar una campaña cuyo producto se desactivó después", () => {
    const current = campaign({ id: "x", name: "Antigua", productId: "old" });
    const result = validateCampaign({ ...current, status: "closed" }, { ...context, campaigns: [...context.campaigns, current] }, current);
    assert.deepEqual(result, { ok: true });
  });

  it("exige producto y fechas", () => {
    const result = validateCampaign(input({ productId: "", startDate: "", endDate: "" }), context);
    assert.ok(!result.ok);
    assert.deepEqual(Object.keys(result.errors).sort(), ["endDate", "productId", "startDate"]);
  });

  it("rechaza nombre duplicado", () => {
    const result = validateCampaign(input({ name: "verano 2025/26" }), context);
    assert.ok(!result.ok && result.errors.name);
  });
});

describe("uso y selección", () => {
  it("encuentra campañas que usan un producto", () => {
    assert.equal(campaignsUsingProduct("soy", [campaign(), campaign({ id: "b", productId: "maiz" })]).length, 1);
  });

  it("solo son seleccionables los activos y las campañas abiertas", () => {
    assert.equal(isSelectable(product("a", false)), false);
    assert.equal(isSelectable(campaign({ status: "closed" })), false);
    assert.equal(isSelectable(campaign()), true);
  });
});
