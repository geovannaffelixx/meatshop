export type ChatParticipantType =
  | "UNIT"
  | "DELIVERY_PERSON"
  | "UNIT_DELIVERY_PERSON";

export type ChatMessage = {
  id: number;
  order_id: number;
  sender_id: number;
  receiver_id: number;
  sender_name: string;
  receiver_name: string;
  participant_type: ChatParticipantType;
  message: string;
  sent_at: string;
  read_at: string | null;
};

export type ChatReadReceipt = {
  order_id: number;
  participant_type: ChatParticipantType;
  reader_id: number;
  updated_count: number;
  read_at: string;
};

export type ChatOrder = {
  id: number;
  client_id: number;
  client_name: string | null;
  unit_id: number;
  delivery_person_id: number | null;
  order_date: string;
  status: string;
  delivery_type: string;
  total_amount: number;
};
