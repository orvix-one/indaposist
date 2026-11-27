import type { Metadata } from "next";
import { SuppliersList } from "@/modules/intake";

export const metadata: Metadata = { title: "Proveedores · INDAPO" };

export default function Page() {
  return <SuppliersList />;
}
