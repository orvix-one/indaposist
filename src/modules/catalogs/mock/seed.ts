/* Datos sintéticos iniciales. Las boletas de ejemplo de intake usan estos mismos ids. */

import type { BusinessUnit, Campaign, Issuer, Product, Site } from "../domain/types.ts";

const at = "2026-11-01T12:00:00.000Z";
const named = (id: string, name: string) => ({ id, name, active: true, createdAt: at, updatedAt: at });

export const seedProducts: Product[] = [named("soy", "Soya en grano")];

export const seedSites: Site[] = [
  named("sj", "Acopio San Julián"),
  named("cc", "Acopio Cuatro Cañadas"),
  named("pa", "Acopio Pailón"),
];

// Unidades de negocio relevadas el 18/11. Cada emisor apunta a una: es la relación provisional hasta que INDAPO la confirme (D02).
export const seedUnits: BusinessUnit[] = [named("sj", "San Julián"), named("cc", "Cuatro Cañadas"), named("pl", "Proléa")];

export const seedIssuers: Issuer[] = [
  { ...named("sj", "Balanza San Julián"), businessUnitId: "sj" },
  { ...named("cc", "Balanza Cuatro Cañadas"), businessUnitId: "cc" },
  { ...named("pc", "Proléa/Cargill"), businessUnitId: "pl" },
];

export const seedCampaigns: Campaign[] = [
  { id: "v26", name: "Verano 2025/26", productId: "soy", startDate: "2026-03-01", endDate: "2026-06-30", status: "open", createdAt: at, updatedAt: at },
  { id: "i26", name: "Invierno 2026", productId: "soy", startDate: "2026-09-01", endDate: "2026-11-30", status: "open", createdAt: at, updatedAt: at },
];
