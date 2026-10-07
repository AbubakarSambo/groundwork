import { test, expect } from '@playwright/test';
import { APP } from '../user-journeys-helpers';
import { screenshotTo, bugPath } from './sweep-helpers';

/**
 * B-037. A1, sign-up form: choosing "With a password" up front still lands on "Check your
 * email", with no sentence anywhere saying the password typed on the form was kept.
 *
 * CHECKED AGAINST THE API FIRST (per the sweep's instructions): the password IS saved and IS
 * used. `entrySave` sends it (client/src/api/auth.ts), the server keeps it for an address with
 * no account yet, and a live probe (sign up with a password, verify the email, sign out, sign
 * back in with that exact password) lands signed in - the account genuinely was made with that
 * password. Confirming the address by email first is still correct even so: nothing can let
 * somebody claim an address they have not proved they own, so an email round trip is not
 * avoidable. What was missing was telling the person that - this screen read identically
 * whichever door was chosen, so picking a password looked silently ignored even though it was
 * not. Fixed by LinkSentPanel's own `withPassword` sentence, said only when a password was
 * actually sent with the account.
 *
 * This test used to pin the OLD, CONFUSING wording as "expected" (a reproduction, not a
 * regression guard). Updated, with this comment, to pin the fixed sentence instead.
 */
test('B-037: choosing "With a password" on sign-up says the password was kept', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const stamp = Date.now();
  await page.goto(`${APP}/auth`);
  await page.getByRole('button', { name: 'New here? Sign up' }).click();
  await page.getByLabel('Your name').fill('B037 Sweep');
  await page.getByLabel('Email', { exact: true }).fill(`b037.${stamp}@sweeptest.test`);
  await page.getByLabel('Your organisation (optional)').fill(`B037 Sweep Co ${stamp}`);
  await page.getByRole('radio', { name: 'With a password' }).click();
  await page.getByLabel(/^Password/).first().fill('SweepTest123!');
  const again = page.getByLabel(/Type it again/).first();
  if (await again.isVisible().catch(() => false)) await again.fill('SweepTest123!');
  await page.waitForTimeout(300);
  await screenshotTo(page, 'docs/bug-log-screens/_b037-form-before-submit-1440.png');
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.waitForTimeout(1500);
  const checkEmail = await page.getByText('Check your email').isVisible().catch(() => false);
  const saysPasswordKept = await page.getByText(/Your password is saved/).isVisible().catch(() => false);
  await page.screenshot({ path: bugPath('B-037', 'password-choice-still-emails', '1440'), fullPage: true });
  console.log('B-037: "Check your email" shown after choosing "With a password":', checkEmail, '- and it says so:', saysPasswordKept);
  expect(checkEmail, 'Confirming the email is still required, and still correct, even with a password chosen').toBe(true);
  expect(saysPasswordKept, 'The screen must say the password was kept, not read identically to the link path').toBe(true);
});
