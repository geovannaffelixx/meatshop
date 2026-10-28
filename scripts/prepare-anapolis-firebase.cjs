// Uses the existing Firebase CLI session; never writes or prints access tokens.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

async function main() {
  const projectId = 'meatshop-3c78f';
  const cli = path.join(process.env.APPDATA, 'npm/node_modules/firebase-tools/lib');
  const config = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.config/configstore/firebase-tools.json'), 'utf8'));
  const { getAccessToken } = require(path.join(cli, 'auth.js'));
  const backendRequire = require('node:module').createRequire(path.join(__dirname, '../meatshop-backend/package.json'));
  const { initializeApp } = backendRequire('firebase-admin/app');
  const { getAuth } = backendRequire('firebase-admin/auth');
  const credential = {
    async getAccessToken() {
      const result = await getAccessToken(config.tokens.refresh_token, ['https://www.googleapis.com/auth/cloud-platform', 'https://www.googleapis.com/auth/firebase']);
      return { access_token: result.access_token, expires_in: 3600 };
    },
  };
  const auth = getAuth(initializeApp({ projectId, credential }));
  const password = process.env.TEST_DATA_PASSWORD;
  if (!password) throw new Error('TEST_DATA_PASSWORD is required');
  const definitions = [
    ['gestor', 'Gestor Teste Anapolis'],
    ['lojaa', 'Responsavel Loja A Anapolis'],
    ['lojab', 'Responsavel Loja B Anapolis'],
    ['clientea', 'Cliente A Anapolis'],
    ['clienteb', 'Cliente B Anapolis'],
    ['clientec', 'Cliente C Anapolis'],
    ['entregador', 'Entregador Teste Anapolis'],
  ];
  const result = [];
  for (const [key, name] of definitions) {
    const email = `${key}.330@meatshop.local`;
    let user;
    try {
      user = await auth.getUserByEmail(email);
      if (user.displayName !== name) throw new Error(`Refusing to change an unrelated identity: ${email}`);
      user = await auth.updateUser(user.uid, { password, emailVerified: true, disabled: false });
    } catch (error) {
      if (error.code !== 'auth/user-not-found') throw error;
      user = await auth.createUser({ email, password, displayName: name, emailVerified: true });
    }
    result.push({ key, name, email, uid: user.uid });
    console.log(`Firebase ready: ${email}`);
  }
  const destination = process.env.TEST_IDENTITIES_PATH;
  if (!destination) throw new Error('TEST_IDENTITIES_PATH is required');
  fs.writeFileSync(destination, JSON.stringify(result, null, 2));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
