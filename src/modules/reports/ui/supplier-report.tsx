"use client";

import { ArrowLeft, Printer, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { businessUnitIdFor, campaignLabel, useCatalogs } from "@/modules/catalogs";
import { QUALITY_KEYS, formatBusinessDate, formatKg, parseDecimal, qualityLabels, useSuppliers, useTickets } from "@/modules/intake";
import { obligationStatusMeta, paymentMethodLabels, usePayments } from "@/modules/purchasing";
import { CURRENCIES, formatMoney, formatRate } from "@/shared/money";
import { Button, Card, EmptyState, Field, Input, Select, buttonClass } from "@/shared/ui";
import { filterHistory, summarizeHistory, type HistoryFilter, type HistoryTicket } from "../domain/history";
import styles from "./reports.module.css";

const issuedFormat = new Intl.DateTimeFormat("es-BO", { dateStyle: "long", timeStyle: "short", timeZone: "America/La_Paz" });

/** Historial del proveedor listo para imprimir o guardar como PDF desde el navegador (IND-06.01). */
export function SupplierReport({ supplierId }: { supplierId: string }) {
  const { suppliers } = useSuppliers();
  const tickets = useTickets();
  const { rows, payments } = usePayments();
  const { campaigns, products, units, issuers, sites } = useCatalogs();
  const [filter, setFilter] = useState<HistoryFilter>({ campaignId: "", from: "", to: "" });
  const [issuedAt] = useState(() => new Date());
  const supplier = suppliers.find((row) => row.id === supplierId);

  // El nombre del PDF que propone el navegador sale del título de la página.
  useEffect(() => {
    if (!supplier) return;
    const previous = document.title;
    document.title = `Historial ${supplier.name} ${issuedAt.toISOString().slice(0, 10)}`;
    return () => {
      document.title = previous;
    };
  }, [supplier, issuedAt]);

  const own = useMemo(() => {
    const approved = rows.filter((row) => row.ticket.fields.supplierId === supplierId && row.ticket.status === "approved");
    return approved
      .map(({ ticket, obligation }) => {
        const history: HistoryTicket = {
          id: ticket.id,
          weighedAt: ticket.fields.weighedAt,
          campaignId: ticket.fields.campaignId,
          unitId: businessUnitIdFor(ticket.fields.issuerId, issuers),
          grossKg: parseDecimal(ticket.fields.grossKg),
          tareKg: parseDecimal(ticket.fields.tareKg),
          netKg: parseDecimal(ticket.fields.netKg),
          discountKg: parseDecimal(ticket.fields.discountKg),
          liquidKg: parseDecimal(ticket.fields.liquidKg),
          quality: Object.fromEntries(QUALITY_KEYS.map((key) => [key, parseDecimal(ticket.fields.quality[key].discountKg)])),
          currency: ticket.fields.currency,
          amountCents: obligation?.amountCents ?? null,
          paidCents: obligation?.paidCents ?? 0n,
          balanceCents: obligation?.balanceCents ?? 0n,
          paymentState: obligation?.status ?? null,
        };
        return { ticket, history };
      })
      .sort((a, b) => a.ticket.fields.weighedAt.localeCompare(b.ticket.fields.weighedAt));
  }, [rows, supplierId, issuers]);

  const included = useMemo(() => {
    const ids = new Set(filterHistory(own.map((item) => item.history), filter).map((item) => item.id));
    return own.filter((item) => ids.has(item.ticket.id));
  }, [own, filter]);

  const summary = useMemo(() => summarizeHistory(included.map((item) => item.history)), [included]);
  const includedIds = new Set(included.map((item) => item.ticket.id));
  const ownPayments = payments.filter((payment) => includedIds.has(payment.ticketId)).sort((a, b) => a.paidOn.localeCompare(b.paidOn));
  const pendingReview = tickets.filter((ticket) => ticket.fields.supplierId === supplierId && ticket.status === "in_review").length;
  const codeOf = (ticketId: string) => tickets.find((ticket) => ticket.id === ticketId)?.code ?? ticketId;
  const currencyOf = (ticketId: string) => own.find((item) => item.ticket.id === ticketId)?.history.currency ?? "BOB";
  const unitName = (id: string) => units.find((unit) => unit.id === id)?.name ?? "Sin unidad";
  const campaign = campaigns.find((row) => row.id === filter.campaignId);
  const period = [campaign ? campaignLabel(campaign, products) : "Todas las campañas", filter.from || filter.to ? `pesaje ${filter.from ? `desde ${formatBusinessDate(filter.from)}` : ""} ${filter.to ? `hasta ${formatBusinessDate(filter.to)}` : ""}`.trim() : ""]
    .filter(Boolean)
    .join(" · ");
  const currencies = CURRENCIES.filter((currency) => summary.money[currency].amount > 0n);

  if (!supplier) {
    return (
      <Card>
        <EmptyState
          icon={<Users aria-hidden />}
          title="Proveedor no encontrado"
          actions={
            <Link href="/proveedores" className={buttonClass({ size: "sm" })}>
              Volver a proveedores
            </Link>
          }
        />
      </Card>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.controls}>
        <Link href={`/proveedores/${supplier.id}`} className={buttonClass({ variant: "ghost", size: "sm" })}>
          <ArrowLeft aria-hidden />
          Volver a la ficha
        </Link>
        <div className={styles.filters}>
          <Field label="Campaña" htmlFor="report-campaign">
            <Select id="report-campaign" controlSize="sm" value={filter.campaignId} onChange={(event) => setFilter((current) => ({ ...current, campaignId: event.target.value }))}>
              <option value="">Todas las campañas</option>
              {campaigns.map((row) => (
                <option key={row.id} value={row.id}>
                  {campaignLabel(row, products)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Pesaje desde" htmlFor="report-from">
            <Input id="report-from" type="date" controlSize="sm" value={filter.from} max={filter.to || undefined} onChange={(event) => setFilter((current) => ({ ...current, from: event.target.value }))} />
          </Field>
          <Field label="Hasta" htmlFor="report-to">
            <Input id="report-to" type="date" controlSize="sm" value={filter.to} min={filter.from || undefined} onChange={(event) => setFilter((current) => ({ ...current, to: event.target.value }))} />
          </Field>
        </div>
        <Button variant="primary" leadingIcon={<Printer aria-hidden />} onClick={() => window.print()}>
          Descargar PDF
        </Button>
      </div>
      <p className={styles.hint}>En el diálogo del navegador elige «Guardar como PDF» como destino.</p>

      <article className={styles.sheet} aria-label={`Historial de ${supplier.name}`}>
        <header className={styles.sheetHeader}>
          <div>
            <p className={styles.brand}>INDAPO</p>
            <h1 className={styles.title}>Historial de boletas y pagos</h1>
            <p className={styles.period}>{period}</p>
          </div>
          <p className={styles.issued}>Emitido el {issuedFormat.format(issuedAt)}</p>
        </header>

        <dl className={styles.supplier}>
          <div>
            <dt>Proveedor</dt>
            <dd>{supplier.name}</dd>
          </div>
          <div>
            <dt>NIT / CI</dt>
            <dd>{supplier.taxId}</dd>
          </div>
          <div>
            <dt>RUA</dt>
            <dd>{supplier.rua || "No registrado"}</dd>
          </div>
          <div>
            <dt>Procedencia</dt>
            <dd>{supplier.origin || "—"}</dd>
          </div>
        </dl>

        {included.length === 0 ? (
          <p className={styles.empty}>No hay boletas aprobadas para este proveedor en el período elegido.</p>
        ) : (
          <>
            <section className={styles.section}>
              <h2>Resumen</h2>
              <div className={styles.summaryGrid}>
                <dl className={styles.figures}>
                  <div>
                    <dt>Boletas</dt>
                    <dd>{summary.count}</dd>
                  </div>
                  <div>
                    <dt>Peso neto</dt>
                    <dd>{formatKg(summary.kg.net)} kg</dd>
                  </div>
                  <div>
                    <dt>Descuentos</dt>
                    <dd>{formatKg(summary.kg.discount)} kg</dd>
                  </div>
                  <div>
                    <dt>Peso líquido</dt>
                    <dd>{formatKg(summary.kg.liquid)} kg</dd>
                  </div>
                </dl>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Moneda</th>
                      <th className={styles.num}>Importe</th>
                      <th className={styles.num}>Pagado</th>
                      <th className={styles.num}>Saldo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currencies.map((currency) => (
                      <tr key={currency}>
                        <td>{currency === "BOB" ? "Bolivianos" : "Dólares"}</td>
                        <td className={styles.num}>{formatMoney(summary.money[currency].amount, currency)}</td>
                        <td className={styles.num}>{formatMoney(summary.money[currency].paid, currency)}</td>
                        <td className={`${styles.num} ${styles.strong}`}>{formatMoney(summary.money[currency].balance, currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className={styles.summaryGrid}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Unidad de negocio</th>
                      <th className={styles.num}>Líquido (kg)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(summary.liquidByUnit).map(([unitId, kg]) => (
                      <tr key={unitId}>
                        <td>{unitName(unitId)}</td>
                        <td className={styles.num}>{formatKg(kg)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Descuento por calidad</th>
                      <th className={styles.num}>kg</th>
                    </tr>
                  </thead>
                  <tbody>
                    {QUALITY_KEYS.filter((key) => summary.discountByFactor[key]).map((key) => (
                      <tr key={key}>
                        <td>{qualityLabels[key]}</td>
                        <td className={styles.num}>{formatKg(summary.discountByFactor[key])}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className={styles.section}>
              <h2>Boletas</h2>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Boleta</th>
                    <th>Pesaje</th>
                    <th>Unidad · acopio</th>
                    <th className={styles.num}>Neto (kg)</th>
                    <th className={styles.num}>Desc. (kg)</th>
                    <th className={styles.num}>Líquido (kg)</th>
                    <th className={styles.num}>Importe</th>
                    <th className={styles.num}>Pagado</th>
                    <th className={styles.num}>Saldo</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {included.map(({ ticket, history }) => (
                    <tr key={ticket.id}>
                      <td className={styles.nowrap}>
                        {ticket.code}
                        <span className={styles.sub}>Tiquete {ticket.fields.scaleTicket || "—"}</span>
                      </td>
                      <td className={styles.nowrap}>{formatBusinessDate(ticket.fields.weighedAt)}</td>
                      <td>
                        {unitName(history.unitId)}
                        <span className={styles.sub}>{sites.find((site) => site.id === ticket.fields.siteId)?.name ?? "—"}</span>
                      </td>
                      <td className={styles.num}>{formatKg(history.netKg)}</td>
                      <td className={styles.num}>{formatKg(history.discountKg)}</td>
                      <td className={styles.num}>{formatKg(history.liquidKg)}</td>
                      <td className={styles.num}>{history.amountCents === null ? "—" : formatMoney(history.amountCents, history.currency)}</td>
                      <td className={styles.num}>{formatMoney(history.paidCents, history.currency)}</td>
                      <td className={`${styles.num} ${styles.strong}`}>{formatMoney(history.balanceCents, history.currency)}</td>
                      <td className={styles.nowrap}>{history.paymentState ? obligationStatusMeta[history.paymentState].label : "Sin importe"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section className={styles.section}>
              <h2>Pagos</h2>
              {ownPayments.length === 0 ? (
                <p className={styles.empty}>Sin pagos registrados en el período.</p>
              ) : (
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Boleta</th>
                      <th>Método</th>
                      <th className={styles.num}>Importe</th>
                      <th className={styles.num}>T. de cambio</th>
                      <th className={styles.num}>Aplicado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ownPayments.map((payment) => (
                      <tr key={payment.id}>
                        <td>{formatBusinessDate(payment.paidOn)}</td>
                        <td>{codeOf(payment.ticketId)}</td>
                        <td>
                          {paymentMethodLabels[payment.method]}
                          <span className={styles.sub}>{payment.bank}</span>
                        </td>
                        <td className={styles.num}>{formatMoney(payment.amountCents, payment.currency)}</td>
                        <td className={styles.num}>{formatRate(payment.rate)}</td>
                        <td className={styles.num}>{formatMoney(payment.appliedCents, currencyOf(payment.ticketId))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          </>
        )}

        <footer className={styles.footer}>
          Incluye solo boletas aprobadas.
          {pendingReview > 0 && ` ${pendingReview === 1 ? "Hay 1 boleta" : `Hay ${pendingReview} boletas`} en revisión que todavía no figura${pendingReview === 1 ? "" : "n"}.`}{" "}
          Saldos al {issuedFormat.format(issuedAt)}
        </footer>
      </article>
    </div>
  );
}
