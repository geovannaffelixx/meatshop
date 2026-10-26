import type { Response } from 'express';
import type { AiChatStreamEvent, AiChatStreamSink } from './ai.types';

export function createSseSink(response: Response): AiChatStreamSink {
  const abort = new AbortController();
  response.on('close', () => {
    if (!response.writableFinished) abort.abort();
  });
  return {
    signal: abort.signal,
    open: () => {
      response.status(200);
      response.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
      response.setHeader('Cache-Control', 'no-cache, no-transform');
      response.setHeader('Connection', 'keep-alive');
      response.setHeader('X-Accel-Buffering', 'no');
      response.flushHeaders();
    },
    send: (event: AiChatStreamEvent) => {
      if (response.writableEnded || abort.signal.aborted) return;
      response.write(`data: ${JSON.stringify(event)}\n\n`);
    },
    close: () => {
      if (!response.writableEnded) response.end();
    },
  };
}
