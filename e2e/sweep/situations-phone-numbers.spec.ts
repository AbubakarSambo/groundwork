import { test } from '@playwright/test';
import { signUp, APP, whatIsOnThePage } from '../user-journeys-helpers';
import { screenshotTo } from './sweep-helpers';

/**
 * Phone numbers typed different ways, where a WhatsApp number is entered for a team member
 * (A2: "add WhatsApp numbers for two"). Tries the People page's own per-person control.
 */
test('phone numbers typed different ways', async ({ page }) => {
  test.setTimeout(2 * 60 * 1000);
  const stamp = Date.now();
  await page.setViewportSize({ width: 1440, height: 900 });
  await signUp(page, { name: 'Phone Test Admin', email: `phone-admin.${stamp}@sweeptest.test`, organisation: `Phone Co ${stamp}` });
  await page.goto(`${APP}/org/members`);
  await page.waitForTimeout(800);
  await screenshotTo(page, 'docs/bug-log-screens/_phone-people-page-1440.png');

  const openSelf = page.getByRole('link', { name: /^Open Phone Test Admin/ }).first();
  await openSelf.click();
  await page.waitForTimeout(1000);
  await screenshotTo(page, 'docs/bug-log-screens/_phone-person-detail-1440.png');
  const detailText = await whatIsOnThePage(page);
  console.log('Person-detail page FULL text (looking for a phone/WhatsApp field):', detailText.replace(/\s+/g, ' '));

  // Try the Connections page too.
  await page.goto(`${APP}/settings/connections`);
  await page.waitForTimeout(1000);
  await screenshotTo(page, 'docs/bug-log-screens/_phone-connections-page-1440.png');
  console.log('Connections page text:', (await whatIsOnThePage(page)).replace(/\s+/g, ' ').slice(0, 600));
});
