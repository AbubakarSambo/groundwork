import { test, expect } from '@playwright/test';
import { APP } from '../user-journeys-helpers';
import { mailMark, linkSentTo } from '../sign-in-by-email';
import { WIDTHS, watch, watchSummary, screenshotTo } from './sweep-helpers';

/**
 * A7. BACK OFFICE WHATSAPP PAGE, GROUNDWORK STAFF ONLY (docs/user-journey-tests.md).
 *
 * Steps: enter the number, IDs and secrets -> copy the webhook address -> send a test message.
 * Works when: secrets show only as "Set" or "Not set"; anyone who isn't staff is refused; the
 * test message arrives.
 *
 * PLATFORM_ADMIN_BOOTSTRAP_EMAIL IS EMPTY in api/.env on this computer, and there is no seed that
 * makes a local sign-in a platform admin without editing the database or .env by hand - both out
 * of bounds for this sweep. So only the refusal for a non-staff person is run here; entering
 * secrets, the webhook address and the test message are recorded as not run, not as passing.
 */
test.describe.configure({ mode: 'serial' });

for (const w of WIDTHS) {
  test(`A7 a non-staff admin is refused /admin/whatsapp, at ${w.name}`, async ({ page }) => {
    await page.setViewportSize({ width: w.width, height: w.height });
    const watcher = watch(page);
    const domain = `a7-${w.name}-${Date.now().toString(36)}.test`;
    const email = `admin@${domain}`;
    await page.goto(`${APP}/auth`);
    await page.getByRole('button', { name: 'New here? Sign up' }).click();
    await page.getByLabel('Your name').fill('Not Staff');
    await page.getByLabel('Email', { exact: true }).fill(email);
    const since = await mailMark();
    await page.getByRole('button', { name: 'Create account' }).click();
    const link = await linkSentTo(page, email, /verify-email\?token=[0-9a-f]+/, since);
    await page.goto(link);
    await page.waitForTimeout(1200);
    const cont = page.getByRole('button', { name: 'Continue' });
    if (await cont.isVisible().catch(() => false)) { await cont.click(); await page.waitForTimeout(1000); }
    const keep = page.getByText('Keep using email links instead');
    if (await keep.isVisible().catch(() => false)) { await keep.click(); await page.waitForTimeout(1500); }

    await page.goto(`${APP}/admin/whatsapp`);
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(800);
    const text = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    await screenshotTo(page, `docs/bug-log-screens/_a7-refused-${w.name}.png`);

    const bugs: string[] = [];
    // Refused means: no secrets/number fields visible, and either redirected away from
    // /admin/whatsapp or shown a plain refusal sentence - never the real settings form.
    const sawSecretsForm = /access token|app secret|verify token|phone number ID/i.test(text);
    const stillOnPage = new URL(page.url()).pathname === '/admin/whatsapp';
    if (sawSecretsForm) bugs.push('A non-staff admin can see the WhatsApp secrets form at /admin/whatsapp.');
    if (stillOnPage && !/only|staff|not allowed|refused|permission/i.test(text)) {
      bugs.push('A non-staff admin stayed on /admin/whatsapp with no refusal sentence shown.');
    }
    if (scrollWidth > clientWidth + 2) bugs.push(`Horizontal scroll at ${w.name}: scrollWidth ${scrollWidth} > clientWidth ${clientWidth}.`);
    const issue = watchSummary(watcher);
    if (issue) bugs.push(`Console/network: ${issue}`);
    console.log(`A7 refusal @ ${w.name}:`, bugs.length ? bugs.join(' | ') : 'no issues observed', '| ended on', page.url());
  });
}
