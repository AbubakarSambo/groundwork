import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * THE REPORT AND THE BOARD, READ AS THE PERSON THEY ARE FOR.
 *
 * Everything else was scaffolding for this. Captured full page and dumped as text, because the
 * question is not "did it render" but "would a busy leader act on it in two minutes".
 */
const APP = 'http://localhost:5173';
const GID = '51f92717-67de-4ac3-a18b-7e2a17105bd5';
const OUT = path.join(__dirname, '..', 'shots', 'org-sim', 'report');

test('the report and the board', async ({ browser }) => {
  test.setTimeout(6 * 60 * 1000);
  fs.mkdirSync(OUT, { recursive: true });
  const c = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
  const page = await c.newPage();

  await page.goto(`${APP}/auth`);
  await page.getByLabel(/^Email$/i).fill('sahar@meridianhealth.test');
  await page.getByLabel(/Password/i).fill('SimPass123!');
  await page.getByRole('button', { name: /^Sign in$/ }).click();
  await page.waitForURL(u => !u.pathname.startsWith('/auth'), { timeout: 20000 });

  for (const [name, url] of [['report', `${APP}/grounds/${GID}/report`], ['board', `${APP}/grounds/${GID}/board`]]) {
    await page.goto(url);
    await page.waitForTimeout(4000);
    /** Anything gated behind a click - activate, release, generate - gets clicked once. */
    for (const re of [/Activate|Release|Generate|Show me|Open the report/i]) {
      const b = page.getByRole('button', { name: re }).first();
      if (await b.count()) { await b.click().catch(() => {}); await page.waitForTimeout(5000); }
    }
    await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: true });
    const txt = ((await page.textContent('body')) ?? '').replace(/\s+/g, ' ').trim();
    fs.writeFileSync(path.join(OUT, `${name}.txt`), txt);
    console.log(`\n===== ${String(name).toUpperCase()} (${txt.length} chars) =====\n${txt.slice(0, 2600)}`);
  }
  await c.close();
  expect(true).toBe(true);
});
