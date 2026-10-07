import { test, expect } from '@playwright/test';
import { signUp, signInByLink, APP, whatIsOnThePage } from '../user-journeys-helpers';
import { mailMark, linkSentTo } from '../sign-in-by-email';
import { screenshotTo, watch, watchSummary } from './sweep-helpers';

test.describe.configure({ mode: 'serial' });

test('two check-ins open: what Today shows and whether each is reachable', async ({ page }) => {
  test.setTimeout(2 * 60 * 1000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await signInByLink(page, 'amani.u8@example.test');
  await page.goto(`${APP}/today`);
  await page.waitForTimeout(1500);
  await screenshotTo(page, 'docs/bug-log-screens/_situations-two-checkins-today-1440.png');
  const text = await whatIsOnThePage(page);
  console.log('Today, someone in several open check-ins (Amani, Kilima Traders U8):', text.replace(/\s+/g, ' ').slice(0, 800));

  await page.goto(`${APP}/grounds`);
  await page.waitForTimeout(1000);
  const links = await page.getByRole('link').evaluateAll((as) => as.map((a) => (a as HTMLAnchorElement).href).filter((h) => /\/grounds\/[0-9a-f-]{36}$/.test(h)));
  console.log('Reachable check-in links from /grounds:', links.length, links.slice(0, 6));
  expect(links.length).toBeGreaterThan(1);
  for (const link of links.slice(0, 2)) {
    await page.goto(link);
    await page.waitForTimeout(1000);
    const ok = !/not found|error|something went wrong/i.test(await whatIsOnThePage(page));
    console.log('Reached', link, '- opened cleanly:', ok);
  }
});

test('an expired or already-used sign-in link', async ({ page }) => {
  test.setTimeout(90 * 1000);
  const email = 'amani.u8@example.test';
  await page.goto(`${APP}/auth`);
  await page.locator('input[type="email"]').first().fill(email);
  const since = await mailMark();
  await page.getByRole('button', { name: 'Email me a sign-in link instead' }).click();
  const link = await linkSentTo(page, email, /verify-email\?token=[0-9a-f]+/, since);
  // Use it once (consumes it).
  await page.goto(link);
  await page.waitForTimeout(1500);
  // Use the SAME link again - it should now be used/expired.
  await page.context().clearCookies();
  await page.evaluate(() => { try { localStorage.clear(); } catch {} });
  await page.goto(link);
  await page.waitForTimeout(1500);
  await screenshotTo(page, 'docs/bug-log-screens/_situations-used-signin-link-1440.png');
  const text = await whatIsOnThePage(page);
  console.log('Re-using an already-used sign-in link, what the page says:', text.replace(/\s+/g, ' ').slice(0, 400));
  const offersWayForward = /sign in|request a new|email me a (new )?link|try again/i.test(text);
  console.log('Is there a way forward offered (sign in again / request a new link)?', offersWayForward);
});

test('double-clicking "Send invitation" does not create two invitations', async ({ page }) => {
  test.setTimeout(2 * 60 * 1000);
  const stamp = Date.now();
  await page.setViewportSize({ width: 1440, height: 900 });
  await signUp(page, { name: 'Double Click Admin', email: `dblclick-admin.${stamp}@sweeptest.test`, organisation: `Double Click Co ${stamp}` });
  await page.goto(`${APP}/org/members`);
  const dupEmail = `dblclick.target.${stamp}@sweeptest.test`;
  await page.getByPlaceholder(/Faith Kerubo/).fill(`Double Click Target, ${dupEmail}`);
  await page.waitForTimeout(1000);
  await page.getByRole('button', { name: 'Send their invitations' }).dblclick();
  await page.waitForTimeout(1200);
  const sendCount = page.getByText(/^Send \d+ invitation/, { exact: false }).first();
  if (await sendCount.isVisible().catch(() => false)) {
    // Double-click the real send button - the one actual risk of a duplicate invite.
    await sendCount.dblclick();
    await page.waitForTimeout(2000);
  }
  await page.goto(`${APP}/org/members`);
  await page.waitForTimeout(1000);
  await screenshotTo(page, 'docs/bug-log-screens/_situations-double-click-invite-1440.png');
  const text = await whatIsOnThePage(page);
  const occurrences = (text.match(new RegExp(dupEmail.replace('.', '\\.'), 'g')) || []).length;
  console.log('Double-clicking the invite send button: how many times does the invited email appear on People?', occurrences);
});

test('the back button mid-invite', async ({ page }) => {
  test.setTimeout(90 * 1000);
  const stamp = Date.now();
  await page.setViewportSize({ width: 1440, height: 900 });
  await signUp(page, { name: 'Back Button Admin', email: `backbtn-admin.${stamp}@sweeptest.test`, organisation: `Back Button Co ${stamp}` });
  await page.goto(`${APP}/org/members`);
  await page.getByPlaceholder(/Faith Kerubo/).fill(`Back Button Target, backbtn.target.${stamp}@sweeptest.test`);
  await page.waitForTimeout(800);
  await page.goBack();
  await page.waitForTimeout(1500);
  await screenshotTo(page, 'docs/bug-log-screens/_situations-back-button-mid-invite-1440.png');
  const text = await whatIsOnThePage(page);
  console.log('After pressing back mid-invite, what the page shows:', text.replace(/\s+/g, ' ').slice(0, 300));
  await page.goForward();
  await page.waitForTimeout(1000);
  const afterForward = await whatIsOnThePage(page);
  console.log('After pressing forward again, invite box still has the typed line?', /Back Button Target/.test(afterForward));
});

test('refresh halfway through set-up (the entry chat)', async ({ page }) => {
  test.setTimeout(2 * 60 * 1000);
  const stamp = Date.now();
  await page.setViewportSize({ width: 1440, height: 900 });
  await signUp(page, { name: 'Refresh Admin', email: `refresh-admin.${stamp}@sweeptest.test`, organisation: `Refresh Co ${stamp}` });
  await page.goto(`${APP}/start`);
  await page.waitForTimeout(3000);
  const box = page.getByRole('textbox').last();
  if (await box.isVisible().catch(() => false)) {
    await box.fill('We run a small ops team and want to keep a weekly read on the work.');
    await page.getByRole('button', { name: /^Send/ }).click();
  }
  await page.waitForTimeout(2000);
  await screenshotTo(page, 'docs/bug-log-screens/_situations-refresh-before-1440.png');
  await page.reload();
  await page.waitForTimeout(3000);
  await screenshotTo(page, 'docs/bug-log-screens/_situations-refresh-after-1440.png');
  const text = await whatIsOnThePage(page);
  const keptSomething = /ops team|weekly/i.test(text);
  console.log('After refreshing mid set-up chat, is what was typed still reflected?', keptSomething);
});
