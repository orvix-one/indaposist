"use client";

/* Estado de los catálogos sobre repositorios en memoria. Se reinicia al recargar. */

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Repository } from "../domain/repository";
import { campaignsUsingProduct, validateCampaign, validateNamed } from "../domain/rules";
import type {
  Campaign,
  CampaignField,
  CampaignInput,
  CatalogKind,
  FieldErrors,
  NamedCatalogKind,
  NamedInput,
  NamedRecord,
} from "../domain/types";
import { createMemoryRepository } from "../mock/memory-repository";
import { seedCampaigns, seedIssuers, seedProducts, seedSites } from "../mock/seed";

export type ReferenceCheck = (kind: CatalogKind, id: string) => boolean;
export type SaveResult<T, K extends string> = { ok: true; row: T } | { ok: false; errors: FieldErrors<K> };

type Lists = Record<NamedCatalogKind, NamedRecord[]> & { campaigns: Campaign[] };
type Repos = Record<NamedCatalogKind, Repository<NamedRecord, NamedInput>> & {
  campaigns: Repository<Campaign, CampaignInput>;
};

type CatalogsContextValue = Lists & {
  loading: boolean;
  saveNamed(kind: NamedCatalogKind, input: NamedInput, id?: string): Promise<SaveResult<NamedRecord, "name">>;
  saveCampaign(input: CampaignInput, id?: string): Promise<SaveResult<Campaign, CampaignField>>;
  remove(kind: CatalogKind, id: string): Promise<boolean>;
  usage(kind: CatalogKind, id: string): string | null;
};

const CatalogsContext = createContext<CatalogsContextValue | null>(null);

const KINDS: CatalogKind[] = ["products", "sites", "issuers", "campaigns"];
const EMPTY: Lists = { products: [], sites: [], issuers: [], campaigns: [] };
const notReferenced: ReferenceCheck = () => false;

function createRepos(): Repos {
  return {
    products: createMemoryRepository(seedProducts, { prefix: "prd" }),
    sites: createMemoryRepository(seedSites, { prefix: "site" }),
    issuers: createMemoryRepository(seedIssuers, { prefix: "iss" }),
    campaigns: createMemoryRepository(seedCampaigns, { prefix: "cmp" }),
  };
}

function plural(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`;
}

export function CatalogsProvider({
  children,
  isReferenced = notReferenced,
}: {
  children: ReactNode;
  isReferenced?: ReferenceCheck;
}) {
  const [repos] = useState(createRepos);
  const [lists, setLists] = useState<Lists>(EMPTY);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(
    async (kind: CatalogKind) => {
      const rows = await repos[kind].list();
      setLists((current) => ({ ...current, [kind]: rows }));
    },
    [repos],
  );

  useEffect(() => {
    Promise.all(KINDS.map(refresh)).then(() => setLoading(false));
  }, [refresh]);

  const saveNamed = useCallback<CatalogsContextValue["saveNamed"]>(
    async (kind, input, id) => {
      const validation = validateNamed(input, lists[kind], id);
      if (!validation.ok) return validation;
      const clean = { ...input, name: input.name.trim() };
      const row = id ? await repos[kind].update(id, clean) : await repos[kind].create(clean);
      await refresh(kind);
      return { ok: true, row };
    },
    [lists, repos, refresh],
  );

  const saveCampaign = useCallback<CatalogsContextValue["saveCampaign"]>(
    async (input, id) => {
      const current = id ? lists.campaigns.find((row) => row.id === id) : undefined;
      const validation = validateCampaign(input, lists, current);
      if (!validation.ok) return validation;
      const clean = { ...input, name: input.name.trim() };
      const row = id ? await repos.campaigns.update(id, clean) : await repos.campaigns.create(clean);
      await refresh("campaigns");
      return { ok: true, row };
    },
    [lists, repos, refresh],
  );

  const usage = useCallback<CatalogsContextValue["usage"]>(
    (kind, id) => {
      if (kind === "products") {
        const count = campaignsUsingProduct(id, lists.campaigns).length;
        if (count > 0) return `Tiene ${plural(count, "campaña asociada", "campañas asociadas")}.`;
      }
      return isReferenced(kind, id) ? "Tiene boletas asociadas." : null;
    },
    [lists.campaigns, isReferenced],
  );

  const remove = useCallback<CatalogsContextValue["remove"]>(
    async (kind, id) => {
      if (usage(kind, id)) return false;
      await repos[kind].remove(id);
      await refresh(kind);
      return true;
    },
    [repos, refresh, usage],
  );

  const value = useMemo(
    () => ({ ...lists, loading, saveNamed, saveCampaign, remove, usage }),
    [lists, loading, saveNamed, saveCampaign, remove, usage],
  );

  return <CatalogsContext.Provider value={value}>{children}</CatalogsContext.Provider>;
}

export function useCatalogs(): CatalogsContextValue {
  const context = useContext(CatalogsContext);
  if (!context) throw new Error("useCatalogs requiere <CatalogsProvider>.");
  return context;
}
