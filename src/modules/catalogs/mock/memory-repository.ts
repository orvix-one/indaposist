/* Repositorio en memoria: los datos viven mientras dure la sesión del navegador. */

import type { Repository } from "../domain/repository.ts";
import type { Entity } from "../domain/types.ts";

type Options = { prefix: string; latencyMs?: number; now?: () => Date };

export function createMemoryRepository<T extends Entity, Input extends object>(
  seed: T[],
  { prefix, latencyMs = 150, now = () => new Date() }: Options,
): Repository<T, Input> {
  const rows = new Map(seed.map((row) => [row.id, structuredClone(row)]));

  const settle = <R>(value: R) =>
    new Promise<R>((resolve) => setTimeout(() => resolve(structuredClone(value)), latencyMs));

  return {
    list: () => settle([...rows.values()]),
    get: (id) => settle(rows.get(id) ?? null),
    create: (input) => {
      const at = now().toISOString();
      const row = { ...input, id: `${prefix}-${crypto.randomUUID().slice(0, 8)}`, createdAt: at, updatedAt: at } as unknown as T;
      rows.set(row.id, row);
      return settle(row);
    },
    update: (id, patch) => {
      const current = rows.get(id);
      if (!current) return Promise.reject(new Error(`Registro inexistente: ${id}`));
      const row = { ...current, ...patch, id, updatedAt: now().toISOString() };
      rows.set(id, row);
      return settle(row);
    },
    remove: (id) => {
      rows.delete(id);
      return settle(undefined);
    },
  };
}
