const { spawn } = require('child_process');

async function testResetPasswordLayout() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const cdpPort = 9525;
  const tempProfile = `C:\\Users\\HP\\AppData\\Local\\Temp\\chrome_rp_${Date.now()}`;
  const proc = spawn(chromePath, ['--headless=new', `--remote-debugging-port=${cdpPort}`, `--user-data-dir=${tempProfile}`, 'about:blank']);
  await new Promise(r => setTimeout(r, 1200));

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

    await send('Page.enable');
    await send('Runtime.enable');

    const viewports = [
      { name: 'Desktop (1440x900)', width: 1440, height: 900 },
      { name: 'Laptop (1366x720)', width: 1366, height: 720 },
      { name: 'Laptop Short (1280x650)', width: 1280, height: 650 },
      { name: 'Mobile (375x667)', width: 375, height: 667 }
    ];

    for (const vp of viewports) {
      await send('Emulation.setDeviceMetricsOverride', { width: vp.width, height: vp.height, deviceScaleFactor: 1, mobile: vp.width < 500 });
      await send('Page.navigate', { url: 'http://127.0.0.1:8088/reset-password.html' });
      await new Promise(r => setTimeout(r, 600));

      // Force form view to test form state layout
      await send('Runtime.evaluate', {
        expression: `(() => {
          document.getElementById('panelLoading').classList.remove('active');
          document.getElementById('panelInvalid').classList.remove('active');
          document.getElementById('resetForm').classList.add('active');
          document.getElementById('pageHeading').textContent = 'Reset Password';
        })()`
      });
      await new Promise(r => setTimeout(r, 300));

      const res = await send('Runtime.evaluate', {
        expression: `(() => {
          const card = document.querySelector('.login-card');
          const title = document.getElementById('pageHeading');
          const submitBtn = document.getElementById('submitBtn');
          const rectCard = card ? card.getBoundingClientRect() : null;
          const rectTitle = title ? title.getBoundingClientRect() : null;
          const rectBtn = submitBtn ? submitBtn.getBoundingClientRect() : null;
          return {
            titleText: title ? title.textContent : '',
            card: rectCard ? { top: rectCard.top, bottom: rectCard.bottom, width: rectCard.width, height: rectCard.height } : null,
            title: rectTitle ? { top: rectTitle.top, height: rectTitle.height } : null,
            btn: rectBtn ? { top: rectBtn.top, bottom: rectBtn.bottom, width: rectBtn.width } : null,
            isTopClipped: rectTitle ? rectTitle.top < 0 : false,
            isCardTopClipped: rectCard ? rectCard.top < 0 : false,
            overflowX: document.documentElement.scrollWidth > window.innerWidth
          };
        })()`,
        returnByValue: true
      });

      console.log(`Reset Password Form State on ${vp.name}:`, JSON.stringify(res.result.value, null, 2));
    }

    // Now test Interactive Validations on Desktop
    console.log('\n--- Testing Interactive Validations on reset-password.html ---');
    await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
    await send('Page.navigate', { url: 'http://127.0.0.1:8088/reset-password.html' });
    await new Promise(r => setTimeout(r, 600));
    await send('Runtime.evaluate', {
      expression: `(() => {
        document.getElementById('panelLoading').classList.remove('active');
        document.getElementById('panelInvalid').classList.remove('active');
        document.getElementById('resetForm').classList.add('active');
      })()`
    });

    // 1. Weak password test (< 8 chars)
    const weakCheck = await send('Runtime.evaluate', {
      expression: `(() => {
        const newPwd = document.getElementById('newPassword');
        const confirmPwd = document.getElementById('confirmPassword');
        newPwd.value = 'short';
        confirmPwd.value = 'short';
        newPwd.dispatchEvent(new Event('input'));
        confirmPwd.dispatchEvent(new Event('input'));
        document.getElementById('resetForm').dispatchEvent(new Event('submit', { cancelable: true }));
        return {
          reqLengthValid: document.getElementById('reqLength').classList.contains('valid'),
          reqMatchValid: document.getElementById('reqMatch').classList.contains('valid'),
          errorText: document.getElementById('newPasswordError').textContent
        };
      })()`,
      returnByValue: true
    });
    console.log('Weak Password Validation Result:', weakCheck.result.value);

    // 2. Password mismatch test
    const mismatchCheck = await send('Runtime.evaluate', {
      expression: `(() => {
        const newPwd = document.getElementById('newPassword');
        const confirmPwd = document.getElementById('confirmPassword');
        newPwd.value = 'SecretPassword123!';
        confirmPwd.value = 'DifferentPassword456!';
        newPwd.dispatchEvent(new Event('input'));
        confirmPwd.dispatchEvent(new Event('input'));
        document.getElementById('resetForm').dispatchEvent(new Event('submit', { cancelable: true }));
        return {
          reqLengthValid: document.getElementById('reqLength').classList.contains('valid'),
          reqMatchValid: document.getElementById('reqMatch').classList.contains('valid'),
          errorText: document.getElementById('confirmPasswordError').textContent
        };
      })()`,
      returnByValue: true
    });
    console.log('Password Mismatch Validation Result:', mismatchCheck.result.value);

    // 3. Password visibility toggle test
    const toggleCheck = await send('Runtime.evaluate', {
      expression: `(() => {
        const newPwd = document.getElementById('newPassword');
        const toggleBtn = document.getElementById('toggleNewPassword');
        const initialType = newPwd.getAttribute('type');
        toggleBtn.click();
        const toggledType = newPwd.getAttribute('type');
        toggleBtn.click();
        const restoredType = newPwd.getAttribute('type');
        return { initialType, toggledType, restoredType };
      })()`,
      returnByValue: true
    });
    console.log('Password Visibility Toggle Result:', toggleCheck.result.value);

    ws.close();
  } catch (e) {
    console.error('Error:', e);
  } finally {
    proc.kill();
  }
}

testResetPasswordLayout();
