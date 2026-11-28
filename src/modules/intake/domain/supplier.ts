export type SupplierInput = {
  name: string;
  taxId: string;
  phone: string;
  origin: string;
  /** Registro Único Agropecuario. Opcional; su exigencia para cobrar se define en D03. */
  rua: string;
  active: boolean;
};
export type Supplier = SupplierInput & { id: string; createdAt: string; updatedAt: string };
export type SupplierField = "name" | "taxId" | "phone" | "rua";
export type SupplierValidation = { ok: true } | { ok: false; errors: Partial<Record<SupplierField, string>> };

export const EMPTY_SUPPLIER: SupplierInput = { name: "", taxId: "", phone: "", origin: "", rua: "", active: true };

export function normalizeTaxId(value: string): string {
  return value.toUpperCase().replace(/[\s.\-]/g, "");
}

export function normalizeRua(value: string): string {
  return value.toUpperCase().replace(/[^0-9A-Z]/g, "");
}

export function hasRua(supplier: Pick<SupplierInput, "rua">): boolean {
  return normalizeRua(supplier.rua) !== "";
}

export function validateSupplier(input: SupplierInput, existing: Supplier[], selfId?: string): SupplierValidation {
  const errors: Partial<Record<SupplierField, string>> = {};
  const others = existing.filter((row) => row.id !== selfId);
  if (!input.name.trim()) errors.name = "Ingresa el nombre o razón social.";

  const taxId = normalizeTaxId(input.taxId);
  if (!taxId) errors.taxId = "Ingresa el NIT o CI.";
  else {
    const duplicate = others.find((row) => normalizeTaxId(row.taxId) === taxId);
    if (duplicate) errors.taxId = `Ya está registrado para ${duplicate.name}.`;
  }

  if (input.phone.trim() && !/^\+?[\d\s\-()]{6,}$/.test(input.phone.trim())) errors.phone = "Usa solo números, espacios, guiones o +.";

  const rua = normalizeRua(input.rua);
  if (rua) {
    const duplicate = others.find((row) => normalizeRua(row.rua) === rua);
    if (duplicate) errors.rua = `Ya está registrado para ${duplicate.name}.`;
  }

  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true };
}

/** Limpia espacios sobrantes antes de guardar. */
export function cleanSupplier(input: SupplierInput): SupplierInput {
  const tidy = (value: string) => value.trim().replace(/\s+/g, " ");
  return { ...input, name: tidy(input.name), taxId: tidy(input.taxId), phone: tidy(input.phone), origin: tidy(input.origin), rua: tidy(input.rua) };
}

/** Búsqueda por nombre, NIT/CI o RUA, sin distinguir mayúsculas, puntos ni guiones. */
export function matchesSupplier(supplier: Pick<SupplierInput, "name" | "taxId" | "rua">, query: string): boolean {
  const needle = query.trim().toLocaleLowerCase("es");
  if (!needle) return true;
  if (supplier.name.toLocaleLowerCase("es").includes(needle)) return true;
  const taxNeedle = normalizeTaxId(query);
  if (taxNeedle && normalizeTaxId(supplier.taxId).includes(taxNeedle)) return true;
  const ruaNeedle = normalizeRua(query);
  return ruaNeedle !== "" && normalizeRua(supplier.rua).includes(ruaNeedle);
}
