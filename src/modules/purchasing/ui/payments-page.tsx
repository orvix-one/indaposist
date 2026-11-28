"use client";

import { Wallet } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useCatalogs } from "@/modules/catalogs";
import { formatBusinessDate, useSuppliers } from "@/modules/intake";
import { formatMoney } from "@/shared/money";
import {
  Badge,
  Button,
  Card,
  CellStack,
  EmptyState,
  Mono,
  PageHeader,
  Pagination,
  SearchInput,
  SegmentedControl,
  Select,
  Stat,
  StatGrid,
  TBody,
  THead,
  Table,
  Td,
  Th,
  Toolbar,
  ToolbarGroup,
  ToolbarSpacer,
  Tr,
} from "@/shared/ui";
import { totalsByCurrency } from "../domain/payments";
import type { Obligation } from "../domain/types";
import { obligationStatusMeta } from "./labels";
import { usePayments, type PayableRow } from "./payments-store";
import styles from "./purchasing.module.css";

const PAGE_SIZE = 10;

type StateFilter = "open" | "closed" | "all";

type Row = PayableRow & { obligation: Obligation };

export function PaymentsPage() {
  const router = useRouter();
  const { rows, payments } = usePayments();
  const { suppliers } = useSuppliers();
  const { issuers } = useCatalogs();
  const [state, setState] = useState<StateFilter>("open");
  const [supplierId, setSupplierId] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);

  const payable = useMemo(
    () => rows.filter((row): row is Row => row.payable.approved && row.obligation !== null),
    [rows],
  );

  const lastPaidOn = useMemo(() => {
    const result = new Map<string, string>();
    for (const payment of payments) if ((result.get(payment.ticketId) ?? "") < payment.paidOn) result.set(payment.ticketId, payment.paidOn);
    return result;
  }, [payments]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return payable
      .filter((row) => {
        if (state === "open" && row.obligation.status === "paid") return false;
        if (state === "closed" && row.obligation.status !== "paid") return false;
        if (supplierId && row.ticket.fields.supplierId !== supplierId) return false;
        if (!needle) return true;
        return [row.ticket.code, row.ticket.fields.scaleTicket].some((value) => value.toLowerCase().includes(needle));
      })
      .sort((a, b) => a.ticket.fields.officeArrivalDate.localeCompare(b.ticket.fields.officeArrivalDate));
  }, [payable, state, supplierId, query]);

  const totals = useMemo(() => totalsByCurrency(filtered.map((row) => row.obligation)), [filtered]);
  const openCount = payable.filter((row) => row.obligation.status !== "paid").length;
  const filtersActive = Boolean(supplierId || query);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const visible = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
  const supplierOptions = suppliers.filter((supplier) => payable.some((row) => row.ticket.fields.supplierId === supplier.id));

  const reset = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value);
    setPage(0);
  };

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Compras" }, { label: "Pagos" }]}
        title="Pagos"
        description="Boletas aprobadas con su importe, lo pagado y el saldo. Los pagos se registran desde cada boleta."
      />

      <div className={styles.totals}>
        <StatGrid>
          <Stat label="Saldo en bolivianos" value={formatMoney(totals.BOB.balance, "BOB")} meta={`Pagado ${formatMoney(totals.BOB.paid, "BOB")}`} />
          <Stat label="Saldo en dólares" value={formatMoney(totals.USD.balance, "USD")} meta={`Pagado ${formatMoney(totals.USD.paid, "USD")}`} />
          <Stat label="Boletas abiertas" value={openCount} meta={`De ${payable.length} aprobadas con importe`} />
        </StatGrid>
      </div>

      <Card>
        <Toolbar bordered label="Filtros">
          <ToolbarGroup>
            <SearchInput controlSize="sm" placeholder="N° de boleta o tiquete" aria-label="Buscar boletas" value={query} onChange={(event) => reset(setQuery)(event.target.value)} />
            <Select controlSize="sm" aria-label="Proveedor" value={supplierId} onChange={(event) => reset(setSupplierId)(event.target.value)} className={styles.filterSelect}>
              <option value="">Todos los proveedores</option>
              {supplierOptions.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </Select>
          </ToolbarGroup>
          <ToolbarSpacer />
          <ToolbarGroup>
            <SegmentedControl
              name="payment-state"
              label="Estado de pago"
              value={state}
              onValueChange={(value) => reset(setState)(value as StateFilter)}
              options={[
                { value: "open", label: "Abiertas" },
                { value: "closed", label: "Cerradas" },
                { value: "all", label: "Todas" },
              ]}
            />
          </ToolbarGroup>
        </Toolbar>

        {visible.length === 0 ? (
          <EmptyState
            icon={<Wallet aria-hidden />}
            title={filtersActive ? "Sin resultados" : "No hay boletas en este estado"}
            description={filtersActive ? "Prueba con otros filtros." : "Las boletas aprobadas aparecerán aquí con su saldo."}
            actions={
              filtersActive ? (
                <Button
                  size="sm"
                  onClick={() => {
                    setQuery("");
                    setSupplierId("");
                    setPage(0);
                  }}
                >
                  Limpiar filtros
                </Button>
              ) : undefined
            }
          />
        ) : (
          <Table>
            <THead>
              <tr>
                <Th>N° boleta</Th>
                <Th>Proveedor</Th>
                <Th>Emisor</Th>
                <Th>Llegada oficina</Th>
                <Th numeric>Importe</Th>
                <Th numeric>Pagado</Th>
                <Th numeric>Saldo</Th>
                <Th>Último pago</Th>
                <Th>Estado</Th>
              </tr>
            </THead>
            <TBody>
              {visible.map(({ ticket, obligation }) => {
                const supplier = suppliers.find((row) => row.id === ticket.fields.supplierId);
                const href = `/boletas/${ticket.id}`;
                const last = lastPaidOn.get(ticket.id);
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
                    <Td>{supplier ? <CellStack primary={supplier.name} secondary={supplier.taxId} /> : <span className={styles.muted}>Sin proveedor</span>}</Td>
                    <Td muted>{issuers.find((issuer) => issuer.id === ticket.fields.issuerId)?.name ?? "—"}</Td>
                    <Td muted>{formatBusinessDate(ticket.fields.officeArrivalDate)}</Td>
                    <Td numeric>{formatMoney(obligation.amountCents, obligation.currency)}</Td>
                    <Td numeric>{formatMoney(obligation.paidCents, obligation.currency)}</Td>
                    <Td numeric className={styles.strong}>
                      {formatMoney(obligation.balanceCents, obligation.currency)}
                    </Td>
                    <Td muted>{last ? formatBusinessDate(last) : "—"}</Td>
                    <Td>
                      <Badge tone={obligationStatusMeta[obligation.status].tone} dot>
                        {obligationStatusMeta[obligation.status].label}
                      </Badge>
                    </Td>
                  </Tr>
                );
              })}
            </TBody>
          </Table>
        )}

        <Pagination
          from={currentPage * PAGE_SIZE + 1}
          to={Math.min((currentPage + 1) * PAGE_SIZE, filtered.length)}
          total={filtered.length}
          onPrevious={currentPage > 0 ? () => setPage(currentPage - 1) : undefined}
          onNext={currentPage < pageCount - 1 ? () => setPage(currentPage + 1) : undefined}
        />
      </Card>
    </>
  );
}
