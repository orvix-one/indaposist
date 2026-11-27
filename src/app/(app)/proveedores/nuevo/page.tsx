import type { Metadata } from "next";
import { SupplierFormPage } from "@/modules/intake";

export const metadata: Metadata = { title: "Nuevo proveedor · INDAPO" };

export default function Page() {
  return <SupplierFormPage />;
}
