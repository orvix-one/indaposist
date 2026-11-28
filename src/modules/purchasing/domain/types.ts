// Ruta relativa con extensión: los tests de dominio corren con node --test, que no resuelve el alias @/.
import type { Currency } from "../../../shared/money.ts";

export type { Currency };

export const PAYMENT_METHODS = ["transfer", "qr", "check", "deposit", "other"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export type Receipt = {
  name: string;
  kind: "pdf" | "image";
  url: string;
  sha256: string;
  sizeBytes: number;
  synthetic?: boolean;
};

/** Pago registrado. Importes en centavos; tipo de cambio en Bs por USD con 4 decimales. */
export type Payment = {
  id: string;
  ticketId: string;
  paidOn: string;
  amountCents: bigint;
  currency: Currency;
  rate: bigint;
  /** Importe aplicado a la boleta, en la moneda de la boleta, convertido con `rate`. */
  appliedCents: bigint;
  method: PaymentMethod;
  bank: string;
  account: string;
  responsible: string;
  receipt: Receipt;
  notes: string;
  recordedBy: string;
  recordedAt: string;
};

/** Lo que el formulario envía, tal como lo escribió la persona. */
export type PaymentInput = {
  paidOn: string;
  amount: string;
  currency: Currency;
  rate: string;
  method: PaymentMethod | "";
  bank: string;
  account: string;
  responsible: string;
  notes: string;
  receipt: Receipt | null;
};

export type PaymentField = Exclude<keyof PaymentInput, "notes">;

/** Estado de pago: abierta sin pagos, abierta con pago parcial o cerrada. */
export type ObligationStatus = "pending" | "partial" | "paid";

export type Obligation = {
  ticketId: string;
  currency: Currency;
  amountCents: bigint;
  paidCents: bigint;
  balanceCents: bigint;
  status: ObligationStatus;
};

/** Boleta vista desde compras: solo lo necesario para pagarla. */
export type PayableTicket = {
  id: string;
  approved: boolean;
  currency: Currency;
  amountCents: bigint | null;
};
