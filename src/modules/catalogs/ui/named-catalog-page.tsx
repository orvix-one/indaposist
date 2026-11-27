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
  Input,
  SearchInput,
  SegmentedControl,
  Spinner,
  Switch,
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
import { normalizeName } from "../domain/rules";
import type { FieldErrors, NamedCatalogKind, NamedRecord } from "../domain/types";
import { CatalogHeader } from "./catalog-header";
import { useCatalogs } from "./catalogs-store";
import { catalogLabels, compareByName } from "./labels";
import { RemoveDialog } from "./remove-dialog";
import styles from "./catalogs.module.css";

type StatusFilter = "active" | "inactive" | "all";

export function NamedCatalogPage({ kind }: { kind: NamedCatalogKind }) {
  const catalogs = useCatalogs();
  const labels = catalogLabels[kind];
  const rows = catalogs[kind];
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("active");
  const [editing, setEditing] = useState<NamedRecord | "new" | null>(null);
  const [removing, setRemoving] = useState<NamedRecord | null>(null);
  const [highlight, setHighlight] = useState<string>();

  const visible = useMemo(() => {
    const needle = normalizeName(query);
    return rows
      .filter((row) => filter === "all" || row.active === (filter === "active"))
      .filter((row) => !needle || normalizeName(row.name).includes(needle))
      .sort(compareByName);
  }, [rows, query, filter]);

  const activeCount = rows.filter((row) => row.active).length;

  return (
    <>
      <CatalogHeader kind={kind} onCreate={() => setEditing("new")} />

      <Card>
        <Toolbar bordered label="Filtros">
          <ToolbarGroup>
            <SearchInput
              controlSize="sm"
              placeholder="Buscar por nombre"
              aria-label={`Buscar ${labels.title.toLowerCase()}`}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className={styles.search}
            />
          </ToolbarGroup>
          <ToolbarSpacer />
          <SegmentedControl
            name={`${kind}-status`}
            label="Estado"
            value={filter}
            onValueChange={(value) => setFilter(value as StatusFilter)}
            options={[
              { value: "active", label: "Activos", count: activeCount },
              { value: "inactive", label: "Inactivos", count: rows.length - activeCount },
              { value: "all", label: "Todos", count: rows.length },
            ]}
          />
        </Toolbar>

        {catalogs.loading ? (
          <EmptyState icon={<Spinner />} title="Cargando…" />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={<Inbox aria-hidden />}
            title={query ? "Sin resultados" : `No hay ${labels.title.toLowerCase()} en esta vista`}
            actions={
              <Button size="sm" onClick={() => setEditing("new")}>
                {labels.create}
              </Button>
            }
          />
        ) : (
          <Table compact>
            <THead>
              <tr>
                <Th>Nombre</Th>
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
                  <Td>
                    <Badge tone={row.active ? "success" : "neutral"} dot>
                      {row.active ? "Activo" : "Inactivo"}
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
        <NamedFormDialog
          kind={kind}
          record={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(row) => {
            setHighlight(row.id);
            if (filter !== "all" && row.active !== (filter === "active")) setFilter("all");
            setEditing(null);
          }}
        />
      )}

      {removing && (
        <RemoveDialog
          name={removing.name}
          usage={catalogs.usage(kind, removing.id)}
          retired={!removing.active}
          retireLabel="Desactivar"
          onClose={() => setRemoving(null)}
          onRemove={() => catalogs.remove(kind, removing.id)}
          onRetire={() => catalogs.saveNamed(kind, { name: removing.name, active: false }, removing.id)}
        />
      )}
    </>
  );
}

function NamedFormDialog({
  kind,
  record,
  onClose,
  onSaved,
}: {
  kind: NamedCatalogKind;
  record: NamedRecord | null;
  onClose: () => void;
  onSaved: (row: NamedRecord) => void;
}) {
  const { saveNamed } = useCatalogs();
  const labels = catalogLabels[kind];
  const formId = `${kind}-form`;
  const [name, setName] = useState(record?.name ?? "");
  const [active, setActive] = useState(record?.active ?? true);
  const [errors, setErrors] = useState<FieldErrors<"name">>({});
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    const result = await saveNamed(kind, { name, active }, record?.id);
    setSaving(false);
    if (result.ok) onSaved(result.row);
    else setErrors(result.errors);
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title={record ? `Editar ${labels.singular}` : labels.create}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form={formId} variant="primary" loading={saving}>
            {record ? "Guardar cambios" : "Crear"}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} noValidate className={styles.form}>
        <Field label="Nombre" htmlFor={`${formId}-name`} error={errors.name}>
          <Input
            id={`${formId}-name`}
            value={name}
            placeholder={labels.placeholder}
            autoFocus
            invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? `${formId}-name-error` : undefined}
            onChange={(event) => setName(event.target.value)}
          />
        </Field>
        {record && (
          <Switch
            label="Activo"
            description="Los inactivos no aparecen al registrar boletas nuevas."
            checked={active}
            onChange={(event) => setActive(event.target.checked)}
          />
        )}
      </form>
    </Dialog>
  );
}
