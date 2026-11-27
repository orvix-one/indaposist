"use client";

import { FileImage, FileText, RotateCw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardHeader,
  CellStack,
  EmptyState,
  FileDropzone,
  Mono,
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
import type { DocumentStatus, IntakeDocument } from "../domain/types";
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
  const { documents, tickets, uploadFiles, retryDocument, startManualEntry, removeDocument } = useIntake();
  const [filter, setFilter] = useState<Filter>("all");
  const [rejected, setRejected] = useState<RejectedFile[]>([]);

  const counts = useMemo(
    () =>
      Object.fromEntries(
        (Object.keys(FILTERS) as Filter[]).map((key) => [key, documents.filter((doc) => FILTERS[key](doc.status)).length]),
      ) as Record<Filter, number>,
    [documents],
  );

  const visible = documents.filter((doc) => FILTERS[filter](doc.status));
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
        description="Sube las boletas escaneadas. Cada archivo se procesa por separado y queda listo para revisar."
      />

      <div className={styles.uploadLayout}>
        <FileDropzone
          accept={ACCEPTED_TYPES.join(",")}
          title="Arrastra los archivos o haz clic para elegirlos"
          hint="PDF, JPG, PNG o WEBP · hasta 20 MB por archivo · varios a la vez"
          onFiles={onFiles}
        />

        <Alert tone="info" title="OCR simulado">
          Mientras se integra el OCR, las sugerencias se generan con datos de ejemplo y no salen del archivo. La huella SHA-256 sí es la real:
          volver a subir el mismo archivo lo marca como duplicado.
        </Alert>

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
          {visible.length === 0 ? (
            <EmptyState icon={<FileText aria-hidden />} title="Nada por aquí" description="No hay documentos en este filtro." />
          ) : (
            <Table>
              <THead>
                <tr>
                  <Th>Archivo</Th>
                  <Th>Huella</Th>
                  <Th>Cargado</Th>
                  <Th>Estado</Th>
                  <Th align="end">
                    <span className="sr-only">Acciones</span>
                  </Th>
                </tr>
              </THead>
              <TBody>
                {visible.map((doc) => {
                  const Icon = doc.kind === "pdf" ? FileText : FileImage;
                  const meta = documentStatusMeta[doc.status];
                  const duplicateCode = codeOf(doc.duplicateOfTicketId);
                  return (
                    <Tr key={doc.id}>
                      <Td>
                        <span className={styles.fileCell}>
                          <span className={styles.fileIcon} aria-hidden>
                            <Icon />
                          </span>
                          <CellStack
                            primary={<span className={styles.fileName}>{doc.name}</span>}
                            secondary={
                              doc.status === "duplicate"
                                ? `Mismo archivo que ${duplicateCode ?? "uno ya cargado"}: no se vuelve a procesar.`
                                : doc.error
                                  ? doc.error
                                  : `${doc.kind === "pdf" ? "PDF" : "Imagen"} · ${formatBytes(doc.sizeBytes)}`
                            }
                          />
                        </span>
                      </Td>
                      <Td>
                        <span title={doc.sha256} className={styles.muted}>
                          <Mono>{doc.sha256.slice(0, 10)}…</Mono>
                        </span>
                      </Td>
                      <Td muted>{formatInstant(doc.uploadedAt)}</Td>
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
                          {doc.status === "suggested" && doc.ticketId && (
                            <Link href={`/boletas/${doc.ticketId}`} className={buttonClass({ size: "sm", variant: "primary" })}>
                              Revisar
                            </Link>
                          )}
                          {doc.status === "failed" && !doc.ticketId && (
                            <>
                              <Button size="sm" variant="ghost" onClick={() => manual(doc)}>
                                Cargar manual
                              </Button>
                              <Button size="sm" leadingIcon={<RotateCw aria-hidden />} onClick={() => retryDocument(doc.id)}>
                                Reintentar
                              </Button>
                            </>
                          )}
                          {doc.status === "failed" && doc.ticketId && (
                            <Link href={`/boletas/${doc.ticketId}`} className={buttonClass({ size: "sm" })}>
                              Continuar carga
                            </Link>
                          )}
                          {doc.status === "duplicate" && (
                            <>
                              <Button size="sm" variant="ghost" onClick={() => removeDocument(doc.id)}>
                                Descartar
                              </Button>
                              {doc.duplicateOfTicketId && (
                                <Link href={`/boletas/${doc.duplicateOfTicketId}`} className={buttonClass({ size: "sm" })}>
                                  Ver {duplicateCode}
                                </Link>
                              )}
                            </>
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
                })}
              </TBody>
            </Table>
          )}
        </Card>
      </div>
    </>
  );
}
