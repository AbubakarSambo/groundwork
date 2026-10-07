import { test, expect } from '@playwright/test';
import { signUp, APP, whatIsOnThePage } from '../user-journeys-helpers';
import { mailMark, linkSentTo } from '../sign-in-by-email';
import { screenshotTo, bugPath, watch, watchSummary } from './sweep-helpers';

/**
 * SITUATIONS TO REPEAT, the ones that fit naturally around one fresh organisation's People page:
 * a seat limit, a double-clicked invite, very long and non-Latin names, and WhatsApp numbers
 * typed different ways. One organisation is made once and reused across these to keep inside the
 * sign-in-link rate limit.
 */
test.describe.configure({ mode: 'serial' });

const STAMP = Date.now();
const ADMIN_EMAIL = `situations-admin.${STAMP}@sweeptest.test`;
const ADMIN2_EMAIL = `situations-admin2.${STAMP}@sweeptest.test`;

async function sendInvite(page: import('@playwright/test').Page, lines: string) {
  await page.goto(`${APP}/org/members`);
  await page.waitForTimeout(500);
  const box = page.getByPlaceholder(/Faith Kerubo/);
  await box.fill(lines);
  await page.waitForTimeout(1000);
  await page.getByRole('button', { name: 'Send their invitations' }).click();
  await page.waitForTimeout(1200);
  const sendCount = page.getByText(/^Send \d+ invitation/, { exact: false }).first();
  if (await sendCount.isVisible().catch(() => false)) {
    await sendCount.click();
    await page.waitForTimeout(1500);
  }
}

test('set up the shared organisations for the invite situations', async ({ page }) => {
  test.setTimeout(3 * 60 * 1000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await signUp(page, { name: 'Situations Admin', email: ADMIN_EMAIL, organisation: `Situations Co ${STAMP}` });
  await page.context().storageState({ path: `/tmp/situations-admin-${STAMP}.json` });
  // A second, separate organisation for the names/phone-number tests, so filling the first
  // org's 5-seat free plan for the seat-limit test does not also block these invites.
  await page.context().clearCookies();
  await page.evaluate(() => { try { localStorage.clear(); } catch {} });
  await signUp(page, { name: 'Situations Admin Two', email: ADMIN2_EMAIL, organisation: `Situations Co Two ${STAMP}` });
  await page.context().storageState({ path: `/tmp/situations-admin2-${STAMP}.json` });
});

test('someone waiting for a seat: a 6th person on a 5-person free plan', async ({ browser }) => {
  test.setTimeout(2 * 60 * 1000);
  const ctx = await browser.newContext({ storageState: `/tmp/situations-admin-${STAMP}.json`, viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  // The admin is person 1 of 5. Invite four more by name/email (fills the plan), then a sixth.
  const four = [1, 2, 3, 4].map((n) => `Seat Filler ${n}, seat.filler.${n}.${STAMP}@sweeptest.test`).join('\n');
  await sendInvite(page, four);
  await screenshotTo(page, 'docs/bug-log-screens/_situations-after-filling-plan.png');

  const sixthEmail = `seat.sixth.${STAMP}@sweeptest.test`;
  await sendInvite(page, `Seat Sixth Person, ${sixthEmail}`);
  await page.waitForTimeout(1000);
  await page.goto(`${APP}/org/members`);
  await page.waitForTimeout(1000);
  const text = await whatIsOnThePage(page);
  await screenshotTo(page, 'docs/bug-log-screens/_situations-waiting-for-a-seat-admin-1440.png');
  const sixthMentioned = text.includes('Seat Sixth Person') || text.includes(sixthEmail);
  const sawSeatWording = /waiting for a seat|no room|plan is full|upgrade|more seats/i.test(text);
  console.log('Waiting-for-a-seat: 6th person shown anywhere on People at all?', sixthMentioned, '| any "waiting for a seat / plan full" wording shown to the admin?', sawSeatWording);
  console.log('Full People summary line area:', text.slice(text.indexOf('Everyone at'), text.indexOf('Everyone at') + 400));
  await ctx.close();
});

test('80-character name and names in other scripts, on People, Today and the invitation email', async ({ browser }) => {
  test.setTimeout(3 * 60 * 1000);
  const ctx = await browser.newContext({ storageState: `/tmp/situations-admin2-${STAMP}.json`, viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const longName = 'A'.repeat(39) + ' ' + 'B'.repeat(40); // 80 chars total
  const names = [
    { name: longName, email: `long.${STAMP}@sweeptest.test` },
    { name: 'فاطمة الزهراء', email: `arabic.${STAMP}@sweeptest.test` },
    { name: '王小明', email: `chinese.${STAMP}@sweeptest.test` },
    { name: 'प्रिया शर्मा', email: `devanagari.${STAMP}@sweeptest.test` },
  ];
  const since = await mailMark();
  await sendInvite(page, names.map((n) => `${n.name}, ${n.email}`).join('\n'));
  await page.waitForTimeout(1500);
  await page.goto(`${APP}/org/members`);
  await page.waitForTimeout(1000);
  await screenshotTo(page, 'docs/bug-log-screens/_situations-people-long-and-script-names-1440.png');
  const peopleText = await whatIsOnThePage(page);
  console.log('People list after long/script-name invites (1440):', peopleText.replace(/\s+/g, ' ').slice(0, 800));

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(500);
  await screenshotTo(page, 'docs/bug-log-screens/_situations-people-long-and-script-names-390.png');
  const scrollW = await page.evaluate(() => document.documentElement.scrollWidth);
  const clientW = await page.evaluate(() => document.documentElement.clientWidth);
  console.log('People list at 390: horizontal overflow (scrollWidth > clientWidth)?', scrollW, '>', clientW, '=', scrollW > clientW + 2);

  // Read one invitation email for the Arabic name.
  const link = await linkSentTo(page, names[1].email, /set-password\?token=[0-9a-f]+/, since).catch(() => null);
  if (link) {
    const memberPage = await ctx.newPage();
    await memberPage.goto(link);
    await memberPage.waitForTimeout(1500);
    await screenshotTo(memberPage, 'docs/bug-log-screens/_situations-arabic-name-set-password-1440.png');
    console.log('Set-password page text for the Arabic-named invite:', (await whatIsOnThePage(memberPage)).slice(0, 300));
  } else {
    console.log('No invitation email link found for the Arabic-named invite within the time given.');
  }
  await ctx.close();
});

test('phone numbers typed different ways, on the People page', async ({ browser }) => {
  test.setTimeout(2 * 60 * 1000);
  const ctx = await browser.newContext({ storageState: `/tmp/situations-admin2-${STAMP}.json`, viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${APP}/org/members`);
  await page.waitForTimeout(500);
  await screenshotTo(page, 'docs/bug-log-screens/_situations-people-page-before-phone-test-1440.png');
  // Open the admin's own row (person 1) and look for a WhatsApp/phone number field to test the
  // three formats against, one at a time, reading back what is stored/shown after each.
  const openSelf = page.getByRole('link', { name: /Open Situations Admin Two/i }).first();
  const formats = ['+254 712 345 678', '0712345678', '254712345678'];
  const results: string[] = [];
  if (await openSelf.isVisible().catch(() => false)) {
    await openSelf.click();
    await page.waitForTimeout(1000);
    const phoneField = page.getByLabel(/WhatsApp|phone/i).first();
    if (await phoneField.isVisible().catch(() => false)) {
      for (const fmt of formats) {
        await phoneField.fill('');
        await phoneField.fill(fmt);
        const saveBtn = page.getByRole('button', { name: /Save|Update/i }).first();
        if (await saveBtn.isVisible().catch(() => false)) { await saveBtn.click(); await page.waitForTimeout(1000); }
        await page.reload();
        await page.waitForTimeout(1000);
        const shown = await phoneField.inputValue().catch(async () => (await whatIsOnThePage(page)));
        results.push(`${fmt} -> ${shown}`);
      }
      await screenshotTo(page, 'docs/bug-log-screens/_situations-phone-formats-1440.png');
    } else {
      results.push('No WhatsApp/phone field found on the person page within the time given.');
    }
  } else {
    results.push('Could not open the admin\'s own People row to find a phone field.');
  }
  console.log('Phone number formats tried, and what was read back after a reload:', JSON.stringify(results, null, 2));
  await ctx.close();
});
