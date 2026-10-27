export type AiUpstreamStreamEvent =
  { type: 'delta'; text: string } | { type: 'error'; message: string } | { type: 'done' };

const EVENT_SEPARATOR = /\r?\n\r?\n/;
const LINE_SEPARATOR = /\r?\n/;
const DATA_PREFIX = 'data:';
const DONE_MARKER = '[DONE]';

function extractData(rawEvent: string): string | null {
  const lines = rawEvent
    .split(LINE_SEPARATOR)
    .filter((line) => line.startsWith(DATA_PREFIX))
    .map((line) => line.slice(DATA_PREFIX.length).trimStart());
  return lines.length ? lines.join('\n') : null;
}

function* drainEvents(rawEvents: string[]): Generator<string> {
  for (const rawEvent of rawEvents) {
    const data = extractData(rawEvent);
    if (data !== null) yield data;
  }
}

async function* readSseData(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  try {
    for (;;) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      const rawEvents = buffer.split(EVENT_SEPARATOR);
      buffer = done ? '' : (rawEvents.pop() ?? '');
      yield* drainEvents(rawEvents);
      if (done) return;
    }
  } finally {
    reader.releaseLock();
  }
}

function toStreamEvent(data: string): AiUpstreamStreamEvent | null {
  if (data === DONE_MARKER) return { type: 'done' };
  try {
    const parsed = JSON.parse(data) as { delta?: unknown; error?: unknown };
    if (typeof parsed.delta === 'string') return { type: 'delta', text: parsed.delta };
    if (typeof parsed.error === 'string') return { type: 'error', message: parsed.error };
  } catch {
    return null;
  }
  return null;
}

export async function* parseChatbotStream(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<AiUpstreamStreamEvent> {
  for await (const data of readSseData(body)) {
    const event = toStreamEvent(data);
    if (event) yield event;
    if (event?.type === 'done') return;
  }
}
