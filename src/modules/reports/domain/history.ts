/* Historial de un proveedor para el reporte en PDF (IND-06.01). Recibe datos ya normalizados: no conoce los módulos de origen. */

// Ruta relativa con extensión: los tests de dominio corren con node --test, que no resuelve el alias @/.
import type { Currency } from "../../../shared/money.ts";

export type PaymentState = "pending" | "partial" | "paid";

export type HistoryTicket = {
  id: string;
  /** Fecha y hora de pesaje (AAAA-MM-DDTHH:mm). */
  weighedAt: string;
  campaignId: string;
  unitId: string;
  grossKg: number | null;
  tareKg: number | null;
  netKg: number | null;
  discountKg: number | null;
  liquidKg: number | null;
  /** Descuento en kg por factor de calidad. */
  quality: Record<string, number | null>;
  currency: Currency;
  amountCents: bigint | null;
  paidCents: bigint;
  balanceCents: bigint;
  paymentState: PaymentState | null;
};

export type HistoryFilter = { campaignId: string; from: string; to: string };

export function filterHistory<T extends Pick<HistoryTicket, "weighedAt" | "campaignId">>(tickets: T[], filter: HistoryFilter): T[] {
  return tickets.filter((ticket) => {
    const day = ticket.weighedAt.slice(0, 10);
    if (filter.campaignId && ticket.campaignId !== filter.campaignId) return false;
    if (filter.from && (!day || day < filter.from)) return false;
    if (filter.to && (!day || day > filter.to)) return false;
    return true;
  });
}

const round = (value: number) => Math.round(value * 1000) / 1000;

function add(record: Record<string, number>, key: string, value: number | null) {
  if (value === null) return;
  record[key] = round((record[key] ?? 0) + value);
}

export type HistorySummary = {
  count: number;
  kg: { gross: number; tare: number; net: number; discount: number; liquid: number };
  liquidByUnit: Record<string, number>;
  discountByFactor: Record<string, number>;
  money: Record<Currency, { amount: bigint; paid: bigint; balance: bigint }>;
};

export function summarizeHistory(tickets: HistoryTicket[]): HistorySummary {
  const kg = { gross: 0, tare: 0, net: 0, discount: 0, liquid: 0 };
  const liquidByUnit: Record<string, number> = {};
  const discountByFactor: Record<string, number> = {};
  const money = { BOB: { amount: 0n, paid: 0n, balance: 0n }, USD: { amount: 0n, paid: 0n, balance: 0n } };

  for (const ticket of tickets) {
    kg.gross = round(kg.gross + (ticket.grossKg ?? 0));
    kg.tare = round(kg.tare + (ticket.tareKg ?? 0));
    kg.net = round(kg.net + (ticket.netKg ?? 0));
    kg.discount = round(kg.discount + (ticket.discountKg ?? 0));
    kg.liquid = round(kg.liquid + (ticket.liquidKg ?? 0));
    add(liquidByUnit, ticket.unitId, ticket.liquidKg);
    for (const [factor, value] of Object.entries(ticket.quality)) add(discountByFactor, factor, value);
    if (ticket.amountCents !== null) {
      const total = money[ticket.currency];
      total.amount += ticket.amountCents;
      total.paid += ticket.paidCents;
      total.balance += ticket.balanceCents;
    }
  }
  return { count: tickets.length, kg, liquidByUnit, discountByFactor, money };
}
