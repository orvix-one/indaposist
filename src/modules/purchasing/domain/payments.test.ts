import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { obligationFor, paymentBlocker, previewApplied, totalsByCurrency, validatePayment } from "./payments.ts";
import type { PayableTicket, Payment, PaymentInput } from "./types.ts";

const TODAY = "2026-11-28";

const bobTicket: PayableTicket = { id: "bl-1", approved: true, currency: "BOB", amountCents: 1_000_000n };
const usdTicket: PayableTicket = { id: "bl-2", approved: true, currency: "USD", amountCents: 1_000_000n };

function payment(ticketId: string, appliedCents: bigint, extra: Partial<Payment> = {}): Payment {
  return {
    id: `p-${ticketId}-${appliedCents}`,
    ticketId,
    paidOn: "2026-11-27",
    amountCents: appliedCents,
    currency: "BOB",
    rate: 69600n,
    appliedCents,
    method: "transfer",
    bank: "Banco Ganadero",
    account: "1041-223344",
    responsible: "Lucía Méndez",
    receipt: { name: "comprobante.pdf", kind: "pdf", url: "blob:1", sha256: "x", sizeBytes: 1 },
    notes: "",
    recordedBy: "Lucía Méndez",
    recordedAt: "2026-11-27T10:00:00Z",
    ...extra,
  };
}

function input(overrides: Partial<PaymentInput> = {}): PaymentInput {
  return {
    paidOn: "2026-11-28",
    amount: "4.000,00",
    currency: "BOB",
    rate: "6,96",
    method: "transfer",
    bank: "Banco Ganadero",
    account: "1041-223344",
    responsible: "Lucía Méndez",
    notes: "",
    receipt: { name: "comprobante.pdf", kind: "pdf", url: "blob:1", sha256: "x", sizeBytes: 1 },
    ...overrides,
  };
}

describe("obligationFor", () => {
  it("una boleta de Bs 10.000 con un pago de Bs 4.000 queda abierta con Bs 6.000 de saldo", () => {
    const obligation = obligationFor(bobTicket, [payment("bl-1", 400_000n)]);
    assert.equal(obligation?.balanceCents, 600_000n);
    assert.equal(obligation?.status, "partial");
  });

  it("sin pagos está abierta y al cubrir el saldo queda cerrada", () => {
    assert.equal(obligationFor(bobTicket, [])?.status, "pending");
    const paid = obligationFor(bobTicket, [payment("bl-1", 400_000n), payment("bl-1", 600_000n)]);
    assert.equal(paid?.status, "paid");
    assert.equal(paid?.balanceCents, 0n);
  });

  it("ignora pagos de otras boletas y no existe sin importe", () => {
    assert.equal(obligationFor(bobTicket, [payment("bl-9", 400_000n)])?.paidCents, 0n);
    assert.equal(obligationFor({ ...bobTicket, amountCents: null }, []), null);
  });
});

describe("validatePayment", () => {
  it("acepta un pago completo y válido", () => {
    const result = validatePayment(input(), bobTicket, obligationFor(bobTicket, []), TODAY);
    assert.deepEqual(result, { ok: true, amountCents: 400_000n, rate: 69_600n, appliedCents: 400_000n });
  });

  it("convierte un pago en bolivianos a una boleta en dólares con la tasa de ese pago", () => {
    const obligation = obligationFor(usdTicket, []);
    const first = validatePayment(input({ amount: "6.960,00", rate: "6,96" }), usdTicket, obligation, TODAY);
    const second = validatePayment(input({ amount: "6.970,00", rate: "6,97" }), usdTicket, obligation, TODAY);
    assert.ok(first.ok && second.ok);
    assert.equal(first.appliedCents, 100_000n);
    assert.equal(second.appliedCents, 100_000n);
    assert.equal(first.rate, 69_600n);
    assert.equal(second.rate, 69_700n);
  });

  it("rechaza un pago mayor al saldo", () => {
    const obligation = obligationFor(bobTicket, [payment("bl-1", 800_000n)]);
    const result = validatePayment(input({ amount: "2.000,01" }), bobTicket, obligation, TODAY);
    assert.equal(result.ok, false);
    assert.match(!result.ok ? result.errors.amount ?? "" : "", /Supera el saldo pendiente de Bs 2\.000,00/);
  });

  it("exige todos los datos obligatorios", () => {
    const empty = input({ paidOn: "", amount: "", rate: "", method: "", bank: " ", account: "", responsible: "", receipt: null });
    const result = validatePayment(empty, bobTicket, obligationFor(bobTicket, []), TODAY);
    assert.equal(result.ok, false);
    assert.deepEqual(Object.keys(!result.ok ? result.errors : {}).sort(), ["account", "amount", "bank", "method", "paidOn", "rate", "receipt", "responsible"]);
  });

  it("rechaza fechas futuras e importes o tasas no válidos", () => {
    const result = validatePayment(input({ paidOn: "2026-11-29", amount: "0", rate: "6,96555" }), bobTicket, obligationFor(bobTicket, []), TODAY);
    assert.ok(!result.ok && result.errors.paidOn && result.errors.amount && result.errors.rate);
  });

  it("no admite pagos en boletas sin aprobar o ya pagadas", () => {
    const notApproved = { ...bobTicket, approved: false };
    assert.ok(paymentBlocker(notApproved, obligationFor(notApproved, [])));
    const paid = obligationFor(bobTicket, [payment("bl-1", 1_000_000n)]);
    const result = validatePayment(input(), bobTicket, paid, TODAY);
    assert.equal(!result.ok && result.errors.form, "La boleta ya está pagada.");
  });
});

describe("previewApplied y totales", () => {
  it("muestra el importe que se aplicaría", () => {
    const obligation = obligationFor(usdTicket, [])!;
    assert.equal(previewApplied({ amount: "696", currency: "BOB", rate: "6,96" }, obligation), 10_000n);
    assert.equal(previewApplied({ amount: "", currency: "BOB", rate: "6,96" }, obligation), null);
  });

  it("suma por moneda sin mezclarlas", () => {
    const totals = totalsByCurrency([obligationFor(bobTicket, [payment("bl-1", 400_000n)])!, obligationFor(usdTicket, [])!]);
    assert.deepEqual(totals.BOB, { amount: 1_000_000n, paid: 400_000n, balance: 600_000n });
    assert.deepEqual(totals.USD, { amount: 1_000_000n, paid: 0n, balance: 1_000_000n });
  });
});
