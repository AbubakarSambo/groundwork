import { test, expect } from '@playwright/test';
import { APP } from '../user-journeys-helpers';
import { screenshotTo, bugPath } from './sweep-helpers';

/**
 * B-037. A1, sign-up form: choosing "With a password" up front still sends an email link, and
 * the post-verify page still says sign-in links will be used, rather than ever asking for or
 * confirming the password typed on the form.
 *
 * Found first during the tester's interactive M1 sweep (using the Browser pane): picking "With a
 * password" on /auth, filling both password fields and pressing "Create account" produced the
 * same "Check your email" screen as the link path, and the email that arrived was "Your
 * Groundwork sign-in link", not an account-created or verify-your-password email. This spec
 * reproduces it standalone with a screenshot.
 */
test('B-037: choosing "With a password" on sign-up still only sends an email link', async ({ page }) => {
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
  await page.screenshot({ path: bugPath('B-037', 'password-choice-still-emails', '1440'), fullPage: true });
  console.log('B-037: "Check your email" shown after choosing "With a password" up front:', checkEmail);
  expect(checkEmail, 'Expected the current (buggy) behaviour: a password sign-up still lands on "Check your email"').toBe(true);
});
