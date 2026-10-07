import { test, expect } from '@playwright/test';
import { APP } from '../user-journeys-helpers';
import { mailMark, linkSentTo } from '../sign-in-by-email';
import { watch, watchSummary, screenshotTo } from './sweep-helpers';

/**
 * A1 (continued): "someone else from the same company domain is offered to join." Two different
 * people sign up with the same email domain, one after the other; the second should be offered
 * the first's organisation rather than quietly starting a new one.
 */
test('A1 a second sign-up from the same email domain is offered to join, not a new org', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const watcher = watch(page);
  const domain = `samedomain-${Date.now().toString(36)}.test`;

  await page.goto(`${APP}/auth`);
  await page.getByRole('button', { name: 'New here? Sign up' }).click();
  await page.getByLabel('Your name').fill('First Admin');
  const email1 = `first@${domain}`;
  await page.getByLabel('Email', { exact: true }).fill(email1);
  let since = await mailMark();
  await page.getByRole('button', { name: 'Create account' }).click();
  let link = await linkSentTo(page, email1, /verify-email\?token=[0-9a-f]+/, since);
  await page.goto(link);
  await page.waitForTimeout(1200);
  const cont = page.getByRole('button', { name: 'Continue' });
  if (await cont.isVisible().catch(() => false)) { await cont.click(); await page.waitForTimeout(1000); }
  const keep = page.getByText('Keep using email links instead');
  if (await keep.isVisible().catch(() => false)) { await keep.click(); await page.waitForTimeout(1500); }

  await page.context().clearCookies();
  await page.evaluate(() => { try { localStorage.clear(); } catch { /* private window */ } });
  await page.goto(`${APP}/auth`);
  await page.getByRole('button', { name: 'New here? Sign up' }).click();
  await page.getByLabel('Your name').fill('Second Person');
  const email2 = `second@${domain}`;
  await page.getByLabel('Email', { exact: true }).fill(email2);
  await page.waitForTimeout(700);

  const text = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
  await screenshotTo(page, 'docs/bug-log-screens/_a1-same-domain-second-person.png');

  const bugs: string[] = [];
  if (!/join|already|existing|First Admin/i.test(text)) {
    bugs.push('The second person, signing up with the same email domain as an existing organisation, was never offered to join it; the form behaved as if starting a brand new organisation.');
  }
  const issue = watchSummary(watcher);
  if (issue) bugs.push(`Console/network: ${issue}`);
  console.log('A1 same-domain join offer:', bugs.length ? bugs.join(' | ') : 'no issues observed');
});
