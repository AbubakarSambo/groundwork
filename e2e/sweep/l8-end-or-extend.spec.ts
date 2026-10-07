import { test } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { pageAs } from './privacy-sign-in-once';
import { watch, watchSummary } from './sweep-helpers';

/**
 * L8. END OR EXTEND A CHECK-IN (docs/user-journey-tests.md), on Kilima Traders U8's own test
 * check-ins, never a seeded company's. The lead looks for a way to give a short check-in more time,
 * then ends another one from "Decide how it ends", and each person in it is read afterwards.
 * Everything seen is kept in SWEEP_OUT, outside the repo.
 */
const OUT = process.env.SWEEP_OUT || '';
const SHORT = 'f3c2057f-224c-4ec7-a954-fe01c62b5552'; // runs out on 12 October
const TO_END = '1cf7728d-be07-45ff-9858-c501444fa6fe'; // Rukia leads, Amani and Juma are in it

test('L8 extend one and end another, and read what each person sees', async ({ browser }) => {
  test.setTimeout(15 * 60 * 1000);
  fs.mkdirSync(OUT, { recursive: true });
  const keep = async (page: import('@playwright/test').Page, name: string) => {
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: true });
    fs.writeFileSync(path.join(OUT, `${name}.txt`), `${page.url()}\n${await page.locator('body').innerText()}`);
  };

  const rukia = await pageAs(browser, 'rukia.u8lead@example.test');
  const w = watch(rukia);
  for (const tab of ['', '?tab=settings']) {
    await rukia.goto(`http://localhost:5173/grounds/${SHORT}${tab}`);
    await keep(rukia, `extend-short${tab ? '-settings' : ''}`);
  }
  const more = rukia.getByRole('button', { name: /more time|extend|longer/i }).or(rukia.getByRole('link', { name: /more time|extend|longer/i })).first();
  fs.writeFileSync(path.join(OUT, 'extend-control.txt'), (await more.isVisible().catch(() => false)) ? `found: ${await more.innerText()}` : 'no control to give it more time');

  await rukia.goto(`http://localhost:5173/grounds/${TO_END}/end`);
  await rukia.waitForLoadState('networkidle').catch(() => {});
  await rukia.getByText('The work stops.', { exact: true }).click();
  await rukia.getByRole('textbox').first().fill('This was a test check-in for the sweep, and the work it followed has stopped.');
  await rukia.getByRole('button', { name: 'Save the outcome and end it' }).click();
  await rukia.waitForTimeout(2000);
  const confirm = rukia.getByRole('button', { name: /end it|yes|confirm/i }).last();
  if (await confirm.isVisible().catch(() => false)) { await confirm.click(); await rukia.waitForTimeout(2500); }
  await keep(rukia, 'ended-lead-after-save');
  await rukia.goto(`http://localhost:5173/grounds/${TO_END}/board`);
  await keep(rukia, 'ended-lead-board');
  fs.writeFileSync(path.join(OUT, 'l8-errors-lead.txt'), watchSummary(w));
  await rukia.context().close();

  for (const [email, name] of [['amani.u8@example.test', 'member'], ['juma.u8admin@example.test', 'admin-member']]) {
    const p = await pageAs(browser, email);
    const pw = watch(p);
    for (const [route, n] of [[`/grounds/${TO_END}/board`, 'board'], [`/grounds/${TO_END}/p`, 'p'], ['/today', 'today']]) {
      await p.goto(`http://localhost:5173${route}`);
      await keep(p, `ended-${name}-${n}`);
    }
    fs.writeFileSync(path.join(OUT, `l8-errors-${name}.txt`), watchSummary(pw));
    await p.context().close();
  }
});
