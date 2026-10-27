import { describe, expect, it } from '@jest/globals';
import { parseChatbotStream, type AiUpstreamStreamEvent } from './ai-chatbot-stream';

function streamOf(...chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(controller) {
      chunks.forEach((chunk) => controller.enqueue(encoder.encode(chunk)));
      controller.close();
    },
  });
}

async function collect(body: ReadableStream<Uint8Array>): Promise<AiUpstreamStreamEvent[]> {
  const events: AiUpstreamStreamEvent[] = [];
  for await (const event of parseChatbotStream(body)) events.push(event);
  return events;
}

describe('parseChatbotStream', () => {
  it('parses deltas split across network chunks and stops at [DONE]', async () => {
    const events = await collect(
      streamOf(
        'data: {"delta": "A pica',
        'nha "}\n\ndata: {"delta": "é ótima"}\r\n\r\n',
        'data: [DONE]\n\n',
      ),
    );

    expect(events).toEqual([
      { type: 'delta', text: 'A picanha ' },
      { type: 'delta', text: 'é ótima' },
      { type: 'done' },
    ]);
  });

  it('maps upstream errors and ignores malformed or unknown events', async () => {
    const events = await collect(
      streamOf(
        ': ping\n\ndata: {oops\n\ndata: {"other": 1}\n\ndata: {"error": "falhou"}\n\ndata: [DONE]',
      ),
    );

    expect(events).toEqual([{ type: 'error', message: 'falhou' }, { type: 'done' }]);
  });

  it('ends without done when the upstream closes early', async () => {
    const events = await collect(streamOf('data: {"delta": "parcial"}\n\n'));

    expect(events).toEqual([{ type: 'delta', text: 'parcial' }]);
  });
});
