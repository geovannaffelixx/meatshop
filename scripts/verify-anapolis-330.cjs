const fs = require('node:fs');
const path = require('node:path');
async function main() {
  const identities = JSON.parse(fs.readFileSync(process.env.TEST_IDENTITIES_PATH, 'utf8'));
  const options = fs.readFileSync(path.join(__dirname, '../../meatshop-mobile/lib/firebase_options.dart'), 'utf8');
  const apiKey = options.match(/apiKey:\s*'([^']+)'/)[1];
  async function request(url, options = {}) {
    const response = await fetch(url, options);
    const body = await response.json();
    if (!response.ok) throw new Error(`${new URL(url).pathname}: HTTP ${response.status}: ${JSON.stringify(body)}`);
    return body;
  }
  for (const identity of identities) {
    const body = JSON.stringify({ email: identity.email, password: process.env.TEST_DATA_PASSWORD, returnSecureToken: true });
    const headers = { 'content-type': 'application/json' };
    const web = await request('http://localhost:3001/auth/login', { method: 'POST', headers, body });
    const firebase = await request(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`, { method: 'POST', headers, body });
    if (firebase.localId !== identity.uid) throw new Error('Firebase UID mismatch');
    const mobile = await request('http://localhost:3001/auth/firebase/exchange', {
      method: 'POST', headers: { ...headers, authorization: `Bearer ${firebase.idToken}` }, body: '{}',
    });
    if (!mobile.access_token || !web.access_token) throw new Error('Missing authenticated session');
    console.log(`Web + Firebase + mobile API login OK: ${identity.email}`);
    const authHeaders = { authorization: `Bearer ${web.access_token}` };
    const profile = await request('http://localhost:3001/users/me', { headers: authHeaders });
    if (!profile.ok) throw new Error('Profile unavailable');
    if (identity.key === 'gestor') {
      const managed = await request('http://localhost:3001/units/mine', { headers: authHeaders });
      console.log('Managed units:', JSON.stringify(managed));
      for (const unitId of [6, 7]) {
        const response = await fetch(`http://localhost:3001/dashboard?unit_id=${unitId}`, { headers: authHeaders });
        const dashboard = await response.json();
        if (response.status === 403 && dashboard.code === 'LEGAL_ACCEPTANCE_REQUIRED') {
          console.log(`Dashboard unit ${unitId}: awaiting the user's first legal acceptance in the UI`);
        } else {
          if (!response.ok) throw new Error(`Dashboard HTTP ${response.status}`);
          console.log(`Dashboard unit ${unitId}:`, JSON.stringify(dashboard));
        }
      }
    }
    // End the verification sessions; do not retain tokens on disk.
    for (const session of [web, mobile]) {
      await request('http://localhost:3001/auth/logout', { method: 'POST', headers, body: JSON.stringify({ refresh_token: session.refresh_token }) });
    }
  }
  const tomorrow = new Date(Date.now() + 86400000);
  const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(tomorrow);
  const slots = await request(`http://localhost:3001/orders/available-slots?unit_ids=6,7&date=${date}`);
  const times = slots.map(slot => slot.time);
  if (JSON.stringify(times) !== JSON.stringify(['10:00','11:00','12:00','13:00','14:00','15:00'])) throw new Error(`Unexpected common slots: ${times}`);
  console.log(`Common slots ${date}: ${times.join(', ')}`);
  const search = await request('http://localhost:3001/search?q=Picanha&unit_id=6&brand=Swift&min_price=70&max_price=90');
  if (search.data.length !== 1 || search.data[0].product.name !== 'Picanha teste A') throw new Error('Search fixture mismatch');
  console.log('Combined product filters OK');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
