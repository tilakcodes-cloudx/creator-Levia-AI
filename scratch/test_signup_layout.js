const { spawn } = require('child_process');

async function test() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const cdpPort = 9524;
  const tempProfile = `C:\\Users\\HP\\AppData\\Local\\Temp\\chrome_signup_${Date.now()}`;
  const proc = spawn(chromePath, ['--headless=new', `--remote-debugging-port=${cdpPort}`, `--user-data-dir=${tempProfile}`, 'about:blank']);
  await new Promise(r => setTimeout(r, 1200));
  const listRes = await fetch(`http://127.0.0.1:${cdpPort}/json`);
  const targets = await listRes.json();
  const ws = new WebSocket(targets[0].webSocketDebuggerUrl);
  let id = 1;
  const callbacks = new Map();
  ws.onmessage = (msg) => {
    const data = JSON.parse(msg.data);
    if (data.id && callbacks.has(data.id)) callbacks.get(data.id).res(data.result);
  };
  await new Promise(r => ws.onopen = r);
  const send = (method, params = {}) => new Promise((res, rej) => {
    callbacks.set(id, { res, rej });
    ws.send(JSON.stringify({ id: id++, method, params }));
  });

  const viewports = [
    { name: 'Laptop 1366x720', width: 1366, height: 720 },
    { name: 'Laptop 1280x700', width: 1280, height: 700 },
    { name: 'Desktop 1280x600 (Small/split screen)', width: 1280, height: 600 }
  ];

  for (const vp of viewports) {
    await send('Emulation.setDeviceMetricsOverride', { width: vp.width, height: vp.height, deviceScaleFactor: 1, mobile: false });
    await send('Page.navigate', { url: 'http://127.0.0.1:8088/signin.html' });
    await new Promise(r => setTimeout(r, 800));
    await send('Runtime.evaluate', { expression: `document.getElementById('toggleAuthMode').click()` });
    await new Promise(r => setTimeout(r, 400));
    const res = await send('Runtime.evaluate', {
      expression: `(() => {
        const card = document.querySelector('.login-card').getBoundingClientRect();
        const title = document.getElementById('formTitle').getBoundingClientRect();
        return { 
          card: { top: card.top, bottom: card.bottom, height: card.height },
          title: { top: title.top, bottom: title.bottom, height: title.height },
          isCardTopClipped: card.top < 0,
          isTitleClipped: title.top < 0
        };
      })()`,
      returnByValue: true
    });
    console.log(`Sign Up Mode on ${vp.name}:`, JSON.stringify(res.result ? res.result.value : res, null, 2));
  }

  ws.close();
  proc.kill();
}
test();
