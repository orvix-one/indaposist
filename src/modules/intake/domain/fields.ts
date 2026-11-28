import type { QualityKey, QualityRow, TicketFields } from "./types.ts";
import { QUALITY_KEYS } from "./types.ts";

export function emptyFields(): TicketFields {
  return {
    issuerId: "",
    siteId: "",
    campaignId: "",
    productId: "",
    analysisNumber: "",
    entryNumber: "",
    scaleTicket: "",
    folio: "",
    weighedAt: "",
    owner: "",
    supplierId: "",
    origin: "",
    driver: "",
    driverId: "",
    vehicle: "",
    plate: "",
    grossKg: "",
    tareKg: "",
    netKg: "",
    discountKg: "",
    liquidKg: "",
    quality: Object.fromEntries(QUALITY_KEYS.map((key) => [key, { percent: "", discountKg: "" }])) as Record<
      QualityKey,
      QualityRow
    >,
    officeArrivalDate: "",
    documentType: "",
    archived: false,
    archiveLocation: "",
    modality: "",
    quantity: "",
    quantityUnit: "t",
    price: "",
    currency: "BOB",
    notes: "",
  };
}
