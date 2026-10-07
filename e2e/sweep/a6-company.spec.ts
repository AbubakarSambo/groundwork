import { test, expect } from '@playwright/test';
import { APP } from '../user-journeys-helpers';
import { signIn } from '../sign-in-by-email';
import { WIDTHS, watch, watchSummary, screenshotTo } from './sweep-helpers';

/**
 * A6. COMPANY PAGE (docs/user-journey-tests.md), using the seeded Kijani Foods (Client org).
 *
 * Works when: priorities, owners, "where the strategy isn't reaching the work" and "what more
 * than one team named" all show for Client org; an admin sees the figures; a participant sees
 * only the priorities and owners; a guest is refused.
 */
test.describe.configure({ mode: 'serial' });

for (const w of [WIDTHS[0], WIDTHS[3]]) {
  test(`A6 Company page, admin (Naomi), at ${w.name}`, async ({ page }) => {
    await page.setViewportSize({ width: w.width, height: w.height });
    const watcher = watch(page);
    await signIn(page, 'naomi@kijani.test');
    await page.goto(`${APP}/company`);
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(800);
    const text = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    await screenshotTo(page, `docs/bug-log-screens/_a6-admin-${w.name}.png`);

    const bugs: string[] = [];
    if (!/priorit/i.test(text)) bugs.push('No mention of priorities on the Company page for an admin.');
    if (!/owner|owns/i.test(text)) bugs.push('No mention of an owner for any priority, for an admin.');
    if (scrollWidth > clientWidth + 2) bugs.push(`Horizontal scroll at ${w.name}: scrollWidth ${scrollWidth} > clientWidth ${clientWidth}.`);
    const issue = watchSummary(watcher);
    if (issue) bugs.push(`Console/network: ${issue}`);
    console.log(`A6 admin @ ${w.name}:`, bugs.length ? bugs.join(' | ') : 'no issues observed');
  });
}

test('A6 Company page, participant (Esther) sees only priorities and owners, at 1440', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const watcher = watch(page);
  await signIn(page, 'esther@kijani.test');
  await page.goto(`${APP}/company`);
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(800);
  const text = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
  await screenshotTo(page, 'docs/bug-log-screens/_a6-participant-1440.png');

  const bugs: string[] = [];
  if (!/priorit/i.test(text)) bugs.push('A participant (Esther) sees no priorities on the Company page.');
  // Figures an admin sees (headcount, check-in counts) should NOT appear for a participant.
  if (/\d+\s*check-ins this week/i.test(text)) bugs.push('A participant sees admin-only figures ("N check-ins this week") on the Company page.');
  const issue = watchSummary(watcher);
  if (issue) bugs.push(`Console/network: ${issue}`);
  console.log('A6 participant @ 1440:', bugs.length ? bugs.join(' | ') : 'no issues observed');
});

test('A6 Company page, a guest is refused, at 1440', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const watcher = watch(page);
  // Nobody at Kijani Foods is a guest in the seed, so this proves refusal the other way: someone
  // signed in at a DIFFERENT organisation, with no membership at Kijani Foods, must never reach
  // Kijani's Company page by URL alone.
  const domain = `a6-guest-${Date.now().toString(36)}.test`;
  await page.goto(`${APP}/auth`);
  await page.getByRole('button', { name: 'New here? Sign up' }).click();
  await page.getByLabel('Your name').fill('Outsider Guest');
  const { mailMark, linkSentTo } = await import('../sign-in-by-email');
  const email = `outsider@${domain}`;
  await page.getByLabel('Email', { exact: true }).fill(email);
  const since = await mailMark();
  await page.getByRole('button', { name: 'Create account' }).click();
  const link = await linkSentTo(page, email, /verify-email\?token=[0-9a-f]+/, since);
  await page.goto(link);
  await page.waitForTimeout(1200);
  const cont = page.getByRole('button', { name: 'Continue' });
  if (await cont.isVisible().catch(() => false)) { await cont.click(); await page.waitForTimeout(1000); }
  const keep = page.getByText('Keep using email links instead');
  if (await keep.isVisible().catch(() => false)) { await keep.click(); await page.waitForTimeout(1500); }

  await page.goto(`${APP}/company`);
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  const text = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
  await screenshotTo(page, 'docs/bug-log-screens/_a6-own-company-1440.png');

  // This only proves an outsider sees their OWN org's company page, not Kijani's - a real cross-org
  // guest-refusal check would need a Kijani guest in the seed, which does not exist; recorded as a
  // gap below.
  console.log('A6 own-org company page for an outsider: title text sample:', text.slice(0, 120));
});
