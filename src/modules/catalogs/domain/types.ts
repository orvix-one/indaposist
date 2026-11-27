export type Entity = { id: string; createdAt: string; updatedAt: string };

export type NamedInput = { name: string; active: boolean };
export type NamedRecord = Entity & NamedInput;
export type Product = NamedRecord;
export type Site = NamedRecord;
export type Issuer = NamedRecord;

export type CampaignStatus = "open" | "closed";
export type CampaignInput = {
  name: string;
  productId: string;
  startDate: string;
  endDate: string;
  status: CampaignStatus;
};
export type Campaign = Entity & CampaignInput;
export type CampaignField = Exclude<keyof CampaignInput, "status">;

export type NamedCatalogKind = "products" | "sites" | "issuers";
export type CatalogKind = NamedCatalogKind | "campaigns";

export type FieldErrors<K extends string> = Partial<Record<K, string>>;
export type Validation<K extends string> = { ok: true } | { ok: false; errors: FieldErrors<K> };
