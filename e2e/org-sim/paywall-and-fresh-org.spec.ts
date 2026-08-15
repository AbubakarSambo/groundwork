import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * THE PAYWALL, THEN THE WORKAROUND.
 *
 * Ground 11 correctly refuses to be created: ten free grounds are spent. That is the gate working.
 * This does two things:
 *   1. follows "See plans" and tries to actually pay, to find exactly where a placeholder Stripe key
 *      leaves the customer;
 *   2. signs up a SECOND admin with a SECOND org through the real UI, so grounds 11 to 14 can still be
 *      exercised as that org's FIRST (free) grounds - her prescribed workaround, labelled as such.
 */
const APP = 'http://localhost:5173';
const MAIL = 'http://localhost:1080';
const OUT = path.join(__dirname, '..', 'shots', 'org-sim', 'paywall');
const LOG: string[] = [];
const log = (s: string) => { LOG.push(s); console.log(s); };

async function mailLink(to: string, match?: string) {
  for (let i = 0; i < 12; i++) {
    try {
      const r = await fetch(`${MAIL}/link?to=${encodeURIComponent(to)}${match ? `&match=${match}` : ''}`);
      const j: any = await r.json();
      if (j?.link) return j.link as string;
    } catch { /* catcher not up yet */ }
    await new Promise(r => setTimeout(r, 1500));
  }
  return null;
}

test('the paywall, and what happens when you try to pay', async ({ browser }) => {
  test.setTimeout(6 * 60 * 1000);
  fs.mkdirSync(OUT, { recursive: true });
  const c = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
  const page = await c.newPage();
  page.on('response', r => { if (r.status() >= 400) log(`HTTP ${r.status()} ${r.url().replace(APP, '')}`); });

  await page.goto(`${APP}/auth`);
  await page.getByLabel(/^Email$/i).fill('sahar@meridianhealth.test');
  await page.getByLabel(/Password/i).fill('SimPass123!');
  await page.getByRole('button', { name: /^Sign in$/ }).click();
  await page.waitForURL(u => !u.pathname.startsWith('/auth'), { timeout: 20000 });

  await page.goto(`${APP}/grounds/new`);
  await page.waitForTimeout(1500);
  const btn = page.getByRole('button', { name: /See plans/i }).first();
  const lnk = page.getByRole('link', { name: /See plans/i }).first();
  if (await btn.count()) await btn.click().catch(() => {});
  else if (await lnk.count()) await lnk.click().catch(() => {});
  await page.waitForTimeout(2500);
  log(`SEEPLANS landed on: ${page.url().replace(APP, '')}`);
  await page.screenshot({ path: path.join(OUT, '01-plans.png'), fullPage: true });

  const sub = page.getByRole('button', { name: /^Subscribe/i }).first();
  if (!(await sub.count())) {
    log('PAYRESULT no Subscribe button on the plans page');
  } else {
    await sub.click().catch(() => {});
    await page.waitForTimeout(4000);
    log(`PAYRESULT after Subscribe, url = ${page.url()}`);
    const body = ((await page.textContent('body')) ?? '').replace(/\s+/g, ' ').slice(0, 300);
    log(`PAYBODY ${body}`);
    await page.screenshot({ path: path.join(OUT, '02-after-subscribe.png'), fullPage: true });
  }

  fs.writeFileSync(path.join(OUT, 'paywall.log'), LOG.join('\n'));
  await c.close();
  expect(LOG.length).toBeGreaterThan(0);
});

test('fresh org, so grounds 11 to 14 can still be exercised', async ({ browser }) => {
  test.setTimeout(6 * 60 * 1000);
  fs.mkdirSync(OUT, { recursive: true });
  const c = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
  const page = await c.newPage();

  const email = 'dara@northfield.test';
  await page.goto(`${APP}/auth?mode=signup`);
  await page.getByLabel(/Your name/i).fill('Dara Adeyemi');
  await page.getByLabel(/^Email$/i).fill(email);
  await page.getByLabel(/Your organisation/i).fill('Northfield Clinics');
  await page.getByRole('button', { name: /Create my account/i }).click();
  const act = await mailLink(email);
  if (!act) { log('FRESHORG blocked: no activation email'); await c.close(); return; }
  await page.goto(act);
  await page.waitForTimeout(1500);
  log(`FRESHORG activated, landed on ${page.url().replace(APP, '')}`);

  /** Same forced workaround as Sahar: signup sets no password, so drive the reset flow. */
  await page.goto(`${APP}/auth`);
  await page.getByRole('button', { name: /Forgot your password/i }).click();
  await page.waitForTimeout(500);
  await page.locator('input[type="email"]:visible').first().fill(email);
  await page.getByRole('button', { name: /Send reset link/i }).click();
  await page.waitForTimeout(2500);
  const reset = await mailLink(email, 'reset-password');
  if (!reset) { log('FRESHORG blocked: no reset email'); await c.close(); return; }
  await page.goto(reset);
  await page.waitForTimeout(1400);
  const pws = page.locator('input[type="password"]:visible');
  for (let i = 0; i < await pws.count(); i++) await pws.nth(i).fill('SimPass123!');
  await page.getByRole('button', { name: /Reset password/i }).click();
  await page.waitForTimeout(2500);
  log('FRESHORG ready: dara@northfield.test / SimPass123!');

  fs.appendFileSync(path.join(OUT, 'paywall.log'), '\n' + LOG.join('\n'));
  await c.close();
  expect(true).toBe(true);
});
