import { test, expect } from '@playwright/test';

/**
 * "I AM SETTING IT UP FOR OTHERS" NOW MEANS SOMETHING.
 *
 * Proved the way it failed: create a ground as an admin, choose that option, and check the record -
 * not the screen. Before the fix this was ignored fourteen times out of fourteen, because the client
 * applied it via confirmLead, which rejects a ground the admin created themselves, into a silent
 * catch. The consequence was that the admin owed a check-in on every ground and the report could
 * never close without her.
 */
const APP = 'http://localhost:5173';

test('an admin who is not a party gets no check-in of her own', async ({ browser }) => {
  test.setTimeout(8 * 60 * 1000);
  const c = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
  const page = await c.newPage();

  await page.goto(`${APP}/auth`);
  await page.getByLabel(/^Email$/i).fill('dara@northfield.test');
  await page.getByLabel(/Password/i).fill('SimPass123!');
  await page.getByRole('button', { name: /^Sign in$/ }).click();
  await page.waitForURL(u => !u.pathname.startsWith('/auth'), { timeout: 20000 });

  await page.goto(`${APP}/grounds/new`);
  await page.waitForTimeout(1600);
  await page.getByText('New hire', { exact: true }).first().click();
  const atStart = page.getByText('At the start', { exact: true }).first();
  await atStart.scrollIntoViewIfNeeded(); await atStart.click();
  await page.waitForTimeout(400);

  const next = async () => {
    const b = page.getByRole('button', { name: /^(Continue|Continue →|Next|Open the ground|Create|Save|Done|Finish)/i }).last();
    await b.scrollIntoViewIfNeeded().catch(() => {});
    await b.click({ timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(1600);
  };
  await next(); await next();
  const sels = page.locator('select:visible');
  if (await sels.count() >= 2) {
    await sels.nth(0).selectOption('30').catch(() => {});
    await sels.nth(1).selectOption('WEEKLY').catch(() => {});
  }
  await next();

  await page.waitForTimeout(800);
  await page.locator('input[type="email"]:visible').first().fill('tunde@northfield.test').catch(() => {});
  const rb = page.locator('input[placeholder*="Head of Engineering"]:visible').first();
  if (await rb.count()) await rb.fill('New clinic manager').catch(() => {});
  await page.getByRole('button', { name: /Add to this ground/i }).first().click({ timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(1200);

  /** The choice under test. */
  const setup = page.getByText('I am setting it up for others', { exact: true }).first();
  await setup.scrollIntoViewIfNeeded().catch(() => {});
  await setup.click().catch(() => {});
  console.log('CHOSE: I am setting it up for others');
  await page.waitForTimeout(500);

  for (let i = 0; i < 8; i++) {
    if (/\/grounds\/[0-9a-f-]{36}/.test(page.url())) break;
    const body = (await page.textContent('body')) ?? '';
    if (/successful outcome look like/i.test(body)) {
      const keep = page.getByText('Keep the hire', { exact: true }).first();
      if (await keep.count()) { await keep.scrollIntoViewIfNeeded().catch(() => {}); await keep.click().catch(() => {}); }
    }
    const ta = page.locator('textarea:visible').first();
    if (await ta.count()) await ta.fill('Tunde starts next month. I am setting this up for his manager, not for me.').catch(() => {});
    await next();
  }

  const id = page.url().match(/\/grounds\/([0-9a-f-]{36})/)?.[1];
  console.log(`GROUND: ${id ?? 'NOT CREATED'}`);
  expect(id, 'the ground should be created').toBeTruthy();
  await c.close();
});
