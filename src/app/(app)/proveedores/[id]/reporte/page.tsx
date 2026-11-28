import type { Metadata } from "next";
import { SupplierReport } from "@/modules/reports";

export const metadata: Metadata = { title: "Historial del proveedor · INDAPO" };

export default async function Page({ params }: PageProps<"/proveedores/[id]/reporte">) {
  const { id } = await params;
  return <SupplierReport supplierId={id} />;
}
