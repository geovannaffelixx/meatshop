/* global __ENV, __VU, open */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';
const searchLatency = new Trend('search_latency', true);
const cartLatency = new Trend('cart_latency', true);
const checkoutLatency = new Trend('checkout_latency', true);
const errors = new Rate('journey_errors');
const baseUrl = __ENV.BASE_URL;
const accounts = JSON.parse(__ENV.K6_ACCOUNTS_FILE ? open(__ENV.K6_ACCOUNTS_FILE) : __ENV.K6_ACCOUNTS || '[]');
const reliability = { journey_errors: ['rate<0.05'], http_req_failed: ['rate<0.05'], checks: ['rate>0.95'] };
export const thresholds = {
  search_latency: ['p(95)<2000'], cart_latency: ['p(95)<1000'], checkout_latency: ['p(95)<3000'], ...reliability,
};
export const spikeThresholds = {
  search_latency: ['p(95)<3000'], cart_latency: ['p(95)<3000'], checkout_latency: ['p(95)<3000'], ...reliability,
};
export function setup() {
  if (!baseUrl || __ENV.K6_ALLOW_MUTATIONS !== 'true' || accounts.length < Number(__ENV.K6_MAX_VUS || 500)) {
    throw new Error('Provide BASE_URL, K6_ALLOW_MUTATIONS=true and a dedicated account per VU (K6_ACCOUNTS).');
  }
}
function request(method, path, account, body, metric, headers = {}) {
  const response = http.request(method, `${baseUrl}${path}`, body == null ? null : JSON.stringify(body), {
    headers: { Authorization: `Bearer ${account.token}`, 'Content-Type': 'application/json',
      'x-client-platform': 'mobile', ...headers }, tags: { name: path.replace(/\/\d+/g, '/:id') },
  });
  if (metric) metric.add(response.timings.duration);
  const ok = check(response, { 'successful API response': (value) => value.status >= 200 && value.status < 300 });
  errors.add(!ok);
  if (!ok) throw new Error(`Journey request failed (${response.status})`);
  return response.body ? response.json() : null;
}
export default function journey() {
  const account = accounts[__VU - 1];
  try {
    const search = request('GET', '/search?q=carne', account, null, searchLatency);
    const found = check(search, { 'search returns the seeded product': (value) =>
      Array.isArray(value.data) && value.data.some((row) => row.type === 'PRODUCT' && row.product.id === account.productId) });
    errors.add(!found);
    if (!found) throw new Error('Dedicated product missing from search results');
    request('DELETE', '/cart', account);
    const cart = request('POST', '/cart/items', account, { product_id: account.productId, quantity: 1 });
    request('PATCH', `/cart/items/${cart.items[0].id}`, account, { quantity: 2 }, cartLatency);
    const selection = { delivery_type: 'PICKUP', payment_method: 'Cash' };
    const quote = request('POST', '/cart/quote', account, selection);
    const key = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (value) => {
      const random = Math.floor(Math.random() * 16); return (value === 'x' ? random : (random & 3) | 8).toString(16);
    });
    const checkout = request('POST', '/orders', account,
      { ...selection, expected_total: quote.total_amount, quote_token: quote.quote_token }, checkoutLatency,
      { 'Idempotency-Key': key });
    for (const order of checkout.orders) request('PATCH', `/orders/${order.id}/cancel`, account, { reason: 'Dedicated k6 validation cleanup' });
  } finally { request('DELETE', '/cart', account); }
  sleep(1);
}
