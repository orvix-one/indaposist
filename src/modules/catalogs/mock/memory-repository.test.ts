import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { NamedInput, NamedRecord } from "../domain/types.ts";
import { createMemoryRepository } from "./memory-repository.ts";

const at = "2026-11-01T12:00:00.000Z";
const seed: NamedRecord[] = [{ id: "sj", name: "Acopio San Julián", active: true, createdAt: at, updatedAt: at }];
const now = () => new Date("2026-11-27T10:00:00.000Z");
const repo = () => createMemoryRepository<NamedRecord, NamedInput>(seed, { prefix: "site", latencyMs: 0, now });

describe("createMemoryRepository", () => {
  it("crea, edita y elimina", async () => {
    const sites = repo();
    const created = await sites.create({ name: "Acopio Pailón", active: true });
    assert.match(created.id, /^site-/);
    assert.equal(created.createdAt, now().toISOString());

    const updated = await sites.update(created.id, { active: false });
    assert.equal(updated.active, false);
    assert.equal(updated.name, "Acopio Pailón");

    await sites.remove(created.id);
    assert.equal(await sites.get(created.id), null);
    assert.equal((await sites.list()).length, 1);
  });

  it("no comparte referencias con quien llama ni con el seed", async () => {
    const sites = repo();
    const [first] = await sites.list();
    first.name = "mutado";
    assert.equal((await sites.get("sj"))?.name, "Acopio San Julián");
    await sites.update("sj", { name: "Otro" });
    assert.equal(seed[0].name, "Acopio San Julián");
  });

  it("falla al editar un id inexistente", async () => {
    await assert.rejects(repo().update("nope", { name: "x" }));
  });
});
