/* Pagos sintéticos sobre las boletas aprobadas de ejemplo: una pagada, una en dólares con dos pagos en bolivianos a tasas distintas, una con pago parcial y el resto sin pagos. Fechas fijas para que servidor y cliente rendericen igual. */

import { currentUser } from "@/modules/access";
import { ticketAmountCents, type Ticket } from "@/modules/intake";
import { convertCents, divideRounded, formatMoney, formatRate, type Currency } from "@/shared/money";
import type { Payment, PaymentMethod, Receipt } from "../domain/types";

function receiptSvg(lines: string[]): string {
  const text = lines
    .map((line, index) => `<text x="32" y="${72 + index * 30}" font-size="${index === 0 ? 22 : 16}" font-weight="${index === 0 ? 600 : 400}">${line}</text>`)
    .join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="380" viewBox="0 0 600 380"><rect width="600" height="380" fill="#fbfaf6"/><rect x="12" y="12" width="576" height="356" fill="none" stroke="#c9c3b3"/><g font-family="sans-serif" fill="#2b2a26">${text}</g><text x="32" y="352" font-family="sans-serif" font-size="12" fill="#8a8476">Comprobante de ejemplo · datos sintéticos</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

type Spec = {
  paidOn: string;
  method: PaymentMethod;
  bank: string;
  account: string;
  currency: Currency;
  rate: bigint;
  /** Parte del importe de la boleta que cubre este pago, en milésimos. */
  share: bigint;
};

const BANKS = { ganadero: "Banco Ganadero", bnb: "Banco Nacional de Bolivia", union: "Banco Unión" };

const PLAN: Record<string, Spec[]> = {
  "bl-2026-04812": [{ paidOn: "2026-11-25", method: "transfer", bank: BANKS.ganadero, account: "1041-223344", currency: "BOB", rate: 69600n, share: 1000n }],
  "bl-2026-04811": [
    { paidOn: "2026-11-24", method: "transfer", bank: BANKS.bnb, account: "300-0129384", currency: "BOB", rate: 69600n, share: 400n },
    { paidOn: "2026-11-27", method: "check", bank: BANKS.bnb, account: "300-0129384", currency: "BOB", rate: 69700n, share: 300n },
  ],
  "bl-2026-04810": [{ paidOn: "2026-11-26", method: "qr", bank: BANKS.union, account: "10000-48291", currency: "BOB", rate: 69600n, share: 350n }],
};

export function seedPayments(tickets: Ticket[]): Payment[] {
  return tickets.flatMap((ticket) => {
    const specs = PLAN[ticket.id];
    const total = ticketAmountCents(ticket.fields);
    if (!specs || total === null) return [];
    return specs.map((spec, index): Payment => {
      const target = divideRounded(total * spec.share, 1000n);
      const amountCents = convertCents(target, ticket.fields.currency, spec.currency, spec.rate);
      const appliedCents = convertCents(amountCents, spec.currency, ticket.fields.currency, spec.rate);
      const reference = `${ticket.fields.scaleTicket || ticket.code}-${index + 1}`;
      const receipt: Receipt = {
        name: `comprobante-${reference}.svg`,
        kind: "image",
        url: receiptSvg([spec.bank, `Fecha: ${spec.paidOn}`, `Importe: ${formatMoney(amountCents, spec.currency)}`, `Cuenta: ${spec.account}`, `Tipo de cambio: ${formatRate(spec.rate)}`, `Referencia: ${reference}`]),
        sha256: `pay${ticket.id}${index}`.padEnd(64, "0"),
        sizeBytes: 42_000 + index * 517,
        synthetic: true,
      };
      return {
        id: `pay-${ticket.id}-${index + 1}`,
        ticketId: ticket.id,
        paidOn: spec.paidOn,
        amountCents,
        currency: spec.currency,
        rate: spec.rate,
        appliedCents,
        method: spec.method,
        bank: spec.bank,
        account: spec.account,
        responsible: currentUser.name,
        receipt,
        notes: "",
        recordedBy: currentUser.name,
        recordedAt: `${spec.paidOn}T16:${String(10 + index).padStart(2, "0")}:00-04:00`,
      };
    });
  });
}
