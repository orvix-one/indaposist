/* Reglas de pagos por boleta (funcional.md § Pagos por boleta). Sin IO: el estado vive en el store en memoria. */

import { RATE_DECIMALS, convertCents, formatMoney, parseScaled } from "../../../shared/money.ts";
import { PAYMENT_METHODS, type Obligation, type PayableTicket, type Payment, type PaymentField, type PaymentInput } from "./types.ts";

export function obligationFor(ticket: Pick<PayableTicket, "id" | "currency" | "amountCents">, payments: Payment[]): Obligation | null {
  if (ticket.amountCents === null) return null;
  const paidCents = payments.filter((payment) => payment.ticketId === ticket.id).reduce((sum, payment) => sum + payment.appliedCents, 0n);
  const balanceCents = ticket.amountCents - paidCents;
  return {
    ticketId: ticket.id,
    currency: ticket.currency,
    amountCents: ticket.amountCents,
    paidCents,
    balanceCents,
    status: paidCents === 0n ? "pending" : balanceCents > 0n ? "partial" : "paid",
  };
}

/** Motivo por el que la boleta no admite pagos, o null si los admite. */
export function paymentBlocker(ticket: PayableTicket, obligation: Obligation | null): string | null {
  if (!ticket.approved) return "Solo se registran pagos de boletas aprobadas.";
  if (!obligation) return "La boleta no tiene importe: faltan carga o precio.";
  if (obligation.balanceCents <= 0n) return "La boleta ya está pagada.";
  return null;
}

export type PaymentValidation =
  | { ok: true; amountCents: bigint; rate: bigint; appliedCents: bigint }
  | { ok: false; errors: Partial<Record<PaymentField | "form", string>> };

/** Valida un pago contra el saldo vigente. `today` es la fecha de negocio (America/La_Paz) en AAAA-MM-DD. */
export function validatePayment(input: PaymentInput, ticket: PayableTicket, obligation: Obligation | null, today: string): PaymentValidation {
  const blocker = paymentBlocker(ticket, obligation);
  if (blocker || !obligation) return { ok: false, errors: { form: blocker ?? "La boleta no admite pagos." } };

  const errors: Partial<Record<PaymentField, string>> = {};
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.paidOn)) errors.paidOn = "Indica la fecha del pago.";
  else if (input.paidOn > today) errors.paidOn = "La fecha no puede ser posterior a hoy.";

  const amountCents = parseScaled(input.amount, 2);
  if (input.amount.trim() === "") errors.amount = "Indica el importe.";
  else if (amountCents === null) errors.amount = "Número no válido (hasta 2 decimales).";
  else if (amountCents === 0n) errors.amount = "Debe ser mayor que cero.";

  const rate = parseScaled(input.rate, RATE_DECIMALS);
  if (input.rate.trim() === "") errors.rate = "Indica el tipo de cambio de la fecha del pago.";
  else if (rate === null) errors.rate = `Número no válido (hasta ${RATE_DECIMALS} decimales).`;
  else if (rate === 0n) errors.rate = "Debe ser mayor que cero.";

  if (!PAYMENT_METHODS.includes(input.method as never)) errors.method = "Elige el método de pago.";
  if (!input.bank.trim()) errors.bank = "Indica el banco.";
  if (!input.account.trim()) errors.account = "Indica la cuenta bancaria.";
  if (!input.responsible.trim()) errors.responsible = "Indica quién realizó el pago.";
  if (!input.receipt) errors.receipt = "Adjunta el comprobante.";

  let appliedCents = 0n;
  if (amountCents && rate) {
    appliedCents = convertCents(amountCents, input.currency, obligation.currency, rate);
    if (appliedCents === 0n) errors.amount ??= "Convertido a la moneda de la boleta da cero.";
    else if (appliedCents > obligation.balanceCents) {
      errors.amount ??= `Supera el saldo pendiente de ${formatMoney(obligation.balanceCents, obligation.currency)}.`;
    }
  }

  if (Object.keys(errors).length > 0 || amountCents === null || rate === null) return { ok: false, errors };
  return { ok: true, amountCents, rate, appliedCents };
}

/** Importe que aplicaría el pago a la boleta, para mostrarlo mientras se escribe. Null si faltan datos. */
export function previewApplied(input: Pick<PaymentInput, "amount" | "currency" | "rate">, obligation: Obligation): bigint | null {
  const amountCents = parseScaled(input.amount, 2);
  const rate = parseScaled(input.rate, RATE_DECIMALS);
  if (!amountCents || !rate) return null;
  return convertCents(amountCents, input.currency, obligation.currency, rate);
}

/** Totales por moneda, sin mezclarlas. */
export function totalsByCurrency(obligations: Obligation[]) {
  const totals = { BOB: { amount: 0n, paid: 0n, balance: 0n }, USD: { amount: 0n, paid: 0n, balance: 0n } };
  for (const obligation of obligations) {
    const total = totals[obligation.currency];
    total.amount += obligation.amountCents;
    total.paid += obligation.paidCents;
    total.balance += obligation.balanceCents;
  }
  return totals;
}

export type SupplierAccount = {
  totals: ReturnType<typeof totalsByCurrency>;
  obligations: Obligation[];
  openCount: number;
  paidCount: number;
  payments: Payment[];
};

/** Cuenta de un proveedor: sus boletas aprobadas con importe, lo pagado y el saldo por moneda, y sus pagos del más reciente al más antiguo. */
export function supplierAccount(supplierId: string, tickets: PayableTicket[], payments: Payment[]): SupplierAccount {
  const own = tickets.filter((ticket) => ticket.supplierId === supplierId && ticket.approved);
  const obligations = own.map((ticket) => obligationFor(ticket, payments)).filter((item): item is Obligation => item !== null);
  const ids = new Set(own.map((ticket) => ticket.id));
  return {
    totals: totalsByCurrency(obligations),
    obligations,
    openCount: obligations.filter((item) => item.status !== "paid").length,
    paidCount: obligations.filter((item) => item.status === "paid").length,
    payments: payments
      .filter((payment) => ids.has(payment.ticketId))
      .sort((a, b) => b.paidOn.localeCompare(a.paidOn) || b.recordedAt.localeCompare(a.recordedAt)),
  };
}
