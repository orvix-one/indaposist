import type { CatalogKind } from "../domain/types";

export const CONFIG_ROUTE = "/configuracion";

export const catalogLabels: Record<
  CatalogKind,
  { title: string; singular: string; create: string; description: string; placeholder: string; href: string }
> = {
  campaigns: {
    title: "Campañas",
    singular: "campaña",
    create: "Nueva campaña",
    description: "Épocas de cosecha por producto.",
    placeholder: "Ej. Verano 2026/27",
    href: `${CONFIG_ROUTE}/campanas`,
  },
  sites: {
    title: "Acopios",
    singular: "acopio",
    create: "Nuevo acopio",
    description: "Lugares donde se recibe el grano.",
    placeholder: "Ej. Acopio San Julián",
    href: `${CONFIG_ROUTE}/acopios`,
  },
  issuers: {
    title: "Emisores",
    singular: "emisor",
    create: "Nuevo emisor",
    description: "Balanzas o empresas que imprimen la boleta.",
    placeholder: "Ej. Balanza San Julián",
    href: `${CONFIG_ROUTE}/emisores`,
  },
  products: {
    title: "Productos",
    singular: "producto",
    create: "Nuevo producto",
    description: "Granos que se reciben.",
    placeholder: "Ej. Soya en grano",
    href: `${CONFIG_ROUTE}/productos`,
  },
};

export const CATALOG_ORDER: CatalogKind[] = ["campaigns", "sites", "issuers", "products"];

export function formatDate(value: string): string {
  if (!value) return "—";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

export function compareByName(a: { name: string }, b: { name: string }): number {
  return a.name.localeCompare(b.name, "es", { sensitivity: "base" });
}
