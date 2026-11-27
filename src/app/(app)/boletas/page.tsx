import type { Metadata } from "next";
import { TicketsList, type TicketStatus } from "@/modules/intake";

export const metadata: Metadata = { title: "Boletas · INDAPO" };

const STATUSES: TicketStatus[] = ["draft", "in_review", "approved", "observed", "rejected"];

export default async function TicketsPage({ searchParams }: PageProps<"/boletas">) {
  const { estado } = await searchParams;
  const status = STATUSES.find((value) => value === estado);
  return <TicketsList key={status ?? "all"} status={status} />;
}
