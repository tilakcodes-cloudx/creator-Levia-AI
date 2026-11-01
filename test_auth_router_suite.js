const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const PORT = 8080;
const BASE_DIR = 'c:\\Users\\HP\\OneDrive\\Desktop\\CreatorOS';

// 1. Static HTTP Server
const server = http.createServer((req, res) => {
  try {
    let reqPath = decodeURIComponent(req.url.split('?')[0]);
    if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
    const filePath = path.join(BASE_DIR, reqPath);
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found: ' + reqPath);
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const mimeMap = {
      '.html': 'text/html; charset=utf-8',
      '.js': 'application/javascript; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.svg': 'image/svg+xml',
      '.png': 'image/png'
    };
    res.writeHead(200, {
      'Content-Type': mimeMap[ext] || 'application/octet-stream',
      'Access-Control-Allow-Origin': '*'
    });
    fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Error: ' + err.message);
  }
});

server.listen(PORT, '127.0.0.1', async () => {
  console.log(`CreatorOS Auth & Router Test Server running at http://127.0.0.1:${PORT}`);
  await runTests();
});

class CDPClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 1;
    this.callbacks = new Map();
  }

  init() {
    return new Promise((resolve, reject) => {
      this.ws.onopen = () => resolve();
      this.ws.onerror = (e) => reject(e);
      this.ws.onmessage = (msg) => {
        const data = JSON.parse(msg.data);
        if (data.id && this.callbacks.has(data.id)) {
          const { res, rej } = this.callbacks.get(data.id);
          this.callbacks.delete(data.id);
          if (data.error) rej(data.error);
          else res(data.result);
        }
      };
    });
  }

  send(method, params = {}) {
    return new Promise((res, rej) => {
      const msgId = this.id++;
      this.callbacks.set(msgId, { res, rej });
      this.ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  }

  async eval(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    return res && res.result ? res.result.value : undefined;
  }

  async navigate(url) {
    await this.send('Page.navigate', { url });
    await new Promise(r => setTimeout(r, 600));
  }

  async wait(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  close() {
    this.ws.close();
  }
}

async function runTests() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const cdpPort = 9444;
  const tempProfile = `C:\\Users\\HP\\AppData\\Local\\Temp\\chrome_auth_suite_${Date.now()}`;

  const proc = spawn(chromePath, [
    '--headless=new',
    `--remote-debugging-port=${cdpPort}`,
    '--no-first-run',
    '--no-default-browser-check',
    `--user-data-dir=${tempProfile}`,
    'about:blank'
  ]);

  await new Promise(r => setTimeout(r, 1500));

  let pageTarget;
  try {
    const listRes = await fetch(`http://127.0.0.1:${cdpPort}/json`);
    const targets = await listRes.json();
    pageTarget = targets.find(t => t.type === 'page');
  } catch (err) {
    console.error('Failed to get CDP targets:', err.message);
    proc.kill();
    server.close();
    process.exit(1);
  }

  const cdp = new CDPClient(pageTarget.webSocketDebuggerUrl);
  await cdp.init();
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');

  const testResults = [];

  function recordResult(num, name, passed, details) {
    testResults.push({ num, name, passed, details });
    const tag = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`[${tag}] Test ${num}: ${name}`);
    console.log(`       Details: ${details}\n`);
  }

  try {
    const BASE_URL = `http://127.0.0.1:${PORT}`;

    // TEST 1: Unauthenticated user opens index.html -> redirects to signin.html
    console.log('--- Running Test 1: Unauthenticated routing to signin.html ---');
    await cdp.navigate(`${BASE_URL}/index.html`);
    await cdp.eval('localStorage.clear(); sessionStorage.clear();');
    await cdp.navigate(`${BASE_URL}/index.html`);
    await cdp.wait(900);

    const t1Url = await cdp.eval('window.location.href');
    const t1Passed = t1Url.includes('signin.html');
    recordResult(1, 'Unauthenticated user opens index.html -> redirects to signin.html', t1Passed,
      `Routed to: ${t1Url}`);

    // TEST 2: Protected dashboard access for all 4 dashboards without session
    console.log('--- Running Test 2: Protected dashboard access ---');
    await cdp.navigate(`${BASE_URL}/creator.html`);
    await cdp.wait(800);
    const t2CreatorUrl = await cdp.eval('window.location.href');

    await cdp.navigate(`${BASE_URL}/Product%20based.html`);
    await cdp.wait(800);
    const t2ProductUrl = await cdp.eval('window.location.href');

    await cdp.navigate(`${BASE_URL}/Freelancer.html`);
    await cdp.wait(800);
    const t2FreelancerUrl = await cdp.eval('window.location.href');

    await cdp.navigate(`${BASE_URL}/advertisor.html`);
    await cdp.wait(800);
    const t2AdvertiserUrl = await cdp.eval('window.location.href');

    const t2AllRedirected = t2CreatorUrl.includes('signin.html') &&
      t2ProductUrl.includes('signin.html') &&
      t2FreelancerUrl.includes('signin.html') &&
      t2AdvertiserUrl.includes('signin.html');

    recordResult(2, 'Direct dashboard access without session redirects to signin.html for all 4 dashboards', t2AllRedirected,
      `creator: ${t2CreatorUrl.includes('signin.html')}, product: ${t2ProductUrl.includes('signin.html')}, freelancer: ${t2FreelancerUrl.includes('signin.html')}, advertiser: ${t2AdvertiserUrl.includes('signin.html')}`);

    // TEST 3: Validation on Sign In & Sign Up forms
    console.log('--- Running Test 3: Password & Email Validation ---');
    await cdp.navigate(`${BASE_URL}/signin.html`);
    await cdp.wait(600);

    // Try submit empty/invalid email
    await cdp.eval(`
      document.getElementById('email').value = "invalid-email-string";
      document.getElementById('password').value = "123";
      document.getElementById('authForm').dispatchEvent(new Event('submit', { cancelable: true }));
    `);
    await cdp.wait(300);

    const emailErr = await cdp.eval(`document.getElementById('emailError')?.textContent`);
    const t3Passed = emailErr && emailErr.includes('valid email');
    recordResult(3, 'Form input validation prevents invalid submissions', t3Passed,
      `Validation error displayed: "${emailErr}"`);

    // TEST 4: New user Sign Up flow -> creates account and routes to persona.html
    console.log('--- Running Test 4: Sign Up flow ---');
    await cdp.eval(`document.getElementById('toggleAuthMode').click();`);
    await cdp.wait(400);
    const isSignUp = await cdp.eval(`document.getElementById('formTitle').textContent === "Sign Up"`);
    await cdp.eval(`
      document.getElementById('displayName').value = "Maya Chen";
      document.getElementById('email').value = "maya.chen@creatoros.ai";
      document.getElementById('password').value = "SecurePassword123!";
      document.getElementById('authForm').dispatchEvent(new Event('submit', { cancelable: true }));
    `);
    await cdp.wait(1500);
    const t4Url = await cdp.eval('window.location.href');
    const t4Passed = isSignUp && t4Url.includes('persona.html');
    recordResult(4, 'New user sign up successfully transitions to persona.html', t4Passed,
      `Mode switched to Sign Up: ${isSignUp}, Routed to: ${t4Url}`);

    // TEST 5: Complete onboarding for Content Creator -> saves persona & routes to creator.html
    console.log('--- Running Test 5: Persona Onboarding Flow ---');
    await cdp.eval(`document.querySelector('[data-action="agree"]').click()`);
    await cdp.wait(300);
    await cdp.eval(`document.querySelector('[data-persona="content_creator"]').click()`);
    await cdp.wait(400);

    for (let s = 0; s < 12; s++) {
      const isReview = await cdp.eval(`document.querySelector('[data-action="finish"]') !== null`);
      if (isReview) {
        await cdp.eval(`document.querySelector('[data-action="finish"]').click()`);
        await cdp.wait(1200);
        const isSuccess = await cdp.eval(`document.querySelector('[data-action="complete"]') !== null`);
        if (isSuccess) {
          await cdp.eval(`document.querySelector('[data-action="complete"]').click()`);
          await cdp.wait(1200);
        }
        break;
      }

      const fieldInfo = await cdp.eval(`(() => {
        return {
          hasText: !!document.querySelector('input[data-input], textarea[data-input]'),
          hasChip: !!document.querySelector('[data-action="select-chip"]'),
          hasMulti: !!document.querySelector('[data-action="toggle-multi"]'),
          hasGoal: !!document.querySelector('[data-action="toggle-goal"]')
        };
      })()`);

      if (fieldInfo.hasText) {
        await cdp.eval(`(() => {
          const el = document.querySelector('input[data-input], textarea[data-input]');
          el.value = "Maya Chen";
          el.dispatchEvent(new Event('input', { bubbles: true }));
        })()`);
        await cdp.wait(150);
      }
      if (fieldInfo.hasChip) {
        await cdp.eval(`document.querySelector('[data-action="select-chip"]').click()`);
        await cdp.wait(150);
      }
      if (fieldInfo.hasMulti) {
        await cdp.eval(`document.querySelector('[data-action="toggle-multi"]').click()`);
        await cdp.wait(150);
      }
      if (fieldInfo.hasGoal) {
        await cdp.eval(`document.querySelector('[data-action="toggle-goal"]').click()`);
        await cdp.wait(150);
      }

      await cdp.eval(`document.querySelector('[data-action="question-next"]').click()`);
      await cdp.wait(350);
    }

    await cdp.wait(1000);
    const t5Url = await cdp.eval('window.location.href');
    const t5Persona = await cdp.eval('localStorage.getItem("creatoros_persona")');
    const t5Passed = t5Url.includes('creator.html') && t5Persona === 'content_creator';
    recordResult(5, 'Completed onboarding saves persona and routes to creator.html', t5Passed,
      `Saved persona: ${t5Persona}, Landed on: ${t5Url}`);

    // TEST 6: Returning user persistence on index.html (skips signin & onboarding)
    console.log('--- Running Test 6: Returning User Direct Routing ---');
    await cdp.navigate(`${BASE_URL}/index.html`);
    await cdp.wait(1000);
    const t6Url = await cdp.eval('window.location.href');
    const t6Passed = t6Url.includes('creator.html');
    recordResult(6, 'Returning authenticated user routes directly to matching dashboard', t6Passed,
      `Routed directly to: ${t6Url}`);

    // TEST 7: Session restoration across browser refresh
    console.log('--- Running Test 7: Session restoration across refresh ---');
    await cdp.send('Page.reload');
    await cdp.wait(1200);
    const t7ReloadUrl = await cdp.eval('window.location.href');
    const t7SessionExists = (await cdp.eval('localStorage.getItem("creatoros_user_cache")')) !== null;
    const t7Passed = t7ReloadUrl.includes('creator.html') && t7SessionExists;
    recordResult(7, 'Session persists and restores seamlessly across browser refresh', t7Passed,
      `Active after reload: ${t7SessionExists}, Current URL: ${t7ReloadUrl}`);

    // TEST 8: Multi-persona routing verification (Product Builder, Freelancer, Advertiser)
    console.log('--- Running Test 8: Multi-Persona Database Routing ---');
    // Simulate updating user's saved persona to product_builder
    await cdp.eval(`
      const profile = JSON.parse(localStorage.getItem('creatoros_user_cache'));
      profile.selected_persona = 'product_builder';
      localStorage.setItem('creatoros_user_cache', JSON.stringify(profile));
      localStorage.setItem('creatoros_persona', 'product_builder');
    `);
    await cdp.navigate(`${BASE_URL}/index.html`);
    await cdp.wait(1000);
    const t8ProductUrl = await cdp.eval('window.location.href');

    // Simulate updating user's saved persona to freelancer
    await cdp.eval(`
      const profile = JSON.parse(localStorage.getItem('creatoros_user_cache'));
      profile.selected_persona = 'freelancer';
      localStorage.setItem('creatoros_user_cache', JSON.stringify(profile));
      localStorage.setItem('creatoros_persona', 'freelancer');
    `);
    await cdp.navigate(`${BASE_URL}/index.html`);
    await cdp.wait(1000);
    const t8FreelancerUrl = await cdp.eval('window.location.href');

    // Simulate updating user's saved persona to advertiser
    await cdp.eval(`
      const profile = JSON.parse(localStorage.getItem('creatoros_user_cache'));
      profile.selected_persona = 'advertiser';
      localStorage.setItem('creatoros_user_cache', JSON.stringify(profile));
      localStorage.setItem('creatoros_persona', 'advertiser');
    `);
    await cdp.navigate(`${BASE_URL}/index.html`);
    await cdp.wait(1000);
    const t8AdvertiserUrl = await cdp.eval('window.location.href');

    const t8Passed = t8ProductUrl.includes('Product%20based.html') &&
      t8FreelancerUrl.includes('Freelancer.html') &&
      t8AdvertiserUrl.includes('advertisor.html');

    recordResult(8, 'Authoritative database persona routing (Product Builder, Freelancer, Advertiser)', t8Passed,
      `Product: ${t8ProductUrl.includes('Product%20based.html')}, Freelancer: ${t8FreelancerUrl.includes('Freelancer.html')}, Advertiser: ${t8AdvertiserUrl.includes('advertisor.html')}`);

    // TEST 9: Safe persona-switching workflow
    console.log('--- Running Test 9: Persona Switching Workflow ---');
    // Open persona switcher from dashboard
    await cdp.navigate(`${BASE_URL}/persona.html`);
    await cdp.wait(800);
    const t9PersonaUrl = await cdp.eval('window.location.href');
    const t9AppPresent = await cdp.eval('!!document.getElementById("app")');
    const t9Passed = t9PersonaUrl.includes('persona.html') && t9AppPresent;
    recordResult(9, 'Safe persona-switching workflow allows re-entering onboarding setup', t9Passed,
      `Onboarding app present: ${t9AppPresent}, URL: ${t9PersonaUrl}`);

    // TEST 10: Logout workflow -> clears local user session and returns to signin.html
    console.log('--- Running Test 10: Logout Workflow ---');
    await cdp.navigate(`${BASE_URL}/creator.html?test_mode=standalone`);
    await cdp.wait(800);
    // Click logout from CreatorAuth
    await cdp.eval(`window.CreatorAuth.signOut();`);
    await cdp.wait(1000);
    const t10Url = await cdp.eval('window.location.href');
    const t10SessionCleared = (await cdp.eval('localStorage.getItem("creatoros_user_cache")')) === null;
    const t10Passed = t10Url.includes('signin.html') && t10SessionCleared;
    recordResult(10, 'Logout clears user session and redirects to signin.html', t10Passed,
      `Session cleared: ${t10SessionCleared}, Navigated to: ${t10Url}`);

    // TEST 11: Standalone router test preservation (legacy mode error state)
    console.log('--- Running Test 11: Standalone router error state preservation ---');
    await cdp.navigate(`${BASE_URL}/index.html?error=missing`);
    await cdp.wait(600);
    const t11ErrorVisible = await cdp.eval(`
      const b = document.getElementById("router-error");
      b && window.getComputedStyle(b).display !== "none"
    `);
    const t11ReturnBtn = await cdp.eval(`document.querySelector('[data-testid="return-persona-button"]') !== null`);
    const t11Passed = t11ErrorVisible && t11ReturnBtn;
    recordResult(11, 'Standalone router error fallback & testid return button preserved', t11Passed,
      `Error box visible: ${t11ErrorVisible}, Return button present: ${t11ReturnBtn}`);

    console.log('=============================================');
    const totalPassed = testResults.filter(t => t.passed).length;
    console.log(`AUTHENTICATION TEST SUITE: ${totalPassed} / ${testResults.length} Tests Passed!`);
    console.log('=============================================\n');

  } catch (err) {
    console.error('Test execution failed with error:', err);
  } finally {
    cdp.close();
    proc.kill();
    server.close();
  }
}
