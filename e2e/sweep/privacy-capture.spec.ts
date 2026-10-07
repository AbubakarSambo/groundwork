import { test } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { pageAs } from './privacy-sign-in-once';
import { watch, watchSummary } from './sweep-helpers';

/**
 * THE PRIVACY SWEEP'S EYES (L4-L8, and "Privacy: every board, report, Today page and Ask answer
 * viewed as the admin, the lead, a team member, a colleague and a guest").
 *
 * For each reader and page in SWEEP_VISITS ("email|path|label;..."), at each width in SWEEP_WIDTHS,
 * opens the page as that person and keeps, in the scratch folder SWEEP_OUT (never the repo): a
 * full-page screenshot, the page's visible text, every JSON body the API served the page, and the
 * console errors and failed requests seen. The reading is done afterwards, by a person, against
 * the rules in CLAUDE.md and docs/decisions.md.
 */
const OUT = process.env.SWEEP_OUT || '';
const VISITS = (process.env.SWEEP_VISITS || '').split(';').filter(Boolean).map((v) => {
  const [email, p, label] = v.split('|');
  return { email, p, label };
});
const WIDTHS = (process.env.SWEEP_WIDTHS || '1440').split(',').map(Number);

test('capture what each reader is shown and served', async ({ browser }) => {
  test.setTimeout(60 * 60 * 1000);
  fs.mkdirSync(OUT, { recursive: true });
  for (const { email, p, label } of VISITS) {
    for (const w of WIDTHS) {
      const page = await pageAs(browser, email, w, w < 500 ? 844 : 900);
      const watcher = watch(page);
      const bodies: { url: string; status: number; body: unknown }[] = [];
      page.on('response', async (res) => {
        if (!res.url().includes('/api/v1/')) return;
        try { bodies.push({ url: `${res.request().method()} ${res.url()}`, status: res.status(), body: await res.json() }); } catch { /* not json */ }
      });
      await page.goto(`http://localhost:5173${p}`);
      await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
      await page.waitForTimeout(2500);
      const base = path.join(OUT, `${label}-${w}`);
      await page.screenshot({ path: `${base}.png`, fullPage: true });
      fs.writeFileSync(`${base}.txt`, `URL ${page.url()}\n\n${await page.locator('body').innerText()}`);
      fs.writeFileSync(`${base}.json`, JSON.stringify(bodies, null, 1));
      fs.writeFileSync(`${base}.errors.txt`, watchSummary(watcher));
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      console.log(label, w, page.url(), overflow > 1 ? `HORIZONTAL OVERFLOW ${overflow}px` : '', watchSummary(watcher) ? 'ERRORS' : '');
      await page.context().close();
    }
  }
});
