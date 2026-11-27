"use client";

import { Inbox, Upload } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  Badge,
  Button,
  Card,
  CellStack,
  EmptyState,
  Input,
  Mono,
  PageHeader,
  Pagination,
  SearchInput,
  SegmentedControl,
  Select,
  TBody,
  THead,
  Table,
  Tabs,
  Td,
  Th,
  Toolbar,
  ToolbarGroup,
  ToolbarSpacer,
  Tr,
  buttonClass,
} from "@/shared/ui";
import { parseDecimal, pendingVerification } from "../domain/rules";
import type { TicketStatus } from "../domain/types";
import { campaigns, catalogName, sites, supplierById } from "../mock/catalogs";
import { useIntake } from "./intake-store";
import { formatBusinessDate, formatKg, ticketStatusMeta } from "./labels";
import styles from "./intake.module.css";

const PAGE_SIZE = 10;
const ROUTE = "/boletas";

const STATUS_TABS: Array<{ status?: TicketStatus; label: string }> = [
  { label: "Todas" },
  { status: "draft", label: "Borradores" },
  { status: "in_review", label: "En revisión" },
  { status: "observed", label: "Observadas" },
  { status: "approved", label: "Aprobadas" },
  { status: "rejected", label: "Rechazadas" },
];

export function TicketsList({ status }: { status?: TicketStatus }) {
  const router = useRouter();
  const { tickets } = useIntake();
  const [query, setQuery] = useState("");
  const [siteId, setSiteId] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [dateField, setDateField] = useState<"truck" | "office">("truck");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return tickets.filter((ticket) => {
      if (status && ticket.status !== status) return false;
      if (siteId && ticket.fields.siteId !== siteId) return false;
      if (campaignId && ticket.fields.campaignId !== campaignId) return false;
      const date = (dateField === "truck" ? ticket.fields.weighedAt : ticket.fields.officeArrivalDate).slice(0, 10);
      if (from && (!date || date < from)) return false;
      if (to && (!date || date > to)) return false;
      if (!needle) return true;
      const supplier = supplierById(ticket.fields.supplierId);
      return [ticket.code, ticket.fields.scaleTicket, supplier?.name, supplier?.taxId, ticket.fields.plate]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(needle));
    });
  }, [tickets, status, query, siteId, campaignId, dateField, from, to]);

  const filtersActive = Boolean(query || siteId || campaignId || from || to);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const visible = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

  const resetPage = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value);
    setPage(0);
  };

  const clearFilters = () => {
    setQuery("");
    setSiteId("");
    setCampaignId("");
    setFrom("");
    setTo("");
    setPage(0);
  };

  const counts = useMemo(() => {
    const result: Partial<Record<TicketStatus | "all", number>> = { all: tickets.length };
    for (const ticket of tickets) result[ticket.status] = (result[ticket.status] ?? 0) + 1;
    return result;
  }, [tickets]);

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Recepción" }, { label: "Boletas" }]}
        title="Boletas"
        description="Registro, revisión y consulta de boletas de balanza."
        actions={
          <Link href={`${ROUTE}/cargar`} className={buttonClass({ variant: "primary" })}>
            <Upload aria-hidden />
            Cargar escaneos
          </Link>
        }
      >
        <Tabs
          label="Estado de la boleta"
          current={status ? `${ROUTE}?estado=${status}` : ROUTE}
          items={STATUS_TABS.map((tab) => ({
            href: tab.status ? `${ROUTE}?estado=${tab.status}` : ROUTE,
            label: tab.label,
            count: counts[tab.status ?? "all"] ?? 0,
          }))}
        />
      </PageHeader>

      <Card>
        <Toolbar bordered label="Filtros">
          <ToolbarGroup>
            <SearchInput
              controlSize="sm"
              placeholder="N°, tiquete, proveedor o placa"
              aria-label="Buscar boletas"
              value={query}
              onChange={(event) => resetPage(setQuery)(event.target.value)}
            />
            <Select controlSize="sm" aria-label="Acopio" value={siteId} onChange={(event) => resetPage(setSiteId)(event.target.value)} className={styles.filterSelect}>
              <option value="">Todos los acopios</option>
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name}
                </option>
              ))}
            </Select>
            <Select controlSize="sm" aria-label="Campaña" value={campaignId} onChange={(event) => resetPage(setCampaignId)(event.target.value)} className={styles.filterSelect}>
              <option value="">Todas las campañas</option>
              {campaigns.map((campaign) => (
                <option key={campaign.id} value={campaign.id}>
                  {campaign.name}
                </option>
              ))}
            </Select>
          </ToolbarGroup>
          <ToolbarSpacer />
          <ToolbarGroup>
            <SegmentedControl
              name="date-field"
              label="Fecha a filtrar"
              value={dateField}
              onValueChange={(value) => resetPage(setDateField)(value as "truck" | "office")}
              options={[
                { value: "truck", label: "Camión" },
                { value: "office", label: "Oficina" },
              ]}
            />
            <Input type="date" controlSize="sm" aria-label="Desde" value={from} max={to || undefined} onChange={(event) => resetPage(setFrom)(event.target.value)} className={styles.dateInput} />
            <span className={styles.dateSeparator}>–</span>
            <Input type="date" controlSize="sm" aria-label="Hasta" value={to} min={from || undefined} onChange={(event) => resetPage(setTo)(event.target.value)} className={styles.dateInput} />
            {filtersActive && (
              <Button size="sm" variant="ghost" onClick={clearFilters}>
                Limpiar
              </Button>
            )}
          </ToolbarGroup>
        </Toolbar>

        {visible.length === 0 ? (
          <EmptyState
            icon={<Inbox aria-hidden />}
            title={filtersActive ? "Sin resultados" : "No hay boletas en este estado"}
            description={filtersActive ? "Prueba con otros filtros o limpia la búsqueda." : "Las boletas aparecerán aquí al cargar sus escaneos."}
            actions={
              filtersActive ? (
                <Button size="sm" onClick={clearFilters}>
                  Limpiar filtros
                </Button>
              ) : (
                <Link href={`${ROUTE}/cargar`} className={buttonClass({ size: "sm" })}>
                  Cargar escaneos
                </Link>
              )
            }
          />
        ) : (
          <Table>
            <THead>
              <tr>
                <Th>N° boleta</Th>
                <Th>Proveedor</Th>
                <Th>Acopio</Th>
                <Th>Pesaje</Th>
                <Th>Llegada oficina</Th>
                <Th numeric>Líquido (kg)</Th>
                <Th>Documento</Th>
                <Th>Estado</Th>
              </tr>
            </THead>
            <TBody>
              {visible.map((ticket) => {
                const supplier = supplierById(ticket.fields.supplierId);
                const pending = ticket.status === "draft" ? pendingVerification(ticket, ticket.fields, ticket.verified).length : 0;
                const href = `${ROUTE}/${ticket.id}`;
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
                    <Td>
                      {supplier ? (
                        <CellStack primary={supplier.name} secondary={supplier.taxId} />
                      ) : (
                        <span className={styles.muted}>Sin proveedor</span>
                      )}
                    </Td>
                    <Td muted>{catalogName(sites, ticket.fields.siteId) || "—"}</Td>
                    <Td muted>{formatBusinessDate(ticket.fields.weighedAt)}</Td>
                    <Td muted>{formatBusinessDate(ticket.fields.officeArrivalDate)}</Td>
                    <Td numeric>{formatKg(parseDecimal(ticket.fields.liquidKg))}</Td>
                    <Td>
                      {ticket.fields.documentType === "photocopy" ? (
                        <Badge tone="warning" square>
                          Fotocopia
                        </Badge>
                      ) : ticket.fields.documentType === "original" ? (
                        <Badge square>Original</Badge>
                      ) : (
                        <span className={styles.muted}>—</span>
                      )}
                    </Td>
                    <Td>
                      <span className={styles.statusCell}>
                        <Badge tone={ticketStatusMeta[ticket.status].tone} dot>
                          {ticketStatusMeta[ticket.status].label}
                        </Badge>
                        {pending > 0 && <Badge tone="warning">{pending} por verificar</Badge>}
                        {ticket.status === "draft" && ticket.ocr === "manual" && <Badge>Manual</Badge>}
                      </span>
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
