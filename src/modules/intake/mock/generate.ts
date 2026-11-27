/* Generador determinista de boletas y sugerencias de OCR sintéticas para el estado inicial. */

import { emptyFields } from "../domain/fields";
import { CONFIDENCE_THRESHOLD } from "../domain/rules";
import type { FieldPath, QualityKey, Suggestions, TicketFields } from "../domain/types";
import { QUALITY_KEYS } from "../domain/types";
import { seedSuppliers } from "./supplier-seed";

export function createRandom(seed: number) {
  let state = seed >>> 0;
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (min: number, max: number) => Math.floor(next() * (max - min + 1)) + min,
    pick: <T,>(items: readonly T[]) => items[Math.floor(next() * items.length)],
  };
}

const kgFormat = new Intl.NumberFormat("es-BO", { maximumFractionDigits: 0 });
const percentFormat = new Intl.NumberFormat("es-BO", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

const DRIVERS = ["Juan Carlos Rojas", "Marco Antonio Suárez", "Edwin Choque Mamani", "Freddy Vaca Díez", "Ronald Justiniano", "Wilson Ortiz Peña"];
const ORIGINS = ["San Julián", "Cuatro Cañadas", "Pailón", "El Puente", "Los Troncos", "Guarayos"];
const VEHICLES = ["Volvo FH 440", "Scania R450", "Mercedes Actros", "Volvo NH12", "International 9800"];
const PLATE_LETTERS = ["KTR", "LPB", "HSD", "GZX", "NBC", "MRT"];

export function generateFields(seed: number, options: { weighedAt: string; officeArrivalDate?: string }): TicketFields {
  const random = createRandom(seed);
  const supplier = random.pick(seedSuppliers);
  const gross = random.int(38_000, 45_500);
  const tare = random.int(13_800, 16_200);
  const net = gross - tare;
  const moisture = 13 + random.next() * 2.6;
  const impurity = 0.8 + random.next() * 1.8;
  const minor = () => random.next() * 1.1;
  const percents: Record<QualityKey, number> = {
    moisture,
    impurity,
    damaged: minor(),
    broken: minor(),
    green: minor() * 0.5,
    other: minor() * 0.3,
  };
  const discountFor: Record<QualityKey, number> = {
    moisture: Math.round((net * Math.max(0, moisture - 13) * 1.2) / 100),
    impurity: Math.round((net * Math.max(0, impurity - 1)) / 100),
    damaged: Math.round((net * Math.max(0, percents.damaged - 0.5)) / 100),
    broken: 0,
    green: 0,
    other: 0,
  };
  const discount = QUALITY_KEYS.reduce((sum, key) => sum + discountFor[key], 0);
  const site = random.pick(["sj", "cc", "pa"]);

  const fields = emptyFields();
  return {
    ...fields,
    issuerId: site === "cc" ? "cc" : "sj",
    siteId: site,
    campaignId: "i26",
    productId: "soy",
    analysisNumber: String(random.int(10_000, 19_999)),
    entryNumber: String(random.int(200_000, 299_999)),
    scaleTicket: String(random.int(48_000, 48_999)).padStart(7, "0"),
    folio: String(random.int(1_000, 9_999)),
    weighedAt: options.weighedAt,
    owner: supplier.name,
    supplierId: supplier.id,
    origin: random.pick(ORIGINS),
    driver: random.pick(DRIVERS),
    driverId: `${random.int(3_000_000, 9_999_999)} SC`,
    vehicle: random.pick(VEHICLES),
    plate: `${random.int(1_000, 4_999)}-${random.pick(PLATE_LETTERS)}`,
    grossKg: kgFormat.format(gross),
    tareKg: kgFormat.format(tare),
    netKg: kgFormat.format(net),
    discountKg: kgFormat.format(discount),
    liquidKg: kgFormat.format(net - discount),
    quality: Object.fromEntries(
      QUALITY_KEYS.map((key) => [
        key,
        { percent: percentFormat.format(percents[key]), discountKg: discountFor[key] ? kgFormat.format(discountFor[key]) : "0" },
      ]),
    ) as TicketFields["quality"],
    officeArrivalDate: options.officeArrivalDate ?? "",
  };
}

const SUGGESTIBLE: FieldPath[] = [
  "issuerId",
  "siteId",
  "campaignId",
  "productId",
  "analysisNumber",
  "entryNumber",
  "scaleTicket",
  "folio",
  "weighedAt",
  "owner",
  "supplierId",
  "origin",
  "driver",
  "driverId",
  "vehicle",
  "plate",
  "grossKg",
  "tareKg",
  "netKg",
  "discountKg",
  "liquidKg",
  ...QUALITY_KEYS.flatMap((key) => [`quality.${key}.percent`, `quality.${key}.discountKg`] as FieldPath[]),
];

export function generateSuggestions(
  seed: number,
  fields: TicketFields,
  lowConfidence: FieldPath[],
): Suggestions {
  const random = createRandom(seed * 31 + 7);
  const read = (path: FieldPath): string => {
    if (path.startsWith("quality.")) {
      const [, key, column] = path.split(".") as [string, QualityKey, "percent" | "discountKg"];
      return fields.quality[key][column];
    }
    return String(fields[path as keyof TicketFields]);
  };

  return Object.fromEntries(
    SUGGESTIBLE.map((path) => {
      const low = lowConfidence.includes(path);
      const confidence = low
        ? 0.48 + random.next() * (CONFIDENCE_THRESHOLD - 0.52)
        : CONFIDENCE_THRESHOLD + 0.04 + random.next() * (0.995 - CONFIDENCE_THRESHOLD - 0.04);
      return [path, { value: read(path), confidence: Math.round(confidence * 100) / 100 }];
    }),
  );
}

export function misread(value: string): string {
  const digits = value.split("");
  const index = digits.findIndex((char, position) => position > 0 && /\d/.test(char) && /\d/.test(digits[position + 1] ?? ""));
  if (index < 0) return value;
  [digits[index], digits[index + 1]] = [digits[index + 1], digits[index]];
  return digits.join("");
}
