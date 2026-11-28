import type {
  Campaign,
  CampaignField,
  CampaignInput,
  FieldErrors,
  NamedInput,
  NamedRecord,
  Product,
  Validation,
} from "./types.ts";

export function normalizeName(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("es");
}

export function toValidation<K extends string>(errors: FieldErrors<K>): Validation<K> {
  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true };
}

function nameError(name: string, existing: Array<{ id: string; name: string }>, selfId?: string): string | undefined {
  const normalized = normalizeName(name);
  if (!normalized) return "Ingresa un nombre.";
  if (existing.some((row) => row.id !== selfId && normalizeName(row.name) === normalized)) {
    return "Ya existe un registro con este nombre.";
  }
  return undefined;
}

export function validateNamed(input: NamedInput, existing: NamedRecord[], selfId?: string): Validation<"name"> {
  const name = nameError(input.name, existing, selfId);
  return toValidation(name ? { name } : {});
}

export function validateCampaign(
  input: CampaignInput,
  context: { campaigns: Campaign[]; products: Product[] },
  current?: Campaign,
): Validation<CampaignField> {
  const errors: FieldErrors<CampaignField> = {};

  const name = nameError(input.name, context.campaigns, current?.id);
  if (name) errors.name = name;

  const product = context.products.find((row) => row.id === input.productId);
  if (!input.productId) errors.productId = "Selecciona un producto.";
  else if (!product) errors.productId = "El producto no existe.";
  else if (!product.active && current?.productId !== input.productId) errors.productId = "El producto está inactivo.";

  if (!input.startDate) errors.startDate = "Ingresa la fecha de inicio.";
  if (!input.endDate) errors.endDate = "Ingresa la fecha de fin.";
  else if (input.startDate && input.endDate < input.startDate) {
    errors.endDate = "La fecha de fin debe ser igual o posterior al inicio.";
  }

  return toValidation(errors);
}

export function campaignsUsingProduct(productId: string, campaigns: Campaign[]): Campaign[] {
  return campaigns.filter((campaign) => campaign.productId === productId);
}

export function isSelectable(row: NamedRecord | Campaign): boolean {
  return "active" in row ? row.active : row.status === "open";
}

export type Option = { id: string; name: string };

export function selectableOptions<T extends NamedRecord | Campaign>(
  rows: T[],
  currentId: string,
  label: (row: T) => string = (row) => row.name,
): Option[] {
  return rows
    .filter((row) => isSelectable(row) || row.id === currentId)
    .map((row) => ({
      id: row.id,
      name: isSelectable(row) ? label(row) : `${label(row)} (${"active" in row ? "inactivo" : "cerrada"})`,
    }));
}

export function campaignLabel(campaign: Campaign, products: Product[]): string {
  const product = products.find((row) => row.id === campaign.productId);
  return product ? `${campaign.name} · ${product.name}` : campaign.name;
}

export function campaignsForDate(campaigns: Campaign[], date: string): Campaign[] {
  const day = date.slice(0, 10);
  if (!day) return [];
  return campaigns.filter((campaign) => campaign.startDate <= day && day <= campaign.endDate);
}

export function defaultCampaignId(campaigns: Campaign[], today: string): string {
  const open = campaigns.filter((campaign) => campaign.status === "open");
  const current = campaignsForDate(open, today)[0];
  if (current) return current.id;
  return [...open].sort((a, b) => b.startDate.localeCompare(a.startDate))[0]?.id ?? "";
}

/** Unidad de negocio de una boleta según su emisor (provisional, D02). Cadena vacía si no hay. */
export function businessUnitIdFor(issuerId: string, issuers: Array<Pick<NamedRecord, "id" | "businessUnitId">>): string {
  return issuers.find((issuer) => issuer.id === issuerId)?.businessUnitId ?? "";
}

export function issuersInUnit(unitId: string, issuers: NamedRecord[]): NamedRecord[] {
  return issuers.filter((issuer) => issuer.businessUnitId === unitId);
}
