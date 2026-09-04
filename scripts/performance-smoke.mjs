const target = process.env.PERF_TARGET ?? 'http://localhost:3001/health';
const requests = Number(process.env.PERF_REQUESTS ?? 100);
const maximumP95Ms = Number(process.env.PERF_MAX_P95_MS ?? 200);
const durations = [];

for (let index = 0; index < requests; index += 1) {
  const startedAt = performance.now();
  const response = await fetch(target);
  durations.push(performance.now() - startedAt);
  if (!response.ok) throw new Error(`Request ${index + 1} failed with HTTP ${response.status}`);
}

durations.sort((left, right) => left - right);
const p95 = durations[Math.ceil(durations.length * 0.95) - 1];
console.log(JSON.stringify({ target, requests, p95Ms: Number(p95.toFixed(2)), maximumP95Ms }));
if (p95 > maximumP95Ms) process.exitCode = 1;
