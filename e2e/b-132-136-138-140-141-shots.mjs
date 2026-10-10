// One-off script: screenshots for B-132, B-136, B-138, B-140, B-141, at 1440, 1280, 1024 and 390.
// Not part of the suite; run by hand with `node e2e/b-132-136-138-140-141-shots.mjs` against the
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

await run('B-140 settings/suites, Naomi (admin)', async () => {
  const page = await browser.newPage();
  await signIn(page, 'naomi@kijani.test', 'review-local-only');
  await page.goto('http://localhost:5173/settings/suites');
  await page.waitForTimeout(800);
  await shotAtWidths(page, 'B-140-fixed');
  await page.close();
});

await run('B-132 Today, Naomi (admin)', async () => {
  const page = await browser.newPage();
  await signIn(page, 'naomi@kijani.test', 'review-local-only');
  await page.goto('http://localhost:5173/today');
  await page.waitForTimeout(800);
  await shotAtWidths(page, 'B-132-fixed');
  await page.close();
});

await run('B-132 Today, Amina (guest admin)', async () => {
  const page = await browser.newPage();
  await signIn(page, 'amina@suites.test', 'suites-local-only');
  await page.goto('http://localhost:5173/today');
  await page.waitForTimeout(800);
  await shotAtWidths(page, 'B-132-guest-fixed');
  await page.close();
});

await run('B-136, B-138, B-141 Tendai (lead), Weekly sales push, Nairobi', async () => {
  const page = await browser.newPage();
  await signIn(page, 'tendai@kijani.test', 'review-local-only');
  await page.goto('http://localhost:5173/grounds');
  await page.waitForTimeout(800);
  const link = page.getByText('Weekly sales push, Nairobi', { exact: false }).first();
  await link.waitFor({ timeout: 10000 });
  await link.click();
  await page.waitForURL(/\/grounds\//, { timeout: 15000 });
  await page.waitForTimeout(600);
  // My work tab (B-136, B-141)
  await page.goto(page.url().split('?')[0] + '?tab=mywork');
  await page.waitForTimeout(800);
  await shotAtWidths(page, 'B-136-141-mywork-fixed');
  // Board (B-138)
  const boardUrl = page.url().replace(/\/grounds\/([^/?]+).*/, '/grounds/$1/board');
  await page.goto(boardUrl);
  await page.waitForTimeout(800);
  await shotAtWidths(page, 'B-138-board-fixed');
  await page.close();
});

await browser.close();
