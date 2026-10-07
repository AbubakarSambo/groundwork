import { test, expect } from '@playwright/test';
import { signUp, APP, acceptTheTeamInvitation, whatIsOnThePage } from '../user-journeys-helpers';
import { mailMark } from '../sign-in-by-email';
import { watch, watchSummary, screenshotTo } from './sweep-helpers';

/**
 * A3. APPROVE A WAITING CHECK-IN (docs/user-journey-tests.md).
 *
 * A fresh sign-up organisation, not Suites Test Company (which this sweep does not have seeded
 * credentials for): an admin signs up, invites a lead ("Can open check-ins"), switches on
 * "Check-ins wait for an admin", the lead makes a check-in, and the admin approves it.
 *
 * Works when: all the lead's set-up answers are kept; invitations go out exactly once, after
 * approval; the "waiting for an admin" note disappears. Watched throughout for console/network
 * errors a person would actually hit.
 */
test.describe.configure({ mode: 'serial' });

test('A3: a lead\'s check-in waits for an admin, and the admin approves it', async ({ page, browser }) => {
  test.setTimeout(20 * 60 * 1000);
  const watcher = watch(page);
  const stamp = Date.now();
  const adminEmail = `ada.${stamp}@a3sweep.test`;
  const leadEmail = `leo.${stamp}@a3sweep.test`;
  const bugs: string[] = [];

  await test.step('Admin signs up, invites a lead, switches on "Check-ins wait for an admin"', async () => {
    await signUp(page, { name: 'Ada Admin', email: adminEmail, organisation: `A3 Sweep ${stamp}` });
    await page.goto(`${APP}/org/members`);
    const list = page.getByLabel(/Write one person on each line/);
    await list.fill(`Leo Lead, ${leadEmail}`);
    await page.getByRole('combobox', { name: 'Role' }).selectOption({ label: 'Can open check-ins' });
    const since = await mailMark();
    await page.getByRole('button', { name: 'Send their invitations' }).click();
    await expect(page.getByText(/1 person was invited\./).first()).toBeVisible();

    const toggle = page.getByRole('switch', { name: 'Check-ins wait for an admin' }).or(page.getByRole('checkbox', { name: 'Check-ins wait for an admin' }));
    const already = await toggle.isChecked().catch(() => false);
    if (!already) await toggle.click();
    await expect(toggle).toBeChecked();

    // Leo accepts his invitation in a separate browser context, as a different person would.
    const leadCtx = await browser.newContext();
    const leadPage = await leadCtx.newPage();
    await acceptTheTeamInvitation(leadPage, leadEmail, since);
    (test.info() as any).leadPage = leadPage;
    (test.info() as any).leadCtx = leadCtx;
  });

  let leadPage: import('@playwright/test').Page;
  await test.step('The lead describes a short project check-in and sets it up', async () => {
    leadPage = (test.info() as any).leadPage;
    const leadWatcher = watch(leadPage);
    await leadPage.goto(`${APP}/start`);
    const box = leadPage.getByRole('textbox').first();
    await box.fill('We are onboarding our new office administrator, Noor. I want to check in weekly with her for four weeks.');
    await leadPage.getByRole('button', { name: /^Send/ }).click();

    const startBtn = leadPage.getByRole('button', { name: 'I set this up and check in myself' });
    for (let i = 0; i < 5; i++) {
      if (await startBtn.isVisible().catch(() => false)) break;
      await leadPage.waitForTimeout(20000);
      const box2 = leadPage.getByRole('textbox').last();
      if (await box2.isVisible().catch(() => false) && await box2.isEnabled().catch(() => false)) {
        await box2.fill('Call it Noor onboarding. Start it now. Yes, go ahead.');
        await leadPage.getByRole('button', { name: /^Send/ }).click();
      }
    }
    if (await startBtn.isVisible().catch(() => false)) {
      await startBtn.click();
      await leadPage.waitForTimeout(5000);
    } else {
      bugs.push('A3: the lead\'s own set-up conversation never offered to start within the time given.');
    }

    const text = await whatIsOnThePage(leadPage);
    console.log('A3 lead after set-up:', text.slice(0, 2000));
    if (/waiting for an admin/i.test(text)) {
      await screenshotTo(leadPage, 'docs/bug-log-screens/_a3-lead-waiting-1440.png');
    } else {
      bugs.push('A3: the lead was not told, in plain words, that this check-in is waiting for an admin.');
    }
    const issue = watchSummary(leadWatcher);
    if (issue) bugs.push(`A3 lead console/network: ${issue}`);
  });

  await test.step('The admin is told, and approves it', async () => {
    await page.reload();
    await page.goto(`${APP}/grounds`);
    await page.waitForTimeout(2000);
    const text = await whatIsOnThePage(page);
    console.log('A3 admin check-ins list:', text.slice(0, 2000));
    if (!/waiting for an admin|waiting for you|needs your approval/i.test(text)) {
      bugs.push('A3: the admin\'s check-ins list does not say anything is waiting for an admin.');
    }
    await screenshotTo(page, 'docs/bug-log-screens/_a3-admin-list-1440.png');

    const row = page.getByText(/Noor onboarding/i).first();
    if (await row.isVisible().catch(() => false)) {
      await row.click();
      await page.waitForTimeout(1500);
      const approve = page.getByRole('button', { name: /Approve|Let .* in|Accept/i }).first();
      if (await approve.isVisible().catch(() => false)) {
        await approve.click();
        await page.waitForTimeout(2000);
        const after = await whatIsOnThePage(page);
        if (/waiting for an admin/i.test(after)) {
          bugs.push('A3: the "waiting for an admin" note is still shown after the admin approved it.');
        }
      } else {
        bugs.push('A3: no approve button was found on the admin\'s view of the waiting check-in.');
      }
    } else {
      bugs.push('A3: the admin could not find the lead\'s check-in by name in the check-ins list.');
    }
    const issue = watchSummary(watcher);
    if (issue) bugs.push(`A3 admin console/network: ${issue}`);
  });

  console.log('A3 @ 1440:', bugs.length ? bugs.join(' | ') : 'no issues observed');
  await (test.info() as any).leadCtx?.close();
});
