import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const OUT = '/Users/hafsahjumare/Documents/GitHub/groundwork/docs/bug-log-screens';
mkdirSync(OUT, { recursive: true });

const WIDTHS = [1440, 390];
const HEIGHT = { 1440: 900, 390: 844 };

async function shot(page, url, name, opts = {}) {
  for (const w of WIDTHS) {
    await page.setViewportSize({ width: w, height: HEIGHT[w] });
    await page.goto(url, { waitUntil: 'networkidle' });
    if (opts.waitFor) await page.waitForSelector(opts.waitFor, { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(opts.settle ?? 500);
    await page.screenshot({ path: `${OUT}/anchor-${name}-${w}.png`, fullPage: false });
    console.log(`wrote anchor-${name}-${w}.png`);
  }
}

/**
 * THE SAME AS `shot`, BUT WITHOUT RE-NAVIGATING BETWEEN WIDTHS. For a shot that depends on
 * in-page state reached by clicking something (the savecard overlay, below) rather than just a
 * URL: `shot`'s own per-width `page.goto` would reload the page and lose that state on every
 * iteration after the first. Only the viewport changes here; the caller does the navigating and
 * clicking once, before calling this.
 */
async function shotNoReload(page, name, opts = {}) {
  for (const w of WIDTHS) {
    await page.setViewportSize({ width: w, height: HEIGHT[w] });
    await page.waitForTimeout(opts.settle ?? 500);
    await page.screenshot({ path: `${OUT}/anchor-${name}-${w}.png`, fullPage: false });
    console.log(`wrote anchor-${name}-${w}.png`);
  }
}

async function login(page, email, password) {
  await page.request.post('http://localhost:3000/api/v1/auth/login', {
    data: { email, password },
  });
}

const browser = await chromium.launch();

// --- 1. Anchor start, signed out (a stranger following the shared link) ---
{
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await shot(page, 'http://localhost:5173/start/team', 'start', { waitFor: 'text=What’s happening right now' });
  await ctx.close();
}

// --- helper: sign in through the UI (password), then screenshot a path ---
async function signedInShot(email, password, url, name, opts = {}) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto('http://localhost:5173/auth');
  await page.waitForTimeout(500);
  const emailBox = page.locator('input[type="email"], input[name="email"]').first();
  await emailBox.fill(email);
  const passBox = page.locator('input[type="password"]').first();
  if (await passBox.count()) {
    await passBox.fill(password);
  }
  await page.locator('button[type="submit"]').first().click();
  await page.waitForTimeout(1500);
  await shot(page, url, name, opts);
  await ctx.close();
}

// --- 2. The set-up screen: the anchor's own reveal, schedule and people step. Seeded the same
// way the unit tests do (a closed draft in gw_entry_session), so this does not depend on a live
// model call to reach the end of the conversation - the screen itself is what is under test here.
{
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('PAGEERROR', e.stack));
  page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE ERROR', m.text()); });
  await page.goto('http://localhost:5173/start');
  await page.evaluate(() => {
    // Same shape as the-people-step-for-an-anchor-draft.spec.tsx's own closedSession() helper,
    // proven to restore cleanly - plus a leadsReveal on the report, for this screenshot only.
    localStorage.setItem('gw_entry_session', JSON.stringify({
      closed: true, onboardingStep: 7,
      history: [
        { role: 'assistant', content: 'What’s happening right now that makes you wish your team saw more of what you see?' },
        { role: 'user', content: 'Everyone delivers their own piece but nobody seems to understand what it takes to keep this company moving.' },
      ],
      report: JSON.stringify({
        alignmentStatus: 'Clear', whatGroundworkSaw: 'x', alignmentBasis: '',
        areasRequiringAlignment: [], alignmentReached: [],
        honestClose: { aligned: '', open: '', revisit: '', risk: '' },
        mentionedPeople: [], suggestedParties: [],
        leadsReveal: {
          title: 'Help my team understand', subtitle: 'One-month Groundwork',
          carrying: 'Everyone delivers their own piece but nobody seems to understand what it takes to keep this company moving.',
          whatTheTeamNeedsToUnderstand: 'How their work connects to customers staying, and the company staying funded.',
          seeingToday: 'People finish their tasks and consider the job done, whether or not it moved the outcome.',
        },
      }),
      onboardingSelections: { mode: 'new', initial: 'Help my team understand', classifiedScenario: 'HELP_TEAM_UNDERSTAND' },
    }))
  });
  /*
   * THE SAVECARD IS AN OVERLAY, NOT THE PAGE ITSELF (found re-taking this shot for decision 114):
   * a restored `closed: true` session lands on the ordinary "What you said is on record." / "Invite
   * and finish" bar (EntryChatPage.tsx line ~4454, `closed && !showSave`); `TheLeadsReveal` and the
   * rest of the set-up screen only draw once `showSave` is true, behind that button. Going straight
   * to a screenshot here (the old version of this script) never crashed on its own, but it also
   * never actually showed the reveal - clicking through is what proves the screen it is meant to.
   */
  await page.setViewportSize({ width: WIDTHS[0], height: HEIGHT[WIDTHS[0]] });
  await page.goto('http://localhost:5173/start', { waitUntil: 'networkidle' });
  await page.waitForSelector('text=Invite and finish', { timeout: 15000 });
  await page.click('text=Invite and finish');
  await page.waitForSelector('text=Start my Groundwork', { timeout: 15000 });
  await shotNoReload(page, 'setup');
  await ctx.close();
}

const GROUND = 'ecdb18b1-0692-41ca-8791-f29b05badf20';
await signedInShot('rukia@anchor.test', 'anchor-local-only', `http://localhost:5173/grounds/${GROUND}/board`, 'board-lead', { settle: 1200 });
await signedInShot('amani@anchor.test', 'anchor-local-only', `http://localhost:5173/grounds/${GROUND}/board`, 'board-participant', { settle: 1200 });
await signedInShot('amani@anchor.test', 'anchor-local-only', `http://localhost:5173/grounds/${GROUND}`, 'checkin', { settle: 1200 });

await browser.close();
console.log('done');
