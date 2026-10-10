// One-off script: screenshots proving the screens-workspace fixes for B-143, B-144 and B-146
// (Hafsah, 10 October 2026). Not part of the suite; run by hand with
// `node e2e/b-143-144-146-fixed-shots.mjs` against the already-running dev client (5173) and
// API (3000).
import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const OUT = path.join(process.cwd(), '..', 'docs', 'bug-log-screens');
fs.mkdirSync(OUT, { recursive: true });
const WIDTHS = [1440, 1280, 1024, 390];

async function signIn(page, email, password) {
  await page.goto('http://localhost:5173/auth');
  await page.locator('#signin-email').fill(email);
  await page.locator('#signin-password').fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.waitForURL(/\/today/, { timeout: 30000 });
}

async function shotAtWidths(page, goto, basename) {
  for (const w of WIDTHS) {
    await page.setViewportSize({ width: w, height: w === 1440 ? 900 : w === 390 ? 844 : 900 });
    if (goto) await page.goto(goto);
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(400);
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
const GROUND_NOT_HERS = 'f9ad5070-c16d-4aa8-b56a-2cb2ae646871'; // "Weekly sales push, Nairobi" - Tendai leads, Naomi is admin, not a party

const sessions = {};
async function pageAs(role, email, password) {
  if (!sessions[role]) {
    const context = await browser.newContext();
    const page = await context.newPage();
    await signIn(page, email, password);
    sessions[role] = page;
  }
  return sessions[role];
}

await run('B-143: Naomi (read-only admin) opening a check-in she does not run lands on the Board', async () => {
  const page = await pageAs('naomi', 'naomi@kijani.test', 'review-local-only');
  await shotAtWidths(page, `http://localhost:5173/grounds/${GROUND_NOT_HERS}`, 'B-143-fixed');
  const url = page.url();
  if (!url.endsWith('/board')) throw new Error(`expected to land on the board, got ${url}`);
  const text = await page.locator('main').innerText();
  if (!text.includes('You can read this check')) throw new Error('missing the read-only admin note');
});

await run('B-144: Connections, grouped buttons for an admin', async () => {
  const page = await pageAs('naomi', 'naomi@kijani.test', 'review-local-only');
  await shotAtWidths(page, 'http://localhost:5173/settings/connections', 'B-144-fixed');
});

await run('B-146: Kwesi (a member) reaches Boards from his side menu and More', async () => {
  const page = await pageAs('kwesi', 'kwesi@kijani.test', 'review-local-only');
  await shotAtWidths(page, 'http://localhost:5173/today', 'B-146-fixed');
  // Confirm the "Boards" link actually works for him.
  await page.goto('http://localhost:5173/boards');
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  const text = await page.locator('body').innerText();
  if (!text.includes('Team boards')) throw new Error('Boards page did not render for a member');
});

/*
 * EXTRA LIVE CHECK: the grouped chooser on Connections actually opens and carries the choice on.
 * "Continue" is the shared Button component, which renders as a LINK (role "link", not "button")
 * once it has a destination and is enabled - true only once a radio is chosen - so it is found by
 * its link role here, the same as any other enabled Button with a `to`.
 */
await run('B-144 extra: the chooser opens, and "Continue" carries the choice to /settings/tools', async () => {
  const page = await pageAs('naomi', 'naomi@kijani.test', 'review-local-only');
  await page.goto('http://localhost:5173/settings/connections');
  await page.getByRole('heading', { name: 'Your numbers' }).waitFor();
  await page.getByRole('button', { name: 'Connect' }).first().click();
  await page.getByText('Choose what you want to connect.').waitFor();
  await page.getByText('Accounting or sales tools', { exact: false }).first().click();
  await page.getByRole('link', { name: 'Continue' }).click();
  await page.waitForURL(/\/settings\/tools\?want=accounting/, { timeout: 5000 });
  await page.waitForTimeout(500);
  const text = await page.locator('body').innerText();
  if (!text.includes('You chose “Accounting or sales tools” on Connections')) {
    throw new Error('the chosen capability note did not appear on the tools page');
  }
});

await browser.close();
