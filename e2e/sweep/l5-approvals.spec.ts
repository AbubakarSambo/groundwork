import { test } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { pageAs } from './privacy-sign-in-once';
import { startMail, mailCount, mailSince } from './l5-mail';
import { watch, watchSummary } from './sweep-helpers';

/**
 * L5. APPROVALS, THE BROWSER PART (docs/user-journey-tests.md), on Suites Test Company.
 *
 * Grace asks to spend a little on travel in the app; Daniel, her manager, approves her waiting leave
 * in the app; then Grace's own requests page and the local mail catcher are read for whether she was
 * told. Works when: the person is told the decision; nothing waits silently.
 * Everything seen is kept in SWEEP_OUT, outside the repo.
 */
const OUT = process.env.SWEEP_OUT || '';

test('L5 a request arrives, the manager approves one, the person is told', async ({ browser }) => {
  test.setTimeout(10 * 60 * 1000);
  fs.mkdirSync(OUT, { recursive: true });
  await startMail();
  const since = mailCount();
  const notes: string[] = [];

  const grace = await pageAs(browser, 'grace@suites.test');
  const gw = watch(grace);
  await grace.goto('http://localhost:5173/suite/spend/new');
  await grace.waitForLoadState('networkidle').catch(() => {});
  await grace.getByLabel(/Amount/).fill('3000');
  await grace.getByLabel(/What it is for/).fill('Matatu fares to the Kilimani shops');
  await grace.getByText('Travel', { exact: true }).click().catch(() => notes.push('no Travel choice'));
  await grace.getByRole('button', { name: 'Send' }).click();
  await grace.waitForTimeout(3000);
  await grace.screenshot({ path: path.join(OUT, 'l5-grace-after-send-1440.png'), fullPage: true });
  fs.writeFileSync(path.join(OUT, 'l5-grace-after-send.txt'), `${grace.url()}\n${await grace.locator('body').innerText()}`);

  const daniel = await pageAs(browser, 'daniel@suites.test');
  const dw = watch(daniel);
  await daniel.goto('http://localhost:5173/suite/queue');
  await daniel.waitForLoadState('networkidle').catch(() => {});
  await daniel.waitForTimeout(1500);
  fs.writeFileSync(path.join(OUT, 'l5-daniel-queue-before.txt'), await daniel.locator('body').innerText());
  await daniel.getByRole('button', { name: 'Approve' }).first().click();
  await daniel.waitForTimeout(3000);
  await daniel.screenshot({ path: path.join(OUT, 'l5-daniel-after-approve-1440.png'), fullPage: true });
  fs.writeFileSync(path.join(OUT, 'l5-daniel-queue-after.txt'), await daniel.locator('body').innerText());

  await grace.goto('http://localhost:5173/suite/mine');
  await grace.waitForLoadState('networkidle').catch(() => {});
  await grace.waitForTimeout(1500);
  await grace.screenshot({ path: path.join(OUT, 'l5-grace-mine-after-1440.png'), fullPage: true });
  fs.writeFileSync(path.join(OUT, 'l5-grace-mine-after.txt'), await grace.locator('body').innerText());
  await grace.goto('http://localhost:5173/today');
  await grace.waitForLoadState('networkidle').catch(() => {});
  await grace.waitForTimeout(1500);
  fs.writeFileSync(path.join(OUT, 'l5-grace-today-after.txt'), await grace.locator('body').innerText());

  await grace.waitForTimeout(8000);
  fs.writeFileSync(path.join(OUT, 'l5-mail.txt'), mailSince(since).join('\n\n=========\n\n'));
  fs.writeFileSync(path.join(OUT, 'l5-errors.txt'), `grace: ${watchSummary(gw)}\ndaniel: ${watchSummary(dw)}\n${notes.join('\n')}`);
  await grace.context().close();
  await daniel.context().close();
});
