/* Puerto de acceso a datos. Hoy lo implementa un repositorio en memoria; mañana, Server Actions sobre Supabase. */

import type { Entity } from "./types.ts";

export type Repository<T extends Entity, Input> = {
  list(): Promise<T[]>;
  get(id: string): Promise<T | null>;
  create(input: Input): Promise<T>;
  update(id: string, patch: Partial<Input>): Promise<T>;
  remove(id: string): Promise<void>;
};
