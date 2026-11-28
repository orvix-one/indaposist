"use client";

/* Proveedores sobre un repositorio en memoria. Se reinicia al recargar. */

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createMemoryRepository } from "@/modules/catalogs";
import { cleanSupplier, validateSupplier, type Supplier, type SupplierField, type SupplierInput } from "../domain/supplier";
import { seedSuppliers } from "../mock/supplier-seed";

export type SupplierSaveResult = { ok: true; row: Supplier } | { ok: false; errors: Partial<Record<SupplierField, string>> };

type SuppliersContextValue = {
  suppliers: Supplier[];
  loading: boolean;
  save(input: SupplierInput, id?: string): Promise<SupplierSaveResult>;
  remove(id: string): Promise<boolean>;
  usage(id: string): string | null;
  registerReferenceCheck(check: SupplierReferenceCheck): () => void;
};

export type SupplierReferenceCheck = (supplierId: string) => boolean;

const SuppliersContext = createContext<SuppliersContextValue | null>(null);
export function SuppliersProvider({ children }: { children: ReactNode }) {
  const [repo] = useState(() => createMemoryRepository<Supplier, SupplierInput>(seedSuppliers, { prefix: "sup" }));
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const checksRef = useRef(new Set<SupplierReferenceCheck>());

  const registerReferenceCheck = useCallback((check: SupplierReferenceCheck) => {
    checksRef.current.add(check);
    return () => {
      checksRef.current.delete(check);
    };
  }, []);

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
      const clean = cleanSupplier(input);
      const row = id ? await repo.update(id, clean) : await repo.create(clean);
      await refresh();
      return { ok: true, row };
    },
    [suppliers, repo, refresh],
  );

  const usage = useCallback(
    (id: string) => ([...checksRef.current].some((check) => check(id)) ? "Tiene boletas asociadas." : null),
    [],
  );

  const remove = useCallback(
    async (id: string) => {
      if (usage(id)) return false;
      await repo.remove(id);
      await refresh();
      return true;
    },
    [repo, refresh, usage],
  );

  const value = useMemo(
    () => ({ suppliers, loading, save, remove, usage, registerReferenceCheck }),
    [suppliers, loading, save, remove, usage, registerReferenceCheck],
  );

  return <SuppliersContext.Provider value={value}>{children}</SuppliersContext.Provider>;
}

export function useSuppliers(): SuppliersContextValue {
  const context = useContext(SuppliersContext);
  if (!context) throw new Error("useSuppliers requiere <SuppliersProvider>.");
  return context;
}
