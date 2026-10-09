// One-off script: screenshots and checks for B-126, B-127, B-128, B-134, at 1440, 1280, 1024 and
// 390. Not part of the suite; run by hand with `node e2e/b-126-127-128-134-shots.mjs` against the
// already-running dev client (5173) and API (3000).
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
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL(/\/today/, { timeout: 15000 });
}

async function shotAtWidths(page, basename) {
  for (const w of WIDTHS) {
    await page.setViewportSize({ width: w, height: 900 });
    await page.waitForTimeout(250);
    await page.screenshot({ path: path.join(OUT, `${basename}-${w}.png`) });
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

// B-126: /billing/checkout "Back" opened with no history must stay inside Groundwork, never
// about:blank.
await run('B-126 billing/checkout, Naomi (admin), opened in a fresh tab (no history)', async () => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await signIn(page, 'naomi@kijani.test', 'review-local-only');
  // Same signed-in context (shares cookies), but a brand-new tab with no navigation history of
  // its own - exactly what opening a link from an email or a new tab looks like.
  const freshPage = await context.newPage();
  await freshPage.goto('http://localhost:5173/billing/checkout?groundId=x&groundName=Test');
  await freshPage.waitForTimeout(800);
  const backBtn = freshPage.getByRole('button', { name: /^Back/ });
  console.log('  Back button label (no history):', await backBtn.textContent());
  await shotAtWidths(freshPage, 'B-126-checkout-fixed');
  await backBtn.click();
  await freshPage.waitForTimeout(600);
  console.log('  URL after clicking Back with no history:', freshPage.url());
  if (freshPage.url().includes('about:blank')) throw new Error('Back left Groundwork (about:blank)');
  await page.close();
  await freshPage.close();
});

// B-127: a lead at /start must never be offered "See plans" (which refuses them).
await run('B-127 /start, Tendai (lead), used-up free plan message', async () => {
  const page = await browser.newPage();
  await signIn(page, 'tendai@kijani.test', 'review-local-only');
  await page.goto('http://localhost:5173/start');
  await page.waitForTimeout(1000);
  const seePlans = page.getByRole('button', { name: 'See plans' });
  const count = await seePlans.count();
  console.log('  "See plans" buttons visible to a lead at /start:', count);
  await shotAtWidths(page, 'B-127-start-lead-fixed');
  await page.close();
});

// B-128: the old, hyphenated check-in permalink must redirect, not 404.
await run('B-128 /check-in/<id> permalink redirect, Naomi (admin)', async () => {
  const page = await browser.newPage();
  await signIn(page, 'naomi@kijani.test', 'review-local-only');
  await page.goto('http://localhost:5173/grounds');
  await page.waitForTimeout(800);
  const link = page.getByText('Weekly sales push, Nairobi', { exact: false }).first();
  await link.waitFor({ timeout: 10000 });
  await link.click();
  await page.waitForURL(/\/grounds\//, { timeout: 15000 });
  const id = page.url().split('/grounds/')[1].split(/[/?]/)[0];
  await page.goto(`http://localhost:5173/check-in/${id}`);
  await page.waitForTimeout(800);
  console.log('  URL after opening /check-in/<id>:', page.url());
  const notFound = await page.getByText('Nothing is at this address').count();
  console.log('  "Nothing is at this address" shown:', notFound > 0);
  await shotAtWidths(page, 'B-128-permalink-redirect-fixed');
  await page.close();
});

// B-134: Esther's own session report should never say "still being written" once the list already
// says her report is ready.
await run('B-134 Esther, her session report after finishing session 1', async () => {
  const page = await browser.newPage();
  await signIn(page, 'esther@kijani.test', 'review-local-only');
  await page.goto('http://localhost:5173/grounds');
  await page.waitForTimeout(800);
  const row = page.getByText('Weekly sales push, Nairobi', { exact: false }).first();
  await row.waitFor({ timeout: 10000 });
  const listSaysReady = await page.getByText('Your report is ready').count();
  console.log('  List says "Your report is ready":', listSaysReady > 0);
  await row.click();
  await page.waitForURL(/\/grounds\//, { timeout: 15000 });
  await page.waitForTimeout(800);
  // B-141, same page: "What success looks like" on My work, lower case or not.
  await page.getByText('My work', { exact: true }).click();
  await page.waitForTimeout(1000);
  const lowerCaseAim = await page.getByText(/^forty more shops/).count();
  console.log('  B-141: "What success looks like" aim still in lower case on My work:', lowerCaseAim > 0);
  await shotAtWidths(page, 'B-141-mywork-esther-fixed');
  // The ground's own "Sessions" list links each finished session to its report at
  // /checkin/:checkInId/report - a different id from the ground itself.
  const sessionLink = page.locator('a[href*="/checkin/"][href*="/report"]').first();
  await sessionLink.waitFor({ timeout: 10000 });
  await sessionLink.click();
  await page.waitForURL(/\/checkin\/.*\/report/, { timeout: 15000 });
  await page.waitForTimeout(1500);
  const stillWriting = await page.getByText('Your report is still being written').count();
  console.log('  Session report page says "still being written":', stillWriting > 0);
  await shotAtWidths(page, 'B-134-session-report-fixed');
  await page.close();
});

await browser.close();
