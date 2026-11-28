/* Importes exactos: decimales escalados a enteros (bigint), sin coma flotante. Redondeo provisional mitad hacia arriba, a confirmar con Contabilidad (D04). */

export type Currency = "BOB" | "USD";

export const CURRENCIES: Currency[] = ["BOB", "USD"];

/** Decimales del tipo de cambio (Bs por USD). */
export const RATE_DECIMALS = 4;

/**
 * Lee un decimal escrito como en Bolivia ("2.150,75", "26,97", "28.450") y lo devuelve escalado a `decimals` cifras.
 * Devuelve null si está vacío, no es un número positivo o tiene más decimales de los permitidos.
 */
export function parseScaled(raw: string, decimals: number): bigint | null {
  const value = raw.trim().replace(/\s/g, "");
  if (value === "") return null;
  let normalized: string;
  if (value.includes(",")) normalized = value.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(value)) normalized = value.replace(/\./g, "");
  else normalized = value;
  const match = /^(\d+)(?:\.(\d+))?$/.exec(normalized);
  if (!match) return null;
  const [, whole, fraction = ""] = match;
  if (fraction.length > decimals) return null;
  return BigInt(whole + fraction.padEnd(decimals, "0"));
}

/** División entera de no negativos con redondeo mitad hacia arriba. */
export function divideRounded(numerator: bigint, denominator: bigint): bigint {
  return (2n * numerator + denominator) / (2n * denominator);
}

/** Producto de dos decimales escalados, llevado a centavos. */
export function productToCents(a: bigint, aDecimals: number, b: bigint, bDecimals: number): bigint {
  return divideRounded(a * b, 10n ** BigInt(aDecimals + bDecimals - 2));
}

/** Convierte centavos entre monedas con un tipo de cambio en Bs por USD escalado a RATE_DECIMALS. */
export function convertCents(cents: bigint, from: Currency, to: Currency, rate: bigint): bigint {
  if (from === to) return cents;
  const scale = 10n ** BigInt(RATE_DECIMALS);
  return from === "USD" ? divideRounded(cents * rate, scale) : divideRounded(cents * scale, rate);
}

/** Escribe un decimal escalado en formato boliviano: miles con punto y decimales con coma. */
export function formatScaled(value: bigint, decimals: number, minDecimals = decimals): string {
  const negative = value < 0n;
  const digits = (negative ? -value : value).toString().padStart(decimals + 1, "0");
  const whole = digits.slice(0, digits.length - decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  let fraction = decimals > 0 ? digits.slice(-decimals) : "";
  while (fraction.length > minDecimals && fraction.endsWith("0")) fraction = fraction.slice(0, -1);
  return `${negative ? "−" : ""}${whole}${fraction ? `,${fraction}` : ""}`;
}

export const currencySymbol: Record<Currency, string> = { BOB: "Bs", USD: "$us" };

export function formatMoney(cents: bigint, currency: Currency): string {
  return `${currencySymbol[currency]} ${formatScaled(cents, 2)}`;
}

export function formatRate(rate: bigint): string {
  return formatScaled(rate, RATE_DECIMALS, 2);
}
