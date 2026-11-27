export type SupplierInput = { name: string; taxId: string; active: boolean };
export type Supplier = SupplierInput & { id: string; createdAt: string; updatedAt: string };
export type SupplierField = "name" | "taxId";
export type SupplierValidation = { ok: true } | { ok: false; errors: Partial<Record<SupplierField, string>> };

export function normalizeTaxId(value: string): string {
  return value.toUpperCase().replace(/[\s.\-]/g, "");
}

export function validateSupplier(input: SupplierInput, existing: Supplier[], selfId?: string): SupplierValidation {
  const errors: Partial<Record<SupplierField, string>> = {};
  if (!input.name.trim()) errors.name = "Ingresa el nombre o razón social.";

  const taxId = normalizeTaxId(input.taxId);
  if (!taxId) errors.taxId = "Ingresa el NIT o CI.";
  else {
    const duplicate = existing.find((row) => row.id !== selfId && normalizeTaxId(row.taxId) === taxId);
    if (duplicate) errors.taxId = `Ya está registrado para ${duplicate.name}.`;
  }

  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true };
}
