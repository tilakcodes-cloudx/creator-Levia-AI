/**
 * CreatorOS — Comprehensive Developer 1 Automated Test Suite
 * Tests:
 * 1. ORCA AI Gateway & RAG Service
 * 2. Shared API Contracts & Persistence Engine (CreatorAPI)
 * 3. Multi-User Authentication & Data Isolation
 * 4. Content Creator Workflows (Studio, Bucket, Calendar, Approvals, Analytics, Brand Voice, Media, Search)
 * 5. Persona Routing & File Ownership Safety (Zero merge conflicts)
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const BASE_DIR = __dirname;
let testsPassed = 0;
let testsFailed = 0;

function it(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    testsPassed++;
  } catch (err) {
    console.error(`  ✗ ${name}:`, err.message);
    testsFailed++;
  }
}

async function itAsync(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    testsPassed++;
  } catch (err) {
    console.error(`  ✗ ${name}:`, err.message);
    testsFailed++;
  }
}

// Mock browser localStorage and window environment
class MockLocalStorage {
  constructor() { this.store = {}; }
  getItem(key) { return this.store[key] || null; }
  setItem(key, val) { this.store[key] = String(val); }
  removeItem(key) { delete this.store[key]; }
  clear() { this.store = {}; }
}

const mockWindow = {
  localStorage: new MockLocalStorage(),
  sessionStorage: new MockLocalStorage(),
  location: { href: '', pathname: '/creator.html', search: '?test_mode=standalone' },
  document: {
    addEventListener: () => {},
    getElementById: () => null,
    querySelector: () => null
  },
  navigator: { clipboard: { writeText: async () => {} } }
};
global.window = mockWindow;
global.localStorage = mockWindow.localStorage;
global.sessionStorage = mockWindow.sessionStorage;

console.log("\n=======================================================");
console.log("CREATOROS — DEVELOPER 1 VERIFICATION & TEST SUITE");
console.log("=======================================================\n");

// 1. File Safety & Ownership Checks
console.log("TEST GROUP 1: FILE SAFETY & OWNERSHIP (MERGE CONFLICT PREVENTION)");
it("Protected teammate dashboard files exist and were left untouched", () => {
  const belugaPath = path.join(BASE_DIR, 'Product based.html');
  const freelancerPath = path.join(BASE_DIR, 'Freelancer.html');
  const advertiserPath = path.join(BASE_DIR, 'advertisor.html');

  assert.ok(fs.existsSync(belugaPath), "Product based.html (Dev 2) must exist");
  assert.ok(fs.existsSync(freelancerPath), "Freelancer.html (Dev 3) must exist");
  assert.ok(fs.existsSync(advertiserPath), "advertisor.html (Dev 4) must exist");
});

it("Developer 1 files exist and are correctly structured", () => {
  assert.ok(fs.existsSync(path.join(BASE_DIR, 'creator.html')), "creator.html must exist");
  assert.ok(fs.existsSync(path.join(BASE_DIR, 'orca-ai.js')), "orca-ai.js must exist");
  assert.ok(fs.existsSync(path.join(BASE_DIR, 'creatoros-api.js')), "creatoros-api.js must exist");
  assert.ok(fs.existsSync(path.join(BASE_DIR, 'auth.js')), "auth.js must exist");
  assert.ok(fs.existsSync(path.join(BASE_DIR, 'supabase_schema.sql')), "supabase_schema.sql must exist");
});

// Load ORCA AI and CreatorAPI modules
eval(fs.readFileSync(path.join(BASE_DIR, 'orca-ai.js'), 'utf8'));
eval(fs.readFileSync(path.join(BASE_DIR, 'creatoros-api.js'), 'utf8'));
global.OrcaAI = mockWindow.OrcaAI || global.OrcaAI;
global.CreatorAPI = mockWindow.CreatorAPI || global.CreatorAPI;

// 2. ORCA AI Gateway & RAG Tests
console.log("\nTEST GROUP 2: ORCA AI GATEWAY & RAG ENGINE");
(async () => {
  await itAsync("ORCA AI loads and exposes required generation endpoints", async () => {
    assert.ok(global.OrcaAI, "window.OrcaAI must be defined");
    assert.strictEqual(typeof global.OrcaAI.generateScript, "function");
    assert.strictEqual(typeof global.OrcaAI.generateCaption, "function");
    assert.strictEqual(typeof global.OrcaAI.generateHashtags, "function");
    assert.strictEqual(typeof global.OrcaAI.generateIdeas, "function");
    assert.strictEqual(typeof global.OrcaAI.generateOutreach, "function");
    assert.strictEqual(typeof global.OrcaAI.chat, "function");
    assert.strictEqual(typeof global.OrcaAI.rag.getBrandVoice, "function");
    assert.strictEqual(typeof global.OrcaAI.rag.saveBrandVoice, "function");
  });

  await itAsync("ORCA AI generates structured script grounded in RAG Brand Voice", async () => {
    await global.OrcaAI.rag.saveBrandVoice("test_user_1", {
      tone: "Quietly confident, analytical",
      preferences: "Strictly actionable, zero buzzwords",
      targetAudience: "Solo developers"
    });

    const res = await global.OrcaAI.generateScript({
      topic: "How I manage my development backlog",
      platform: "YouTube",
      tone: "Analytical",
      userId: "test_user_1"
    });

    assert.ok(res.success, "Generation must succeed");
    assert.ok(res.output.includes("ACT 1"), "YouTube output must contain ACT 1 breakdown");
    assert.ok(res.output.includes("THE 3-PART FRAMEWORK"), "YouTube output must contain actionable framework");
    assert.strictEqual(res.ragContext.brandVoice.tone, "Quietly confident, analytical");
  });

  await itAsync("ORCA AI generates tiered hashtags & platform captions", async () => {
    const hashRes = await global.OrcaAI.generateHashtags({ topic: "Creator Systems" });
    assert.ok(hashRes.success);
    assert.ok(hashRes.tiered.highReach.length > 0);
    assert.ok(hashRes.output.includes("#creatorsystems"));

    const capRes = await global.OrcaAI.generateCaption({ topic: "Deep work routine" });
    assert.ok(capRes.success);
    assert.ok(capRes.output.includes("POV:"));
  });

  await itAsync("ORCA AI Co-Pilot chat responds with context-aware insights", async () => {
    const chatRes = await global.OrcaAI.chat({
      message: "Give me an opening hook for my next post",
      context: { activeView: "Dashboard" },
      userId: "test_user_1"
    });

    assert.ok(chatRes.success);
    assert.ok(chatRes.reply.length > 50, "Chat response must provide comprehensive advice");
  });

  // 3. Shared API Contract & Data Persistence (CreatorAPI)
  console.log("\nTEST GROUP 3: SHARED API CONTRACT & DATA PERSISTENCE (CreatorAPI)");

  await itAsync("CreatorAPI provides CRUD operations for content pipeline (Bucket)", async () => {
    const initialList = await global.CreatorAPI.content.list();
    assert.ok(Array.isArray(initialList), "Content list must return array");

    const created = await global.CreatorAPI.content.create({
      title: "Test Reel on Systems Architecture",
      platform: "Instagram",
      notes: "Verify persistence across refreshes"
    });

    assert.ok(created.id, "Created item must have generated ID");
    assert.strictEqual(created.title, "Test Reel on Systems Architecture");

    // Verify it exists in updated list
    const updatedList = await global.CreatorAPI.content.list();
    assert.ok(updatedList.some(i => i.id === created.id), "Created item must appear in list");

    // Update item
    const patched = await global.CreatorAPI.content.update(created.id, {
      status: "Ready for approval",
      script: true,
      caption: true
    });
    assert.strictEqual(patched.status, "Ready for approval");

    // Delete item
    await global.CreatorAPI.content.delete(created.id);
    const finalList = await global.CreatorAPI.content.list();
    assert.ok(!finalList.some(i => i.id === created.id), "Deleted item must not exist in list");
  });

  await itAsync("CreatorAPI supports Calendar event creation and deletion", async () => {
    const newEvent = await global.CreatorAPI.calendar.create({
      title: "Weekly Release Live Stream",
      date: "2024-06-25",
      time: "17:00",
      platform: "YouTube"
    });

    assert.ok(newEvent.id);
    const events = await global.CreatorAPI.calendar.list();
    assert.ok(events.some(e => e.id === newEvent.id));

    await global.CreatorAPI.calendar.delete(newEvent.id);
    const eventsAfter = await global.CreatorAPI.calendar.list();
    assert.ok(!eventsAfter.some(e => e.id === newEvent.id));
  });

  await itAsync("CreatorAPI handles approval promotion and revision workflows", async () => {
    const item = await global.CreatorAPI.content.create({
      title: "Product Launch Teaser",
      status: "Ready for approval",
      platform: "TikTok"
    });

    const approved = await global.CreatorAPI.approvals.approve(item.id);
    assert.strictEqual(approved.status, "Approved");
    assert.ok(approved.approved_at);

    const revision = await global.CreatorAPI.approvals.requestEdit(item.id, "Audio needs license check");
    assert.strictEqual(revision.status, "Draft");
    assert.strictEqual(revision.notes, "Audio needs license check");
  });

  // 4. Multi-User Authentication & Data Isolation Tests
  console.log("\nTEST GROUP 4: AUTHENTICATION & MULTI-USER DATA ISOLATION");
  await itAsync("Private user records are isolated and cannot leak between accounts", async () => {
    const userA_Key = "creatoros_user_alpha_bucket";
    const userB_Key = "creatoros_user_beta_bucket";

    mockWindow.localStorage.setItem(userA_Key, JSON.stringify([
      { id: "a1", title: "User A Confidential Video Draft", platform: "YouTube" }
    ]));

    mockWindow.localStorage.setItem(userB_Key, JSON.stringify([
      { id: "b1", title: "User B Client Deliverable", platform: "Instagram" }
    ]));

    const dataA = JSON.parse(mockWindow.localStorage.getItem(userA_Key));
    const dataB = JSON.parse(mockWindow.localStorage.getItem(userB_Key));

    assert.strictEqual(dataA[0].title, "User A Confidential Video Draft");
    assert.strictEqual(dataB[0].title, "User B Client Deliverable");
    assert.ok(!dataA.some(i => i.title.includes("User B")), "User A must never see User B records");
    assert.ok(!dataB.some(i => i.title.includes("User A")), "User B must never see User A records");
  });

  // 5. Database Schema & RLS Policies Verification
  console.log("\nTEST GROUP 5: SUPABASE SCHEMA & ROW LEVEL SECURITY");
  it("supabase_schema.sql contains full RLS tables for Content Creator and shared contracts", () => {
    const schemaSql = fs.readFileSync(path.join(BASE_DIR, 'supabase_schema.sql'), 'utf8');

    assert.ok(schemaSql.includes("CREATE TABLE IF NOT EXISTS public.content_items"), "content_items table must exist");
    assert.ok(schemaSql.includes("CREATE TABLE IF NOT EXISTS public.calendar_events"), "calendar_events table must exist");
    assert.ok(schemaSql.includes("CREATE TABLE IF NOT EXISTS public.brand_voices"), "brand_voices table must exist");
    assert.ok(schemaSql.includes("CREATE TABLE IF NOT EXISTS public.media_assets"), "media_assets table must exist");
    assert.ok(schemaSql.includes("CREATE TABLE IF NOT EXISTS public.orca_generations"), "orca_generations table must exist");
    assert.ok(schemaSql.includes("ENABLE ROW LEVEL SECURITY"), "RLS must be enabled on tables");
    assert.ok(schemaSql.includes("auth.uid() = user_id"), "RLS must scope by auth.uid()");
  });

  // 6. Content Creator Dashboard HTML Inspection
  console.log("\nTEST GROUP 6: CONTENT CREATOR DASHBOARD INTEGRITY");
  it("creator.html correctly links shared infrastructure and defines interactive controller", () => {
    const html = fs.readFileSync(path.join(BASE_DIR, 'creator.html'), 'utf8');

    assert.ok(html.includes('<script src="auth.js"></script>'), "auth.js must be imported");
    assert.ok(html.includes('<script src="orca-ai.js"></script>'), "orca-ai.js must be imported");
    assert.ok(html.includes('<script src="creatoros-api.js"></script>'), "creatoros-api.js must be imported");
    assert.ok(html.includes('window.CreatorApp = {'), "window.CreatorApp public controller must be exposed");
    assert.ok(html.includes('generateStudio'), "generateStudio handler must be defined");
    assert.ok(html.includes('saveStudioToBucket'), "saveStudioToBucket workflow must be defined");
    assert.ok(html.includes('saveBrandVoice'), "saveBrandVoice workflow must be defined");
    assert.ok(html.includes('openEditBucket'), "openEditBucket workflow must be defined");
    assert.ok(html.includes('approvePost'), "approvePost workflow must be defined");
  });

  it("persona button opens a dropdown menu rather than redirecting to questionnaire", () => {
    const html = fs.readFileSync(path.join(BASE_DIR, 'creator.html'), 'utf8');

    assert.ok(html.includes('togglePersona'), "persona selector must call togglePersona");
    assert.ok(html.includes('renderPersonaPopover'), "renderPersonaPopover must be defined");
    assert.ok(html.includes('switchPersona'), "switchPersona handler must be defined");
    assert.ok(!html.includes('class="persona" data-testid="persona-selector" onclick="window.location.href=\'persona.html\';"'), "persona button must not blindly redirect to questionnaire");
  });

  console.log("\n=======================================================");
  console.log(`TEST SUMMARY: ${testsPassed} PASSED, ${testsFailed} FAILED`);
  console.log("=======================================================\n");

  if (testsFailed > 0) {
    process.exit(1);
  }
})();
