import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { filterHistory, summarizeHistory, type HistoryTicket } from "./history.ts";

function ticket(overrides: Partial<HistoryTicket> = {}): HistoryTicket {
  return {
    id: "bl-1",
    weighedAt: "2026-11-24T10:22",
    campaignId: "i26",
    unitId: "sj",
    grossKg: 42_380,
    tareKg: 14_930,
    netKg: 27_450,
    discountKg: 480,
    liquidKg: 26_970,
    quality: { moisture: 320, impurity: 160, damaged: null },
    currency: "BOB",
    amountCents: 5_798_550n,
    paidCents: 2_000_000n,
    balanceCents: 3_798_550n,
    paymentState: "partial",
    ...overrides,
  };
}

describe("filterHistory", () => {
  const tickets = [ticket(), ticket({ id: "bl-2", weighedAt: "2026-05-10T08:00", campaignId: "v26" })];

  it("filtra por campaña y por fecha de pesaje", () => {
    assert.deepEqual(filterHistory(tickets, { campaignId: "v26", from: "", to: "" }).map((item) => item.id), ["bl-2"]);
    assert.deepEqual(filterHistory(tickets, { campaignId: "", from: "2026-11-01", to: "2026-11-30" }).map((item) => item.id), ["bl-1"]);
    assert.equal(filterHistory(tickets, { campaignId: "", from: "", to: "" }).length, 2);
  });
});

describe("summarizeHistory", () => {
  it("suma kilos, líquido por unidad y descuentos por factor", () => {
    const summary = summarizeHistory([ticket(), ticket({ id: "bl-2", unitId: "pl", liquidKg: 10_000.5, quality: { moisture: 80.25 } })]);
    assert.equal(summary.count, 2);
    assert.equal(summary.kg.liquid, 36_970.5);
    assert.deepEqual(summary.liquidByUnit, { sj: 26_970, pl: 10_000.5 });
    assert.deepEqual(summary.discountByFactor, { moisture: 400.25, impurity: 160 });
  });

  it("separa importes por moneda y omite boletas sin importe", () => {
    const summary = summarizeHistory([
      ticket(),
      ticket({ id: "bl-2", currency: "USD", amountCents: 100_000n, paidCents: 100_000n, balanceCents: 0n }),
      ticket({ id: "bl-3", amountCents: null, paidCents: 0n, balanceCents: 0n }),
    ]);
    assert.deepEqual(summary.money.BOB, { amount: 5_798_550n, paid: 2_000_000n, balance: 3_798_550n });
    assert.deepEqual(summary.money.USD, { amount: 100_000n, paid: 100_000n, balance: 0n });
  });
});
