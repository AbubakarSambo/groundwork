import { test, expect } from '@playwright/test';
import { APP } from '../user-journeys-helpers';
import { mailMark, linkSentTo } from '../sign-in-by-email';
import { WIDTHS, watch, watchSummary, screenshotTo } from './sweep-helpers';

/**
 * A1. SIGN UP AND CREATE THE ORGANISATION (docs/user-journey-tests.md).
 *
 * Steps: open the front page -> sign up with an email link, then again with a password -> accept
 * the suggested organisation name -> land on Today.
 *
 * Works when: the name is suggested from the email domain and can be changed; the one-month
 * trial is shown plainly; someone else from the same company domain is offered to join; nothing
 * asks for anything twice.
 *
 * The full sign-up (which sends an email, so is rate-limited to 5/minute) is run once by link and
 * once by password, at 1440 and 390. 1280 and 1024 only check the sign-up form's own layout,
 * which does not send mail, so the rate limit is not a concern.
 */
test.describe.configure({ mode: 'serial' });

async function fullSignUp(page: import('@playwright/test').Page, domain: string, byLink: boolean) {
  await page.goto(`${APP}/auth`);
  await page.getByRole('button', { name: 'New here? Sign up' }).click();
  await page.getByLabel('Your name').fill('Amara Sweep');
  const email = `amara-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}@${domain}`;
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.waitForTimeout(600);
  const orgField = page.getByLabel('Your organisation (optional)');
  const suggested = await orgField.inputValue();
  const since = await mailMark();
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByText('Check your email')).toBeVisible();
  const link = await linkSentTo(page, email, /verify-email\?token=[0-9a-f]+/, since);
  await page.goto(link);
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  const cont = page.getByRole('button', { name: 'Continue' });
  if (await cont.isVisible().catch(() => false)) { await cont.click(); await page.waitForTimeout(1200); }
  if (byLink) {
    const keep = page.getByText('Keep using email links instead');
    if (await keep.isVisible().catch(() => false)) { await keep.click(); await page.waitForTimeout(1200); }
  } else {
    const pw = page.getByLabel(/^Password/).first();
    if (await pw.isVisible().catch(() => false)) {
      await pw.fill('SweepTest123!');
      await page.getByRole('button', { name: 'Save password' }).click();
      await page.waitForTimeout(1200);
    }
  }
  return { email, suggested };
}

test('A1 full sign-up by email link, at 1440', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const watcher = watch(page);
  const domain = `acme-${Date.now().toString(36)}.test`;
  const { suggested } = await fullSignUp(page, domain, true);
  await page.waitForTimeout(1000);
  await screenshotTo(page, 'docs/bug-log-screens/_a1-today-1440.png');
  const text = (await page.locator('body').innerText()).replace(/\s+/g, ' ');

  const bugs: string[] = [];
  if (!suggested) bugs.push('The organisation name was not suggested from the email domain on the sign-up form.');
  if (!/trial/i.test(text)) bugs.push('Today, straight after sign-up, says nothing about the one-month trial.');
  const issue = watchSummary(watcher);
  if (issue) bugs.push(`Console/network: ${issue}`);
  console.log('A1 link @ 1440:', bugs.length ? bugs.join(' | ') : 'no issues observed', '| suggested org name:', JSON.stringify(suggested));
});

test('A1 full sign-up by password, at 390 (phone)', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const watcher = watch(page);
  const domain = `acme-${Date.now().toString(36)}b.test`;
  const { suggested } = await fullSignUp(page, domain, false);
  await page.waitForTimeout(1000);
  await screenshotTo(page, 'docs/bug-log-screens/_a1-today-390.png');
  const text = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);

  const bugs: string[] = [];
  if (!suggested) bugs.push('The organisation name was not suggested from the email domain on the sign-up form.');
  if (!/trial/i.test(text)) bugs.push('Today, straight after sign-up, says nothing about the one-month trial.');
  if (scrollWidth > clientWidth + 2) bugs.push(`Horizontal scroll at 390: scrollWidth ${scrollWidth} > clientWidth ${clientWidth}.`);
  const issue = watchSummary(watcher);
  if (issue) bugs.push(`Console/network: ${issue}`);
  console.log('A1 password @ 390:', bugs.length ? bugs.join(' | ') : 'no issues observed', '| suggested org name:', JSON.stringify(suggested));
});

for (const w of [{ name: '1280', width: 1280, height: 900 }, { name: '1024', width: 1024, height: 900 }]) {
  test(`A1 sign-up form layout only, at ${w.name}`, async ({ page }) => {
    await page.setViewportSize({ width: w.width, height: w.height });
    const watcher = watch(page);
    await page.goto(`${APP}/auth`);
    await page.getByRole('button', { name: 'New here? Sign up' }).click();
    await page.getByLabel('Your name').fill('Amara Sweep');
    await page.getByLabel('Email', { exact: true }).fill(`layout-${w.name}@acme-layout.test`);
    await page.waitForTimeout(500);
    const orgField = page.getByLabel('Your organisation (optional)');
    const suggested = await orgField.inputValue();
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    await screenshotTo(page, `docs/bug-log-screens/_a1-form-${w.name}.png`);

    const bugs: string[] = [];
    if (!suggested) bugs.push('The organisation name was not suggested from the email domain on the sign-up form.');
    if (scrollWidth > clientWidth + 2) bugs.push(`Horizontal scroll at ${w.name}: scrollWidth ${scrollWidth} > clientWidth ${clientWidth}.`);
    const issue = watchSummary(watcher);
    if (issue) bugs.push(`Console/network: ${issue}`);
    console.log(`A1 layout @ ${w.name}:`, bugs.length ? bugs.join(' | ') : 'no issues observed');
  });
}
