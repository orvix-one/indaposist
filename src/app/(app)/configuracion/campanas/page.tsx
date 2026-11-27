import type { Metadata } from "next";
import { CampaignsPage } from "@/modules/catalogs";

export const metadata: Metadata = { title: "Campañas · INDAPO" };

export default function Page() {
  return <CampaignsPage />;
}
