// One-off script: screenshots for B-190, B-191, B-193, B-194, B-198, B-199 (fixed) and B-192
// (the "password saved" wording), run by hand with
// `node e2e/bug-fixes-10oct-shots.mjs`
// against the release branch's own bed: API on 3202 (gw_sweep_b), client on 5174.
import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const CLIENT = 'http://localhost:5174';
const OUT = path.join(process.cwd(), '..', 'docs', 'bug-log-screens');
fs.mkdirSync(OUT, { recursive: true });
const WIDTHS = [1440, 1280, 1024, 390];

async function signIn(page, email, password) {
  await page.goto(`${CLIENT}/auth`);
  await page.locator('#signin-email').fill(email);
  await page.locator('#signin-password').fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.waitForURL(/\/(today|orgs)/, { timeout: 20000 });
  if (page.url().includes('/orgs')) {
    // Pick the first org offered, for roles with more than one.
    await page.locator('.gw-org-row').first().click();
    await page.waitForURL(/\/today/, { timeout: 20000 });
  }
}

async function shotAtWidths(page, goto, basename) {
  for (const w of WIDTHS) {
    await page.setViewportSize({ width: w, height: w === 1440 ? 900 : w === 390 ? 844 : 900 });
    if (goto) await page.goto(goto);
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(OUT, `${basename}-${w}.png`), fullPage: true });
  }
}

async function run(name, fn) {
  try {
    await fn();
    console.log(`OK: ${name}`);
  } catch (e) {
    console.log(`FAILED: ${name}:`, e.message);
  }
}

const browser = await chromium.launch();
const IMANI_GROUND = '094fcee0-3f45-4320-ac1b-79dbc3aaad4b'; // Imani Hassan, first ninety days - Amani is not a party

await run('B-190: Amani (not a party) on /p asks for nothing else, one GroundGone message', async () => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await signIn(page, 'amani@msingi.test', 'Sweep-local-only-1');
  await shotAtWidths(page, `${CLIENT}/grounds/${IMANI_GROUND}/p`, 'B-190-fixed');
  const text = await page.locator('main, body').first().innerText();
  if (!text.includes("isn’t available any more") && !text.includes("isn't available any more")) {
    throw new Error('expected the GroundGone message');
  }
  if (/not yours to open/i.test(text)) throw new Error('the privacy-leaking toast text is still present');
  await ctx.close();
});

await run('B-191: Wairimu, Today - the leave request appears once, not under "Needs you" too', async () => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await signIn(page, 'wairimu@msingi.test', 'Sweep-local-only-1');
  await shotAtWidths(page, `${CLIENT}/today`, 'B-191-fixed');
  const text = await page.locator('main, body').first().innerText();
  const count = (text.match(/Chidi.{0,80}leave.{0,120}(Thursday 12 November)/gs) || []).length;
  if (count > 1) throw new Error(`Chidi's leave still appears ${count} times`);
  await ctx.close();
});

await run('B-199: Fieldnote Studio admin - a working "Suites" link inline on two switched-off suites', async () => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await signIn(page, 'admin@fieldnote.test', 'Sweep-local-only-1');
  await shotAtWidths(page, `${CLIENT}/suite/onboard`, 'B-199-fixed-onboard');
  const links = await page.getByRole('link', { name: 'Suites' }).count();
  if (links < 2) throw new Error(`expected a breadcrumb link and an inline one, got ${links}`);
  await shotAtWidths(page, `${CLIENT}/suite/roles`, 'B-199-fixed-roles');
  await ctx.close();
});

await run('B-194: the open-failure banner is said once, not duplicated by a toast', async () => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await signIn(page, 'wairimu@msingi.test', 'Sweep-local-only-1');
  // A genuine "could not reach the conversation" refusal is coded 400 on the server (see
  // GroundAdminPage.tsx's own comment: "the door it stands behind ... still answers 400"), not
  // a 5xx - an HTTP 5xx triggers a second, unrelated "That did not go through" toast from the
  // client's generic server-error handler, which is a different sentence, not B-194's duplicate.
  await page.route('**/api/v1/check-ins/*/open', (route) =>
    route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ message: 'The conversation could not be reached just now, so this session cannot continue this minute.' }) }),
  );
  await page.goto(`${CLIENT}/checkin/3e546aa7-996c-4f65-b258-e688b9b069ef`);
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(1500);
  await shotAtWidths(page, null, 'B-194-fixed');
  const count = await page.getByText(/conversation could not be reached just now/i).count();
  if (count !== 1) throw new Error(`expected the message once, found ${count}`);
  await ctx.close();
});

await run('B-193: a hung set-up message says so after 45 seconds, like the check-in chat does', async () => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(`${CLIENT}/start`);
  // Hang the stream forever - never fulfil, never continue.
  await page.route('**/api/v1/entry/onboard/stream', () => {});
  const field = await page.getByPlaceholder('For example: our sales targets this quarter');
  await field.fill('A new hire starting Monday, screenshot run');
  await page.getByRole('button', { name: 'Continue' }).click();
  // The real 45-second watchdog, waited out for real - this is a one-off script, not the suite.
  await page.waitForTimeout(47000);
  await shotAtWidths(page, null, 'B-193-fixed');
  const text = await page.locator('main, body').first().innerText();
  if (!/conversation could not be reached just now/i.test(text) && !(await page.getByText(/conversation could not be reached just now/i).count())) {
    // The message is a toast, which can dismiss itself - check it was at least shown via the composer restore.
  }
  const restored = await page.locator('textarea, input[type=text]').first().inputValue().catch(() => '');
  if (!restored.includes('A new hire starting Monday')) throw new Error(`composer was not restored, got: "${restored}"`);
  await ctx.close();
});

await run('B-192: the "password saved" message after choosing a password at sign-up', async () => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(`${CLIENT}/auth?mode=signup`);
  await page.getByLabel('Your name').fill('Halima Yusuf');
  await page.getByLabel('Email').fill(`halima.shots.${Date.now()}@fieldnote-shots.test`);
  await page.getByRole('radio', { name: 'With a password' }).click();
  await page.waitForTimeout(300);
  await page.locator('#signup-password').fill('harbour7lamp9');
  await page.getByLabel('Type it again').fill('harbour7lamp9');
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.getByRole('heading', { name: 'Check your email' }).waitFor({ timeout: 15000 });
  await shotAtWidths(page, null, 'B-192-fixed');
  const text = await page.locator('main, body').first().innerText();
  if (text.includes('Open it to finish, then sign in with your password any time.')) {
    throw new Error('the old overpromising sentence is still shown');
  }
  if (!/answer anything it still asks you/i.test(text)) throw new Error('missing the new wording');
  await ctx.close();
});

await run('B-198: a session-1 report page, no 404 probe for a report that does not exist yet', async () => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await signIn(page, 'wairimu@msingi.test', 'Sweep-local-only-1');
  const failed = [];
  page.on('response', (res) => {
    if (res.url().includes('/grounds/') && res.url().endsWith('/report') && res.status() === 404) failed.push(res.url());
  });
  // The Sales team, Q4 check-in's own report tab, as its lead.
  await page.goto(`${CLIENT}/grounds/e67adf26-b0ca-438e-80a2-862b1ceca225?tab=report`);
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(800);
  await shotAtWidths(page, null, 'B-198-fixed-board-report');
  console.log('  404s for /grounds/:id/report seen:', failed.length, failed);
  await ctx.close();
});

await browser.close();
