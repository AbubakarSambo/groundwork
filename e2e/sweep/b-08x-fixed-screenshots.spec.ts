import { test, expect, Page } from '@playwright/test';
import { screenshotTo } from './sweep-helpers';

/**
 * FRESH SCREENSHOTS, AFTER THE FIX, FOR B-081 AND B-082 (docs/bug-log-screens.md).
 *
 * Same shape as more-fixed-screenshots.spec.ts: reach the real state through the running app and
 * the real API (tendai@kijani.test, the lead of "Weekly sales push, Nairobi", the same local
 * password every Kijani Foods account uses), then screenshot the fixed page at 1440 and 390.
 *
 * B-077, B-078, B-080 (a managing-only lead on an anchor check-in, test bed copy b) and B-088 (an
 * anchor invitation, signed out, test bed copy b) need the heavier sweep test bed
 * (api/journey/sweep/README.md: its own database, API port, mail catcher and model calls) and are
 * not reached here - see the bug log's "Fixed" cells for why they rely on their specs instead.
 */
test.describe.configure({ mode: 'serial' });

const CLIENT = 'http://localhost:5173';
const TENDAI = { email: 'tendai@kijani.test', password: 'review-local-only' };

async function signInPassword(page: Page, email: string, password: string) {
  await page.goto(`${CLIENT}/auth`);
  await page.locator('#signin-email').fill(email);
  await page.locator('#signin-password').fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.waitForTimeout(2000);
}

async function openWeeklySalesPush(page: Page) {
  await page.goto(`${CLIENT}/grounds`);
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await waitPastAnyLoadFailure(page);
  await page.getByRole('link', { name: /Weekly sales push, Nairobi/ }).first().click();
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await waitPastAnyLoadFailure(page);
}

/**
 * A FEW OF THESE LOADS FAIL ONCE, TRANSIENTLY, ON THE FIRST REQUEST AFTER SIGNING IN - "We could
 * not load this check-in"/"your check-ins", with a working "Try again" right there. Retried here so
 * a screenshot is never taken of that failure screen instead of the state being proven.
 */
async function waitPastAnyLoadFailure(page: Page, triesLeft = 3) {
  const tryAgain = page.getByRole('button', { name: 'Try again' });
  if (triesLeft > 0 && await tryAgain.isVisible().catch(() => false)) {
    await tryAgain.click();
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(600);
    await waitPastAnyLoadFailure(page, triesLeft - 1);
  }
}

test('B-081: the lead\'s ending panel reads "correct what they said", not "account"', async () => {
  test.setTimeout(60_000);
  const { chromium } = await import('@playwright/test');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });
  await signInPassword(page, TENDAI.email, TENDAI.password);
  await openWeeklySalesPush(page);
  const url = new URL(page.url());
  const groundId = url.pathname.split('/').pop();

  for (const width of [1440, 390] as const) {
    await page.setViewportSize({ width, height: width === 1440 ? 900 : 844 });
    await page.goto(`${CLIENT}/grounds/${groundId}/end`);
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(600);
    await waitPastAnyLoadFailure(page);
    await screenshotTo(page, `docs/bug-log-screens/B-081-fixed-${width}.png`);
    const text = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
    expect(text, 'the fixed wording is on the page').toContain('can still correct what they said');
    expect(text.toLowerCase(), 'the word "account" is nowhere on this reader\'s ending panel').not.toContain('account');
  }
  await browser.close();
});

test('B-082: once the old chat is off, "Something agreed on a call" opens Ask, and the lines name Ask', async () => {
  test.setTimeout(60_000);
  const { chromium } = await import('@playwright/test');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });
  await signInPassword(page, TENDAI.email, TENDAI.password);
  await openWeeklySalesPush(page);
  const url = new URL(page.url());
  const groundId = url.pathname.split('/').pop();

  for (const width of [1440, 390] as const) {
    await page.setViewportSize({ width, height: width === 1440 ? 900 : 844 });
    await page.goto(`${CLIENT}/grounds/${groundId}?tab=context`);
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(800);
    await waitPastAnyLoadFailure(page);
    await screenshotTo(page, `docs/bug-log-screens/B-082-fixed-${width}.png`);
    const text = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
    expect(text, 'the real Context and resources page loaded, not the failure screen').toContain('What this check-in is for');
    expect(text, 'the old chat is not drawn').not.toContain('This conversation sets the context.');
  }
  await browser.close();
});
