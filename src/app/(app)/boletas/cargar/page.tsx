import type { Metadata } from "next";
import { UploadInbox } from "@/modules/intake";

export const metadata: Metadata = { title: "Cargar escaneos · INDAPO" };

export default function UploadPage() {
  return <UploadInbox />;
}
