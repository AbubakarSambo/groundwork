import { test, expect, Page, Browser } from '@playwright/test';
import { APP } from '../user-journeys-helpers';
import { signIn, mailMark, linkSentTo } from '../sign-in-by-email';
import { watch, watchSummary, screenshotTo } from './sweep-helpers';

/**
 * CONTINUE WITH GOOGLE, END TO END (A2, #/signin and #/signup).
 *
 * Nothing here can run against the real Google: there are no credentials on this computer, and a
 * Google password must never be typed. So the parts that are Google's own are stood in for with
 * `page.route`:
 *
 *   - `/api/v1/auth/methods` answers `google: true` (or `false` for the one test that checks the
 *     button is hidden), the same gate AuthPage, GoogleFailedPage and the entry chat all read.
 *   - Clicking the Google button is a full-page navigation to `/api/v1/auth/google`, which the
 *     real server would hand to Google and get back as `GET /auth/google/callback`. That hop is
 *     replaced with a redirect straight to the client's own `/auth/google/callback`, carrying the
 *     same query shape the server sends (`code`, `new`, `nameOrg`, and `next` when the request
 *     carried one) - see auth.controller.ts's `googleCallback`.
 *   - `/api/v1/auth/google/exchange` answers with a REAL access token for a local test account,
 *     obtained first by signing that account in by email (sign-in-by-email.ts). The callback page
 *     then calls the real, unmocked `/auth/me` with it, so everything from there on - the user
 *     object, the organisation, the redirect - is the genuine product, not a stub.
 *
 * Two accounts:
 *   - naomi@kijani.test, EXISTING, admin of Kijani Foods (used elsewhere in the sweep).
 *   - a FRESH account made here by email sign-up, standing in for "a new Google account": per
 *     findOrCreateGoogleUser (auth.service.ts), someone nobody is expecting gets `isNewUser: true,
 *     needsOrgName: true`, and the callback page (GoogleCallbackPage.tsx) sends that to
 *     `/org-new?naming=1` to name the organisation the server made for them. The test drives that
 *     exact path; the token behind it only needs to be a real, signed-in session, since the
 *     branch taken is decided by the callback URL's own `new`/`nameOrg` flags, not by who the
 *     token belongs to.
 */

const WIDTHS = [
  { name: '1440', width: 1440, height: 900 },
  { name: '390', width: 390, height: 844 },
];

type GoogleStub = {
  googleOn: boolean;
  token?: string;
  isNewUser?: boolean;
  needsOrgName?: boolean;
  failExchange?: boolean;
};

/** Stands in for the server and for Google, as described above. */
async function mockGoogle(page: Page, stub: GoogleStub) {
  await page.route('**/api/v1/auth/methods', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ magicLink: true, google: stub.googleOn }),
    }),
  );

  const startGoogle = (route: import('@playwright/test').Route) => {
    const url = new URL(route.request().url());
    const next = url.searchParams.get('next');
    const params = new URLSearchParams();
    params.set('code', 'test-code');
    params.set('new', String(!!stub.isNewUser));
    params.set('nameOrg', String(!!stub.needsOrgName));
    if (next) params.set('next', next);
    return route.fulfill({ status: 302, headers: { location: `/auth/google/callback?${params.toString()}` } });
  };
  await page.route('**/api/v1/auth/google', startGoogle);
  await page.route('**/api/v1/auth/google?*', startGoogle);

  await page.route('**/api/v1/auth/google/exchange*', (route) => {
    if (stub.failExchange) {
      return route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ message: 'The code has expired.' }) });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ accessToken: stub.token }) });
  });
}

/** A brand-new account, made by email sign-up, as the stand-in for "a new Google account" (see above). */
async function freshAccount(page: Page): Promise<string> {
  const domain = `google-sweep-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}.test`;
  const email = `amara-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}@${domain}`;
  await page.goto(`${APP}/auth`);
  await page.getByRole('button', { name: 'New here? Sign up' }).click();
  await page.getByLabel('Your name').fill('Amara Google');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.waitForTimeout(600);
  const since = await mailMark();
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByText('Check your email')).toBeVisible();
  const link = await linkSentTo(page, email, /verify-email\?token=[0-9a-f]+/, since);
  await page.goto(link);
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  const keep = page.getByText('Keep using email links instead');
  if (await keep.isVisible().catch(() => false)) { await keep.click(); await page.waitForTimeout(1200); }
  await page.waitForTimeout(1000);
  const token = await page.evaluate(() => localStorage.getItem('token'));
  expect(token, 'a token for the fresh account').toBeTruthy();
  return token as string;
}

async function tokenFor(browser: Browser, email: string): Promise<string> {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await signIn(page, email);
  const token = await page.evaluate(() => localStorage.getItem('token'));
  await ctx.close();
  expect(token, `a token for ${email}`).toBeTruthy();
  return token as string;
}

let naomiToken: string;
let newUserToken: string;

test.beforeAll(async ({ browser }) => {
  naomiToken = await tokenFor(browser, 'naomi@kijani.test');
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  newUserToken = await freshAccount(page);
  await ctx.close();
});

for (const w of WIDTHS) {
  test.describe(`at ${w.name}`, () => {
    test(`(a) an existing user, naomi, comes back signed in on Today with her organisation`, async ({ browser }) => {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      await page.setViewportSize({ width: w.width, height: w.height });
      const watcher = watch(page);
      await mockGoogle(page, { googleOn: true, token: naomiToken, isNewUser: false, needsOrgName: false });

      await page.goto(`${APP}/auth`);
      await page.getByRole('button', { name: 'Sign in with Google' }).click();
      await page.waitForURL(/\/(today|)$/, { timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(1200);

      const path = new URL(page.url()).pathname;
      const text = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
      expect(path, `landed on ${page.url()} instead of Today`).toMatch(/\/today/);
      expect(text).toContain('Kijani Foods');

      await screenshotTo(page, `docs/bug-log-screens/google-existing-user-${w.name}.png`);
      const issue = watchSummary(watcher);
      if (issue) console.log(`(a) @ ${w.name} console/network:`, issue);
      await ctx.close();
    });

    test(`(b) a new Google account is sent to name its organisation`, async ({ browser }) => {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      await page.setViewportSize({ width: w.width, height: w.height });
      const watcher = watch(page);
      await mockGoogle(page, { googleOn: true, token: newUserToken, isNewUser: true, needsOrgName: true });

      await page.goto(`${APP}/auth?mode=signup`);
      await page.getByRole('button', { name: 'Sign up with Google' }).click();
      await page.waitForURL(/\/org-new/, { timeout: 15000 });
      await page.waitForTimeout(600);

      expect(new URL(page.url()).search).toContain('naming=1');
      await expect(page.getByText('Create an organisation')).toBeVisible();

      await screenshotTo(page, `docs/bug-log-screens/google-new-user-${w.name}.png`);
      const issue = watchSummary(watcher);
      if (issue) console.log(`(b) @ ${w.name} console/network:`, issue);
      await ctx.close();
    });

    test(`(c) ?next= from an invitation survives the round trip through Google`, async ({ browser }) => {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      await page.setViewportSize({ width: w.width, height: w.height });
      const watcher = watch(page);
      await mockGoogle(page, { googleOn: true, token: naomiToken, isNewUser: false, needsOrgName: false });

      const nextPath = '/j/acme-google-sweep-next';
      await page.goto(`${APP}/auth?mode=signup&next=${encodeURIComponent(nextPath)}`);
      await page.getByRole('button', { name: 'Sign up with Google' }).click();
      await page.waitForURL(new RegExp(nextPath.replace(/\//g, '\\/')), { timeout: 15000 });

      expect(new URL(page.url()).pathname).toBe(nextPath);

      await screenshotTo(page, `docs/bug-log-screens/google-next-survives-${w.name}.png`);
      const issue = watchSummary(watcher);
      if (issue) console.log(`(c) @ ${w.name} console/network:`, issue);
      await ctx.close();
    });

    test(`(d) a failed callback lands on /google-failed with a way on`, async ({ browser }) => {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      await page.setViewportSize({ width: w.width, height: w.height });
      const watcher = watch(page);
      await mockGoogle(page, { googleOn: true, failExchange: true });

      await page.goto(`${APP}/auth`);
      await page.getByRole('button', { name: 'Sign in with Google' }).click();
      await page.waitForURL(/\/google-failed/, { timeout: 15000 });
      await page.waitForTimeout(400);

      await expect(page.getByText('Google sign-in didn’t finish')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Try Google again' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Email me a sign-in link' })).toBeVisible();

      await screenshotTo(page, `docs/bug-log-screens/google-failed-callback-${w.name}.png`);
      const issue = watchSummary(watcher);
      if (issue) console.log(`(d) @ ${w.name} console/network:`, issue);
      await ctx.close();
    });

    test(`(e) with google:false, no Google button shows on sign-in, sign-up or the failed page`, async ({ browser }) => {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      await page.setViewportSize({ width: w.width, height: w.height });
      const watcher = watch(page);
      await mockGoogle(page, { googleOn: false });

      await page.goto(`${APP}/auth`);
      await page.waitForTimeout(500);
      await expect(page.getByRole('button', { name: 'Sign in with Google' })).toHaveCount(0);

      await page.goto(`${APP}/auth?mode=signup`);
      await page.waitForTimeout(500);
      await expect(page.getByRole('button', { name: 'Sign up with Google' })).toHaveCount(0);

      await page.goto(`${APP}/google-failed`);
      await page.waitForTimeout(500);
      await expect(page.getByRole('button', { name: 'Try Google again' })).toHaveCount(0);
      await expect(page.getByRole('link', { name: 'Email me a sign-in link' })).toBeVisible();

      await screenshotTo(page, `docs/bug-log-screens/google-off-${w.name}.png`);
      const issue = watchSummary(watcher);
      if (issue) console.log(`(e) @ ${w.name} console/network:`, issue);
      await ctx.close();
    });
  });
}
