export type AiChatResponse = {
  response: string;
  request_id: string | null;
  conversation_id: string;
  expires_at: string;
};

export type AiUpstreamChatResponse = Omit<AiChatResponse, 'conversation_id' | 'expires_at'>;

export type AiChatStreamEvent =
  | { delta: string }
  | { error: string; code: string }
  | { done: true; conversation_id: string };

export interface AiChatStreamSink {
  readonly signal: AbortSignal;
  open(): void;
  send(event: AiChatStreamEvent): void;
  close(): void;
}

export type AiConversationResponse = {
  conversation_id: string;
  expires_at: string;
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    created_at: string;
  }>;
};

export type AiRecipeIngredient = {
  name: string;
  quantity: string;
  tip: string | null;
};

export type AiRecipeStep = {
  step_number: number;
  description: string;
  tip: string | null;
};

export type AiRecipeProduct = {
  product_id: number;
  call_to_action: string;
};

export type AiRecipeDraft = {
  title: string;
  description: string;
  tag: string;
  ingredients: AiRecipeIngredient[];
  steps: AiRecipeStep[];
  products: AiRecipeProduct[];
  safety_notice: string;
};

export type AiRecipeDraftResponse = {
  draft: AiRecipeDraft;
  request_id: string | null;
};
