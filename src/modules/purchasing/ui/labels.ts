import type { Tone } from "@/shared/ui";
import type { ObligationStatus, PaymentMethod } from "../domain/types";

export const obligationStatusMeta: Record<ObligationStatus, { label: string; tone: Tone }> = {
  pending: { label: "Abierta · sin pagos", tone: "warning" },
  partial: { label: "Abierta · pago parcial", tone: "info" },
  paid: { label: "Cerrada · pagada", tone: "success" },
};

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  transfer: "Transferencia bancaria",
  qr: "QR",
  check: "Cheque",
  deposit: "Depósito bancario",
  other: "Otro",
};
