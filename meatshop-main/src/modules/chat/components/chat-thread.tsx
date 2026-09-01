'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, CheckCheck, MessageCircle, Send, Wifi, WifiOff } from 'lucide-react';
import { io, type Socket } from 'socket.io-client';
import { Button } from '@/shared/components/ui/button';
import { Spinner } from '@/shared/components/ui/spinner';
import { Textarea } from '@/shared/components/ui/textarea';
import { API_URL, apiGet, apiPatch, apiPost } from '@/shared/lib/api';
import { toast } from '@/shared/lib/toast';
import type { ChatMessage, ChatParticipantType, ChatReadReceipt } from '../types';

type ChatThreadProps = {
  orderId: number;
  participantType: ChatParticipantType;
  participantLabel: string;
  currentUserId: number;
  closed: boolean;
};

type TypingEvent = {
  order_id: number;
  participant_type: ChatParticipantType;
  user_id: number;
  typing: boolean;
};

function mergeMessage(current: ChatMessage[], incoming: ChatMessage): ChatMessage[] {
  if (current.some((item) => item.id === incoming.id)) return current;
  return [...current, incoming].sort(
    (a, b) => new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime(),
  );
}

const timeFormatter = new Intl.DateTimeFormat('pt-BR', {
  hour: '2-digit', minute: '2-digit',
});

export function ChatThread({ orderId, participantType, participantLabel, currentUserId, closed }: ChatThreadProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [connected, setConnected] = useState(false);
  const [otherIsTyping, setOtherIsTyping] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const markRead = useCallback(async () => {
    try {
      await apiPatch(`/orders/${orderId}/chat/read?participant_type=${participantType}`, {}, { silent: true });
    } catch {
      // Falhas de leitura não interrompem o envio ou o recebimento.
    }
  }, [orderId, participantType]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setMessages([]);
    void apiGet(
      `/orders/${orderId}/chat?participant_type=${participantType}&page=1&limit=100`,
      { signal: controller.signal, silent: true },
    )
      .then((data: unknown) => {
        if (Array.isArray(data)) {
          setMessages(data as ChatMessage[]);
          void markRead();
        }
      })
      .catch(() => toast.error('Falha ao carregar a conversa.'))
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    const socket = io(`${API_URL}/chat`, {
      transports: ['websocket', 'polling'],
      withCredentials: true,
      reconnection: true,
    });
    socketRef.current = socket;
    const room = { order_id: orderId, participant_type: participantType };
    socket.on('connect', () => {
      setConnected(true);
      socket.emit('chat:join', room);
    });
    socket.on('disconnect', () => setConnected(false));
    socket.on('chat:message', (message: ChatMessage) => {
      if (message.order_id !== orderId || message.participant_type !== participantType) return;
      setMessages((current) => mergeMessage(current, message));
      if (message.sender_id !== currentUserId) void markRead();
    });
    socket.on('chat:read', (receipt: ChatReadReceipt) => {
      const sameRoom = receipt.order_id === orderId && receipt.participant_type === participantType;
      if (!sameRoom || receipt.reader_id === currentUserId) return;
      setMessages((current) => current.map((message) =>
        message.sender_id === currentUserId ? { ...message, read_at: receipt.read_at } : message,
      ));
    });
    socket.on('chat:typing', (event: TypingEvent) => {
      const sameRoom = event.order_id === orderId && event.participant_type === participantType;
      if (sameRoom && event.user_id !== currentUserId) setOtherIsTyping(event.typing);
    });
    socket.on('chat:error', () => toast.error('Não foi possível conectar à conversa.'));
    return () => {
      controller.abort();
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      socket.emit('chat:leave', room);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [currentUserId, markRead, orderId, participantType]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages, otherIsTyping]);

  function handleDraftChange(value: string) {
    setDraft(value);
    const socket = socketRef.current;
    if (!socket?.connected) return;
    const payload = { order_id: orderId, participant_type: participantType };
    socket.emit('chat:typing', { ...payload, typing: Boolean(value.trim()) });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('chat:typing', { ...payload, typing: false });
    }, 1200);
  }

  async function sendMessage() {
    const message = draft.trim();
    if (!message || sending || closed) return;
    setSending(true);
    try {
      const sent = (await apiPost(`/orders/${orderId}/chat`, {
        participant_type: participantType, message,
      })) as ChatMessage;
      setMessages((current) => mergeMessage(current, sent));
      setDraft('');
      socketRef.current?.emit('chat:typing', {
        order_id: orderId, participant_type: participantType, typing: false,
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <section className='flex min-h-0 flex-1 flex-col bg-slate-50'>
      <header className='flex items-center justify-between border-b bg-white px-5 py-3'>
        <div>
          <h2 className='font-semibold text-slate-900'>{participantLabel}</h2>
          <p className='text-xs text-slate-500'>Pedido #{orderId}</p>
        </div>
        <span className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${connected ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
          {connected ? <Wifi className='size-3.5' /> : <WifiOff className='size-3.5' />}
          {connected ? 'Tempo real conectado' : 'Reconectando...'}
        </span>
      </header>
      <div className='min-h-0 flex-1 space-y-3 overflow-y-auto p-5' aria-live='polite'>
        {loading ? (
          <div className='flex h-full items-center justify-center gap-2 text-sm text-slate-500'>
            <Spinner /> Carregando conversa...
          </div>
        ) : messages.length === 0 ? (
          <div className='flex h-full flex-col items-center justify-center text-center text-slate-500'>
            <span className='mb-3 rounded-full bg-white p-4 shadow-sm'>
              <MessageCircle className='size-7 text-red-600' />
            </span>
            <p className='font-medium text-slate-700'>Comece a conversa</p>
            <p className='mt-1 max-w-sm text-sm'>Use este canal apenas para informações relacionadas ao pedido.</p>
          </div>
        ) : (
          <>
            {messages.map((item) => {
              const mine = item.sender_id === currentUserId;
              return (
                <article key={item.id} className={mine ? 'flex justify-end' : 'flex justify-start'}>
                  <div className={mine ? 'max-w-[82%] rounded-2xl rounded-br-md bg-red-600 px-4 py-2.5 text-white shadow-sm' : 'max-w-[82%] rounded-2xl rounded-bl-md border bg-white px-4 py-2.5 text-slate-800 shadow-sm'}>
                    {!mine && <p className='mb-1 text-xs font-semibold text-slate-500'>{item.sender_name}</p>}
                    <p className='whitespace-pre-wrap break-words text-sm leading-relaxed'>{item.message}</p>
                    <span className={mine ? 'mt-1 flex items-center justify-end gap-1 text-[10px] text-red-100' : 'mt-1 flex justify-end text-[10px] text-slate-400'}>
                      {timeFormatter.format(new Date(item.sent_at))}
                      {mine && (item.read_at ? <CheckCheck className='size-3.5' /> : <Check className='size-3.5' />)}
                    </span>
                  </div>
                </article>
              );
            })}
          </>
        )}
        {otherIsTyping && <p className='text-xs italic text-slate-500'>{participantLabel} está digitando...</p>}
        <div ref={bottomRef} />
      </div>
      <footer className='border-t bg-white p-4'>
        {closed ? (
          <p className='rounded-lg bg-slate-100 px-4 py-3 text-center text-sm text-slate-600'>
            Esta conversa foi encerrada junto com o pedido. O histórico continua disponível.
          </p>
        ) : (
          <div className='flex items-end gap-3'>
            <Textarea
              value={draft}
              onChange={(event) => handleDraftChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  void sendMessage();
                }
              }}
              maxLength={2000}
              rows={2}
              placeholder={`Escreva para ${participantLabel.toLowerCase()}...`}
              className='max-h-32 min-h-11 resize-none'
              aria-label={`Mensagem para ${participantLabel}`}
            />
            <Button type='button' size='icon' disabled={sending || !draft.trim()}
              onClick={() => void sendMessage()} className='size-11 shrink-0 bg-red-600 hover:bg-red-700' aria-label='Enviar mensagem'>
              {sending ? <Spinner /> : <Send className='size-4' />}
            </Button>
          </div>
        )}
        {!closed && <p className='mt-1 text-right text-[11px] text-slate-400'>Enter envia · Shift + Enter quebra a linha · {draft.length}/2000</p>}
      </footer>
    </section>
  );
}
