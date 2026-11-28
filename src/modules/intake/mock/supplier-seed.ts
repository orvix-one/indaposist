/* Proveedores sintéticos iniciales. Las boletas de ejemplo usan estos mismos ids. */

import type { Supplier } from "../domain/supplier";

const at = "2026-11-01T12:00:00.000Z";
const supplier = (id: string, name: string, taxId: string, extra: Partial<Supplier> = {}): Supplier => ({
  id,
  name,
  taxId,
  phone: "",
  origin: "",
  rua: "",
  active: true,
  createdAt: at,
  updatedAt: at,
  ...extra,
});

export const seedSuppliers: Supplier[] = [
  supplier("s1", "Agropecuaria San Julián", "NIT 1028374019", { phone: "721 45678", origin: "San Julián", rua: "RUA 7020-0145" }),
  supplier("s2", "Cooperativa El Porvenir", "NIT 3847201015", { phone: "3 342 1180", origin: "Guarayos", rua: "RUA 7031-0872" }),
  supplier("s3", "Hnos. Quiroga Vaca", "CI 5928374 SC", { phone: "760 11223", origin: "Cuatro Cañadas" }),
  supplier("s4", "Agrícola Los Troncos S.R.L.", "NIT 2093847016", { origin: "Los Troncos", rua: "RUA 7044-1290" }),
  supplier("s5", "Productores Unidos Pailón", "NIT 7738291010", { phone: "3 345 6610", origin: "Pailón" }),
  supplier("s6", "Rolando Paz Céspedes", "CI 4410293 SC", { phone: "715 98321", origin: "San Julián", rua: "RUA 7020-0391" }),
  supplier("s7", "Granos del Oriente S.A.", "NIT 1203948027"),
  supplier("s8", "Menonitas Colonia Río Negro", "NIT 9928374013", { origin: "Colonia Río Negro", rua: "RUA 7055-0007" }),
];
