import { test, expect } from '@playwright/test';

/**
 * THE PROMISE THE SIGNUP MAKES, KEPT.
 *
 * Signup says twice that you will be asked to set a password. Before this fix you never were, and the
 * cost only appeared later: a passwordless account can ONLY be re-entered by requesting a fresh
 * emailed link, every single time. In the 18-ground run that is what stopped grounds reaching a
 * report, because the last person to check in could never sign back in to finish.
 *
 * Proved end to end, as a person: sign up, open the emailed link, land on the password screen, set
 * one, then SIGN IN WITH IT - which is the half that actually matters.
 */
const APP = 'http://localhost:5173';
const MAIL = 'http://localhost:1080';
const EMAIL = `newstarter${Date.now()}@meridianhealth.test`;
const PW = 'FreshPass123!';

async function link(to: string) {
  for (let i = 0; i < 12; i++) {
    try {
      const j: any = await (await fetch(`${MAIL}/link?to=${encodeURIComponent(to)}`)).json();
      if (j?.link) return j.link as string;
    } catch { /* not up */ }
    await new Promise(r => setTimeout(r, 1500));
  }
  return null;
}

test('signup asks for a password, and that password works', async ({ browser }) => {
  test.setTimeout(5 * 60 * 1000);
  const c = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
  const page = await c.newPage();

  await page.goto(`${APP}/auth?mode=signup`);
  await page.getByLabel(/Your name/i).fill('Tomi Balogun');
  await page.getByLabel(/^Email$/i).fill(EMAIL);
  await page.getByLabel(/Your organisation/i).fill('Balogun Care');
  await page.getByRole('button', { name: /Create my account/i }).click();

  const activate = await link(EMAIL);
  expect(activate, 'an activation email should arrive').toBeTruthy();
  await page.goto(activate!);
  await page.waitForTimeout(3500);

  /** THE FIX: verification now lands on the password screen instead of straight into the app. */
  const url = page.url();
  const body = (await page.textContent('body')) ?? '';
  console.log(`AFTER VERIFY: ${url.replace(APP, '')}`);
  expect(url, 'verification should route to set-password').toContain('/set-password');

  const boxes = page.locator('input[type="password"]:visible');
  await expect(boxes.first()).toBeVisible();
  const n = await boxes.count();
  for (let i = 0; i < n; i++) await boxes.nth(i).fill(PW);
  await page.getByRole('button', { name: /Set|Save|Continue|Choose|Reset/i }).first().click();
  await page.waitForTimeout(3500);
  console.log(`AFTER SET: ${page.url().replace(APP, '')}`);

  /** The half that matters: sign out, then sign in with the password they just chose. */
  await page.goto(`${APP}/signout`);
  await page.waitForTimeout(2500);
  await page.goto(`${APP}/auth`);
  await page.getByLabel(/^Email$/i).fill(EMAIL);
  await page.getByLabel(/Password/i).fill(PW);
  await page.getByRole('button', { name: /^Sign in$/ }).click();
  await page.waitForURL(u => !u.pathname.startsWith('/auth'), { timeout: 20000 });
  console.log(`SIGNED IN WITH PASSWORD: ${page.url().replace(APP, '')}`);
  expect(page.url()).not.toContain('/auth');

  void body;
  await c.close();
});
