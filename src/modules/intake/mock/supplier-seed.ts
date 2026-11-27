/* Proveedores sintéticos iniciales. Las boletas de ejemplo usan estos mismos ids. */

import type { Supplier } from "../domain/supplier";

const at = "2026-11-01T12:00:00.000Z";
const supplier = (id: string, name: string, taxId: string): Supplier => ({ id, name, taxId, active: true, createdAt: at, updatedAt: at });

export const seedSuppliers: Supplier[] = [
  supplier("s1", "Agropecuaria San Julián", "NIT 1028374019"),
  supplier("s2", "Cooperativa El Porvenir", "NIT 3847201015"),
  supplier("s3", "Hnos. Quiroga Vaca", "CI 5928374 SC"),
  supplier("s4", "Agrícola Los Troncos S.R.L.", "NIT 2093847016"),
  supplier("s5", "Productores Unidos Pailón", "NIT 7738291010"),
  supplier("s6", "Rolando Paz Céspedes", "CI 4410293 SC"),
  supplier("s7", "Granos del Oriente S.A.", "NIT 1203948027"),
  supplier("s8", "Menonitas Colonia Río Negro", "NIT 9928374013"),
];
