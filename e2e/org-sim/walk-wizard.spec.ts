import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * LEARN THE CREATION WIZARD BY WALKING IT, then encode it.
 *
 * Writing a harness against a wizard I have not walked is how you get a script that "passes" while
 * driving nothing. This walks it as Sahar and logs the real shape of every step - headings, controls,
 * what the Continue button is waiting for - so the driver can be written against what is there.
 */
const APP = 'http://localhost:5173';
const OUT = path.join(__dirname, '..', 'shots', 'org-sim', 'g01');
const LOG: string[] = [];

function log(s: string) { LOG.push(s); console.log(s); }

test('walk the new-ground wizard as Sahar', async ({ browser }) => {
  test.setTimeout(6 * 60 * 1000);
  fs.mkdirSync(OUT, { recursive: true });
  const c = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
  const page = await c.newPage();

  page.on('console', m => { if (m.type() === 'error') log(`CONSOLE ERROR: ${m.text().slice(0, 160)}`); });
  page.on('response', r => { if (r.status() >= 400) log(`HTTP ${r.status()} ${r.url().replace(APP, '')}`); });

  await page.goto(`${APP}/auth`);
  await page.getByLabel(/^Email$/i).fill('sahar@meridianhealth.test');
  await page.getByLabel(/Password/i).fill('SimPass123!');
  await page.getByRole('button', { name: /^Sign in$/ }).click();
  await page.waitForURL(u => !u.pathname.startsWith('/auth'), { timeout: 20000 });
  log(`signed in, landed on ${page.url()}`);
  await page.screenshot({ path: path.join(OUT, 'w00-signed-in.png'), fullPage: true });

  await page.goto(`${APP}/grounds/new`);
  await page.waitForTimeout(1500);

  // Step 1: the card. Click the New hire heading's card container.
  await page.getByText('New hire', { exact: true }).first().click();
  await page.waitForTimeout(600);
  log('picked card: New hire');

  // Step 2: the moment, which lives below all the cards.
  const moment = page.getByText('At the start', { exact: true }).first();
  await moment.scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(OUT, 'w01-moment-picker.png'), fullPage: true });
  await moment.click();
  await page.waitForTimeout(500);
  log('picked moment: At the start');

  // Now walk every remaining step, logging what each one asks for.
  for (let step = 0; step < 12; step++) {
    const heading = (await page.locator('h1,h2,h3').first().textContent().catch(() => '')) ?? '';
    const inputs = await page.locator('input:visible, textarea:visible, select:visible').evaluateAll(
      els => els.map(e => {
        const i = e as HTMLInputElement;
        return `${e.tagName.toLowerCase()}[${i.type || ''}] ph="${i.placeholder || ''}"`;
      }),
    );
    const buttons = await page.locator('button:visible').evaluateAll(
      els => els.map(e => (e.textContent || '').trim()).filter(Boolean),
    );
    log(`\n--- STEP ${step} @ ${page.url().replace(APP, '')}\n  heading: "${heading.trim().slice(0, 90)}"\n  inputs: ${JSON.stringify(inputs)}\n  buttons: ${JSON.stringify(buttons.slice(0, 12))}`);
    await page.screenshot({ path: path.join(OUT, `w02-step-${step}.png`), fullPage: true });

    if (/\/grounds\/[0-9a-f-]{36}/.test(page.url())) { log('GROUND CREATED'); break; }

    // Fill anything visible so we can move on, then continue.
    const tas = page.locator('textarea:visible');
    for (let i = 0; i < await tas.count(); i++) {
      await tas.nth(i).fill('Abubakar starts Monday as a delivery lead. I want us both clear on what he owns and what doing well looks like in the first 90 days.').catch(() => {});
    }
    const texts = page.locator('input[type="text"]:visible');
    for (let i = 0; i < await texts.count(); i++) {
      const ph = (await texts.nth(i).getAttribute('placeholder')) ?? '';
      if (/name|label|call/i.test(ph)) await texts.nth(i).fill('Abubakar, first 90 days').catch(() => {});
    }

    const cont = page.getByRole('button', { name: /^(Continue|Next|Create|Open the ground|Save|Done|Finish)/i }).first();
    if (!(await cont.count())) { log('  no continue-like button; stopping walk'); break; }
    const dis = await cont.isDisabled().catch(() => false);
    if (dis) {
      const hint = await page.locator('text=/to continue/i').first().textContent().catch(() => '');
      log(`  CONTINUE DISABLED. hint: "${(hint ?? '').trim()}"`);
      const radios = page.locator('[role="radio"]:visible, input[type="radio"]:visible');
      if (await radios.count()) { await radios.first().click().catch(() => {}); await page.waitForTimeout(300); }
      else break;
    }
    await cont.click().catch(() => {});
    await page.waitForTimeout(1800);
  }

  fs.writeFileSync(path.join(OUT, 'wizard-walk.log'), LOG.join('\n'));
  await c.close();
  expect(LOG.length).toBeGreaterThan(0);
});
