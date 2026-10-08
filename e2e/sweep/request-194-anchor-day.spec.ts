import { test, expect } from '@playwright/test';
import { signIn } from '../sign-in-by-email';
import { screenshotTo, watch, watchSummary } from './sweep-helpers';

/**
 * REQUEST 194: THE LEAD CAN CHANGE THE DAY CHECK-INS LAND ON, FROM "PEOPLE AND SETUP", PROVEN LIVE.
 *
 * Tendai Mwangi (tendai@kijani.test) runs "Get a project back on track" (bb076fe3...), a monthly
 * check-in. Runs against the already-running client (5173) and API (3000); starts and stops nothing.
 * Screenshots go to docs/bug-log-screens/, committed.
 */
test.describe.configure({ mode: 'serial' });

const APP = 'http://localhost:5173';
const SIZES = [{ name: '1440', width: 1440, height: 900 }, { name: '390', width: 390, height: 844 }];

/* Pre-existing, unrelated noise on Kijani's seed (today-outstanding.spec.ts's own note): a time
   suite that is off for this organisation, and a stray earlier commit failing. Neither is about
   this picker. */
function unexpected(w: ReturnType<typeof watch>): string {
  const real = (s: string) => !/suites\/time\/mine|entry\/commit/.test(s);
  return watchSummary({ consoleErrors: [], pageErrors: w.pageErrors, failedRequests: w.failedRequests.filter(real) });
}

test('the day-of-month picker appears under "How often", and choosing a day saves it', async ({ page }) => {
  const w = watch(page);
  await signIn(page, 'tendai@kijani.test', APP);
  await page.goto(`${APP}/grounds`);
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => undefined);
  const link = page.getByRole('link', { name: /Get a project back on track/ }).first();
  await link.click();
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => undefined);
  await page.getByRole('tab', { name: /People and setup|Setup/ }).click().catch(() => undefined);
  await page.waitForTimeout(500);

  for (const size of SIZES) {
    await page.setViewportSize(size);
    const howOften = page.getByText('How often').first();
    await howOften.scrollIntoViewIfNeeded();
    await screenshotTo(page, `docs/bug-log-screens/piece5-cadence-anchor-day-before-${size.name}.png`);
  }

  const row = page.locator('.gwui-field-row', { hasText: 'How often' }).first();
  await row.getByRole('button', { name: 'Change' }).click();
  await expect(page.getByText(/Which day of the/).first()).toBeVisible({ timeout: 10000 });

  for (const size of SIZES) {
    await page.setViewportSize(size);
    await screenshotTo(page, `docs/bug-log-screens/piece5-cadence-anchor-day-picker-open-${size.name}.png`);
  }

  await page.setViewportSize(SIZES[0]);
  await page.getByTitle('Monday').click();
  await page.getByRole('button', { name: 'Save timeframe' }).click();
  await expect(page.getByText(/Lands on Mondays\./)).toBeVisible({ timeout: 10000 });
  await screenshotTo(page, `docs/bug-log-screens/piece5-cadence-anchor-day-saved-1440.png`);

  expect(unexpected(w), unexpected(w)).toBe('');
});
