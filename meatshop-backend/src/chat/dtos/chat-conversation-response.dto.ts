import type { ChatParticipantType } from '../enums/chat-participant-type.enum';

export class ChatConversationResponseDto {
  id: string;
  order_id: number;
  participant_type: ChatParticipantType;
  participant: { id: number; name: string; avatar_url: string | null };
  last_message: string;
  last_message_at: Date;
  unread_count: number;
  closed: boolean;
}
