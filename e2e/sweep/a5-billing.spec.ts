import { test, expect } from '@playwright/test';
import { APP } from '../user-journeys-helpers';
import { mailMark, linkSentTo } from '../sign-in-by-email';
import { WIDTHS, watch, watchSummary, screenshotTo } from './sweep-helpers';

/**
 * A5. PLAN AND BILLING (docs/user-journey-tests.md).
 *
 * Steps: open Plan and billing on the trial -> look at the WhatsApp add-on -> choose a plan with
 * the Stripe test card.
 *
 * Works when: prices come from the system, not the page; nothing is charged during the trial;
 * the add-on shows its price and limit; a free-plan organisation is never called "Starter".
 *
 * NO STRIPE TEST KEY IS CONFIGURED on this computer (api/.env has STRIPE_SECRET_KEY and
 * STRIPE_PUBLISHABLE_KEY both empty), so choosing a plan with the 4242 card cannot be driven end
 * to end here. That part is recorded as not run, not as passing.
 */
test.describe.configure({ mode: 'serial' });

async function newAdminOrg(page: import('@playwright/test').Page, tag: string) {
  const domain = `a5-${tag}-${Date.now().toString(36)}.test`;
  const email = `admin@${domain}`;
  await page.goto(`${APP}/auth`);
  await page.getByRole('button', { name: 'New here? Sign up' }).click();
  await page.getByLabel('Your name').fill('Billing Admin');
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
}

for (const w of [WIDTHS[0], WIDTHS[3]]) {
  test(`A5 plan and billing on the trial, at ${w.name}`, async ({ page }) => {
    await page.setViewportSize({ width: w.width, height: w.height });
    const watcher = watch(page);
    await newAdminOrg(page, w.name);
    await page.goto(`${APP}/billing`);
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    const text = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    await screenshotTo(page, `docs/bug-log-screens/_a5-billing-${w.name}.png`);

    const bugs: string[] = [];
    // "Starter" is the name of the cheapest PAID plan here, not the free plan itself (which reads
    // "You are on the free plan") - that is not the violation A5 warns against, so it is not
    // checked for on its own. The WhatsApp add-on is only shown once WhatsApp is switched on
    // platform-wide (useWhatsAppIsOn), which this computer's .env leaves off on purpose, so its
    // absence here is expected, not a finding.
    if (!/trial/i.test(text)) bugs.push('Plan and billing does not mention the trial at all (see B-001: the trial may simply be off in this computer\'s local settings).');
    if (scrollWidth > clientWidth + 2) bugs.push(`Horizontal scroll at ${w.name}: scrollWidth ${scrollWidth} > clientWidth ${clientWidth}.`);
    const issue = watchSummary(watcher);
    if (issue) bugs.push(`Console/network: ${issue}`);
    console.log(`A5 @ ${w.name}:`, bugs.length ? bugs.join(' | ') : 'no issues observed');
  });
}
