import type { Metadata } from "next";
import { NamedCatalogPage } from "@/modules/catalogs";

export const metadata: Metadata = { title: "Emisores · INDAPO" };

export default function Page() {
  return <NamedCatalogPage kind="issuers" />;
}
