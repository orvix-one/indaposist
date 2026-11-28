/* Páginas de un archivo: huellas, etiquetas y la regla para unir páginas mal separadas (IND-02.08). */

import type { IntakeDocument, Ticket, TicketStatus } from "./types.ts";

/** Estados en los que una página todavía se puede unir: ya se leyó (o falló) y nadie la envió a revisión. */
const MERGEABLE: IntakeDocument["status"][] = ["suggested", "failed", "duplicate"];

export function pagesLabel(pages: number[]): string {
  if (pages.length === 1) return `pág. ${pages[0]}`;
  return `págs. ${pages[0]}–${pages[pages.length - 1]}`;
}

/** Huella del archivo del que salió el documento: la del original si viene de un PDF, si no la propia. */
export function fileHashOf(doc: Pick<IntakeDocument, "sha256" | "source">): string {
  return doc.source?.fileSha256 ?? doc.sha256;
}

export type MergeCheck = { ok: true; previousId: string } | { ok: false; reason: string };

/**
 * Comprueba si `docId` se puede unir con la página inmediatamente anterior del mismo archivo.
 * Ambas deben estar leídas o fallidas y, si ya tienen boleta, seguir en borrador.
 */
export function canMergeWithPrevious(
  docId: string,
  documents: IntakeDocument[],
  tickets: Array<Pick<Ticket, "id" | "status">>,
): MergeCheck {
  const doc = documents.find((item) => item.id === docId);
  if (!doc?.source) return { ok: false, reason: "No es una página de un archivo." };
  const first = doc.source.pages[0];
  const fileHash = doc.source.fileSha256;
  const previous = documents.find((item) => item.source?.fileSha256 === fileHash && item.source.pages[item.source.pages.length - 1] === first - 1);
  if (!previous?.source) return { ok: false, reason: "No hay una página anterior en la bandeja." };

  const statusOf = (ticketId?: string): TicketStatus | undefined => tickets.find((ticket) => ticket.id === ticketId)?.status;
  for (const item of [previous, doc]) {
    if (!MERGEABLE.includes(item.status)) return { ok: false, reason: "Espera a que ambas páginas terminen de leerse." };
    const status = statusOf(item.ticketId);
    if (status && status !== "draft") return { ok: false, reason: "Una de las páginas ya se envió a revisión." };
  }
  return { ok: true, previousId: previous.id };
}
