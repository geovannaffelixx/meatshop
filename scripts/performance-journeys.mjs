import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';

export async function runJourneys({ baseUrl, accounts, iterations = 5, searchTerm = 'carne', allowMutations = false }) {
  if (!allowMutations) throw new Error('Use only dedicated test accounts and explicitly enable mutations');
  if (!Array.isArray(accounts) || accounts.length === 0 || new Set(accounts.map(a => a.token)).size !== accounts.length) throw new Error('Provide a different test account token per concurrent worker');
  if (!Number.isSafeInteger(iterations) || iterations < 1 || iterations > 1000) throw new Error('Invalid iteration count');
  const measures = { search: [], cart: [], checkout: [] };
  async function request(path, account, { method = 'GET', body, headers = {}, metric } = {}) {
    const started = performance.now();
    const response = await fetch(new URL(path, baseUrl), { method, headers: { authorization: `Bearer ${account.token}`, 'content-type': 'application/json', ...headers }, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(15000) });
    if (metric) measures[metric].push(performance.now() - started);
    if (!response.ok) throw new Error(`${method} ${path.split('?')[0]} failed: HTTP ${response.status}`);
    return response.status === 204 ? null : response.json();
  }
  await Promise.all(accounts.map(async account => {
    const initial = await request('/cart', account);
    if (initial.items?.length) throw new Error('Test accounts must start with an empty cart');
    try {
      for (let index = 0; index < iterations; index++) {
        await request(`/search?q=${encodeURIComponent(searchTerm)}`, account, { metric: 'search' });
        const cart = await request('/cart/items', account, { method: 'POST', body: { product_id: account.productId, quantity: 1 }, metric: 'cart' });
        const item = cart.items.find(value => value.product_id === account.productId);
        if (!item) throw new Error('Added product not found in cart response');
        await request(`/cart/items/${item.id}`, account, { method: 'PATCH', body: {quantity: 2}, metric: 'cart' });
        const selection = { delivery_type: 'PICKUP', payment_method: 'Cash' };
        const quote = await request('/cart/quote', account, { method: 'POST', body: selection });
        const checkout = await request('/orders', account, { method: 'POST', headers: { 'Idempotency-Key': randomUUID() }, body: { ...selection, quote_token: quote.quote_token, expected_total: quote.total_amount }, metric: 'checkout' });
        for (const order of checkout.orders) await request(`/orders/${order.id}/cancel`, account, { method: 'PATCH', body: { reason: 'Dedicated performance test cleanup' } });
      }
    } finally { await request('/cart', account, { method: 'DELETE' }); }
  }));
  const limits = { search: 5000, cart: 1000, checkout: 3000 };
  return Object.fromEntries(Object.entries(measures).map(([name, durations]) => {
    durations.sort((a,b) => a-b);
    const maximumMs = Math.max(...durations);
    return [name, { count: durations.length, p95Ms: durations[Math.ceil(durations.length * .95)-1], maximumMs, budgetMs: limits[name], passed: maximumMs <= limits[name] }];
  }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = await runJourneys({ baseUrl: process.env.PERF_BASE_URL ?? 'http://localhost:3001', accounts: JSON.parse(process.env.PERF_ACCOUNTS ?? '[]'), iterations: Number(process.env.PERF_ITERATIONS ?? 5), searchTerm: process.env.PERF_SEARCH_TERM ?? 'carne', allowMutations: process.env.PERF_ALLOW_MUTATIONS === 'true' });
  console.log(JSON.stringify(result, null, 2));
  if (Object.values(result).some(value => !value.passed)) process.exitCode = 1;
}
