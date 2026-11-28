"use client";

import { FileText, Plus, Wallet, X } from "lucide-react";
import { useState } from "react";
import { currentUser } from "@/modules/access";
import { formatBusinessDate } from "@/modules/intake";
import { CURRENCIES, currencySymbol, formatMoney, formatRate, type Currency } from "@/shared/money";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  CellStack,
  Dialog,
  EmptyState,
  Field,
  FileDropzone,
  FormGrid,
  Input,
  Select,
  TBody,
  THead,
  Table,
  Td,
  Th,
  Textarea,
  formLayout,
} from "@/shared/ui";
import { paymentBlocker, previewApplied } from "../domain/payments";
import { PAYMENT_METHODS, type Obligation, type PaymentField, type PaymentInput, type PaymentMethod, type Receipt } from "../domain/types";
import { obligationStatusMeta, paymentMethodLabels } from "./labels";
import { todayInLaPaz, usePayments } from "./payments-store";
import styles from "./purchasing.module.css";

const RECEIPT_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const MAX_RECEIPT_BYTES = 20 * 1024 * 1024;

/** Sección de pagos de una boleta: resumen, historial y registro. Solo aparece en boletas aprobadas. */
export function TicketPayments({ ticketId }: { ticketId: string }) {
  const { rows, payments } = usePayments();
  const [open, setOpen] = useState(false);
  const [registered, setRegistered] = useState(false);
  const row = rows.find((item) => item.ticket.id === ticketId);
  if (!row || !row.payable.approved) return null;

  const { obligation, payable } = row;
  const history = payments.filter((payment) => payment.ticketId === ticketId).sort((a, b) => b.paidOn.localeCompare(a.paidOn) || b.recordedAt.localeCompare(a.recordedAt));
  const blocker = paymentBlocker(payable, obligation);
  const canRegister = currentUser.canRegisterPayments && !blocker;

  return (
    <Card>
      <CardHeader
        title="Pagos"
        description="Pagos totales o parciales, cada uno con su tipo de cambio."
        actions={
          canRegister ? (
            <Button
              size="sm"
              variant="primary"
              leadingIcon={<Plus aria-hidden />}
              onClick={() => {
                setOpen(true);
                setRegistered(false);
              }}
            >
              Registrar pago
            </Button>
          ) : undefined
        }
      />
      <CardBody>
        {registered && (
          <Alert tone="success" title="Pago registrado">
            {obligation?.status === "paid" ? "La boleta quedó cerrada." : "El saldo se actualizó."}
          </Alert>
        )}
        {obligation ? (
          <dl className={styles.summary}>
            <dt>Importe</dt>
            <dd>{formatMoney(obligation.amountCents, obligation.currency)}</dd>
            <dt>Pagado</dt>
            <dd>{formatMoney(obligation.paidCents, obligation.currency)}</dd>
            <dt>Saldo</dt>
            <dd className={styles.strong}>{formatMoney(obligation.balanceCents, obligation.currency)}</dd>
            <dt>Estado</dt>
            <dd>
              <Badge tone={obligationStatusMeta[obligation.status].tone} dot>
                {obligationStatusMeta[obligation.status].label}
              </Badge>
            </dd>
          </dl>
        ) : (
          <Alert tone="warning" title="Sin importe">
            {blocker}
          </Alert>
        )}
      </CardBody>
      {history.length === 0 ? (
        <EmptyState icon={<Wallet aria-hidden />} title="Sin pagos registrados" description="Los pagos de esta boleta aparecerán aquí." />
      ) : (
        <Table>
          <THead>
            <tr>
              <Th>Fecha</Th>
              <Th numeric>Importe</Th>
              <Th numeric>Aplicado</Th>
              <Th>Método</Th>
              <Th>Comprobante</Th>
            </tr>
          </THead>
          <TBody>
            {history.map((payment) => (
              <tr key={payment.id}>
                <Td>
                  <CellStack primary={formatBusinessDate(payment.paidOn)} secondary={payment.responsible} />
                </Td>
                <Td numeric>
                  <CellStack primary={formatMoney(payment.amountCents, payment.currency)} secondary={`T. c. ${formatRate(payment.rate)}`} />
                </Td>
                <Td numeric className={styles.strong}>
                  {formatMoney(payment.appliedCents, payable.currency)}
                </Td>
                <Td>
                  <CellStack primary={paymentMethodLabels[payment.method]} secondary={`${payment.bank} · ${payment.account}`} />
                </Td>
                <Td>
                  <a href={payment.receipt.url} target="_blank" rel="noreferrer" className={styles.receiptLink} title={payment.receipt.name}>
                    <FileText aria-hidden />
                    Ver
                  </a>
                </Td>
              </tr>
            ))}
          </TBody>
        </Table>
      )}
      {open && obligation && (
        <PaymentDialog
          ticketId={ticketId}
          obligation={obligation}
          onClose={() => setOpen(false)}
          onRegistered={() => {
            setOpen(false);
            setRegistered(true);
          }}
        />
      )}
    </Card>
  );
}

function emptyInput(currency: Currency): PaymentInput {
  return {
    paidOn: todayInLaPaz(),
    amount: "",
    currency,
    rate: "",
    method: "",
    bank: "",
    account: "",
    responsible: currentUser.name,
    notes: "",
    receipt: null,
  };
}

async function sha256(file: File): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function PaymentDialog({
  ticketId,
  obligation,
  onClose,
  onRegistered,
}: {
  ticketId: string;
  obligation: Obligation;
  onClose: () => void;
  onRegistered: () => void;
}) {
  const { registerPayment } = usePayments();
  const [input, setInput] = useState<PaymentInput>(() => emptyInput(obligation.currency));
  const [errors, setErrors] = useState<Partial<Record<PaymentField | "form", string>>>({});
  const applied = previewApplied(input, obligation);
  const converts = input.currency !== obligation.currency;

  const patch = (values: Partial<PaymentInput>) => {
    setInput((current) => ({ ...current, ...values }));
    setErrors((current) => {
      const next = { ...current };
      for (const key of Object.keys(values)) delete next[key as PaymentField];
      delete next.form;
      return next;
    });
  };

  const attach = async (files: File[]) => {
    const file = files[0];
    if (!RECEIPT_TYPES.includes(file.type)) return setErrors((current) => ({ ...current, receipt: "Adjunta un PDF o una imagen." }));
    if (file.size > MAX_RECEIPT_BYTES) return setErrors((current) => ({ ...current, receipt: "Supera los 20 MB." }));
    const receipt: Receipt = {
      name: file.name,
      kind: file.type === "application/pdf" ? "pdf" : "image",
      url: URL.createObjectURL(file),
      sha256: await sha256(file),
      sizeBytes: file.size,
    };
    patch({ receipt });
  };

  const submit = () => {
    const result = registerPayment(ticketId, input);
    if (result.ok) onRegistered();
    else setErrors(result.errors);
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title="Registrar pago"
      description={`Saldo pendiente: ${formatMoney(obligation.balanceCents, obligation.currency)}. Todos los campos son obligatorios salvo las observaciones.`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={submit}>
            Registrar pago
          </Button>
        </>
      }
    >
      {errors.form && (
        <Alert tone="danger" title="No se pudo registrar">
          {errors.form}
        </Alert>
      )}
      <FormGrid>
        <Field label="Fecha del pago" htmlFor="pay-date" error={errors.paidOn}>
          <Input id="pay-date" type="date" value={input.paidOn} max={todayInLaPaz()} invalid={Boolean(errors.paidOn)} onChange={(event) => patch({ paidOn: event.target.value })} />
        </Field>
        <Field label="Método" htmlFor="pay-method" error={errors.method}>
          <Select id="pay-method" value={input.method} invalid={Boolean(errors.method)} onChange={(event) => patch({ method: event.target.value as PaymentMethod })}>
            <option value="">Seleccionar…</option>
            {PAYMENT_METHODS.map((method) => (
              <option key={method} value={method}>
                {paymentMethodLabels[method]}
              </option>
            ))}
          </Select>
        </Field>
        <div className={styles.amountRow}>
          <Field label="Importe" htmlFor="pay-amount" error={errors.amount}>
            <Input
              id="pay-amount"
              numeric
              inputMode="decimal"
              autoComplete="off"
              leading={currencySymbol[input.currency]}
              placeholder="0,00"
              value={input.amount}
              invalid={Boolean(errors.amount)}
              onChange={(event) => patch({ amount: event.target.value })}
            />
          </Field>
          <Field label="Moneda" htmlFor="pay-currency">
            <Select id="pay-currency" value={input.currency} onChange={(event) => patch({ currency: event.target.value as Currency })}>
              {CURRENCIES.map((currency) => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Tipo de cambio" htmlFor="pay-rate" error={errors.rate} hint="Bs por dólar vigente en la fecha del pago.">
          <Input
            id="pay-rate"
            numeric
            inputMode="decimal"
            autoComplete="off"
            placeholder="6,96"
            value={input.rate}
            invalid={Boolean(errors.rate)}
            onChange={(event) => patch({ rate: event.target.value })}
          />
        </Field>
        <p className={cxApplied(applied, obligation)} aria-live="polite">
          {applied === null
            ? "Completa importe y tipo de cambio para ver cuánto se aplica a la boleta."
            : `Se aplican ${formatMoney(applied, obligation.currency)} a la boleta${converts ? ", convertidos con este tipo de cambio" : ""}.`}
        </p>
        <Field label="Banco" htmlFor="pay-bank" error={errors.bank}>
          <Input id="pay-bank" value={input.bank} autoComplete="off" invalid={Boolean(errors.bank)} onChange={(event) => patch({ bank: event.target.value })} />
        </Field>
        <Field label="Cuenta bancaria" htmlFor="pay-account" error={errors.account}>
          <Input id="pay-account" value={input.account} autoComplete="off" invalid={Boolean(errors.account)} onChange={(event) => patch({ account: event.target.value })} />
        </Field>
        <Field label="Responsable del pago" htmlFor="pay-responsible" error={errors.responsible} className={formLayout.span2}>
          <Input id="pay-responsible" value={input.responsible} invalid={Boolean(errors.responsible)} onChange={(event) => patch({ responsible: event.target.value })} />
        </Field>
        <Field label="Comprobante" htmlFor="pay-receipt" error={errors.receipt} className={formLayout.span2}>
          {input.receipt ? (
            <div className={styles.receiptChosen} id="pay-receipt">
              <FileText aria-hidden />
              <span>{input.receipt.name}</span>
              <Button size="sm" variant="ghost" iconOnly aria-label="Quitar comprobante" onClick={() => patch({ receipt: null })}>
                <X aria-hidden />
              </Button>
            </div>
          ) : (
            <FileDropzone multiple={false} accept={RECEIPT_TYPES.join(",")} title="Adjuntar comprobante" hint="PDF o imagen, hasta 20 MB." onFiles={attach} />
          )}
        </Field>
        <Field label="Observaciones" htmlFor="pay-notes" optional className={formLayout.span2}>
          <Textarea id="pay-notes" value={input.notes} onChange={(event) => patch({ notes: event.target.value })} />
        </Field>
      </FormGrid>
    </Dialog>
  );
}

function cxApplied(applied: bigint | null, obligation: Obligation): string {
  return applied !== null && applied > obligation.balanceCents ? `${styles.appliedHint} ${styles.appliedOver}` : styles.appliedHint;
}
