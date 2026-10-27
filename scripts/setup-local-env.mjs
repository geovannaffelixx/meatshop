import { randomBytes } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';

const EXAMPLE_FILE = new URL('../.env.example', import.meta.url);
const ENV_FILE = new URL('../.env', import.meta.url);
const SECRET_BYTES = 32;
const ENTRY_PATTERN = /^([A-Z0-9_]+)=(.*)$/;

const hex = () => randomBytes(SECRET_BYTES).toString('hex');
const base64 = () => randomBytes(SECRET_BYTES).toString('base64');

const GENERATORS = {
  JWT_SECRET: hex,
  JWT_REFRESH_SECRET: hex,
  DELIVERY_CODE_SECRET: hex,
  DELIVERY_CODE_ENCRYPTION_KEY: hex,
  DATA_ENCRYPTION_KEY: base64,
  DATA_HASH_KEY: base64,
  METRICS_TOKEN: hex,
  MONITORING_WEBHOOK_TOKEN: hex,
  AI_CHATBOT_SERVICE_KEY: hex,
  SEED_PASSWORD: hex,
  GRAFANA_ADMIN_PASSWORD: hex,
};

function parseEntries(content) {
  const entries = new Map();
  for (const line of content.split(/\r?\n/)) {
    const match = line.match(ENTRY_PATTERN);
    if (match) entries.set(match[1], match[2]);
  }
  return entries;
}

function resolveValue(key, exampleValue, current) {
  if (current.get(key)) return current.get(key);
  if (!exampleValue && GENERATORS[key]) return GENERATORS[key]();
  return current.has(key) ? current.get(key) : exampleValue;
}

function buildEnvironment(exampleContent, current) {
  const declared = new Set();
  const lines = exampleContent.split(/\r?\n/).map((line) => {
    const match = line.match(ENTRY_PATTERN);
    if (!match) return line;
    declared.add(match[1]);
    return `${match[1]}=${resolveValue(match[1], match[2], current)}`;
  });
  const extras = [...current].filter(([key]) => !declared.has(key));
  if (extras.length) lines.push('', ...extras.map(([key, value]) => `${key}=${value}`));
  return `${lines.join('\n').trimEnd()}\n`;
}

const example = await readFile(EXAMPLE_FILE, 'utf8');
const current = parseEntries(await readFile(ENV_FILE, 'utf8').catch(() => ''));
await writeFile(ENV_FILE, buildEnvironment(example, current), { mode: 0o600 });
console.log('.env local preparado sem exibir os valores gerados.');
