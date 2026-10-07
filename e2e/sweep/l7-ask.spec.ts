import { test, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { pageAs } from './privacy-sign-in-once';
import { watch, watchSummary } from './sweep-helpers';

/**
 * L7. ASK, IN THE BROWSER (docs/user-journey-tests.md), on Kijani Foods.
 *
 * A lead asks about the company, about a person's work and about a check-in, then adds context and
 * asks to add a document. A team member asks about a colleague. Every answer, and every Ask payload
 * the API served, is kept in SWEEP_OUT (outside the repo) and read afterwards. Works when: it is
 * named after the organisation; it answers across the organisation; anything added is said back and
 * confirmed first; questions stay private.
 */
const OUT = process.env.SWEEP_OUT || '';
const WHO = (process.env.SWEEP_ASK || '').split(';').filter(Boolean).map((s) => { const [email, label, ...qs] = s.split('|'); return { email, label, qs }; });

async function askOne(page: Page, q: string) {
  const box = page.getByRole('textbox').last();
  await box.fill(q);
  await box.press('Enter');
  for (let t = 0; t < 90; t++) {
    await page.waitForTimeout(1000);
    if (await box.isEnabled().catch(() => false) && !(await page.getByText('Still reading what you wrote').isVisible().catch(() => false)) && t > 4) break;
  }
  await page.waitForTimeout(1500);
}

test('L7 ask as each reader', async ({ browser }) => {
  test.setTimeout(30 * 60 * 1000);
  fs.mkdirSync(OUT, { recursive: true });
  for (const { email, label, qs } of WHO) {
    const page = await pageAs(browser, email);
    const w = watch(page);
    const bodies: unknown[] = [];
    page.on('response', async (r) => { if (r.url().includes('/api/v1/ask')) { try { bodies.push({ url: `${r.request().method()} ${r.url()}`, body: await r.json() }); } catch { /* */ } } });
    await page.goto('http://localhost:5173/chat');
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(1500);
    const about = process.env.SWEEP_ASK_ABOUT;
    if (about) {
      const sel = page.locator('select').first();
      if (await sel.isVisible().catch(() => false)) await sel.selectOption({ label: about }).catch(() => {});
      else await page.getByRole('button', { name: about }).first().click().catch(() => {});
      await page.waitForTimeout(1500);
    }
    for (const q of qs) await askOne(page, q);
    await page.screenshot({ path: path.join(OUT, `${label}-1440.png`), fullPage: true });
    fs.writeFileSync(path.join(OUT, `${label}.txt`), await page.locator('body').innerText());
    fs.writeFileSync(path.join(OUT, `${label}.json`), JSON.stringify(bodies, null, 1));
    fs.writeFileSync(path.join(OUT, `${label}.errors.txt`), watchSummary(w));
    await page.context().close();
  }
});
