"use client";

import { FileImage, FileText, Merge, RotateCw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardHeader,
  CellStack,
  EmptyState,
  FileDropzone,
  PageHeader,
  SegmentedControl,
  Spinner,
  TBody,
  THead,
  Table,
  Td,
  Th,
  Tr,
  buttonClass,
} from "@/shared/ui";
import { canMergeWithPrevious, pagesLabel } from "../domain/pages";
import type { DocumentStatus, IntakeDocument, TicketFormat } from "../domain/types";
import { ACCEPTED_TYPES, useIntake, type RejectedFile } from "./intake-store";
import { documentStatusMeta, formatBytes, formatInstant } from "./labels";
import styles from "./intake.module.css";

type Filter = "all" | "active" | "suggested" | "failed" | "reviewed";

const FILTERS: Record<Filter, (status: DocumentStatus) => boolean> = {
  all: () => true,
  active: (status) => status === "uploaded" || status === "processing",
  suggested: (status) => status === "suggested",
  failed: (status) => status === "failed" || status === "duplicate",
  reviewed: (status) => status === "reviewed",
};

export function UploadInbox() {
  const router = useRouter();
  const { documents, tickets, uploadFiles, retryDocument, startManualEntry, discardDocument, mergeWithPrevious } = useIntake();
  const [mergeError, setMergeError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [rejected, setRejected] = useState<RejectedFile[]>([]);

  const counts = useMemo(
    () =>
      Object.fromEntries(
        (Object.keys(FILTERS) as Filter[]).map((key) => [key, documents.filter((doc) => FILTERS[key](doc.status)).length]),
      ) as Record<Filter, number>,
    [documents],
  );

  const groups = useMemo(() => groupByFile(documents.filter((doc) => FILTERS[filter](doc.status)), documents), [documents, filter]);
  const codeOf = (ticketId?: string) => tickets.find((ticket) => ticket.id === ticketId)?.code;

  const onFiles = async (files: File[]) => setRejected(await uploadFiles(files));

  const manual = (doc: IntakeDocument) => {
    const ticketId = startManualEntry(doc.id);
    if (ticketId) router.push(`/boletas/${ticketId}`);
  };

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Recepción" }, { label: "Boletas", href: "/boletas" }, { label: "Cargar escaneos" }]}
        title="Cargar escaneos"
        description="Sube las boletas escaneadas, sueltas o en un PDF de varias páginas. Cada página se procesa por separado y queda lista para revisar."
      />

      <div className={styles.uploadLayout}>
        <FileDropzone
          accept={ACCEPTED_TYPES.join(",")}
          title="Arrastra los archivos o haz clic para elegirlos"
          hint="PDF (una boleta por página), JPG, PNG o WEBP · hasta 20 MB por archivo · varios a la vez"
          onFiles={onFiles}
        />

        <Alert tone="info" title="Lectura automática">
          Cada página de un PDF se lee por separado y queda como un borrador para revisar con el documento al lado. Si una boleta ocupa dos
          páginas, únelas con «Unir con la anterior» y se vuelven a leer juntas. Volver a subir el mismo archivo, la misma página o una
          boleta ya cargada la marca como duplicada. Nada se guarda: la bandeja se vacía al recargar.
        </Alert>

        {mergeError && (
          <Alert
            tone="danger"
            title="No se pudieron unir las páginas"
            actions={
              <Button size="sm" onClick={() => setMergeError(null)}>
                Entendido
              </Button>
            }
          >
            {mergeError}
          </Alert>
        )}

        {rejected.length > 0 && (
          <Alert
            tone="danger"
            title={`${rejected.length} ${rejected.length === 1 ? "archivo no se cargó" : "archivos no se cargaron"}`}
            actions={
              <Button size="sm" onClick={() => setRejected([])}>
                Entendido
              </Button>
            }
          >
            <ul className={styles.plainList}>
              {rejected.map((file) => (
                <li key={file.name}>
                  <strong>{file.name}</strong>: {file.reason}
                </li>
              ))}
            </ul>
          </Alert>
        )}

        <Card>
          <CardHeader
            title="Bandeja de documentos"
            description="Estado de cada archivo cargado en esta sesión."
            actions={
              <SegmentedControl
                name="inbox-filter"
                label="Filtrar documentos"
                value={filter}
                onValueChange={(value) => setFilter(value as Filter)}
                options={[
                  { value: "all", label: "Todos", count: counts.all },
                  { value: "active", label: "En proceso", count: counts.active },
                  { value: "suggested", label: "Por revisar", count: counts.suggested },
                  { value: "failed", label: "Con problemas", count: counts.failed },
                  { value: "reviewed", label: "Revisados", count: counts.reviewed },
                ]}
              />
            }
          />
          {groups.length === 0 ? (
            <EmptyState icon={<FileText aria-hidden />} title="Nada por aquí" description="No hay documentos en este filtro." />
          ) : (
            <Table>
              <THead>
                <tr>
                  <Th>Documento</Th>
                  <Th>Formato</Th>
                  <Th>Estado</Th>
                  <Th align="end">
                    <span className="sr-only">Acciones</span>
                  </Th>
                </tr>
              </THead>
              <TBody>
                {groups.map((group) => (
                  <Fragment key={group.key}>
                    {group.pageCount > 1 && (
                      <Tr className={styles.groupRow}>
                        <Td colSpan={4}>
                          <span className={styles.fileCell}>
                            <span className={styles.fileIcon} aria-hidden>
                              <FileText />
                            </span>
                            <CellStack
                              primary={<span className={styles.fileName}>{group.name}</span>}
                              secondary={groupSummary(group)}
                            />
                          </span>
                        </Td>
                      </Tr>
                    )}
                    {group.docs.map((doc) => (
                      <DocumentRow
                        key={doc.id}
                        doc={doc}
                        nested={group.pageCount > 1}
                        duplicateCode={codeOf(doc.duplicateOfTicketId)}
                        onManual={() => manual(doc)}
                        onRetry={() => retryDocument(doc.id)}
                        onDiscard={() => discardDocument(doc.id)}
                        canMerge={canMergeWithPrevious(doc.id, documents, tickets).ok}
                        onMerge={async () => setMergeError(await mergeWithPrevious(doc.id))}
                      />
                    ))}
                  </Fragment>
                ))}
              </TBody>
            </Table>
          )}
        </Card>
      </div>
    </>
  );
}

type FileGroup = { key: string; name: string; pageCount: number; docs: IntakeDocument[]; all: IntakeDocument[] };

function groupByFile(visible: IntakeDocument[], all: IntakeDocument[]): FileGroup[] {
  const groups = new Map<string, FileGroup>();
  for (const doc of visible) {
    const key = doc.source ? `file:${doc.source.fileSha256}` : doc.id;
    const group = groups.get(key) ?? {
      key,
      name: doc.name,
      pageCount: doc.source?.pageCount ?? 1,
      docs: [],
      all: doc.source ? all.filter((item) => item.source?.fileSha256 === doc.source!.fileSha256) : [doc],
    };
    group.docs.push(doc);
    groups.set(key, group);
  }
  for (const group of groups.values()) group.docs.sort((a, b) => (a.source?.page ?? 0) - (b.source?.page ?? 0));
  return [...groups.values()];
}

const usdFormat = new Intl.NumberFormat("es-BO", { style: "currency", currency: "USD", minimumFractionDigits: 4, maximumFractionDigits: 4 });

function costLabel(docs: IntakeDocument[]): string | null {
  const costs = docs.map((doc) => doc.usage?.costUsd).filter((cost): cost is number => typeof cost === "number");
  return costs.length === 0 ? null : usdFormat.format(costs.reduce((sum, cost) => sum + cost, 0));
}

function groupSummary(group: FileGroup): string {
  const first = group.all[0];
  const done = group.all.filter((doc) => doc.status !== "uploaded" && doc.status !== "processing").length;
  const cost = costLabel(group.all);
  return [
    `${group.pageCount} páginas`,
    `${done} de ${group.all.length} procesadas`,
    first ? formatInstant(first.uploadedAt) : "",
    `Huella del archivo ${group.all[0]?.source?.fileSha256.slice(0, 10) ?? group.all[0]?.sha256.slice(0, 10)}…`,
    cost ? `Costo ${cost}` : "",
  ]
    .filter(Boolean)
    .join(" · ");
}

const formatLabels: Record<TicketFormat, string> = { indapo: "INDAPO", cargill: "Cargill", unknown: "No reconocido" };

function usageLabel(doc: IntakeDocument): string | null {
  if (!doc.usage) return null;
  const tokens = new Intl.NumberFormat("es-BO").format(doc.usage.inputTokens + doc.usage.outputTokens);
  const cost = costLabel([doc]);
  return [`${tokens} tokens`, cost, doc.usage.attempts > 1 ? "con reintento" : ""].filter(Boolean).join(" · ");
}

function DocumentRow({
  doc,
  nested,
  duplicateCode,
  onManual,
  onRetry,
  onDiscard,
  canMerge,
  onMerge,
}: {
  doc: IntakeDocument;
  nested: boolean;
  duplicateCode?: string;
  onManual: () => void;
  onRetry: () => void;
  onDiscard: () => void;
  canMerge: boolean;
  onMerge: () => void;
}) {
  const Icon = doc.kind === "pdf" ? FileText : FileImage;
  const meta = documentStatusMeta[doc.status];
  const title =
    nested && doc.source
      ? doc.source.pages.length > 1
        ? `Páginas ${doc.source.pages[0]}–${doc.source.pages[doc.source.pages.length - 1]} de ${doc.source.pageCount} (unidas)`
        : `Página ${doc.source.page} de ${doc.source.pageCount}`
      : doc.name;
  const detail =
    doc.status === "duplicate"
      ? doc.source
        ? `Misma boleta que ${duplicateCode ?? "una ya cargada"}: no se crea otra.`
        : `Mismo archivo que ${duplicateCode ?? "uno ya cargado"}: no se vuelve a procesar.`
      : doc.error
        ? doc.error
        : [usageLabel(doc) ?? `${doc.kind === "pdf" ? "PDF" : "Imagen"} · ${formatBytes(doc.sizeBytes)} · ${formatInstant(doc.uploadedAt)}`, `Huella ${doc.sha256.slice(0, 8)}…`].join(" · ");
  const canDiscard = doc.status !== "reviewed" && doc.status !== "processing";

  return (
    <Tr>
      <Td>
        <span className={nested ? `${styles.fileCell} ${styles.nestedCell}` : styles.fileCell}>
          <span className={styles.fileIcon} aria-hidden>
            <Icon />
          </span>
          <CellStack primary={<span className={styles.fileName}>{title}</span>} secondary={detail} />
        </span>
      </Td>
      <Td>{doc.format ? <Badge tone={doc.format === "unknown" ? "warning" : "neutral"}>{formatLabels[doc.format]}</Badge> : <span className={styles.muted}>—</span>}</Td>
      <Td>
        <span className={styles.statusCell}>
          {doc.status === "processing" && <Spinner label="Procesando" />}
          <Badge tone={meta.tone} dot={doc.status !== "processing"}>
            {meta.label}
          </Badge>
          {doc.attempts > 1 && <span className={styles.muted}>Intento {doc.attempts}</span>}
        </span>
      </Td>
      <Td align="end">
        <span className={styles.rowActions}>
          {canMerge && (
            <Button size="sm" variant="ghost" leadingIcon={<Merge aria-hidden />} onClick={onMerge} title={doc.source ? `Unir con ${pagesLabel([doc.source.page - 1])}` : undefined}>
              Unir con la anterior
            </Button>
          )}
          {canDiscard && (
            <Button size="sm" variant="ghost" onClick={onDiscard}>
              Descartar
            </Button>
          )}
          {doc.status === "suggested" && doc.ticketId && (
            <Link href={`/boletas/${doc.ticketId}`} className={buttonClass({ size: "sm", variant: "primary" })}>
              Revisar
            </Link>
          )}
          {doc.status === "failed" && !doc.ticketId && (
            <>
              <Button size="sm" variant="ghost" onClick={onManual}>
                Cargar manual
              </Button>
              <Button size="sm" leadingIcon={<RotateCw aria-hidden />} onClick={onRetry}>
                Reintentar
              </Button>
            </>
          )}
          {doc.status === "failed" && doc.ticketId && (
            <Link href={`/boletas/${doc.ticketId}`} className={buttonClass({ size: "sm" })}>
              Continuar carga
            </Link>
          )}
          {doc.status === "duplicate" && doc.duplicateOfTicketId && (
            <Link href={`/boletas/${doc.duplicateOfTicketId}`} className={buttonClass({ size: "sm" })}>
              Ver {duplicateCode}
            </Link>
          )}
          {doc.status === "reviewed" && doc.ticketId && (
            <Link href={`/boletas/${doc.ticketId}`} className={buttonClass({ size: "sm", variant: "ghost" })}>
              Ver boleta
            </Link>
          )}
        </span>
      </Td>
    </Tr>
  );
}
