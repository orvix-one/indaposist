"use client";

import { Plus, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  Badge,
  Card,
  CellStack,
  EmptyState,
  Mono,
  PageHeader,
  Pagination,
  SearchInput,
  SegmentedControl,
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
  buttonClass,
} from "@/shared/ui";
import { matchesSupplier } from "../domain/supplier";
import { RuaBadge } from "./supplier-form-page";
import { useSuppliers } from "./suppliers-store";
import styles from "./intake.module.css";

const PAGE_SIZE = 10;
export const SUPPLIERS_ROUTE = "/proveedores";

type StatusFilter = "active" | "inactive" | "all";

export function SuppliersList() {
  const router = useRouter();
  const { suppliers, loading } = useSuppliers();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("active");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    return suppliers
      .filter((row) => filter === "all" || row.active === (filter === "active"))
      .filter((row) => matchesSupplier(row, query))
      .sort((a, b) => a.name.localeCompare(b.name, "es", { sensitivity: "base" }));
  }, [suppliers, query, filter]);

  const activeCount = suppliers.filter((row) => row.active).length;
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const visible = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
  const newHref = `${SUPPLIERS_ROUTE}/nuevo`;

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Recepción" }, { label: "Proveedores" }]}
        title="Proveedores"
        description="Beneficiarios de las boletas de recepción."
        actions={
          <Link href={newHref} className={buttonClass({ variant: "primary" })}>
            <Plus aria-hidden />
            Nuevo proveedor
          </Link>
        }
      />

      <Card>
        <Toolbar bordered label="Filtros">
          <ToolbarGroup>
            <SearchInput
              controlSize="sm"
              placeholder="Nombre, NIT, CI o RUA"
              aria-label="Buscar proveedores"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(0);
              }}
            />
          </ToolbarGroup>
          <ToolbarSpacer />
          <SegmentedControl
            name="supplier-status"
            label="Estado"
            value={filter}
            onValueChange={(value) => {
              setFilter(value as StatusFilter);
              setPage(0);
            }}
            options={[
              { value: "active", label: "Activos", count: activeCount },
              { value: "inactive", label: "Inactivos", count: suppliers.length - activeCount },
              { value: "all", label: "Todos", count: suppliers.length },
            ]}
          />
        </Toolbar>

        {loading ? (
          <EmptyState icon={<Spinner />} title="Cargando proveedores…" />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={<Users aria-hidden />}
            title={query ? "Sin resultados" : "No hay proveedores en esta vista"}
            actions={
              <Link href={newHref} className={buttonClass({ size: "sm" })}>
                Nuevo proveedor
              </Link>
            }
          />
        ) : (
          <>
            <Table>
              <THead>
                <tr>
                  <Th>Nombre o razón social</Th>
                  <Th>NIT / CI</Th>
                  <Th>Procedencia</Th>
                  <Th>Teléfono</Th>
                  <Th>RUA</Th>
                  <Th>Estado</Th>
                </tr>
              </THead>
              <TBody>
                {visible.map((row) => {
                  const href = `${SUPPLIERS_ROUTE}/${row.id}`;
                  return (
                    <Tr key={row.id} className={styles.clickableRow} onClick={() => router.push(href)}>
                      <Td>
                        <Link href={href} className={styles.rowLink} onClick={(event) => event.stopPropagation()}>
                          {row.name}
                        </Link>
                      </Td>
                      <Td muted>
                        <Mono>{row.taxId}</Mono>
                      </Td>
                      <Td muted>{row.origin || "—"}</Td>
                      <Td muted>{row.phone || "—"}</Td>
                      <Td>{row.rua ? <CellStack primary={<RuaBadge rua={row.rua} />} secondary={row.rua} /> : <RuaBadge rua="" />}</Td>
                      <Td>
                        <Badge tone={row.active ? "success" : "neutral"} dot>
                          {row.active ? "Activo" : "Inactivo"}
                        </Badge>
                      </Td>
                    </Tr>
                  );
                })}
              </TBody>
            </Table>
            <Pagination
              from={currentPage * PAGE_SIZE + 1}
              to={currentPage * PAGE_SIZE + visible.length}
              total={filtered.length}
              onPrevious={currentPage > 0 ? () => setPage(currentPage - 1) : undefined}
              onNext={currentPage < pageCount - 1 ? () => setPage(currentPage + 1) : undefined}
            />
          </>
        )}
      </Card>
    </>
  );
}
