import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { convertCents, divideRounded, formatMoney, formatRate, formatScaled, parseScaled, productToCents } from "./money.ts";

describe("parseScaled", () => {
  it("lee el formato boliviano", () => {
    assert.equal(parseScaled("2.150,75", 2), 215075n);
    assert.equal(parseScaled("26,97", 3), 26970n);
    assert.equal(parseScaled("28.450", 0), 28450n);
    assert.equal(parseScaled("6,96", 4), 69600n);
    assert.equal(parseScaled("15", 2), 1500n);
  });

  it("rechaza vacíos, texto, negativos y decimales de más", () => {
    assert.equal(parseScaled("", 2), null);
    assert.equal(parseScaled("abc", 2), null);
    assert.equal(parseScaled("-5", 2), null);
    assert.equal(parseScaled("1,234", 2), null);
  });
});

describe("divideRounded", () => {
  it("redondea mitad hacia arriba", () => {
    assert.equal(divideRounded(5n, 2n), 3n);
    assert.equal(divideRounded(4n, 3n), 1n);
    assert.equal(divideRounded(5n, 3n), 2n);
  });
});

describe("productToCents", () => {
  it("multiplica carga por precio y redondea a centavos", () => {
    // 26,970 t × Bs 2.150,00 = Bs 57.985,50
    assert.equal(productToCents(26970n, 3, 215000n, 2), 5798550n);
    // 1,005 t × Bs 3,33 = Bs 3,34665 → Bs 3,35
    assert.equal(productToCents(1005n, 3, 333n, 2), 335n);
  });
});

describe("convertCents", () => {
  it("convierte dólares a bolivianos y al revés con la tasa del pago", () => {
    assert.equal(convertCents(10000n, "USD", "BOB", 69600n), 69600n);
    assert.equal(convertCents(69600n, "BOB", "USD", 69600n), 10000n);
    assert.equal(convertCents(100000n, "BOB", "USD", 69700n), 14347n);
  });

  it("no convierte en la misma moneda", () => {
    assert.equal(convertCents(12345n, "BOB", "BOB", 69600n), 12345n);
  });
});

describe("formatos", () => {
  it("escribe miles con punto y decimales con coma", () => {
    assert.equal(formatScaled(5798550n, 2), "57.985,50");
    assert.equal(formatScaled(26970n, 3, 0), "26,97");
    assert.equal(formatScaled(5n, 2), "0,05");
    assert.equal(formatMoney(100000000n, "USD"), "$us 1.000.000,00");
    assert.equal(formatRate(69600n), "6,96");
    assert.equal(formatRate(69725n), "6,9725");
  });
});
