import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canTransition,
  findDuplicateTicket,
  parseDecimal,
  pendingVerification,
  setFieldValue,
  validateDecision,
  validateForSubmit,
  weightChecks,
} from "./rules.ts";
import { emptyFields } from "./fields.ts";
import type { TicketFields } from "./types.ts";

function filled(overrides: Partial<TicketFields> = {}): TicketFields {
  const base = emptyFields();
  return {
    ...base,
    issuerId: "sj",
    siteId: "sj",
    campaignId: "v26",
    productId: "soy",
    scaleTicket: "0048123",
    weighedAt: "2026-11-25T08:40",
    supplierId: "s1",
    plate: "3456-KTR",
    grossKg: "42.380",
    tareKg: "14.930",
    netKg: "27.450",
    discountKg: "480",
    liquidKg: "26.970",
    quality: { ...base.quality, moisture: { percent: "14,2", discountKg: "320" }, impurity: { percent: "1,6", discountKg: "160" } },
    officeArrivalDate: "2026-11-26",
    documentType: "original",
    ...overrides,
  };
}

describe("parseDecimal", () => {
  it("lee miles con punto y decimales con coma", () => {
    assert.equal(parseDecimal("28.450"), 28450);
    assert.equal(parseDecimal("2.150,75"), 2150.75);
    assert.equal(parseDecimal("14,2"), 14.2);
    assert.equal(parseDecimal("15"), 15);
  });

  it("devuelve null en vacío o texto", () => {
    assert.equal(parseDecimal(""), null);
    assert.equal(parseDecimal("abc"), null);
  });
});

describe("weightChecks", () => {
  it("acepta una boleta coherente", () => {
    const checks = weightChecks(filled());
    assert.ok(checks.net.ok && checks.discount.ok && checks.liquid.ok);
  });

  it("detecta neto distinto de bruto − tara", () => {
    const checks = weightChecks(filled({ tareKg: "15.420" }));
    assert.equal(checks.net.ok, false);
    assert.equal(checks.net.expected, 26960);
  });

  it("detecta descuento distinto de la suma de calidad", () => {
    assert.equal(weightChecks(filled({ discountKg: "500" })).discount.ok, false);
  });

  it("tolera hasta 1 kg por el redondeo de los descuentos de calidad", () => {
    const base = emptyFields().quality;
    const quality = { ...base, moisture: { percent: "14,2", discountKg: "320,4" }, impurity: { percent: "1,6", discountKg: "160,2" } };
    assert.equal(weightChecks(filled({ quality, discountKg: "481" })).discount.ok, true);
    assert.equal(weightChecks(filled({ quality, discountKg: "482" })).discount.ok, false);
  });
});

describe("validateForSubmit", () => {
  it("no reporta problemas en una boleta completa", () => {
    const issues = validateForSubmit({ suggestions: {} }, filled(), []);
    assert.deepEqual(issues, { fieldErrors: {}, pending: [] });
  });

  it("exige ubicación cuando el original está archivado", () => {
    const issues = validateForSubmit({ suggestions: {} }, filled({ archived: true }), []);
    assert.ok(issues.fieldErrors.archiveLocation);
  });

  it("exige los campos obligatorios", () => {
    const issues = validateForSubmit({ suggestions: {} }, emptyFields(), []);
    assert.ok(issues.fieldErrors.supplierId && issues.fieldErrors.grossKg);
  });
});

describe("pendingVerification", () => {
  const suggestions = { plate: { value: "3456-KTR", confidence: 0.6 }, scaleTicket: { value: "0048123", confidence: 0.98 } };

  it("lista los campos de baja confianza sin confirmar", () => {
    assert.deepEqual(pendingVerification({ suggestions }, filled(), []), ["plate"]);
  });

  it("los da por verificados al confirmarlos o corregirlos", () => {
    assert.deepEqual(pendingVerification({ suggestions }, filled(), ["plate"]), []);
    assert.deepEqual(pendingVerification({ suggestions }, setFieldValue(filled(), "plate", "3465-KTR"), []), []);
  });
});

describe("canTransition", () => {
  it("permite borrador → revisión y observada → revisión", () => {
    assert.ok(canTransition("draft", "in_review"));
    assert.ok(canTransition("observed", "in_review"));
  });

  it("impide saltar de borrador a aprobada", () => {
    assert.equal(canTransition("draft", "approved"), false);
  });
});

describe("validateDecision", () => {
  it("aprueba una boleta en revisión sin comentario", () => {
    assert.equal(validateDecision("in_review", "approved", ""), null);
  });

  it("exige motivo para observar o rechazar", () => {
    assert.ok(validateDecision("in_review", "observed", "  "));
    assert.ok(validateDecision("in_review", "rejected", ""));
    assert.equal(validateDecision("in_review", "rejected", "Boleta de otra campaña"), null);
  });

  it("solo decide sobre boletas en revisión", () => {
    assert.ok(validateDecision("draft", "approved", ""));
    assert.ok(validateDecision("approved", "rejected", "Error"));
  });
});

describe("findDuplicateTicket", () => {
  const existing = [{ id: "bl-1", fields: filled({ issuerId: "pc", scaleTicket: "0088445", folio: "" }) }];

  it("detecta la misma boleta del mismo emisor aunque cambien ceros y espacios", () => {
    assert.equal(findDuplicateTicket(existing, { issuerId: "pc", scaleTicket: "88 445", folio: "" }), "bl-1");
  });

  it("no confunde boletas de otro emisor ni sin número", () => {
    assert.equal(findDuplicateTicket(existing, { issuerId: "sj", scaleTicket: "88445", folio: "" }), undefined);
    assert.equal(findDuplicateTicket(existing, { issuerId: "pc", scaleTicket: "", folio: "" }), undefined);
  });
});
