import type { Metadata } from "next";
import { PaymentsPage } from "@/modules/purchasing";

export const metadata: Metadata = { title: "Pagos · INDAPO" };

export default function Page() {
  return <PaymentsPage />;
}
