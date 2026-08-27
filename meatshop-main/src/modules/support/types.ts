export type SupportStatus = "OPEN" | "ANSWERED" | "WAITING_SUPPORT" | "WAITING_USER" | "CLOSED";
export type SupportCategory = "ACCOUNT" | "BILLING" | "ORDER" | "TECHNICAL" | "SUGGESTION" | "OTHER";
export type SupportPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

export type SupportAttachment = {
  id: number; file_url: string; original_name: string; mime_type: string; size_bytes: number;
};
export type SupportMessage = {
  id: number; sender_id: number; message: string | null; created_at: string;
  sender: { id: number; name: string; global_role: "SUPER_ADMIN" | "USER" };
  attachments: SupportAttachment[];
};
export type SupportTicket = {
  id: number; user_id: number; unit_id: number | null; order_id: number | null;
  subject: string; description: string; status: SupportStatus; category: SupportCategory;
  priority: SupportPriority; created_at: string; updated_at: string; last_message_at: string;
  closed_at: string | null; user?: { id: number; name: string; email: string };
  unit?: { id: number; name: string } | null; messages?: SupportMessage[];
};

export const categoryLabels: Record<SupportCategory, string> = {
  ACCOUNT: "Conta e acesso", BILLING: "Cobrança e pagamento", ORDER: "Pedido",
  TECHNICAL: "Problema técnico", SUGGESTION: "Sugestão", OTHER: "Outro assunto",
};
export const priorityLabels: Record<SupportPriority, string> = {
  LOW: "Baixa", NORMAL: "Normal", HIGH: "Alta", URGENT: "Urgente",
};
export const statusLabels: Record<SupportStatus, string> = {
  OPEN: "Aberto", ANSWERED: "Respondido", WAITING_SUPPORT: "Aguardando MeatShop",
  WAITING_USER: "Aguardando usuário", CLOSED: "Encerrado",
};
