"use client";

import { FileText, Receipt, Wallet } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { businessUnitIdFor, useCatalogs } from "@/modules/catalogs";
import { formatBusinessDate, ticketStatusMeta, useTickets } from "@/modules/intake";
import { formatMoney, formatRate } from "@/shared/money";
import {
  Badge,
  Card,
  CardHeader,
  CellStack,
  EmptyState,
  Mono,
  Stat,
  StatGrid,
  TBody,
  THead,
  Table,
  Td,
  Th,
  Tr,
} from "@/shared/ui";
import { supplierAccount } from "../domain/payments";
import { obligationStatusMeta, paymentMethodLabels } from "./labels";
import { usePayments } from "./payments-store";
import styles from "./purchasing.module.css";

/** Cuenta del proveedor en su ficha: saldo por moneda, sus boletas y sus pagos. */
export function SupplierAccountPanel({ supplierId }: { supplierId: string }) {
  const router = useRouter();
  const tickets = useTickets();
  const { rows, payments } = usePayments();
  const { issuers, units } = useCatalogs();

  const account = useMemo(() => supplierAccount(supplierId, rows.map((row) => row.payable), payments), [supplierId, rows, payments]);
  const own = useMemo(
    () => rows.filter((row) => row.ticket.fields.supplierId === supplierId).sort((a, b) => b.ticket.fields.weighedAt.localeCompare(a.ticket.fields.weighedAt)),
    [rows, supplierId],
  );
  const codeOf = (ticketId: string) => tickets.find((ticket) => ticket.id === ticketId)?.code ?? ticketId;
  const currencyOf = (ticketId: string) => rows.find((row) => row.ticket.id === ticketId)?.payable.currency ?? "BOB";

  return (
    <div className={styles.stack}>
      <StatGrid>
        <Stat label="Saldo en bolivianos" value={formatMoney(account.totals.BOB.balance, "BOB")} meta={`Pagado ${formatMoney(account.totals.BOB.paid, "BOB")}`} />
        <Stat label="Saldo en dólares" value={formatMoney(account.totals.USD.balance, "USD")} meta={`Pagado ${formatMoney(account.totals.USD.paid, "USD")}`} />
        <Stat label="Boletas abiertas" value={account.openCount} meta={`${account.paidCount} cerradas · ${own.length} en total`} />
      </StatGrid>

      <Card>
        <CardHeader title="Boletas" description="Todas las boletas del proveedor, de la más reciente a la más antigua." />
        {own.length === 0 ? (
          <EmptyState icon={<Receipt aria-hidden />} title="Sin boletas" description="Las boletas asignadas a este proveedor aparecerán aquí." />
        ) : (
          <Table>
            <THead>
              <tr>
                <Th>N° boleta</Th>
                <Th>Pesaje</Th>
                <Th>Unidad</Th>
                <Th numeric>Líquido (kg)</Th>
                <Th>Boleta</Th>
                <Th numeric>Importe</Th>
                <Th numeric>Saldo</Th>
                <Th>Pago</Th>
              </tr>
            </THead>
            <TBody>
              {own.map(({ ticket, obligation }) => {
                const href = `/boletas/${ticket.id}`;
                const unit = units.find((item) => item.id === businessUnitIdFor(ticket.fields.issuerId, issuers));
                return (
                  <Tr key={ticket.id} className={styles.clickableRow} onClick={() => router.push(href)}>
                    <Td>
                      <CellStack
                        primary={
                          <Link href={href} className={styles.rowLink} onClick={(event) => event.stopPropagation()}>
                            <Mono>{ticket.code}</Mono>
                          </Link>
                        }
                        secondary={ticket.fields.scaleTicket ? `Tiquete ${ticket.fields.scaleTicket}` : "Sin tiquete"}
                      />
                    </Td>
                    <Td muted>{formatBusinessDate(ticket.fields.weighedAt)}</Td>
                    <Td muted>{unit?.name ?? "—"}</Td>
                    <Td numeric>{ticket.fields.liquidKg || "—"}</Td>
                    <Td>
                      <Badge tone={ticketStatusMeta[ticket.status].tone} dot>
                        {ticketStatusMeta[ticket.status].label}
                      </Badge>
                    </Td>
                    <Td numeric>{obligation ? formatMoney(obligation.amountCents, obligation.currency) : "—"}</Td>
                    <Td numeric className={obligation ? styles.strong : undefined}>
                      {obligation && ticket.status === "approved" ? formatMoney(obligation.balanceCents, obligation.currency) : "—"}
                    </Td>
                    <Td>
                      {obligation && ticket.status === "approved" ? (
                        <Badge tone={obligationStatusMeta[obligation.status].tone} dot>
                          {obligationStatusMeta[obligation.status].label}
                        </Badge>
                      ) : (
                        <span className={styles.muted}>Sin aprobar</span>
                      )}
                    </Td>
                  </Tr>
                );
              })}
            </TBody>
          </Table>
        )}
      </Card>

      <Card>
        <CardHeader title="Pagos" description="Pagos registrados a este proveedor, del más reciente al más antiguo." />
        {account.payments.length === 0 ? (
          <EmptyState icon={<Wallet aria-hidden />} title="Sin pagos" description="Los pagos se registran desde cada boleta aprobada." />
        ) : (
          <Table>
            <THead>
              <tr>
                <Th>Fecha</Th>
                <Th>Boleta</Th>
                <Th numeric>Importe</Th>
                <Th numeric>Aplicado</Th>
                <Th>Método</Th>
                <Th>Comprobante</Th>
              </tr>
            </THead>
            <TBody>
              {account.payments.map((payment) => (
                <tr key={payment.id}>
                  <Td>
                    <CellStack primary={formatBusinessDate(payment.paidOn)} secondary={payment.responsible} />
                  </Td>
                  <Td>
                    <Link href={`/boletas/${payment.ticketId}`} className={styles.rowLink}>
                      <Mono>{codeOf(payment.ticketId)}</Mono>
                    </Link>
                  </Td>
                  <Td numeric>
                    <CellStack primary={formatMoney(payment.amountCents, payment.currency)} secondary={`T. c. ${formatRate(payment.rate)}`} />
                  </Td>
                  <Td numeric className={styles.strong}>
                    {formatMoney(payment.appliedCents, currencyOf(payment.ticketId))}
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
      </Card>
    </div>
  );
}
