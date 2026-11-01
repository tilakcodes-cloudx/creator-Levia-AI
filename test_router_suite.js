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
  console.log(`CreatorOS Test Server listening at http://127.0.0.1:${PORT}`);
  await runTests();
});

// Helper for CDP communication
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
  const tempProfile = `C:\\Users\\HP\\AppData\\Local\\Temp\\chrome_suite_${Date.now()}`;

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
    console.log(`[${tag}] Scenario ${num}: ${name}`);
    console.log(`       Details: ${details}\n`);
  }

  try {
    const BASE_URL = `http://127.0.0.1:${PORT}`;

    // SCENARIO 1: First-time visitor (no persona in localStorage) -> routes to persona.html
    console.log('--- Running Scenario 1 ---');
    await cdp.navigate(`${BASE_URL}/index.html`);
    await cdp.eval('localStorage.clear();');
    await cdp.navigate(`${BASE_URL}/index.html`);
    await cdp.wait(1000);

    const s1Url = await cdp.eval('window.location.href');
    const s1Persona = await cdp.eval('localStorage.getItem("creatoros_persona")');
    const s1Passed = s1Url.includes('persona.html') && s1Persona === null;
    recordResult(1, 'First-time visitor (no persona in localStorage)', s1Passed,
      `URL redirected to: ${s1Url}, creatoros_persona: ${s1Persona}`);

    // Helper function for full questionnaire completion
    async function completeOnboarding(personaKey, expectedDashboardSubstring) {
      await cdp.navigate(`${BASE_URL}/persona.html`);
      await cdp.wait(500);
      await cdp.eval('localStorage.clear();');
      await cdp.navigate(`${BASE_URL}/persona.html`);
      await cdp.wait(600);

      // Agree to terms
      await cdp.eval(`document.querySelector('[data-action="agree"]').click()`);
      await cdp.wait(300);

      // Select persona
      await cdp.eval(`document.querySelector('[data-persona="${personaKey}"]').click()`);
      await cdp.wait(400);

      for (let s = 0; s < 12; s++) {
        const isReview = await cdp.eval(`document.querySelector('[data-action="finish"]') !== null`);
        if (isReview) {
          // Finish questionnaire
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
            el.value = "Automated Sample Response";
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

      // Allow router to redirect from index.html if passing through
      await cdp.wait(800);

      const finalUrl = await cdp.eval(`window.location.href`);
      const savedPersona = await cdp.eval(`localStorage.getItem('creatoros_persona')`);
      const hasOnboarding = await cdp.eval(`!!localStorage.getItem('creatoros_onboarding')`);

      const passed = savedPersona === personaKey && hasOnboarding && finalUrl.includes(expectedDashboardSubstring);
      return { finalUrl, savedPersona, hasOnboarding, passed };
    }

    // SCENARIO 2: Select Content Creator -> saves content_creator -> routes to creator.html
    console.log('--- Running Scenario 2 ---');
    const s2 = await completeOnboarding('content_creator', 'creator.html');
    recordResult(2, 'Select Content Creator persona flow', s2.passed,
      `Saved persona: ${s2.savedPersona}, Routed to: ${s2.finalUrl}, Onboarding payload saved: ${s2.hasOnboarding}`);

    // SCENARIO 3: Select Product Creator -> saves product_builder -> routes to Product based.html
    console.log('--- Running Scenario 3 ---');
    const s3 = await completeOnboarding('product_builder', 'Product');
    recordResult(3, 'Select Product Builder persona flow', s3.passed,
      `Saved persona: ${s3.savedPersona}, Routed to: ${s3.finalUrl}, Onboarding payload saved: ${s3.hasOnboarding}`);

    // SCENARIO 4: Select Freelancer -> saves freelancer -> routes to Freelancer.html
    console.log('--- Running Scenario 4 ---');
    const s4 = await completeOnboarding('freelancer', 'Freelancer.html');
    recordResult(4, 'Select Freelancer persona flow', s4.passed,
      `Saved persona: ${s4.savedPersona}, Routed to: ${s4.finalUrl}, Onboarding payload saved: ${s4.hasOnboarding}`);

    // SCENARIO 5: Select Advertiser -> saves advertiser -> routes to advertisor.html
    console.log('--- Running Scenario 5 ---');
    const s5 = await completeOnboarding('advertiser', 'advertisor.html');
    recordResult(5, 'Select Advertiser persona flow', s5.passed,
      `Saved persona: ${s5.savedPersona}, Routed to: ${s5.finalUrl}, Onboarding payload saved: ${s5.hasOnboarding}`);

    // SCENARIO 6: Refresh index.html after saving persona -> routes to matching dashboard
    console.log('--- Running Scenario 6 ---');
    await cdp.eval('localStorage.setItem("creatoros_persona", "freelancer");');
    await cdp.navigate(`${BASE_URL}/index.html`);
    await cdp.wait(800);
    const s6Url = await cdp.eval('window.location.href');
    const s6Passed = s6Url.includes('Freelancer.html');
    recordResult(6, 'Refresh index.html with saved persona', s6Passed,
      `Preset persona "freelancer", Routed directly to: ${s6Url}`);

    // SCENARIO 7: Invalid persona value -> clears storage and routes to persona.html
    console.log('--- Running Scenario 7 ---');
    await cdp.eval('localStorage.setItem("creatoros_persona", "invalid_persona_xyz");');
    await cdp.navigate(`${BASE_URL}/index.html`);
    await cdp.wait(1000);
    const s7Url = await cdp.eval('window.location.href');
    const s7Persona = await cdp.eval('localStorage.getItem("creatoros_persona")');
    const s7Passed = s7Url.includes('persona.html') && s7Persona === null;
    recordResult(7, 'Invalid persona value reset & routing', s7Passed,
      `Storage cleared: ${s7Persona === null}, Routed to: ${s7Url}`);

    // SCENARIO 8: Change persona from within dashboard -> updates creatoros_persona & routes
    console.log('--- Running Scenario 8 ---');
    await cdp.eval('localStorage.setItem("creatoros_persona", "content_creator");');
    await cdp.navigate(`${BASE_URL}/creator.html`);
    await cdp.wait(800);

    // Switch persona to product_builder
    await cdp.eval(`
      localStorage.setItem("creatoros_persona", "product_builder");
      window.location.href = "index.html";
    `);
    await cdp.wait(1000);

    const s8Url = await cdp.eval('window.location.href');
    const s8Persona = await cdp.eval('localStorage.getItem("creatoros_persona")');
    const s8Passed = s8Persona === 'product_builder' && s8Url.includes('Product');
    recordResult(8, 'Change persona and route to new dashboard', s8Passed,
      `Updated persona: ${s8Persona}, Landed on: ${s8Url}`);

    // SCENARIO 9: Missing dashboard / error simulation -> shows error card & return button
    console.log('--- Running Scenario 9 ---');
    await cdp.navigate(`${BASE_URL}/index.html?error=missing`);
    await cdp.wait(600);

    const s9ErrorVisible = await cdp.eval(`
      const box = document.getElementById("router-error");
      box && window.getComputedStyle(box).display !== "none"
    `);
    const s9ErrorMessage = await cdp.eval(`document.getElementById("error-message")?.textContent`);
    const s9ReturnBtn = await cdp.eval(`
      const btn = document.querySelector('[data-testid="return-persona-button"]');
      btn !== null && btn.textContent.includes("Return to Persona Selection")
    `);

    // Test clicking the return button
    await cdp.eval(`document.querySelector('[data-testid="return-persona-button"]').click()`);
    await cdp.wait(800);
    const s9ReturnUrl = await cdp.eval('window.location.href');
    const s9StorageCleared = (await cdp.eval('localStorage.getItem("creatoros_persona")')) === null;

    const s9Passed = s9ErrorVisible && s9ReturnBtn && s9ReturnUrl.includes('persona.html') && s9StorageCleared;
    recordResult(9, 'Error screen fallback and return button flow', s9Passed,
      `Error box visible: ${s9ErrorVisible}, Error text: "${s9ErrorMessage}", Return button navigated to: ${s9ReturnUrl}, Storage reset: ${s9StorageCleared}`);

    console.log('=============================================');
    const totalPassed = testResults.filter(t => t.passed).length;
    console.log(`FINAL RESULT: ${totalPassed} / 9 Scenarios Passed!`);
    console.log('=============================================\n');

    return { totalPassed, testResults };

  } catch (err) {
    console.error('Test execution failed with error:', err);
    return { totalPassed: 0, testResults };
  } finally {
    cdp.close();
    proc.kill();
    server.close();
  }
}

if (require.main === module) {
  // Started by server listen callback
}
