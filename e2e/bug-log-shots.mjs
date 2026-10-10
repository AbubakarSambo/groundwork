// One-off script: screenshots for the five screen-fault fixes (docs/bug-log-screens.md
// items B-117..B-121), at 1440, 1280, 1024 and 390. Not part of the suite; run by hand with
// `node e2e/bug-log-shots.mjs` against the already-running dev client (5173) and API (3000).
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

// Item 1 (EntryChatPage save card) is captured separately by item1-only.mjs - a real
// multi-turn onboarding conversation that needs its own careful handling (see that file).

await run('item-2 ReviewPage appeal', async () => {
  const page = await browser.newPage();
  await signIn(page, 'daniel@suites.test', 'suites-local-only');
  await page.goto('http://localhost:5173/suite/reviews');
  await page.getByText('Your review,', { exact: false }).first().waitFor({ timeout: 15000 });
  // "Your reviews" section: Daniel's own decided review, "Open it".
  const openIt = page.getByRole('link', { name: 'Open it' }).first();
  await openIt.waitFor({ timeout: 10000 });
  await openIt.click();
  await page.waitForTimeout(800);
  const appealBtn = page.getByRole('button', { name: 'Appeal this decision' });
  if (await appealBtn.count()) {
    await appealBtn.click();
    await page.getByLabel('Why you disagree').fill('I was not told about the new route before the decision.');
    await page.getByRole('button', { name: 'Send my appeal' }).click();
    await page.waitForTimeout(1000);
  }
  await shotAtWidths(page, 'item-2');
  await page.close();
});

await run('item-3 ReviewsBoardPage every empty', async () => {
  const page = await browser.newPage();
  await signIn(page, 'amina@suites.test', 'suites-local-only');
  await page.goto('http://localhost:5173/suite/reviews');
  await page.waitForTimeout(800);
  await shotAtWidths(page, 'item-3');
  await page.close();
});

await run('item-4 WaitingToBeLetIn heading', async () => {
  const page = await browser.newPage();
  await signIn(page, 'amina@suites.test', 'suites-local-only');
  await page.goto('http://localhost:5173/org/members');
  await page.waitForTimeout(800);
  await shotAtWidths(page, 'item-4');
  await page.close();
});

await run('item-5 old context chat stays put', async () => {
  const page = await browser.newPage();
  await signIn(page, 'tendai@kijani.test', 'review-local-only');
  await page.goto('http://localhost:5173/grounds');
  await page.waitForTimeout(800);
  const firstGround = page.locator('a[href^="/grounds/"]').first();
  await firstGround.waitFor({ timeout: 10000 });
  await firstGround.click();
  await page.waitForTimeout(800);
  const contextTab = page.getByRole('tab', { name: /context/i });
  await contextTab.waitFor({ timeout: 10000 });
  await contextTab.click();
  await page.waitForTimeout(800);
  await shotAtWidths(page, 'item-5');
  await page.close();
});

await browser.close();
console.log('done');
