"use client";

/* Pagos en memoria mientras no hay persistencia. Se reinician al recargar, igual que las boletas. */

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { currentUser } from "@/modules/access";
import { ticketAmountCents, useTickets, type Ticket } from "@/modules/intake";
import { obligationFor, validatePayment, type PaymentValidation } from "../domain/payments";
import type { Obligation, PayableTicket, Payment, PaymentInput } from "../domain/types";
import { seedPayments } from "../mock/seed";

export type PayableRow = { ticket: Ticket; payable: PayableTicket; obligation: Obligation | null };

type RegisterResult = { ok: true; payment: Payment } | Extract<PaymentValidation, { ok: false }>;

type PaymentsContextValue = {
  payments: Payment[];
  rows: PayableRow[];
  registerPayment: (ticketId: string, input: PaymentInput) => RegisterResult;
};

const PaymentsContext = createContext<PaymentsContextValue | null>(null);

export function todayInLaPaz(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/La_Paz" }).format(new Date());
}

function toPayable(ticket: Ticket): PayableTicket {
  return { id: ticket.id, supplierId: ticket.fields.supplierId, approved: ticket.status === "approved", currency: ticket.fields.currency, amountCents: ticketAmountCents(ticket.fields) };
}

export function PaymentsProvider({ children }: { children: ReactNode }) {
  const tickets = useTickets();
  const [payments, setPayments] = useState<Payment[]>(() => seedPayments(tickets));
  const paymentsRef = useRef(payments);
  const ticketsRef = useRef(tickets);

  useEffect(() => {
    paymentsRef.current = payments;
  }, [payments]);

  useEffect(() => {
    ticketsRef.current = tickets;
  }, [tickets]);

  const rows = useMemo(
    () =>
      tickets.map((ticket) => {
        const payable = toPayable(ticket);
        return { ticket, payable, obligation: obligationFor(payable, payments) };
      }),
    [tickets, payments],
  );

  const registerPayment = useCallback((ticketId: string, input: PaymentInput): RegisterResult => {
    if (!currentUser.canRegisterPayments) return { ok: false, errors: { form: "No tienes permiso para registrar pagos." } };
    const ticket = ticketsRef.current.find((item) => item.id === ticketId);
    if (!ticket) return { ok: false, errors: { form: "Boleta no encontrada." } };
    const payable = toPayable(ticket);
    // Se valida contra los pagos vigentes al confirmar, no contra los que había al abrir el formulario.
    const result = validatePayment(input, payable, obligationFor(payable, paymentsRef.current), todayInLaPaz());
    if (!result.ok || !input.receipt || !input.method) return result.ok ? { ok: false, errors: { form: "Faltan datos." } } : result;
    const payment: Payment = {
      id: `pay-${crypto.randomUUID().slice(0, 8)}`,
      ticketId,
      paidOn: input.paidOn,
      amountCents: result.amountCents,
      currency: input.currency,
      rate: result.rate,
      appliedCents: result.appliedCents,
      method: input.method,
      bank: input.bank.trim(),
      account: input.account.trim(),
      responsible: input.responsible.trim(),
      receipt: input.receipt,
      notes: input.notes.trim(),
      recordedBy: currentUser.name,
      recordedAt: new Date().toISOString(),
    };
    paymentsRef.current = [...paymentsRef.current, payment];
    setPayments(paymentsRef.current);
    return { ok: true, payment };
  }, []);

  const value = useMemo(() => ({ payments, rows, registerPayment }), [payments, rows, registerPayment]);
  return <PaymentsContext.Provider value={value}>{children}</PaymentsContext.Provider>;
}

export function usePayments(): PaymentsContextValue {
  const context = useContext(PaymentsContext);
  if (!context) throw new Error("usePayments requiere PaymentsProvider.");
  return context;
}
