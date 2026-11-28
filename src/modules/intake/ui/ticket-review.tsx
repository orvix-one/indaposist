"use client";

import { ArrowDownToLine, ArrowRight, CircleCheck, CircleX, FileSearch, MessageSquareWarning, Plus, ScanSearch, Send } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { currentUser } from "@/modules/access";
import { campaignLabel, selectableOptions, useCatalogs } from "@/modules/catalogs";
import { CURRENCIES, currencySymbol, formatMoney } from "@/shared/money";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  Dialog,
  DocumentViewer,
  EmptyState,
  Field,
  FormGrid,
  Input,
  Mono,
  PageHeader,
  Radio,
  SearchInput,
  Select,
  Switch,
  Textarea,
  buttonClass,
  cx,
  formLayout,
} from "@/shared/ui";
import {
  hasIssues,
  isEditable,
  liquidQuantity,
  pendingVerification,
  setFieldValue,
  ticketAmountCents,
  validateForSubmit,
  weightChecks,
  type SubmitIssues,
  type TicketDecision,
  type WeightCheck,
} from "../domain/rules";
import { QUANTITY_UNITS, type Currency, type FieldPath, type QuantityUnit, type Ticket, type TicketFields } from "../domain/types";
import { EMPTY_SUPPLIER, matchesSupplier, type SupplierField, type SupplierInput } from "../domain/supplier";
import { RuaBadge } from "./supplier-form-page";
import { useIntake } from "./intake-store";
import { fieldId, fieldLabel, formatBusinessDate, formatKgExact, formatKgRaw, ticketStatusMeta } from "./labels";
import { QualityTable } from "./quality-table";
import { ReviewField, ReviewProvider, type ReviewContextValue } from "./review-context";
import { TicketHistory } from "./ticket-history";
import { useSuppliers } from "./suppliers-store";
import styles from "./intake.module.css";

/* `children` permite que la ruta agregue secciones de otros módulos (por ejemplo, pagos) sin que recepción dependa de ellos. */
export function TicketReview({ ticketId, children }: { ticketId: string; children?: ReactNode }) {
  const { tickets } = useIntake();
  const ticket = tickets.find((item) => item.id === ticketId);

  if (!ticket) {
    return (
      <Card>
        <EmptyState
          icon={<FileSearch aria-hidden />}
          title="Boleta no encontrada"
          description="Puede que se haya cargado en otra sesión: mientras no hay base de datos, lo cargado se pierde al recargar."
          actions={
            <Link href="/boletas" className={buttonClass({ size: "sm" })}>
              Volver a boletas
            </Link>
          }
        />
      </Card>
    );
  }

  return (
    <ReviewScreen key={ticket.id} ticket={ticket}>
      {children}
    </ReviewScreen>
  );
}

const DECISIONS: Record<TicketDecision, { title: string; description: string; action: string; done: string }> = {
  approved: {
    title: "Aprobar boleta",
    description: "La boleta queda bloqueada y disponible para registrar pagos.",
    action: "Aprobar",
    done: "Boleta aprobada",
  },
  observed: {
    title: "Observar boleta",
    description: "Vuelve a quedar editable para corregirla y reenviarla. Indica qué hay que corregir.",
    action: "Observar",
    done: "Boleta observada",
  },
  rejected: {
    title: "Rechazar boleta",
    description: "La boleta queda cerrada sin obligación de pago. Indica el motivo.",
    action: "Rechazar",
    done: "Boleta rechazada",
  },
};

function ReviewScreen({ ticket, children }: { ticket: Ticket; children?: ReactNode }) {
  const { saveDraft, submitForReview, decideTicket } = useIntake();
  const [decision, setDecision] = useState<TicketDecision | null>(null);
  const [decisionComment, setDecisionComment] = useState("");
  const [decisionError, setDecisionError] = useState<string | null>(null);
  const [decided, setDecided] = useState<TicketDecision | null>(null);
  const [fields, setFields] = useState<TicketFields>(ticket.fields);
  const [verified, setVerified] = useState<FieldPath[]>(ticket.verified);
  const [issues, setIssues] = useState<SubmitIssues | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [notice, setNotice] = useState<"saved" | "submitted" | null>(null);

  const editable = isEditable(ticket.status);
  const dirty = JSON.stringify(fields) !== JSON.stringify(ticket.fields) || verified.join() !== ticket.verified.join();
  const pending = pendingVerification(ticket, fields, verified);
  const checks = weightChecks(fields);
  const liveIssues = issues ? validateForSubmit(ticket, fields, verified) : null;
  const errorCount = liveIssues ? Object.keys(liveIssues.fieldErrors).length : 0;
  const [creatingSupplier, setCreatingSupplier] = useState(false);
  const { issuers, sites, campaigns, products } = useCatalogs();
  const { suppliers } = useSuppliers();
  const [supplierQuery, setSupplierQuery] = useState("");
  const supplier = suppliers.find((row) => row.id === fields.supplierId);
  const issuerName = issuers.find((row) => row.id === fields.issuerId)?.name;
  const siteName = sites.find((row) => row.id === fields.siteId)?.name;
  const options = useMemo(
    () => ({
      issuers: selectableOptions(issuers, fields.issuerId),
      sites: selectableOptions(sites, fields.siteId),
      campaigns: selectableOptions(campaigns, fields.campaignId, (row) => campaignLabel(row, products)),
      products: selectableOptions(products, fields.productId),
      suppliers: selectableOptions(
        suppliers.filter((row) => row.id === fields.supplierId || matchesSupplier(row, supplierQuery)),
        fields.supplierId,
        (row) => [row.name, row.taxId, row.rua].filter(Boolean).join(" · "),
      ),
    }),
    [issuers, sites, campaigns, products, suppliers, supplierQuery, fields.issuerId, fields.siteId, fields.campaignId, fields.productId, fields.supplierId],
  );

  const setValue = useCallback((path: FieldPath, value: string) => {
    setFields((current) => setFieldValue(current, path, value));
    setNotice(null);
  }, []);

  const confirm = useCallback((paths: FieldPath[]) => {
    setVerified((current) => Array.from(new Set([...current, ...paths])));
    setNotice(null);
  }, []);

  const review: ReviewContextValue = useMemo(
    () => ({
      fields,
      suggestions: ticket.suggestions,
      verified,
      errors: liveIssues?.fieldErrors ?? {},
      readOnly: !editable,
      setValue,
      confirm,
    }),
    [fields, ticket.suggestions, verified, liveIssues?.fieldErrors, editable, setValue, confirm],
  );

  const focusNextPending = () => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>("[data-pending]"));
    const index = nodes.findIndex((node) => node === document.activeElement);
    const next = nodes[(index + 1) % nodes.length];
    next?.scrollIntoView({ behavior: "smooth", block: "center" });
    next?.focus({ preventScroll: true });
  };

  const save = useCallback(() => {
    if (!editable) return;
    saveDraft(ticket.id, fields, verified);
    setNotice("saved");
  }, [editable, saveDraft, ticket.id, fields, verified]);

  const requestSubmit = () => {
    const result = validateForSubmit(ticket, fields, verified);
    setIssues(result);
    if (!hasIssues(result)) {
      setDialogOpen(true);
      return;
    }
    const firstError = (Object.keys(result.fieldErrors) as FieldPath[])
      .map((path) => document.getElementById(fieldId(path)))
      .filter((element): element is HTMLElement => element !== null)
      .sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1))[0];
    if (firstError) {
      firstError.scrollIntoView({ behavior: "smooth", block: "center" });
      firstError.focus({ preventScroll: true });
    } else focusNextPending();
  };

  const openDecision = (value: TicketDecision) => {
    setDecision(value);
    setDecisionComment("");
    setDecisionError(null);
  };

  const confirmDecision = () => {
    if (!decision) return;
    const error = decideTicket(ticket.id, decision, decisionComment);
    if (error) {
      setDecisionError(error);
      return;
    }
    setDecided(decision);
    setDecision(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submit = () => {
    submitForReview(ticket.id, fields, verified, comment);
    setDialogOpen(false);
    setComment("");
    setNotice("submitted");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        save();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [save]);

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const status = ticketStatusMeta[ticket.status];
  const submitAmount = ticketAmountCents(fields);
  const lastObservation = [...ticket.history].reverse().find((entry) => entry.action === "observed");

  return (
    <ReviewProvider value={review}>
      <PageHeader
        breadcrumbs={[{ label: "Recepción" }, { label: "Boletas", href: "/boletas" }, { label: ticket.code }]}
        title={
          <span className={styles.titleRow}>
            Boleta <Mono>{ticket.code}</Mono>
            <Badge tone={status.tone} dot>
              {status.label}
            </Badge>
          </span>
        }
        description={[supplier?.name ?? "Proveedor sin identificar", fields.scaleTicket && `Tiquete ${fields.scaleTicket}`, issuerName]
          .filter(Boolean)
          .join(" · ")}
      />

      <div className={styles.reviewGrid}>
        <div className={styles.viewerPane}>
          {ticket.document ? (
            <DocumentViewer
              src={ticket.document.url}
              kind={ticket.document.kind}
              name={ticket.document.synthetic ? `${ticket.document.name} · documento de ejemplo` : ticket.document.name}
            />
          ) : (
            <Card className={styles.viewerEmpty}>
              <EmptyState icon={<FileSearch aria-hidden />} title="Sin documento" description="Esta boleta no tiene escaneo asociado." />
            </Card>
          )}
        </div>

        <div className={styles.formPane}>
          {notice === "submitted" && (
            <Alert tone="success" title="Boleta enviada a revisión">
              Administración puede aprobarla, observarla o rechazarla. Mientras tanto queda bloqueada para edición.
            </Alert>
          )}
          {notice !== "submitted" && ticket.status === "in_review" && (
            <Alert tone="info" title="En revisión">
              La edición está bloqueada hasta que Administración la apruebe, observe o rechace.
            </Alert>
          )}
          {decided && decided !== "observed" && decided === ticket.status && (
            <Alert tone={decided === "approved" ? "success" : "danger"} title={DECISIONS[decided].done}>
              {decided === "approved" ? "Ya puedes registrar sus pagos." : "La decisión quedó en el historial."}
            </Alert>
          )}
          {ticket.status === "observed" && (
            <Alert tone="warning" title="Boleta observada">
              {lastObservation?.comment ?? "Corrige los datos señalados y vuelve a enviarla a revisión."}
            </Alert>
          )}
          {editable && ticket.ocr === "suggested" && Object.keys(ticket.suggestions).length > 0 && (
            <Alert tone="neutral" title="Datos leídos del escaneo">
              Compara cada valor con el documento. Los campos con menos de 85 % de confianza están resaltados: corrígelos o confírmalos.
            </Alert>
          )}
          {editable && ticket.ocr === "manual" && (
            <Alert tone="warning" title="Carga manual">
              No se pudo leer este documento. Completa los datos a partir del escaneo.
            </Alert>
          )}

          <fieldset className={styles.formFieldset} disabled={!editable}>
            <Card>
              <CardHeader title="Identificación" description="Datos impresos en la cabecera de la boleta." />
              <CardBody>
                <FormGrid>
                  <ReviewField path="issuerId" options={options.issuers} />
                  <ReviewField path="siteId" options={options.sites} />
                  <ReviewField path="campaignId" options={options.campaigns} />
                  <ReviewField path="productId" options={options.products} />
                  <ReviewField path="scaleTicket" />
                  <ReviewField path="weighedAt" type="datetime-local" />
                  <ReviewField path="entryNumber" optional />
                  <ReviewField path="analysisNumber" optional />
                  <ReviewField path="folio" optional />
                </FormGrid>
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Proveedor y transporte" />
              <CardBody>
                <FormGrid>
                  {editable && (
                    <Field label="Buscar proveedor" htmlFor="supplier-search" optional className={formLayout.span2}>
                      <SearchInput
                        id="supplier-search"
                        placeholder="Nombre, NIT, CI o RUA"
                        value={supplierQuery}
                        onChange={(event) => setSupplierQuery(event.target.value)}
                      />
                    </Field>
                  )}
                  <ReviewField
                    path="supplierId"
                    options={options.suppliers}
                    className={formLayout.span2}
                    hint={
                      supplier ? (
                        <span className={styles.supplierHint}>
                          <RuaBadge rua={supplier.rua} />
                          {supplier.rua || "El proveedor no tiene RUA registrado."}
                        </span>
                      ) : editable ? (
                        <span className={styles.supplierHint}>
                          {supplierQuery && options.suppliers.length === 0 && "Ningún proveedor coincide."}
                          <Button size="sm" variant="ghost" leadingIcon={<Plus aria-hidden />} onClick={() => setCreatingSupplier(true)}>
                            Crear proveedor
                          </Button>
                        </span>
                      ) : undefined
                    }
                  />
                  <ReviewField path="owner" optional hint="Titular impreso en la boleta, si difiere del proveedor." />
                  <ReviewField path="origin" optional />
                  <ReviewField path="driver" optional />
                  <ReviewField path="driverId" optional />
                  <ReviewField path="vehicle" optional />
                  <ReviewField path="plate" />
                </FormGrid>
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Pesaje" description="Kilogramos tal como figuran en la boleta." />
              <CardBody className={styles.weights}>
                <FormGrid columns={3}>
                  <ReviewField path="grossKg" numeric trailing="kg" />
                  <ReviewField path="tareKg" numeric trailing="kg" />
                  <ReviewField path="netKg" numeric trailing="kg" />
                  <ReviewField path="discountKg" numeric trailing="kg" />
                  <ReviewField path="liquidKg" numeric trailing="kg" />
                </FormGrid>
                <div className={styles.checks} aria-live="polite">
                  <WeightCheckRow label="Neto = bruto − tara" check={checks.net} onApply={(value) => setValue("netKg", value)} readOnly={!editable} />
                  <WeightCheckRow label="Descuento = suma de calidad" check={checks.discount} onApply={(value) => setValue("discountKg", value)} readOnly={!editable} />
                  <WeightCheckRow label="Líquido = neto − descuento" check={checks.liquid} onApply={(value) => setValue("liquidKg", value)} readOnly={!editable} />
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Calidad" description="Resultados del análisis y descuento aplicado por concepto." />
              <QualityTable />
            </Card>

            <OfficeCard fields={fields} setFields={setFields} errors={liveIssues?.fieldErrors ?? {}} />

            <AmountCard fields={fields} setFields={setFields} setValue={setValue} />
          </fieldset>

          {children}

          <Card>
            <CardHeader title="Historial" description="Quién hizo qué y cuándo." />
            <CardBody>
              <TicketHistory entries={ticket.history} />
            </CardBody>
          </Card>

          {editable && (
            <div className={styles.actionBar}>
              <div className={styles.actionStatus}>
                {liveIssues && errorCount > 0 ? (
                  <span className={styles.actionError}>
                    <CircleX aria-hidden />
                    {errorCount === 1 ? "1 campo por corregir" : `${errorCount} campos por corregir`}
                  </span>
                ) : pending.length > 0 ? (
                  <button type="button" className={styles.actionWarning} onClick={focusNextPending} title="Ir al siguiente campo por verificar">
                    <ScanSearch aria-hidden />
                    {pending.length === 1 ? "1 campo por verificar" : `${pending.length} campos por verificar`}
                    <ArrowRight aria-hidden />
                  </button>
                ) : dirty ? (
                  <span>Cambios sin guardar</span>
                ) : notice === "saved" ? (
                  <span className={styles.actionOk}>
                    <CircleCheck aria-hidden />
                    Borrador guardado
                  </span>
                ) : (
                  <span>Sin cambios</span>
                )}
              </div>
              <Button onClick={save} disabled={!dirty} title="Guardar borrador (⌘S)">
                Guardar borrador
              </Button>
              <Button variant="primary" leadingIcon={<Send aria-hidden />} onClick={requestSubmit}>
                Enviar a revisión
              </Button>
            </div>
          )}

          {ticket.status === "in_review" && currentUser.canDecideTickets && (
            <div className={styles.actionBar}>
              <div className={styles.actionStatus}>
                <span>Pendiente de decisión</span>
              </div>
              <Button variant="danger" leadingIcon={<CircleX aria-hidden />} onClick={() => openDecision("rejected")}>
                Rechazar
              </Button>
              <Button leadingIcon={<MessageSquareWarning aria-hidden />} onClick={() => openDecision("observed")}>
                Observar
              </Button>
              <Button variant="primary" leadingIcon={<CircleCheck aria-hidden />} onClick={() => openDecision("approved")}>
                Aprobar
              </Button>
            </div>
          )}
        </div>
      </div>

      {decision && (
        <Dialog
          open
          onClose={() => setDecision(null)}
          title={DECISIONS[decision].title}
          description={DECISIONS[decision].description}
          footer={
            <>
              <Button variant="ghost" onClick={() => setDecision(null)}>
                Cancelar
              </Button>
              <Button variant={decision === "rejected" ? "danger" : "primary"} onClick={confirmDecision}>
                {DECISIONS[decision].action}
              </Button>
            </>
          }
        >
          <Field
            label={decision === "approved" ? "Comentario" : "Motivo"}
            htmlFor="decision-comment"
            optional={decision === "approved"}
            error={decisionError ?? undefined}
          >
            <Textarea
              id="decision-comment"
              autoFocus
              invalid={Boolean(decisionError)}
              value={decisionComment}
              onChange={(event) => {
                setDecisionComment(event.target.value);
                setDecisionError(null);
              }}
            />
          </Field>
        </Dialog>
      )}

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="Enviar a revisión"
        description="Administración revisará la boleta. No podrás editarla hasta que la apruebe u observe."
        footer={
          <>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="primary" leadingIcon={<Send aria-hidden />} onClick={submit}>
              Enviar
            </Button>
          </>
        }
      >
        <dl className={styles.summary}>
          <dt>Proveedor</dt>
          <dd>{supplier?.name ?? "—"}</dd>
          <dt>Tiquete</dt>
          <dd>
            <Mono>{fields.scaleTicket || "—"}</Mono>
          </dd>
          <dt>Acopio</dt>
          <dd>{siteName || "—"}</dd>
          <dt>Llegada a oficina</dt>
          <dd>{formatBusinessDate(fields.officeArrivalDate)}</dd>
          <dt>Peso líquido</dt>
          <dd>{formatKgRaw(fields.liquidKg)} kg</dd>
          <dt>Importe</dt>
          <dd className={styles.summaryStrong}>{submitAmount === null ? "—" : formatMoney(submitAmount, fields.currency)}</dd>
        </dl>
        <Field label="Comentario" htmlFor="submit-comment" optional>
          <Textarea
            id="submit-comment"
            placeholder="Contexto para Administración, si hace falta."
            value={comment}
            onChange={(event) => setComment(event.target.value)}
          />
        </Field>
      </Dialog>

      {creatingSupplier && (
        <CreateSupplierDialog
          initial={{ name: ticket.readings?.supplierName ?? "", taxId: ticket.readings?.supplierTaxId ?? "" }}
          onClose={() => setCreatingSupplier(false)}
          onCreated={(id) => {
            setValue("supplierId", id);
            setCreatingSupplier(false);
          }}
        />
      )}
    </ReviewProvider>
  );
}

function CreateSupplierDialog({
  initial,
  onClose,
  onCreated,
}: {
  initial: Pick<SupplierInput, "name" | "taxId">;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const { save } = useSuppliers();
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<Partial<Record<SupplierField, string>>>({});
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    const result = await save({ ...EMPTY_SUPPLIER, ...values, active: true });
    setSaving(false);
    if (result.ok) onCreated(result.row.id);
    else setErrors(result.errors);
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title="Crear proveedor"
      description="Se agrega al catálogo de proveedores y queda elegido en esta boleta."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={submit} disabled={saving}>
            Crear
          </Button>
        </>
      }
    >
      <Field label="Nombre o razón social" htmlFor="new-supplier-name" error={errors.name}>
        <Input
          id="new-supplier-name"
          value={values.name}
          autoFocus
          invalid={Boolean(errors.name)}
          onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))}
        />
      </Field>
      <Field label="NIT o CI" htmlFor="new-supplier-tax" error={errors.taxId} hint="Ej. NIT 1028374019 o CI 5928374 SC">
        <Input
          id="new-supplier-tax"
          value={values.taxId}
          invalid={Boolean(errors.taxId)}
          onChange={(event) => setValues((current) => ({ ...current, taxId: event.target.value }))}
        />
      </Field>
    </Dialog>
  );
}

function WeightCheckRow({
  label,
  check,
  onApply,
  readOnly,
}: {
  label: string;
  check: WeightCheck;
  onApply: (value: string) => void;
  readOnly: boolean;
}) {
  const state = check.expected === null || check.actual === null ? "idle" : check.ok ? "ok" : "mismatch";
  return (
    <div className={cx(styles.checkRow, styles[`check_${state}`])}>
      <span className={styles.checkIcon} aria-hidden>
        {state === "ok" ? <CircleCheck /> : state === "mismatch" ? <CircleX /> : <span className={styles.checkIdle} />}
      </span>
      <span className={styles.checkLabel}>{label}</span>
      <span className={styles.checkValue}>
        {state === "idle" ? "Faltan datos" : state === "ok" ? `${formatKgExact(check.expected)} kg` : `Esperado ${formatKgExact(check.expected)} kg`}
      </span>
      {state === "mismatch" && !readOnly && (
        <Button size="sm" variant="ghost" leadingIcon={<ArrowDownToLine aria-hidden />} onClick={() => onApply(formatKgExact(check.expected))}>
          Usar
        </Button>
      )}
    </div>
  );
}

function OfficeCard({
  fields,
  setFields,
  errors,
}: {
  fields: TicketFields;
  setFields: (update: (current: TicketFields) => TicketFields) => void;
  errors: Partial<Record<FieldPath, string>>;
}) {
  const patch = (values: Partial<TicketFields>) => setFields((current) => ({ ...current, ...values }));

  return (
    <Card>
      <CardHeader title="Datos de oficina" description="Lo que no viene impreso en la boleta." />
      <CardBody>
        <FormGrid>
          <ReviewField path="officeArrivalDate" type="date" hint="Distinta de la fecha de pesaje del camión." />
          <Field label={fieldLabel("documentType")} htmlFor={fieldId("documentType")} error={errors.documentType}>
            <div className={styles.radioRow} role="radiogroup" aria-label={fieldLabel("documentType")} id={fieldId("documentType")} tabIndex={-1}>
              <Radio
                name="documentType"
                label="Original"
                checked={fields.documentType === "original"}
                onChange={() => patch({ documentType: "original" })}
              />
              <Radio
                name="documentType"
                label="Fotocopia"
                description={currentUser.canRegisterPhotocopy ? undefined : "Solo Administración"}
                checked={fields.documentType === "photocopy"}
                disabled={!currentUser.canRegisterPhotocopy}
                onChange={() => patch({ documentType: "photocopy" })}
              />
            </div>
          </Field>
          <div className={cx(formLayout.spanFull, styles.archiveRow)}>
            <Switch
              label="Original archivado físicamente"
              checked={fields.archived}
              onChange={(event) => patch({ archived: event.target.checked, archiveLocation: event.target.checked ? fields.archiveLocation : "" })}
            />
            {fields.archived && (
              <ReviewField path="archiveLocation" placeholder="Archivador, carpeta o caja" className={styles.archiveLocation} />
            )}
          </div>
          <ReviewField path="notes" optional multiline placeholder="Acuerdos, diferencias con el original, pendientes…" className={formLayout.spanFull} />
        </FormGrid>
      </CardBody>
    </Card>
  );
}

const UNIT_LABELS: Record<QuantityUnit, { option: string; per: string }> = {
  t: { option: "t", per: "tonelada" },
  kg: { option: "kg", per: "kilogramo" },
};

function AmountCard({
  fields,
  setFields,
  setValue,
}: {
  fields: TicketFields;
  setFields: (update: (current: TicketFields) => TicketFields) => void;
  setValue: (path: FieldPath, value: string) => void;
}) {
  const patch = (values: Partial<TicketFields>) => setFields((current) => ({ ...current, ...values }));
  const fromLiquid = liquidQuantity(fields, fields.quantityUnit);
  const amount = ticketAmountCents(fields);

  return (
    <Card>
      <CardHeader title="Carga e importe" description="Lo que se le debe al proveedor. Los pagos se registran cuando la boleta está aprobada." />
      <CardBody>
        <FormGrid>
          <div className={styles.priceRow}>
            <ReviewField
              path="quantity"
              numeric
              trailing={fields.quantityUnit}
              hint={
                fromLiquid && fromLiquid !== fields.quantity ? (
                  <Button size="sm" variant="ghost" leadingIcon={<ArrowDownToLine aria-hidden />} onClick={() => setValue("quantity", fromLiquid)}>
                    Usar peso líquido ({fromLiquid} {fields.quantityUnit})
                  </Button>
                ) : undefined
              }
            />
            <Field label={fieldLabel("quantityUnit")} htmlFor={fieldId("quantityUnit")}>
              <Select
                id={fieldId("quantityUnit")}
                value={fields.quantityUnit}
                onChange={(event) => patch({ quantityUnit: event.target.value as QuantityUnit })}
              >
                {QUANTITY_UNITS.map((unit) => (
                  <option key={unit} value={unit}>
                    {UNIT_LABELS[unit].option}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className={styles.priceRow}>
            <ReviewField path="price" numeric leading={currencySymbol[fields.currency]} hint={`Por ${UNIT_LABELS[fields.quantityUnit].per}.`} />
            <Field label={fieldLabel("currency")} htmlFor={fieldId("currency")}>
              <Select id={fieldId("currency")} value={fields.currency} onChange={(event) => patch({ currency: event.target.value as Currency })}>
                {CURRENCIES.map((currency) => (
                  <option key={currency} value={currency}>
                    {currency}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label={fieldLabel("modality")} htmlFor={fieldId("modality")} optional hint="Informativa: anticipo y cierre se definirán con Administración.">
            <div className={styles.radioRow} role="radiogroup" aria-label={fieldLabel("modality")} id={fieldId("modality")} tabIndex={-1}>
              <Radio name="modality" label="Abierta" checked={fields.modality === "open"} onChange={() => patch({ modality: "open" })} />
              <Radio name="modality" label="Cerrada" checked={fields.modality === "closed"} onChange={() => patch({ modality: "closed" })} />
            </div>
          </Field>
          <dl className={cx(styles.summary, styles.amountSummary)}>
            <dt>Importe</dt>
            <dd className={styles.summaryStrong}>{amount === null ? "Completa carga y precio" : formatMoney(amount, fields.currency)}</dd>
          </dl>
        </FormGrid>
      </CardBody>
    </Card>
  );
}
