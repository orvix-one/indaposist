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
