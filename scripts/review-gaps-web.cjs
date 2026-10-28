// Connect to a headless Edge instance with an isolated temporary profile on port 9229.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
let browserSocket;

async function main() {
  const tabs = await (await fetch('http://127.0.0.1:9229/json/list')).json();
  const tab = tabs.find(item => item.type === 'page');
  if (!tab) throw new Error('No browser page available');
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  browserSocket = ws;
  await new Promise((resolve, reject) => { ws.addEventListener('open', resolve); ws.addEventListener('error', reject); });
  let nextId = 0;
  const pending = new Map();
  const responses = [];
  ws.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.method === 'Network.responseReceived') {
      const { url, status } = message.params.response;
      if (url.startsWith('http://localhost:3001/units/')) responses.push({ url, status });
    }
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(message.error.message)); else resolve(message.result);
    }
  });
  const command = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++nextId;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async expression => {
    const result = await command('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
    return result.result.value;
  };
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  await command('Page.enable');
  await command('Network.enable');
  await command('Page.navigate', { url: 'http://localhost:3000/login' });
  await wait(1500);
  const login = await evaluate(`(async () => {
    const response = await fetch('http://localhost:3001/auth/login', {
      method: 'POST', credentials: 'include', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({email:'lojaa.330@meatshop.local',password:${JSON.stringify(process.env.TEST_DATA_PASSWORD)}})
    });
    return response.status;
  })()`);
  if (login !== 200) throw new Error(`Browser login failed: ${login}`);
  const directory = path.join(os.tmpdir(), 'meatshop-gaps-web-review');
  fs.mkdirSync(directory, { recursive: true });
  for (const [label, url, width, height] of [
    ['settings-desktop','/settings/unit',1440,1000],
    ['settings-mobile','/settings/unit',390,844],
    ['dashboard-desktop','/dashboard',1440,1000],
  ]) {
    await command('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 600 });
    await command('Page.navigate', { url: `http://localhost:3000${url}` });
    await wait(2000);
    const layout = await evaluate(`({url: location.pathname, width: innerWidth, scrollWidth: document.documentElement.scrollWidth,
      text: document.body.innerText.slice(0,300), hasScheduling: document.body.innerText.includes('Oferecer agendamento de pedidos')})`);
    if (label === 'settings-desktop' && layout.hasScheduling) {
      responses.length = 0;
      await evaluate(`[...document.querySelectorAll('button')].find(button => button.textContent.includes('Salvar horários e agendamento')).click()`);
      await wait(1500);
      const saved = responses.filter(response => response.url.endsWith('/business-hours') && response.status !== 204);
      console.log('Scheduling form save:', JSON.stringify(saved));
      if (saved.length !== 1 || saved[0].status !== 200) throw new Error('Scheduling form did not save atomically');
    }
    const screenshot = await command('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
    const destination = path.join(directory, `${label}.png`);
    fs.writeFileSync(destination, Buffer.from(screenshot.data, 'base64'));
    console.log(JSON.stringify({ label, ...layout, screenshot: destination }));
    if (layout.scrollWidth > layout.width) throw new Error(`${label}: horizontal overflow`);
  }
  ws.close();
}
main().catch(error => { browserSocket?.close(); console.error(error.message); process.exitCode = 1; });
