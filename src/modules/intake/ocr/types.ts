import type { ExtractionUsage, Suggestions, TicketFields, TicketFormat, TicketReadings } from "../domain/types.ts";

export type ExtractionResult =
  | { ok: true; format: TicketFormat; fields: TicketFields; suggestions: Suggestions; readings: TicketReadings; usage: ExtractionUsage }
  | { ok: false; error: string };
