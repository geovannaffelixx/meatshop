import { randomBytes } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';

const file = new URL('../.env', import.meta.url);
let environment = await readFile(file, 'utf8').catch(() => '');
const match = environment.match(/^MONITORING_WEBHOOK_TOKEN=(.+)$/m);
const token = match?.[1]?.trim() || randomBytes(32).toString('hex');
if (token.length < 32) throw new Error('MONITORING_WEBHOOK_TOKEN must have at least 32 characters');
if (!match) {
  environment = environment.replace(/^MONITORING_WEBHOOK_TOKEN=.*(?:\r?\n|$)/m, '');
  await writeFile(file, `${environment.trimEnd()}\nMONITORING_WEBHOOK_TOKEN=${token}\n`, { mode: 0o600 });
}
await mkdir(new URL('../secrets/', import.meta.url), { recursive: true });
await writeFile(new URL('../secrets/monitoring-token.txt', import.meta.url), token, { mode: 0o600 });
console.log('Monitoring credentials prepared without displaying their values.');
