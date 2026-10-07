import { test, expect } from '@playwright/test';
import { signUp, signInByLink, APP, whatIsOnThePage } from '../user-journeys-helpers';
import { mailMark, linkSentTo } from '../sign-in-by-email';
import { screenshotTo, watch, watchSummary } from './sweep-helpers';

test.describe.configure({ mode: 'serial' });

test('someone in two organisations: invite an existing person into a second org', async ({ page, browser }) => {
  test.setTimeout(2 * 60 * 1000);
  const stamp = Date.now();
  const existingEmail = 'amani.u8@example.test'; // already a member of Kilima Traders U8
  await page.setViewportSize({ width: 1440, height: 900 });
  await signUp(page, { name: 'Second Org Admin', email: `secondorg-admin.${stamp}@sweeptest.test`, organisation: `Second Org Co ${stamp}` });
  await page.goto(`${APP}/org/members`);
  await page.getByPlaceholder(/Faith Kerubo/).fill(`Amani In Two Orgs, ${existingEmail}`);
  await page.waitForTimeout(1000);
  const since = await mailMark();
  await page.getByRole('button', { name: 'Send their invitations' }).click();
  await page.waitForTimeout(1200);
  const sendCount = page.getByText(/^Send \d+ invitation/, { exact: false }).first();
  if (await sendCount.isVisible().catch(() => false)) { await sendCount.click(); await page.waitForTimeout(1500); }
  await screenshotTo(page, 'docs/bug-log-screens/_situations-two-orgs-invite-sent-1440.png');

  // Amani already has an account, so this should be a straight add, or an invite to accept -
  // read whichever email actually arrives.
  const link = await linkSentTo(page, existingEmail, /(set-password|verify-email|accept)[^\s"]*/, since).catch(() => null);
  console.log('Invitation link for an existing user added to a second org:', link ? 'arrived' : 'none found within the time given');

  // Reuse the same page/context, signed out of the admin and back in as Amani, rather than a
  // second browser.newPage() (which, in one run, unexpectedly still showed the admin's own
  // session - worth a second look later, but not the point of this check).
  const amaniPage = page;
  await signInByLink(amaniPage, existingEmail);
  await amaniPage.goto(`${APP}/today`);
  await amaniPage.waitForTimeout(1500);
  await screenshotTo(amaniPage, 'docs/bug-log-screens/_situations-two-orgs-amani-today-1440.png');
  const orgSwitcher = amaniPage.getByRole('button', { name: /Kilima Traders U8|Second Org Co/i }).first();
  await orgSwitcher.click().catch(() => {});
  await amaniPage.waitForTimeout(800);
  await screenshotTo(amaniPage, 'docs/bug-log-screens/_situations-two-orgs-switcher-open-1440.png');
  const switcherText = await whatIsOnThePage(amaniPage);
  const showsBoth = /Kilima Traders U8/.test(switcherText) && /Second Org Co/.test(switcherText);
  console.log('Org switcher lists both organisations Amani is in:', showsBoth);

  // Switch to the second org and confirm nothing from Kilima Traders shows there.
  const secondOrgItem = amaniPage.getByText(/Second Org Co/).first();
  if (await secondOrgItem.isVisible().catch(() => false)) {
    await secondOrgItem.click();
    await amaniPage.waitForTimeout(1500);
    await screenshotTo(amaniPage, 'docs/bug-log-screens/_situations-two-orgs-switched-1440.png');
    const afterSwitch = await whatIsOnThePage(amaniPage);
    const leaked = /Sales team, Q3|Kilima Traders|Rukia Otieno|Tuskys/i.test(afterSwitch);
    console.log('After switching to the second org, does anything from Kilima Traders U8 still show?', leaked);
  } else {
    console.log('Could not find "Second Org Co" as a switchable option within the time given.');
  }
});

test('two tabs on the same check-in, answered in both', async ({ browser }) => {
  test.setTimeout(2 * 60 * 1000);
  const ctxA = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const pageA = await ctxA.newPage();
  await signInByLink(pageA, 'amani.u8@example.test');
  const url = `${APP}/grounds/6d7b2482-cc1c-429c-8977-3c8e2572d7bf`;
  await pageA.goto(url);
  await pageA.waitForTimeout(3000);

  const pageB = await ctxA.newPage();
  await pageB.goto(url);
  await pageB.waitForTimeout(3000);

  await screenshotTo(pageA, 'docs/bug-log-screens/_situations-two-tabs-a-1440.png');
  await screenshotTo(pageB, 'docs/bug-log-screens/_situations-two-tabs-b-1440.png');

  const boxA = pageA.locator('textarea, input[placeholder*="Type"]').last();
  const boxB = pageB.locator('textarea, input[placeholder*="Type"]').last();
  if (await boxA.isVisible().catch(() => false) && await boxB.isVisible().catch(() => false)) {
    await boxA.fill('Answering from tab A.');
    await boxB.fill('Answering from tab B.');
    await pageA.getByRole('button', { name: /^Send/ }).first().click().catch(() => {});
    await pageB.getByRole('button', { name: /^Send/ }).first().click().catch(() => {});
    await pageA.waitForTimeout(4000);
    await screenshotTo(pageA, 'docs/bug-log-screens/_situations-two-tabs-after-a-1440.png');
    await screenshotTo(pageB, 'docs/bug-log-screens/_situations-two-tabs-after-b-1440.png');
    console.log('Both tabs answered the same open session - see screenshots for whether either lost the other\'s answer or errored.');
  } else {
    console.log('Could not find an answer box in both tabs within the time given (no open session, or already answered this round).');
  }
});

test('a slow connection: invite send with a 3s API delay', async ({ page }) => {
  test.setTimeout(90 * 1000);
  const stamp = Date.now();
  await page.setViewportSize({ width: 1440, height: 900 });
  await signUp(page, { name: 'Slow Conn Admin', email: `slowconn-admin.${stamp}@sweeptest.test`, organisation: `Slow Conn Co ${stamp}` });
  await page.goto(`${APP}/org/members`);
  await page.getByPlaceholder(/Faith Kerubo/).fill(`Slow Conn Target, slowconn.target.${stamp}@sweeptest.test`);
  await page.waitForTimeout(800);
  await page.getByRole('button', { name: 'Send their invitations' }).click();
  await page.waitForTimeout(1200);
  const sendCount = page.getByText(/^Send \d+ invitation/, { exact: false }).first();
  await sendCount.waitFor({ state: 'visible', timeout: 10000 });

  await page.route('**/api/v1/**', async (route) => {
    await new Promise((r) => setTimeout(r, 3000));
    await route.continue();
  });

  await sendCount.click();
  await page.waitForTimeout(300);
  const stillClickable = await sendCount.isEnabled().catch(() => false);
  await screenshotTo(page, 'docs/bug-log-screens/_situations-slow-connection-mid-send-1440.png');
  console.log('On a slow connection, is the send button still enabled/clickable 300ms after one click (risk of a double submit)?', stillClickable);
  await page.waitForTimeout(4000);
  await screenshotTo(page, 'docs/bug-log-screens/_situations-slow-connection-after-1440.png');
  const text = await whatIsOnThePage(page);
  const stuckSpinner = /sending|loading|please wait/i.test(text);
  console.log('After the delayed response arrives, any stuck spinner/loading text left on screen?', stuckSpinner);
});
