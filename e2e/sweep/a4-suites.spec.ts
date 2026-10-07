import { test, expect } from '@playwright/test';
import { APP } from '../user-journeys-helpers';
import { signIn } from '../sign-in-by-email';
import { mailMark, linkSentTo } from '../sign-in-by-email';
import { watch, watchSummary, screenshotTo } from './sweep-helpers';

/**
 * A4. SUITES (docs/user-journey-tests.md).
 *
 * Steps: switch on leave, finance requests, timesheets and performance reviews -> set approval
 * rules and a spending limit.
 *
 * Works when: each suite appears for the right people; approvals go to the line manager, or an
 * admin where there is none; spending over the limit goes to the person the rule names.
 *
 * Part 1 (new org, 1440): switching the suites on from nothing, the way an admin really does it.
 * Part 2 (Suites Test Company, seeded, daniel the lead / amina the admin / approvals above the
 * limit) proves the right people see the right things, without needing to build a reporting line
 * and a week of requests by hand.
 */
test.describe.configure({ mode: 'serial' });

test('A4 switch on the suites and set a limit, at 1440', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const watcher = watch(page);
  const domain = `a4-${Date.now().toString(36)}.test`;
  const email = `admin@${domain}`;
  await page.goto(`${APP}/auth`);
  await page.getByRole('button', { name: 'New here? Sign up' }).click();
  await page.getByLabel('Your name').fill('Suite Admin');
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

  await page.goto(`${APP}/settings/suites`);
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await screenshotTo(page, 'docs/bug-log-screens/_a4-suites-before-1440.png');

  const bugs: string[] = [];
  const suiteNames = ['Leave requests', 'Spending and budgets', 'Time sheets', 'Performance reviews'];
  for (const suite of suiteNames) {
    const panel = page.getByRole('region', { name: new RegExp(suite, 'i') });
    const found = await panel.isVisible().catch(() => false);
    if (!found) { bugs.push(`No "${suite}" section found on the Suites page.`); continue; }
    const toggle = panel.getByRole('switch').or(panel.getByRole('checkbox')).first();
    if (await toggle.isVisible().catch(() => false)) {
      const alreadyOn = (await toggle.getAttribute('aria-checked')) === 'true';
      if (!alreadyOn) {
        await toggle.click();
        await page.waitForTimeout(600);
      }
    } else {
      bugs.push(`No switch found to turn "${suite}" on.`);
    }
  }
  await page.waitForTimeout(800);
  await screenshotTo(page, 'docs/bug-log-screens/_a4-suites-after-1440.png');

  // a spending limit, if the spend suite exposes one here
  const limitField = page.getByLabel(/limit/i).first();
  if (await limitField.isVisible().catch(() => false)) {
    await limitField.fill('50000');
    await page.keyboard.press('Tab');
    await page.waitForTimeout(600);
  }

  const issue = watchSummary(watcher);
  if (issue) bugs.push(`Console/network: ${issue}`);
  console.log('A4 switch-on @ 1440:', bugs.length ? bugs.join(' | ') : 'no issues observed');
});

test('A4 the right people see the right suites (Suites Test Company), at 1440', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const watcher = watch(page);

  // Daniel: lead, manages Grace/Peter/Sara, approves their leave and writes their reviews.
  await signIn(page, 'daniel@suites.test');
  await page.goto(`${APP}/suite/leave`);
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  const danielText = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
  await screenshotTo(page, 'docs/bug-log-screens/_a4-daniel-suites-1440.png');

  // Grace: team member, should see her own requests, never the approval queue as an approver.
  await signIn(page, 'grace@suites.test');
  await page.goto(`${APP}/suite/leave`);
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  const graceText = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
  await screenshotTo(page, 'docs/bug-log-screens/_a4-grace-suites-1440.png');

  const bugs: string[] = [];
  if (!/leave|wait|approv/i.test(danielText)) bugs.push('Daniel (lead) does not see leave requests on /suite/leave.');
  if (!/leave|wait|approv/i.test(graceText)) bugs.push('Grace (team member) does not see leave on /suite/leave.');
  // Privacy: Grace should never see Peter's or Sara's private request detail from this page.
  if (/Peter Okoro.{0,40}(declined|approved).{0,80}(budget|route)/i.test(graceText)) {
    bugs.push('Grace can read the reason behind Peter\'s leave or spending decision, which is private to Peter and the approvers.');
  }

  const issue = watchSummary(watcher);
  if (issue) bugs.push(`Console/network: ${issue}`);
  console.log('A4 right-people @ 1440:', bugs.length ? bugs.join(' | ') : 'no issues observed');
});
