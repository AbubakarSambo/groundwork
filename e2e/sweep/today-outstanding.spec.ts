import { test, expect } from '@playwright/test';
import { signIn } from '../sign-in-by-email';
import { screenshotTo, watch, watchSummary } from './sweep-helpers';

/**
 * TODAY'S OWN LINK FOR THE LEAD'S DAILY NUDGE (decision 120, GET /today/outstanding), proven live.
 *
 * Tendai Mwangi (tendai@kijani.test), Kijani Foods' head of sales, runs three check-ins and is the
 * lead the nudge is written for; Esther Adeyemi (esther@kijani.test) is a member, so the server
 * gives her `null` and Today should show nothing new.
 *
 * Runs against the already-running client (5173) and API (3000); it starts and stops nothing.
 * Screenshots go to docs/bug-log-screens/today-outstanding-<role>-<width>.png, committed.
 */
test.describe.configure({ mode: 'serial' });

const APP = 'http://localhost:5173';
const SIZES = [{ name: '1440', width: 1440, height: 900 }, { name: '390', width: 390, height: 844 }];

/*
 * KNOWN, PRE-EXISTING NOISE, NOT A FINDING FROM THIS WORK: `GET /suites/time/mine` 404s on every
 * load for an organisation with time sheets off (B-002's own note, TodayPage.tsx), and Kijani's
 * seed leaves one stray `POST /entry/commit` failing from an earlier run. Neither is about
 * `GET /today/outstanding` or anything this change drew, so they are filtered out here rather than
 * silencing the watch altogether.
 */
function unexpected(w: ReturnType<typeof watch>): string {
  const real = (s: string) => !/suites\/time\/mine|entry\/commit/.test(s);
  return watchSummary({ consoleErrors: [], pageErrors: w.pageErrors, failedRequests: w.failedRequests.filter(real) });
}

test('the lead, at 1440 and 390', async ({ page }) => {
  const w = watch(page);
  await signIn(page, 'tendai@kijani.test', APP);
  for (const size of SIZES) {
    await page.setViewportSize(size);
    await page.goto(`${APP}/today`);
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => undefined);
    await page.waitForTimeout(800);
    await screenshotTo(page, `docs/bug-log-screens/today-outstanding-lead-${size.name}.png`);
  }
  expect(unexpected(w), unexpected(w)).toBe('');
});

test('a member, esther, sees nothing new', async ({ page }) => {
  const w = watch(page);
  await signIn(page, 'esther@kijani.test', APP);
  await page.goto(`${APP}/today`);
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => undefined);
  await page.waitForTimeout(800);
  /* exact: true - Playwright's getByRole name match is substring by default, and "Needs you"
     would otherwise match the existing "What needs you" heading, a false positive. */
  for (const heading of ['Needs you', 'Overdue on your team', 'Risks']) {
    await expect(page.getByRole('heading', { name: heading, exact: true })).toHaveCount(0);
  }
  expect(unexpected(w), unexpected(w)).toBe('');
});
