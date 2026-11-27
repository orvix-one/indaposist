"use client";

/* Proveedores sobre un repositorio en memoria. Se reinicia al recargar. */

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { createMemoryRepository } from "@/modules/catalogs";
import { validateSupplier, type Supplier, type SupplierField, type SupplierInput } from "../domain/supplier";
import { seedSuppliers } from "../mock/supplier-seed";

export type SupplierSaveResult = { ok: true; row: Supplier } | { ok: false; errors: Partial<Record<SupplierField, string>> };

type SuppliersContextValue = {
  suppliers: Supplier[];
  loading: boolean;
  save(input: SupplierInput, id?: string): Promise<SupplierSaveResult>;
  remove(id: string): Promise<boolean>;
  usage(id: string): string | null;
};

const SuppliersContext = createContext<SuppliersContextValue | null>(null);
const notReferenced = () => false;

export function SuppliersProvider({
  children,
  isReferenced = notReferenced,
}: {
  children: ReactNode;
  isReferenced?: (supplierId: string) => boolean;
}) {
  const [repo] = useState(() => createMemoryRepository<Supplier, SupplierInput>(seedSuppliers, { prefix: "sup" }));
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => setSuppliers(await repo.list()), [repo]);

  useEffect(() => {
    repo.list().then((rows) => {
      setSuppliers(rows);
      setLoading(false);
    });
  }, [repo]);

  const save = useCallback<SuppliersContextValue["save"]>(
    async (input, id) => {
      const validation = validateSupplier(input, suppliers, id);
      if (!validation.ok) return validation;
      const clean = { ...input, name: input.name.trim(), taxId: input.taxId.trim().replace(/\s+/g, " ") };
      const row = id ? await repo.update(id, clean) : await repo.create(clean);
      await refresh();
      return { ok: true, row };
    },
    [suppliers, repo, refresh],
  );

  const usage = useCallback((id: string) => (isReferenced(id) ? "Tiene boletas asociadas." : null), [isReferenced]);

  const remove = useCallback(
    async (id: string) => {
      if (usage(id)) return false;
      await repo.remove(id);
      await refresh();
      return true;
    },
    [repo, refresh, usage],
  );

  const value = useMemo(() => ({ suppliers, loading, save, remove, usage }), [suppliers, loading, save, remove, usage]);

  return <SuppliersContext.Provider value={value}>{children}</SuppliersContext.Provider>;
}

export function useSuppliers(): SuppliersContextValue {
  const context = useContext(SuppliersContext);
  if (!context) throw new Error("useSuppliers requiere <SuppliersProvider>.");
  return context;
}
