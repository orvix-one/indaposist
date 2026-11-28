"use client";

import { ArrowRight, FilePen, Package, ScanSearch, Send, Upload } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { Card, CardBody, CardHeader, Mono, PageHeader, Stat, StatGrid, buttonClass } from "@/shared/ui";
import { parseDecimal, pendingVerification } from "../domain/rules";
import { currentUser } from "@/modules/access";
import { useIntake } from "./intake-store";
import { formatInstant, formatKg, historyLabels } from "./labels";
import styles from "./intake.module.css";

export function IntakeOverview() {
  const { tickets } = useIntake();

  const stats = useMemo(() => {
    const drafts = tickets.filter((ticket) => ticket.status === "draft");
    const inReview = tickets.filter((ticket) => ticket.status === "in_review");
    const pending = drafts.reduce((sum, ticket) => sum + pendingVerification(ticket, ticket.fields, ticket.verified).length, 0);
    const approvedKg = tickets
      .filter((ticket) => ticket.status === "approved")
      .reduce((sum, ticket) => sum + (parseDecimal(ticket.fields.liquidKg) ?? 0), 0);
    const activity = tickets
      .flatMap((ticket) => ticket.history.map((entry) => ({ entry, ticket })))
      .sort((a, b) => b.entry.at.localeCompare(a.entry.at))
      .slice(0, 6);
    return { drafts: drafts.length, inReview: inReview.length, pending, approvedKg, activity };
  }, [tickets]);

  return (
    <>
      <PageHeader title={`Hola, ${currentUser.name.split(" ")[0]}`} description="Resumen de la recepción de boletas de la campaña en curso." />

      <div className={styles.overview}>
        <StatGrid>
          <Stat label="Borradores" icon={<FilePen aria-hidden />} value={stats.drafts} meta="Por completar y enviar" />
          <Stat label="Campos por verificar" icon={<ScanSearch aria-hidden />} value={stats.pending} meta="Sugerencias con baja confianza" />
          <Stat label="En revisión" icon={<Send aria-hidden />} value={stats.inReview} meta="Esperando a Administración" />
          <Stat label="Líquido aprobado" icon={<Package aria-hidden />} value={formatKg(stats.approvedKg)} unit="kg" meta="Boletas aprobadas" />
        </StatGrid>

        <div className={styles.overviewGrid}>
          <Card>
            <CardHeader title="Recepción de boletas" description="Del escaneo a la revisión." />
            <CardBody className={styles.quickActions}>
              <Link href="/boletas/cargar" className={styles.quickAction}>
                <span className={styles.quickIcon}>
                  <Upload aria-hidden />
                </span>
                <span className={styles.quickText}>
                  <strong>Cargar escaneos</strong>
                  <span>Subir PDF o imágenes y procesarlos</span>
                </span>
                <ArrowRight aria-hidden className={styles.quickArrow} />
              </Link>
              <Link href="/boletas?estado=draft" className={styles.quickAction}>
                <span className={styles.quickIcon}>
                  <FilePen aria-hidden />
                </span>
                <span className={styles.quickText}>
                  <strong>Completar borradores</strong>
                  <span>{stats.drafts} boletas esperan revisión de datos</span>
                </span>
                <ArrowRight aria-hidden className={styles.quickArrow} />
              </Link>
              <Link href="/boletas" className={styles.quickAction}>
                <span className={styles.quickIcon}>
                  <ScanSearch aria-hidden />
                </span>
                <span className={styles.quickText}>
                  <strong>Consultar boletas</strong>
                  <span>Filtrar por estado, acopio, campaña y fechas</span>
                </span>
                <ArrowRight aria-hidden className={styles.quickArrow} />
              </Link>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Actividad reciente"
              actions={
                <Link href="/boletas" className={buttonClass({ size: "sm", variant: "ghost" })}>
                  Ver todo
                </Link>
              }
            />
            <ul className={styles.activity}>
              {stats.activity.map(({ entry, ticket }) => (
                <li key={entry.id}>
                  <Link href={`/boletas/${ticket.id}`} className={styles.activityItem}>
                    <span className={styles.activityText}>
                      <strong>{entry.actor}</strong> · {historyLabels[entry.action].toLowerCase()}
                    </span>
                    <span className={styles.activityMeta}>
                      <Mono>{ticket.code}</Mono> · {formatInstant(entry.at)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}
