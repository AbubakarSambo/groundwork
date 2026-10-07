import { test } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { pageAs } from './privacy-sign-in-once';
import { watch, watchSummary } from './sweep-helpers';

/**
 * L8, THE EXTEND HALF: Rukia presses "Give it more time" on her own short test check-in (it runs
 * out on 12 October) and follows wherever it leads, keeping each screen in SWEEP_OUT.
 */
const OUT = process.env.SWEEP_OUT || '';
const SHORT = 'f3c2057f-224c-4ec7-a954-fe01c62b5552';

test('L8 give a short check-in more time', async ({ browser }) => {
  test.setTimeout(10 * 60 * 1000);
  const p = await pageAs(browser, 'rukia.u8lead@example.test');
  const w = watch(p);
  const keep = async (name: string) => {
    await p.waitForLoadState('networkidle').catch(() => {});
    await p.waitForTimeout(1500);
    await p.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: true });
    fs.writeFileSync(path.join(OUT, `${name}.txt`), `${p.url()}\n${await p.locator('body').innerText()}`);
  };
  await p.goto(`http://localhost:5173/grounds/${SHORT}`);
  await p.waitForLoadState('networkidle').catch(() => {});
  await p.getByRole('button', { name: 'Give it more time' }).or(p.getByRole('link', { name: 'Give it more time' })).first().click();
  await keep('extend-1-after-click');
  const fields = await p.locator('input:visible, select:visible').evaluateAll((els) => els.map((e) => `${e.tagName} ${(e as HTMLInputElement).type} ${e.getAttribute('aria-label') ?? ''} ${(e as HTMLInputElement).value}`));
  const buttons = await p.locator('button:visible').allInnerTexts();
  fs.writeFileSync(path.join(OUT, 'extend-1-controls.txt'), `${fields.join('\n')}\n---\n${buttons.join('\n')}`);
  const date = p.locator('input[type="date"]:visible').first();
  if (await date.isVisible().catch(() => false)) {
    await date.fill('2026-11-30');
    const save = p.getByRole('button', { name: 'Save timeframe' });
    await save.click().catch(() => {});
    await p.waitForTimeout(2500);
  } else {
    const days = p.locator('input[type="number"]:visible').first();
    if (await days.isVisible().catch(() => false)) {
      await days.fill('63');
      await p.getByRole('button', { name: /save|keep|confirm|give it/i }).first().click().catch(() => {});
      await p.waitForTimeout(2500);
    }
  }
  await keep('extend-2-after-save');
  await p.goto(`http://localhost:5173/grounds/${SHORT}`);
  await keep('extend-3-checkin-after');
  fs.writeFileSync(path.join(OUT, 'l8-extend-errors.txt'), watchSummary(w));
  await p.context().close();
});
