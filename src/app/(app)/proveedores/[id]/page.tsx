import type { Metadata } from "next";
import { SupplierFormPage } from "@/modules/intake";
import { SupplierAccountPanel } from "@/modules/purchasing";

export const metadata: Metadata = { title: "Proveedor · INDAPO" };

export default async function Page({ params }: PageProps<"/proveedores/[id]">) {
  const { id } = await params;
  return (
    <SupplierFormPage key={id} supplierId={id}>
      <SupplierAccountPanel supplierId={id} />
    </SupplierFormPage>
  );
}
