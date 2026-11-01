const { spawn } = require('child_process');

async function testLayout() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const cdpPort = 9522;
  const tempProfile = `C:\\Users\\HP\\AppData\\Local\\Temp\\chrome_layout_${Date.now()}`;

  const proc = spawn(chromePath, [
    '--headless=new',
    `--remote-debugging-port=${cdpPort}`,
    '--no-first-run',
    '--no-default-browser-check',
    `--user-data-dir=${tempProfile}`,
    'about:blank'
  ]);

  await new Promise(r => setTimeout(r, 1500));

  try {
    const listRes = await fetch(`http://127.0.0.1:${cdpPort}/json`);
    const targets = await listRes.json();
    const pageTarget = targets.find(t => t.type === 'page');

    const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
    let id = 1;
    const callbacks = new Map();
    ws.onmessage = (msg) => {
      const data = JSON.parse(msg.data);
      if (data.id && callbacks.has(data.id)) {
        const { res, rej } = callbacks.get(data.id);
        callbacks.delete(data.id);
        if (data.error) rej(data.error);
        else res(data.result);
      }
    };
    await new Promise(r => ws.onopen = r);

    const send = (method, params = {}) => new Promise((res, rej) => {
      const msgId = id++;
      callbacks.set(msgId, { res, rej });
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });

    const viewports = [
      { name: 'Desktop Large', width: 1440, height: 900 },
      { name: 'Laptop Common', width: 1366, height: 720 },
      { name: 'Laptop Short', width: 1280, height: 650 },
      { name: 'Mobile Standard', width: 375, height: 667 },
      { name: 'Mobile Short', width: 360, height: 640 }
    ];

    for (const vp of viewports) {
      await send('Emulation.setDeviceMetricsOverride', {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: 1,
        mobile: vp.width < 500
      });

      await send('Page.navigate', { url: 'http://127.0.0.1:8088/signin.html' });
      await new Promise(r => setTimeout(r, 800));

      const measureFn = `(() => {
        const card = document.querySelector('.login-card');
        const title = document.getElementById('formTitle');
        const container = document.querySelector('.page-container');
        const body = document.body;
        const html = document.documentElement;
        const rectCard = card ? card.getBoundingClientRect() : null;
        const rectTitle = title ? title.getBoundingClientRect() : null;
        const rectContainer = container ? container.getBoundingClientRect() : null;
        
        return {
          mode: title ? title.textContent : '',
          viewport: { innerWidth: window.innerWidth, innerHeight: window.innerHeight },
          card: rectCard ? { top: rectCard.top, bottom: rectCard.bottom, left: rectCard.left, right: rectCard.right, width: rectCard.width, height: rectCard.height } : null,
          title: rectTitle ? { top: rectTitle.top, bottom: rectTitle.bottom, left: rectTitle.left, height: rectTitle.height } : null,
          container: rectContainer ? { top: rectContainer.top, bottom: rectContainer.bottom, height: rectContainer.height } : null,
          isTopClipped: rectTitle ? rectTitle.top < 0 : false,
          isCardTopClipped: rectCard ? rectCard.top < 0 : false
        };
      })()`;

      // 1. Sign In Mode
      const metricsIn = await send('Runtime.evaluate', { expression: measureFn, returnByValue: true });
      console.log(`\n=== Viewport: ${vp.name} (${vp.width}x${vp.height}) - SIGN IN ===`);
      console.log(JSON.stringify(metricsIn.result.value, null, 2));

      // 2. Sign Up Mode
      await send('Runtime.evaluate', { expression: `document.getElementById('toggleAuthMode').click()` });
      await new Promise(r => setTimeout(r, 300));
      const metricsUp = await send('Runtime.evaluate', { expression: measureFn, returnByValue: true });
      console.log(`\n=== Viewport: ${vp.name} (${vp.width}x${vp.height}) - SIGN UP ===`);
      console.log(JSON.stringify(metricsUp.result.value, null, 2));
    }

    ws.close();
  } catch (err) {
    console.error('Error in layout test:', err);
  } finally {
    proc.kill();
  }
}

testLayout();
