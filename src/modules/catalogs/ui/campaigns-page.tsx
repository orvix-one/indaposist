"use client";

import { Inbox, Pencil, Trash2 } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import {
  Badge,
  Button,
  Card,
  Dialog,
  EmptyState,
  Field,
  FormGrid,
  Input,
  SearchInput,
  SegmentedControl,
  Select,
  Spinner,
  TBody,
  THead,
  Table,
  Td,
  Th,
  Toolbar,
  ToolbarGroup,
  ToolbarSpacer,
  Tr,
  formLayout,
} from "@/shared/ui";
import { normalizeName } from "../domain/rules";
import type { Campaign, CampaignField, CampaignInput, CampaignStatus, FieldErrors } from "../domain/types";
import { CatalogHeader } from "./catalog-header";
import { useCatalogs } from "./catalogs-store";
import { compareByName, formatDate } from "./labels";
import { RemoveDialog } from "./remove-dialog";
import styles from "./catalogs.module.css";

type StatusFilter = CampaignStatus | "all";

const FORM_ID = "campaign-form";

export function CampaignsPage() {
  const catalogs = useCatalogs();
  const { campaigns, products } = catalogs;
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("open");
  const [editing, setEditing] = useState<Campaign | "new" | null>(null);
  const [removing, setRemoving] = useState<Campaign | null>(null);
  const [highlight, setHighlight] = useState<string>();

  const productName = (id: string) => products.find((product) => product.id === id)?.name ?? "—";

  const visible = useMemo(() => {
    const needle = normalizeName(query);
    return campaigns
      .filter((row) => filter === "all" || row.status === filter)
      .filter((row) => !needle || normalizeName(row.name).includes(needle))
      .sort((a, b) => b.startDate.localeCompare(a.startDate) || compareByName(a, b));
  }, [campaigns, query, filter]);

  const openCount = campaigns.filter((row) => row.status === "open").length;

  return (
    <>
      <CatalogHeader kind="campaigns" onCreate={() => setEditing("new")} />

      <Card>
        <Toolbar bordered label="Filtros">
          <ToolbarGroup>
            <SearchInput
              controlSize="sm"
              placeholder="Buscar por nombre"
              aria-label="Buscar campañas"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className={styles.search}
            />
          </ToolbarGroup>
          <ToolbarSpacer />
          <SegmentedControl
            name="campaign-status"
            label="Estado"
            value={filter}
            onValueChange={(value) => setFilter(value as StatusFilter)}
            options={[
              { value: "open", label: "Abiertas", count: openCount },
              { value: "closed", label: "Cerradas", count: campaigns.length - openCount },
              { value: "all", label: "Todas", count: campaigns.length },
            ]}
          />
        </Toolbar>

        {catalogs.loading ? (
          <EmptyState icon={<Spinner />} title="Cargando…" />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={<Inbox aria-hidden />}
            title={query ? "Sin resultados" : "No hay campañas en esta vista"}
            actions={
              <Button size="sm" onClick={() => setEditing("new")}>
                Nueva campaña
              </Button>
            }
          />
        ) : (
          <Table compact>
            <THead>
              <tr>
                <Th>Nombre</Th>
                <Th>Producto</Th>
                <Th>Período</Th>
                <Th>Estado</Th>
                <Th shrink>
                  <span className="sr-only">Acciones</span>
                </Th>
              </tr>
            </THead>
            <TBody>
              {visible.map((row) => (
                <Tr key={row.id} selected={row.id === highlight}>
                  <Td>{row.name}</Td>
                  <Td muted>{productName(row.productId)}</Td>
                  <Td muted>
                    {formatDate(row.startDate)} – {formatDate(row.endDate)}
                  </Td>
                  <Td>
                    <Badge tone={row.status === "open" ? "success" : "neutral"} dot>
                      {row.status === "open" ? "Abierta" : "Cerrada"}
                    </Badge>
                  </Td>
                  <Td shrink>
                    <span className={styles.rowActions}>
                      <Button size="sm" variant="ghost" iconOnly aria-label={`Editar ${row.name}`} onClick={() => setEditing(row)}>
                        <Pencil aria-hidden />
                      </Button>
                      <Button size="sm" variant="ghost" iconOnly aria-label={`Eliminar ${row.name}`} onClick={() => setRemoving(row)}>
                        <Trash2 aria-hidden />
                      </Button>
                    </span>
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        )}
      </Card>

      {editing && (
        <CampaignFormDialog
          record={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(row) => {
            setHighlight(row.id);
            if (filter !== "all" && row.status !== filter) setFilter("all");
            setEditing(null);
          }}
        />
      )}

      {removing && (
        <RemoveDialog
          name={removing.name}
          usage={catalogs.usage("campaigns", removing.id)}
          retired={removing.status === "closed"}
          retireLabel="Cerrar campaña"
          onClose={() => setRemoving(null)}
          onRemove={() => catalogs.remove("campaigns", removing.id)}
          onRetire={() => catalogs.saveCampaign({ ...removing, status: "closed" }, removing.id)}
        />
      )}
    </>
  );
}

function CampaignFormDialog({
  record,
  onClose,
  onSaved,
}: {
  record: Campaign | null;
  onClose: () => void;
  onSaved: (row: Campaign) => void;
}) {
  const { products, saveCampaign } = useCatalogs();
  const selectableProducts = products
    .filter((product) => product.active || product.id === record?.productId)
    .sort(compareByName);
  const [values, setValues] = useState<CampaignInput>(() => ({
    name: record?.name ?? "",
    productId: record?.productId ?? (selectableProducts.length === 1 ? selectableProducts[0].id : ""),
    startDate: record?.startDate ?? "",
    endDate: record?.endDate ?? "",
    status: record?.status ?? "open",
  }));
  const [errors, setErrors] = useState<FieldErrors<CampaignField>>({});
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof CampaignInput>(key: K, value: CampaignInput[K]) =>
    setValues((current) => ({ ...current, [key]: value }));

  const describedBy = (field: CampaignField) => (errors[field] ? `${FORM_ID}-${field}-error` : undefined);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    const result = await saveCampaign(values, record?.id);
    setSaving(false);
    if (result.ok) onSaved(result.row);
    else setErrors(result.errors);
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title={record ? "Editar campaña" : "Nueva campaña"}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form={FORM_ID} variant="primary" loading={saving}>
            {record ? "Guardar cambios" : "Crear"}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={submit} noValidate>
        <FormGrid>
          <Field label="Nombre" htmlFor={`${FORM_ID}-name`} error={errors.name} className={formLayout.spanFull}>
            <Input
              id={`${FORM_ID}-name`}
              value={values.name}
              placeholder="Ej. Verano 2026/27"
              autoFocus
              invalid={Boolean(errors.name)}
              aria-describedby={describedBy("name")}
              onChange={(event) => set("name", event.target.value)}
            />
          </Field>
          <Field label="Producto" htmlFor={`${FORM_ID}-productId`} error={errors.productId} className={formLayout.spanFull}>
            <Select
              id={`${FORM_ID}-productId`}
              value={values.productId}
              invalid={Boolean(errors.productId)}
              aria-describedby={describedBy("productId")}
              onChange={(event) => set("productId", event.target.value)}
            >
              <option value="">Selecciona…</option>
              {selectableProducts.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                  {product.active ? "" : " (inactivo)"}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Inicio" htmlFor={`${FORM_ID}-startDate`} error={errors.startDate}>
            <Input
              id={`${FORM_ID}-startDate`}
              type="date"
              value={values.startDate}
              max={values.endDate || undefined}
              invalid={Boolean(errors.startDate)}
              aria-describedby={describedBy("startDate")}
              onChange={(event) => set("startDate", event.target.value)}
            />
          </Field>
          <Field label="Fin" htmlFor={`${FORM_ID}-endDate`} error={errors.endDate}>
            <Input
              id={`${FORM_ID}-endDate`}
              type="date"
              value={values.endDate}
              min={values.startDate || undefined}
              invalid={Boolean(errors.endDate)}
              aria-describedby={describedBy("endDate")}
              onChange={(event) => set("endDate", event.target.value)}
            />
          </Field>
          {record && (
            <Field
              label="Estado"
              htmlFor={`${FORM_ID}-status`}
              hint="Las campañas cerradas no aparecen al registrar boletas nuevas."
              className={formLayout.spanFull}
            >
              <Select
                id={`${FORM_ID}-status`}
                value={values.status}
                aria-describedby={`${FORM_ID}-status-hint`}
                onChange={(event) => set("status", event.target.value as CampaignStatus)}
              >
                <option value="open">Abierta</option>
                <option value="closed">Cerrada</option>
              </Select>
            </Field>
          )}
        </FormGrid>
      </form>
    </Dialog>
  );
}
