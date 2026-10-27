import { fork, type ChildProcess } from 'node:child_process';
import { createServer, request, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { resolve } from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import { setTimeout, clearTimeout } from 'node:timers';

type Profile = {
  at: number;
  cpu: { user: number; system: number };
  elu: { active: number; idle: number };
  rss: number;
};
type Replica = { child: ChildProcess; port: number; samples: Profile[] };

async function startReplica(count: number): Promise<Replica> {
  const profileDir = resolve('test-results/cpu-profiles');
  if (process.env.K6_CPU_PROFILE === 'true') await mkdir(profileDir, { recursive: true });
  const child = fork(resolve(__dirname, 'api-worker.cjs'), [], {
    execArgv:
      process.env.K6_CPU_PROFILE === 'true'
        ? ['--cpu-prof', `--cpu-prof-dir=${profileDir}`]
        : undefined,
    env: {
      ...process.env,
      SOCKET_IO_SHARED: 'true',
      BACKEND_REPLICAS: String(count),
      DB_POOL_MAX: process.env.K6_DB_POOL_MAX || '10',
      LEGAL_ACCEPTANCE_REQUIRED: 'true',
    },
    stdio: ['ignore', 'ignore', 'pipe', 'ipc'],
  });
  return new Promise((resolve, reject) => {
    const samples: Profile[] = [];
    child.on('message', (message: { profile?: Profile }) => {
      if (message.profile) samples.push(message.profile);
    });
    let errorOutput = '';
    child.stderr?.on('data', (chunk: Buffer) => {
      errorOutput = (errorOutput + chunk.toString()).slice(-2000);
    });
    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error('k6 API readiness timeout'));
    }, 30000);
    child.once('error', reject);
    child.once('exit', () => {
      clearTimeout(timeout);
      reject(new Error(`k6 API exited before readiness: ${errorOutput}`));
    });
    child.once('message', (message: { port: number }) => {
      clearTimeout(timeout);
      resolve({ child, port: message.port, samples });
    });
  });
}

function proxyFor(replicas: Replica[]): Server {
  let next = 0;
  return createServer((incoming, response) => {
    const replica = replicas[next++ % replicas.length];
    const upstream = request(
      {
        hostname: '127.0.0.1',
        port: replica.port,
        method: incoming.method,
        path: incoming.url,
        headers: incoming.headers,
      },
      (result) => {
        response.writeHead(result.statusCode ?? 502, result.headers);
        result.pipe(response);
      },
    );
    upstream.on('error', () => {
      response.writeHead(502);
      response.end();
    });
    incoming.on('aborted', () => upstream.destroy());
    incoming.pipe(upstream);
  });
}

async function stopReplica(replica: Replica): Promise<void> {
  if (replica.child.exitCode !== null) return;
  await new Promise<void>((resolve) => {
    const timer = setTimeout(() => replica.child.kill(), 5000);
    replica.child.once('exit', () => {
      clearTimeout(timer);
      resolve();
    });
    if (replica.child.connected) replica.child.send('stop');
    else replica.child.kill();
  });
}

export async function startK6Cluster(count: number) {
  if (!Number.isInteger(count) || count < 1 || count > 6)
    throw new Error('K6_REPLICAS must be between 1 and 6');
  const replicas: Replica[] = [];
  try {
    const started = await Promise.allSettled(
      Array.from({ length: count }, () => startReplica(count)),
    );
    for (const result of started) if (result.status === 'fulfilled') replicas.push(result.value);
    const failure = started.find((result) => result.status === 'rejected');
    if (failure?.status === 'rejected') throw failure.reason;
    const proxy = proxyFor(replicas);
    await new Promise<void>((resolve, reject) => {
      proxy.once('error', reject);
      proxy.listen(0, '127.0.0.1', resolve);
    });
    return {
      baseUrl: `http://127.0.0.1:${(proxy.address() as AddressInfo).port}`,
      close: async () => {
        proxy.closeAllConnections();
        await new Promise<void>((resolve) => proxy.close(() => resolve()));
        await Promise.all(replicas.map(stopReplica));
        await writeFile(
          resolve('test-results/k6-runtime-profile.json'),
          JSON.stringify(replicas.map(({ child, samples }) => ({ pid: child.pid, samples }))),
        );
      },
    };
  } catch (error) {
    await Promise.all(replicas.map(stopReplica));
    throw error;
  }
}
