/* Catálogos y sesión de ejemplo hasta que existan los módulos access y catalogs (IND-01). Datos sintéticos. */

export type CatalogItem = { id: string; name: string };
export type Supplier = CatalogItem & { taxId: string };

export const issuers: CatalogItem[] = [
  { id: "sj", name: "Balanza San Julián" },
  { id: "cc", name: "Balanza Cuatro Cañadas" },
  { id: "pc", name: "Proléa/Cargill" },
];

export const sites: CatalogItem[] = [
  { id: "sj", name: "Acopio San Julián" },
  { id: "cc", name: "Acopio Cuatro Cañadas" },
  { id: "pa", name: "Acopio Pailón" },
];

export const campaigns: CatalogItem[] = [
  { id: "v26", name: "Verano 2025/26 · Soya" },
  { id: "i26", name: "Invierno 2026 · Soya" },
];

export const products: CatalogItem[] = [{ id: "soy", name: "Soya en grano" }];

export const suppliers: Supplier[] = [
  { id: "s1", name: "Agropecuaria San Julián", taxId: "NIT 1028374019" },
  { id: "s2", name: "Cooperativa El Porvenir", taxId: "NIT 3847201015" },
  { id: "s3", name: "Hnos. Quiroga Vaca", taxId: "CI 5928374 SC" },
  { id: "s4", name: "Agrícola Los Troncos S.R.L.", taxId: "NIT 2093847016" },
  { id: "s5", name: "Productores Unidos Pailón", taxId: "NIT 7738291010" },
  { id: "s6", name: "Rolando Paz Céspedes", taxId: "CI 4410293 SC" },
  { id: "s7", name: "Granos del Oriente S.A.", taxId: "NIT 1203948027" },
  { id: "s8", name: "Menonitas Colonia Río Negro", taxId: "NIT 9928374013" },
];

export const currentUser = {
  name: "Lucía Méndez",
  role: "Operación",
  canRegisterPhotocopy: false,
};

export function catalogName(list: CatalogItem[], id: string): string {
  return list.find((item) => item.id === id)?.name ?? "";
}

export function supplierById(id: string): Supplier | undefined {
  return suppliers.find((supplier) => supplier.id === id);
}
