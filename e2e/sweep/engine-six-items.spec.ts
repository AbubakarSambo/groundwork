import { test, Browser, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { WIDTHS, screenshotTo } from './sweep-helpers';

/**
 * THE ENGINE'S SIX SCREEN ITEMS, READ IN A REAL BROWSER AT FOUR WIDTHS (review, 9 October).
 *
 * Commits 1fedcbc6, 0c237bff, adcde9e6, 27ccb571, a5ce8599 and 638202d0. Each page is opened as the
 * person who reads it, its visible text is written to the scratch folder for the reviewer to read,
 * and a full-page picture is saved as docs/bug-log-screens/engine-item-<letter>-<width>.png.
 *
 * Signed-in states come from SWEEP_STATE_DIR (outside the repo). STEPS is a JSON list of
 * { item, app, state, url, tab?, scrollTo?, name? }. Nothing is written to the product.
 */
const DIR = process.env.SWEEP_STATE_DIR || '';
const OUT = process.env.READ_OUT || DIR;
type Step = { item: string; app: string; state: string; url: string; tab?: string; click?: string; scrollTo?: string; name?: string };
const STEPS: Step[] = JSON.parse(process.env.STEPS || '[]');

async function open(browser: Browser, s: Step, width: number, height: number): Promise<{ page: Page; errors: string[] }> {
  const ctx = await browser.newContext({ storageState: path.join(DIR, s.state), viewport: { width, height } });
  const page = await ctx.newPage();
  const errors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 300)); });
  page.on('pageerror', (e) => errors.push('PAGEERROR ' + String(e).slice(0, 300)));
  page.on('response', (r) => { if (r.status() >= 400 && r.url().includes('/api/')) errors.push(`${r.status()} ${r.request().method()} ${r.url()}`); });
  await page.goto(s.app + s.url);
  await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => undefined);
  await page.waitForTimeout(1500);
  if (s.tab) { await page.getByRole('tab', { name: s.tab }).first().click(); await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => undefined); await page.waitForTimeout(1500); }
  if (s.click) { await page.getByText(s.click).first().click(); await page.waitForTimeout(2000); }
  return { page, errors };
}

test('read each item at four widths', async ({ browser }) => {
  for (const s of STEPS) {
    for (const w of WIDTHS) {
      const { page, errors } = await open(browser, s, w.width, w.height);
      const sideways = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      const text = await page.locator('main').first().innerText().catch(() => page.locator('body').innerText());
      /* Text that runs past its own box sideways (clipped or overlapping), the words of each such element. */
      const clipped = await page.evaluate(() => Array.from(document.querySelectorAll('main *')).filter((el) => {
        const e = el as HTMLElement; const cs = getComputedStyle(e);
        return e.children.length === 0 && (e.innerText || '').trim().length > 0 && e.scrollWidth > e.clientWidth + 1 && (cs.overflow === 'hidden' || cs.overflowX === 'hidden' || cs.textOverflow === 'ellipsis');
      }).map((el) => (el as HTMLElement).innerText.slice(0, 80)));
      const name = s.name ?? `engine-item-${s.item}`;
      await screenshotTo(page, `docs/bug-log-screens/${name}-${w.name}.png`);
      fs.writeFileSync(path.join(OUT, `read-${name}-${w.name}.txt`), `URL ${page.url()}\nSIDEWAYS ${sideways}\nCLIPPED ${JSON.stringify(clipped)}\nERRORS ${JSON.stringify(errors)}\n----\n${text}\n`);
      await page.context().close();
    }
  }
});
