import { test, expect, Page } from '@playwright/test';
import { screenshotTo } from './sweep-helpers';

/**
 * FRESH SCREENSHOTS, AFTER THE FIX, FOR THE PAGE-AUDIT BUGS FIXED IN THIS PASS OF
 * docs/bug-log-screens.md: B-042, B-043, B-045, B-047, B-048 and B-049.
 *
 * Same shape as fixed-screenshots.spec.ts: reach the real state through the running app and the
 * real API (naomi@kijani.test, an admin who runs several check-ins but has never been one of
 * their subjects - exactly the B-043 case - and the same local passwords page-audit.spec.ts
 * already uses), then screenshot the fixed page at 1440 and 390.
 */
test.describe.configure({ mode: 'serial' });

const CLIENT = 'http://localhost:5173';
const ADMIN = { email: 'naomi@kijani.test', password: 'review-local-only' };

async function signInPassword(page: Page, email: string, password: string) {
  await page.goto(`${CLIENT}/auth`);
  await page.locator('#signin-email').fill(email);
  await page.locator('#signin-password').fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.waitForTimeout(2000);
}

async function shoot(page: Page, id: string, width: number) {
  await page.setViewportSize({ width, height: width === 1440 ? 900 : 844 });
  await page.waitForTimeout(400);
  await screenshotTo(page, `docs/bug-log-screens/${id}-fixed-${width}.png`);
}

test('B-043: an admin with no report of her own reads "Your work in each" with no empty "Your board" above it', async () => {
  test.setTimeout(60_000);
  const { chromium } = await import('@playwright/test');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });
  await signInPassword(page, ADMIN.email, ADMIN.password);

  for (const width of [1440, 390] as const) {
    await page.setViewportSize({ width, height: width === 1440 ? 900 : 844 });
    await page.goto(`${CLIENT}/you`);
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(600);
    await screenshotTo(page, `docs/bug-log-screens/B-043-fixed-${width}.png`);
    const text = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
    expect(text, 'the page still shows her own section of the You page').toContain('Your work in each');
    expect(text, 'no empty "Your board" heading above it').not.toContain('Your board');
  }
  await browser.close();
});

test('B-042: a switched-off suite\'s toast no longer sits over the page\'s own heading and subtitle', async () => {
  test.setTimeout(60_000);
  const { chromium } = await import('@playwright/test');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });
  await signInPassword(page, ADMIN.email, ADMIN.password);

  for (const width of [1440, 390] as const) {
    await page.setViewportSize({ width, height: width === 1440 ? 900 : 844 });
    await page.goto(`${CLIENT}/suite/time`);
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(800);
    await shoot(page, 'B-042', width);
    const text = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
    expect(text, 'the page\'s own explanatory sentence still reads in full').toContain('Hours are for billing only');
    const toast = page.getByText('That is not here any more');
    if (await toast.count()) {
      const toastBox = await toast.first().boundingBox();
      const subtitle = page.getByText('They never appear in anyone', { exact: false });
      const subBox = await subtitle.first().boundingBox().catch(() => null);
      if (toastBox && subBox) {
        // The toast's box must not vertically overlap the subtitle's box.
        const overlaps = toastBox.y < subBox.y + subBox.height && toastBox.y + toastBox.height > subBox.y
          && toastBox.x < subBox.x + subBox.width && toastBox.x + toastBox.width > subBox.x;
        expect(overlaps, 'the toast must not sit on top of the page\'s own subtitle').toBe(false);
      }
    }
  }
  await browser.close();
});

test('B-045: the checkout page starts near the top, with no empty band above its heading', async () => {
  test.setTimeout(60_000);
  const { chromium } = await import('@playwright/test');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });
  await signInPassword(page, ADMIN.email, ADMIN.password);

  for (const width of [1440, 390] as const) {
    await page.setViewportSize({ width, height: width === 1440 ? 900 : 844 });
    await page.goto(`${CLIENT}/billing/checkout?groundId=shot&groundName=${encodeURIComponent('Shot check-in')}`);
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(600);
    await shoot(page, 'B-045', width);
    /* B-145: retitled from "Add sessions to this check-in", which contradicted the page's own
       body ("Sessions are not charged for"), to "Use an access code" - the one thing this page
       still does. */
    const heading = page.getByText('Use an access code');
    await expect(heading).toBeVisible();
    const box = await heading.boundingBox();
    expect(box, 'the heading must be found').not.toBeNull();
    // It used to sit roughly 300px down a 900px-tall viewport; now it starts near the top.
    expect(box!.y, 'no large empty band above the heading').toBeLessThan(200);
  }
  await browser.close();
});

test('B-048: the staff-only refusal renders the same way (no customer sidebar) on /preview/reports as on /admin', async () => {
  test.setTimeout(60_000);
  const { chromium } = await import('@playwright/test');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });
  await signInPassword(page, ADMIN.email, ADMIN.password);

  for (const width of [1440, 390] as const) {
    await page.setViewportSize({ width, height: width === 1440 ? 900 : 844 });
    await page.goto(`${CLIENT}/preview/reports`);
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(600);
    await shoot(page, 'B-048', width);
    const text = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
    expect(text).toContain('This part is for Groundwork staff');
    // The customer rail (the organisation switcher) must not render alongside the refusal.
    expect(text, 'no customer sidebar beside the staff-only refusal').not.toContain('Start a check-in');
  }
  await browser.close();
});

test('B-049: with nothing to join, /welcome only promises what it offers', async () => {
  test.setTimeout(60_000);
  const { chromium } = await import('@playwright/test');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });
  await signInPassword(page, ADMIN.email, ADMIN.password);

  for (const width of [1440, 390] as const) {
    await page.setViewportSize({ width, height: width === 1440 ? 900 : 844 });
    await page.goto(`${CLIENT}/welcome`);
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(600);
    await shoot(page, 'B-049', width);
    const text = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
    expect(text).toContain('Create a new organisation for your team. If somebody invited you to join theirs, use the link they sent you.');
    expect(text).not.toContain('Join an organisation you belong to, or create a new one.');
  }
  await browser.close();
});

test('B-047: /join/confirm with no token reads the same shared shell as every other dead link', async () => {
  test.setTimeout(60_000);
  for (const width of [1440, 390] as const) {
    const { chromium } = await import('@playwright/test');
    const browser = await chromium.launch();
    const page = await browser.newPage();
    await page.setViewportSize({ width, height: width === 1440 ? 900 : 844 });
    // Signed out on purpose: this is the one refusal screen in the audit a stranger reaches cold.
    await page.goto(`${CLIENT}/join/confirm`);
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(600);
    await shoot(page, 'B-047', width);
    const text = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
    expect(text).toContain('This join link did not work');
    expect(text).toContain('Sign in instead');
    await browser.close();
  }
});
