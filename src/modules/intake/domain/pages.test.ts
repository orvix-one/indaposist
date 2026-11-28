import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canMergeWithPrevious, fileHashOf, pagesLabel } from "./pages.ts";
import type { IntakeDocument } from "./types.ts";

function page(id: string, pages: number[], extra: Partial<IntakeDocument> = {}): IntakeDocument {
  return {
    id,
    name: "boletas.pdf",
    kind: "image",
    url: `blob:${id}`,
    sizeBytes: 1,
    sha256: `page-${id}`,
    status: "suggested",
    attempts: 1,
    uploadedAt: "2026-11-28T10:00:00Z",
    source: { fileName: "boletas.pdf", fileSha256: "file-a", page: pages[0], pages, pageCount: 4 },
    ...extra,
  };
}

describe("pagesLabel", () => {
  it("nombra una página o un rango", () => {
    assert.equal(pagesLabel([3]), "pág. 3");
    assert.equal(pagesLabel([1, 2]), "págs. 1–2");
  });
});

describe("fileHashOf", () => {
  it("usa la huella del archivo original para las páginas", () => {
    assert.equal(fileHashOf(page("p1", [1])), "file-a");
    assert.equal(fileHashOf({ sha256: "solo", source: undefined }), "solo");
  });
});

describe("canMergeWithPrevious", () => {
  const docs = [page("p1", [1], { ticketId: "t1" }), page("p2", [2], { ticketId: "t2" }), page("p3", [3]), page("x1", [2], { source: { fileName: "otro.pdf", fileSha256: "file-b", page: 2, pages: [2], pageCount: 2 } })];
  const drafts = [
    { id: "t1", status: "draft" as const },
    { id: "t2", status: "draft" as const },
  ];

  it("une una página con la anterior del mismo archivo", () => {
    assert.deepEqual(canMergeWithPrevious("p2", docs, drafts), { ok: true, previousId: "p1" });
  });

  it("encuentra la anterior aunque ya sea una unión de varias páginas", () => {
    const merged = [page("p12", [1, 2]), page("p3", [3])];
    assert.deepEqual(canMergeWithPrevious("p3", merged, []), { ok: true, previousId: "p12" });
  });

  it("no une la primera página ni páginas de otro archivo", () => {
    assert.equal(canMergeWithPrevious("p1", docs, drafts).ok, false);
    assert.equal(canMergeWithPrevious("x1", docs, drafts).ok, false);
  });

  it("no une páginas en proceso ni boletas ya enviadas a revisión", () => {
    const processing = [page("p1", [1], { status: "processing" }), page("p2", [2])];
    assert.equal(canMergeWithPrevious("p2", processing, []).ok, false);
    assert.equal(canMergeWithPrevious("p2", docs, [{ id: "t1", status: "in_review" }, drafts[1]]).ok, false);
  });
});
