"use client";

import { Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { RemoveDialog } from "@/modules/catalogs";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardFooter,
  CardHeader,
  EmptyState,
  Field,
  FormGrid,
  FormSection,
  Input,
  PageHeader,
  Spinner,
  Switch,
  buttonClass,
  formLayout,
} from "@/shared/ui";
import { EMPTY_SUPPLIER, hasRua, type Supplier, type SupplierField, type SupplierInput } from "../domain/supplier";
import { SUPPLIERS_ROUTE } from "./suppliers-list";
import { useSuppliers } from "./suppliers-store";
import styles from "./suppliers.module.css";

export function SupplierFormPage({ supplierId }: { supplierId?: string }) {
  const { suppliers, loading } = useSuppliers();
  const record = supplierId ? suppliers.find((row) => row.id === supplierId) : undefined;
  const crumbs = [{ label: "Recepción" }, { label: "Proveedores", href: SUPPLIERS_ROUTE }];

  if (supplierId && loading) {
    return <EmptyState icon={<Spinner />} title="Cargando proveedor…" />;
  }

  if (supplierId && !record) {
    return (
      <>
        <PageHeader breadcrumbs={[...crumbs, { label: "No encontrado" }]} title="Proveedor no encontrado" />
        <Card>
          <EmptyState
            icon={<Users aria-hidden />}
            title="Este proveedor no existe"
            description="Puede que se haya eliminado o que el enlace sea incorrecto."
            actions={
              <Link href={SUPPLIERS_ROUTE} className={buttonClass({ size: "sm" })}>
                Volver a proveedores
              </Link>
            }
          />
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        breadcrumbs={[...crumbs, { label: record ? record.name : "Nuevo" }]}
        title={record ? record.name : "Nuevo proveedor"}
      />
      <SupplierForm key={record?.updatedAt ?? "new"} record={record} />
    </>
  );
}

function SupplierForm({ record }: { record?: Supplier }) {
  const router = useRouter();
  const { save, remove, usage } = useSuppliers();
  const [values, setValues] = useState<SupplierInput>(() => {
    if (!record) return EMPTY_SUPPLIER;
    const { name, taxId, phone, origin, rua, active } = record;
    return { name, taxId, phone, origin, rua, active };
  });
  const [errors, setErrors] = useState<Partial<Record<SupplierField, string>>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [removing, setRemoving] = useState(false);

  const set = <K extends keyof SupplierInput>(key: K, value: SupplierInput[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
    setSaved(false);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    const result = await save(values, record?.id);
    setSaving(false);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    if (record) setSaved(true);
    else router.push(SUPPLIERS_ROUTE);
  };

  return (
    <form onSubmit={submit} noValidate>
      <Card>
        <CardHeader
          title="Datos del proveedor"
          actions={
            record && (
              <Badge tone={record.active ? "success" : "neutral"} dot>
                {record.active ? "Activo" : "Inactivo"}
              </Badge>
            )
          }
        />
        <div className={styles.formBody}>
          {saved && <Alert tone="success" title="Cambios guardados" />}
          <FormSection title="Identificación" description="Tal como figura el beneficiario en las boletas.">
            <FormGrid>
              <Field label="Nombre o razón social" htmlFor="supplier-name" error={errors.name} className={formLayout.spanFull}>
                <Input
                  id="supplier-name"
                  value={values.name}
                  autoFocus={!record}
                  invalid={Boolean(errors.name)}
                  aria-describedby={errors.name ? "supplier-name-error" : undefined}
                  onChange={(event) => set("name", event.target.value)}
                />
              </Field>
              <Field
                label="NIT o CI"
                htmlFor="supplier-tax"
                error={errors.taxId}
                hint="Ej. NIT 1028374019 o CI 5928374 SC"
              >
                <Input
                  id="supplier-tax"
                  value={values.taxId}
                  invalid={Boolean(errors.taxId)}
                  aria-describedby={errors.taxId ? "supplier-tax-error" : "supplier-tax-hint"}
                  onChange={(event) => set("taxId", event.target.value)}
                />
              </Field>
              <Field label="Procedencia" htmlFor="supplier-origin" optional hint="Zona o comunidad de origen del grano.">
                <Input id="supplier-origin" value={values.origin} onChange={(event) => set("origin", event.target.value)} />
              </Field>
            </FormGrid>
          </FormSection>
          <FormSection title="Contacto">
            <FormGrid>
              <Field label="Teléfono" htmlFor="supplier-phone" optional error={errors.phone}>
                <Input
                  id="supplier-phone"
                  type="tel"
                  inputMode="tel"
                  value={values.phone}
                  invalid={Boolean(errors.phone)}
                  onChange={(event) => set("phone", event.target.value)}
                />
              </Field>
            </FormGrid>
          </FormSection>
          <FormSection
            title="Registro agropecuario"
            description="El RUA identifica al productor. Si su ausencia bloquea el cobro se definirá con Administración."
          >
            <FormGrid>
              <Field
                label="RUA"
                htmlFor="supplier-rua"
                optional
                error={errors.rua}
                aside={<RuaBadge rua={values.rua} />}
              >
                <Input id="supplier-rua" value={values.rua} invalid={Boolean(errors.rua)} onChange={(event) => set("rua", event.target.value)} />
              </Field>
            </FormGrid>
          </FormSection>
          {record && (
            <FormSection title="Estado">
              <Switch
                label="Activo"
                description="Los proveedores inactivos no aparecen al registrar boletas nuevas."
                checked={values.active}
                onChange={(event) => set("active", event.target.checked)}
              />
            </FormSection>
          )}
        </div>
        <CardFooter
          start={
            record && (
              <Button variant="ghost" onClick={() => setRemoving(true)}>
                Eliminar
              </Button>
            )
          }
        >
          <Link href={SUPPLIERS_ROUTE} className={buttonClass({ variant: "ghost" })}>
            {record ? "Volver" : "Cancelar"}
          </Link>
          <Button type="submit" variant="primary" loading={saving}>
            {record ? "Guardar cambios" : "Crear proveedor"}
          </Button>
        </CardFooter>
      </Card>

      {record && removing && (
        <RemoveDialog
          name={record.name}
          usage={usage(record.id)}
          retired={!record.active}
          retireLabel="Desactivar"
          onClose={() => setRemoving(false)}
          onRemove={async () => {
            router.push(SUPPLIERS_ROUTE);
            await remove(record.id);
          }}
          onRetire={() => save({ name: record.name, taxId: record.taxId, phone: record.phone, origin: record.origin, rua: record.rua, active: false }, record.id)}
        />
      )}
    </form>
  );
}

export function RuaBadge({ rua }: { rua: string }) {
  return hasRua({ rua }) ? (
    <Badge tone="success" dot>
      Con RUA
    </Badge>
  ) : (
    <Badge tone="warning" dot>
      Sin RUA
    </Badge>
  );
}
