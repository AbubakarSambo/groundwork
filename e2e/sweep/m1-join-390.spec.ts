import { test, expect } from '@playwright/test';
import { signUp, APP, whatIsOnThePage } from '../user-journeys-helpers';
import { mailMark, linkSentTo } from '../sign-in-by-email';
import { watch, watchSummary, screenshotTo } from './sweep-helpers';

/**
 * M1. JOIN, at 390 (phone width), in Playwright so real .png screenshots can be saved
 * (docs/user-journey-tests.md: "Run the full join at 1440 and 390").
 *
 * A fresh admin invites one team member by email; the team member opens the invitation on a
 * phone-width screen, sets a password, and arrives at Check-ins.
 *
 * Works when: it is obvious what to do; nothing forces WhatsApp; the invitation's wording about
 * who reads what is true.
 */
test('M1 join at 390: open the invitation, sign in, arrive at Check-ins', async ({ page }) => {
  test.setTimeout(3 * 60 * 1000);
  const stamp = Date.now();
  const adminEmail = `m1-390-admin.${stamp}@sweeptest.test`;
  const memberEmail = `m1-390-member.${stamp}@sweeptest.test`;

  // The admin's own sign-up can stay at 1440; what is under test is the member's phone join.
  await page.setViewportSize({ width: 1440, height: 900 });
  await signUp(page, { name: 'M1 Three Ninety Admin', email: adminEmail, organisation: `M1 390 Co ${stamp}` });
  await page.goto(`${APP}/org/members`);
  await page.getByPlaceholder(/Faith Kerubo/).fill(`M1 Three Ninety Member\n${memberEmail}`);
  await page.waitForTimeout(1000);
  // First click shows a per-line preview/breakdown, not the actual send; the real send is a
  // second button ("Send N invitation(s)") that appears once the preview is up.
  await page.getByRole('button', { name: 'Send their invitations' }).click();
  await page.waitForTimeout(1000);
  const since = await mailMark();
  const sendCount = page.getByText(/^Send \d+ invitation/, { exact: false });
  await sendCount.first().waitFor({ state: 'visible', timeout: 10000 });
  await sendCount.first().click();
  await page.waitForTimeout(2000);
  await screenshotTo(page, 'docs/bug-log-screens/_m1-390-after-invite-click.png');

  // Now the invited member, on a phone-width screen, starting from nothing (no admin session kept).
  const memberPage = await page.context().browser()!.newPage();
  await memberPage.setViewportSize({ width: 390, height: 844 });
  const watcher = watch(memberPage);
  const link = await linkSentTo(memberPage, memberEmail, /set-password\?token=[0-9a-f]+/, since);
  await memberPage.goto(link);
  await memberPage.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
  await screenshotTo(memberPage, 'docs/bug-log-screens/_m1-390-set-password.png');

  const pwText = await whatIsOnThePage(memberPage);
  const mentionsWhatsApp = /whatsapp/i.test(pwText);
  if (mentionsWhatsApp) console.log('M1 390: set-password page mentions WhatsApp:', pwText);

  await memberPage.getByLabel(/^Password/).first().fill('SweepTest390!');
  const again = memberPage.getByLabel(/Type it again/);
  if (await again.count()) await again.first().fill('SweepTest390!');
  await memberPage.getByRole('button', { name: /Save password|Set password|Continue/i }).first().click();
  await memberPage.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
  await memberPage.waitForTimeout(1500);
  await screenshotTo(memberPage, 'docs/bug-log-screens/_m1-390-after-join.png');

  const landedText = await whatIsOnThePage(memberPage);
  const onCheckIns = /check-in/i.test(landedText);
  const forcedWhatsApp = /connect whatsapp|link whatsapp|add your whatsapp number/i.test(landedText) && !/skip|later|not now/i.test(landedText);

  console.log('M1 390: landed text snippet:', landedText.slice(0, 300));
  console.log('M1 390: appears to be on a Check-ins-related page:', onCheckIns, '| forced WhatsApp connect (no skip offered):', forcedWhatsApp);

  const issue = watchSummary(watcher);
  if (issue) console.log('M1 390 console/network:', issue);

  expect(onCheckIns, 'The member should land somewhere about check-ins after joining').toBe(true);
  expect(forcedWhatsApp, 'Nothing should force connecting WhatsApp with no way to skip').toBe(false);
});
