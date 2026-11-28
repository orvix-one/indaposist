import type { Metadata } from "next";
import { TicketReview } from "@/modules/intake";
import { TicketPayments } from "@/modules/purchasing";

export const metadata: Metadata = { title: "Revisión de boleta · INDAPO" };

export default async function TicketPage({ params }: PageProps<"/boletas/[id]">) {
  const { id } = await params;
  return (
    <TicketReview ticketId={id}>
      <TicketPayments ticketId={id} />
    </TicketReview>
  );
}
