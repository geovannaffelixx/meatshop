import { SupportDetailScreen } from "@/modules/support";

export default async function SupportTicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SupportDetailScreen ticketId={Number(id)} />;
}
