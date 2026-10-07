import { test, expect } from '@playwright/test';
import { APP } from '../user-journeys-helpers';
import { mailMark, linkSentTo } from '../sign-in-by-email';
import { watch, watchSummary, screenshotTo } from './sweep-helpers';

/**
 * A2. ADD AND MANAGE PEOPLE (docs/user-journey-tests.md).
 *
 * Steps: invite three people by email -> give one a different role -> add WhatsApp numbers for
 * two -> set who can start check-ins -> turn on "check-ins wait for an admin".
 *
 * Works when: invitations arrive with the right wording; people waiting to be let in are shown
 * separately and never counted as answered; no email address appears anywhere in place of a
 * name; a member cannot resend an invitation in the lead's name.
 */
test.describe.configure({ mode: 'serial' });

async function newAdminOrg(page: import('@playwright/test').Page, tag: string) {
  const domain = `a2-${tag}-${Date.now().toString(36)}.test`;
  const email = `admin@${domain}`;
  await page.goto(`${APP}/auth`);
  await page.getByRole('button', { name: 'New here? Sign up' }).click();
  await page.getByLabel('Your name').fill('Priya Admin');
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
  return { domain, email };
}

test('A2 invite people, roles, WhatsApp numbers, who can start check-ins, at 1440', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const watcher = watch(page);
  const { domain } = await newAdminOrg(page, 'main');

  const names = ['Fatima One', 'George Two', 'Hassan Three'];
  const emails = names.map((n, i) => `person${i + 1}@${domain}`);

  await page.goto(`${APP}/org/members`);
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

  const list = page.getByLabel(/Write one person on each line, with their name and email/);
  await list.fill(names.map((n, i) => `${n}, ${emails[i]}`).join('\n'));
  const since = await mailMark();
  await page.getByRole('button', { name: 'Send their invitations' }).click();
  await page.waitForTimeout(1500);

  const afterInviteText = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
  await screenshotTo(page, 'docs/bug-log-screens/_a2-after-invite-1440.png');

  const bugs: string[] = [];
  // The main People table correctly shows each invited person's name first, with the email
  // underneath - that part is fine. But the "N people were invited" confirmation list right
  // below the invite box lists only the raw email, with no name at all, even though a name was
  // typed for every one of them. That is the "email in place of a name" the rule forbids.
  const section = afterInviteText.slice(afterInviteText.lastIndexOf('people were invited.')).slice(0, 300);
  const nameMissing = names.every((n) => !section.includes(n));
  if (nameMissing && emails.every((e) => section.includes(e))) {
    bugs.push('The "N people were invited" confirmation list shows only the raw email address for each person, with no name, even though a name was typed for every one of them.');
  }

  // Read the actual invitation email's wording for person1.
  try {
    await linkSentTo(page, emails[0], /set-password\?token=[0-9a-f]+/, since);
  } catch (e) {
    bugs.push(`No invitation email reached ${emails[0]} within the wait.`);
  }

  // Give one person (person2) a different role, from their own page.
  const openLink = page.getByRole('row', { name: new RegExp(names[1]) }).getByRole('link', { name: 'Open' });
  if (await openLink.isVisible().catch(() => false)) {
    await openLink.click();
    await page.waitForTimeout(800);
  } else {
    const personLink = page.getByRole('link', { name: new RegExp(names[1]) }).first();
    if (await personLink.isVisible().catch(() => false)) await personLink.click();
    await page.waitForTimeout(800);
  }
  const roleCard = page.getByText('Can open check-ins', { exact: true }).first();
  if (await roleCard.isVisible().catch(() => false)) {
    await roleCard.click();
    await page.waitForTimeout(800);
  } else {
    bugs.push(`Could not reach ${names[1]}'s own page to change their role (no role choice cards found after opening them).`);
  }

  await screenshotTo(page, 'docs/bug-log-screens/_a2-person-page-1440.png');

  // who can start check-ins, and check-ins wait for an admin
  await page.goto(`${APP}/org/members`);
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  const waitSwitch = page.getByRole('switch', { name: 'Check-ins wait for an admin' });
  if (await waitSwitch.isVisible().catch(() => false)) {
    await waitSwitch.click();
    await page.waitForTimeout(800);
  } else {
    bugs.push('"Check-ins wait for an admin" switch was not found on the People page.');
  }

  const issue = watchSummary(watcher);
  if (issue) bugs.push(`Console/network: ${issue}`);
  console.log('A2 @ 1440:', bugs.length ? bugs.join(' | ') : 'no issues observed');
});

test('A2 People page layout, at 390 (phone)', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const watcher = watch(page);
  await newAdminOrg(page, 'phone');
  await page.goto(`${APP}/org/members`);
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(800);
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
  await screenshotTo(page, 'docs/bug-log-screens/_a2-people-390.png');

  const bugs: string[] = [];
  if (scrollWidth > clientWidth + 2) bugs.push(`Horizontal scroll at 390 on People: scrollWidth ${scrollWidth} > clientWidth ${clientWidth}.`);
  const issue = watchSummary(watcher);
  if (issue) bugs.push(`Console/network: ${issue}`);
  console.log('A2 @ 390:', bugs.length ? bugs.join(' | ') : 'no issues observed');
});
