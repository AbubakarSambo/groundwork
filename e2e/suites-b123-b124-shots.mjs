// One-off script: screenshots for B-123 (the member's own Suites page) and B-124 (an existing
// organisation's admin can now change its settings), at 1440, 1280, 1024 and 390. Not part of the
// suite; run by hand with `node e2e/suites-b123-b124-shots.mjs` against the already-running dev
// client (5173) and API (3000).
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

// B-123: the member's own Suites page, as grace@suites.test (member, Suites Test Company).
await run('suites-mine-member', async () => {
  const page = await browser.newPage();
  await signIn(page, 'grace@suites.test', 'suites-local-only');
  await page.goto('http://localhost:5173/suite/mine');
  await page.getByRole('heading', { level: 1, name: 'Suites' }).waitFor({ timeout: 10000 });
  await page.waitForTimeout(500);
  await shotAtWidths(page, 'suites-mine-member');
  await page.close();
});

// B-123: the same page for a lead's own personal requests, as daniel@suites.test.
await run('suites-mine-lead', async () => {
  const page = await browser.newPage();
  await signIn(page, 'daniel@suites.test', 'suites-local-only');
  await page.goto('http://localhost:5173/suite/mine');
  await page.getByRole('heading', { level: 1, name: 'Suites' }).waitFor({ timeout: 10000 });
  await page.waitForTimeout(500);
  await shotAtWidths(page, 'suites-mine-lead');
  await page.close();
});

// B-124: the admin's settings, well-formed data, as amina@suites.test (Suites Test Company) -
// "See or change its settings" open on Leave requests.
await run('suites-settings-admin', async () => {
  const page = await browser.newPage();
  await signIn(page, 'amina@suites.test', 'suites-local-only');
  await page.goto('http://localhost:5173/settings/suites');
  await page.getByRole('heading', { level: 1, name: 'Suites' }).waitFor({ timeout: 10000 });
  const card = page.locator('[aria-label="Leave requests"]');
  await card.getByRole('button', { name: 'See or change its settings' }).click();
  await page.waitForTimeout(300);
  await shotAtWidths(page, 'suites-settings-admin');
  await page.close();
});

// B-124 for an EXISTING organisation: naomi@kijani.test, whose leave suite was set up before this
// page existed (`daysAYear`, a person's id for `approver`) - the form now opens, maps what it can,
// and leaves the rest blank with a plain note, instead of refusing outright.
await run('suites-settings-admin-kijani', async () => {
  const page = await browser.newPage();
  await signIn(page, 'naomi@kijani.test', 'review-local-only');
  await page.goto('http://localhost:5173/settings/suites');
  await page.getByRole('heading', { level: 1, name: 'Suites' }).waitFor({ timeout: 10000 });
  const card = page.locator('[aria-label="Leave requests"]');
  await card.getByRole('button', { name: 'See or change its settings' }).click();
  await page.waitForTimeout(300);
  await shotAtWidths(page, 'suites-settings-admin-kijani');
  await page.close();
});

await browser.close();
console.log('Done.');
