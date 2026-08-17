import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * GROUND 1, CREATED THROUGH THE SCREENS.
 *
 * Written against the wizard as actually walked (see walk-wizard.spec.ts):
 *   card -> moment -> explainer -> two selects (duration, cadence) -> add people -> create.
 *
 * Adding the lead and the participant happens INSIDE creation, each with an email, a role and an
 * optional note. There is no separate "add a lead" screen, which is worth knowing: the admin's
 * mental model ("invite my team, then start a ground") does not match the product's.
 */
const APP = 'http://localhost:5173';
const OUT = path.join(__dirname, '..', 'shots', 'org-sim', 'g01');
const LOG: string[] = [];
const log = (s: string) => { LOG.push(s); console.log(s); };

test('Ground 1: create through the UI', async ({ browser }) => {
  test.setTimeout(8 * 60 * 1000);
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
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(OUT, 'c01-cards.png'), fullPage: true });

  await page.getByText('New hire', { exact: true }).first().click();
  await page.waitForTimeout(400);
  const atStart = page.getByText('At the start', { exact: true }).first();
  await atStart.scrollIntoViewIfNeeded();
  await atStart.click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, 'c02-card-and-moment.png'), fullPage: true });

  const next = async (label = /^(Continue|Continue →|Next)/i) => {
    const b = page.getByRole('button', { name: label }).first();
    await b.scrollIntoViewIfNeeded().catch(() => {});
    await b.click({ timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(1600);
  };

  await next();                                   // leave the card step
  await page.screenshot({ path: path.join(OUT, 'c03-after-cards.png'), fullPage: true });
  await next();                                   // leave the explainer
  await page.waitForTimeout(600);

  // ---- the two selects: log every option, then choose 90 days / weekly ---------------------
  const sels = page.locator('select:visible');
  const nSel = await sels.count();
  log(`selects on this step: ${nSel}`);
  for (let i = 0; i < nSel; i++) {
    const opts = await sels.nth(i).locator('option').evaluateAll(
      els => els.map(e => `${(e as HTMLOptionElement).value}|${e.textContent?.trim()}`),
    );
    log(`  select ${i}: ${JSON.stringify(opts)}`);
  }
  await page.screenshot({ path: path.join(OUT, 'c04-duration-cadence.png'), fullPage: true });
  /** Ground 1 is 90 days, weekly, so twelve sessions. Chosen by value, not index. */
  if (nSel >= 1) await sels.nth(0).selectOption('90').catch(() => {});
  if (nSel >= 2) await sels.nth(1).selectOption('WEEKLY').catch(() => {});
  await page.waitForTimeout(400);
  await next();

  // ---- add the lead and the participant ---------------------------------------------------
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(OUT, 'c05-add-people-empty.png'), fullPage: true });

  const addPerson = async (email: string, role: string, note: string) => {
    await page.locator('input[type="email"]:visible').first().fill(email);
    const roleBox = page.locator('input[placeholder*="Head of Engineering"]:visible').first();
    if (await roleBox.count()) await roleBox.fill(role);
    const noteBox = page.locator('input[placeholder*="Looking forward"]:visible').first();
    if (await noteBox.count()) await noteBox.fill(note);
    const add = page.getByRole('button', { name: /Add to this ground/i }).first();
    await add.click({ timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(1200);
    log(`added ${email} as "${role}"`);
  };

  await addPerson('hafsah@meridianhealth.test', 'Delivery manager, his line manager',
    'You are leading this one, thank you.');
  await addPerson('abubakar@meridianhealth.test', 'New delivery lead, starting Monday',
    'Welcome aboard, this is just so we start on the same page.');

  const own = page.locator('input[placeholder*="responsible for here"]:visible').first();
  if (await own.count()) await own.fill('Ops admin, setting this up');
  await page.screenshot({ path: path.join(OUT, 'c06-add-people-filled.png'), fullPage: true });

  // ---- finish -----------------------------------------------------------------------------
  for (let i = 0; i < 8; i++) {
    if (/\/grounds\/[0-9a-f-]{36}/.test(page.url())) break;

    /**
     * THE END-STATE STEP, and the most striking thing in the whole wizard.
     *
     * On a NEW HIRE ground - somebody starting Monday, where the card promises "get you and a new
     * hire on the same page about the role and what early success looks like" - Sahar is asked to
     * pick, before day one, from: Keep the hire / Restructure the role / Let them go / Extend
     * evaluation period / Not yet, revisit with a named gap. And the step's own copy says "Everyone
     * sees it before the first session."
     *
     * Sahar is setting up a welcome. She picks the outcome she actually wants.
     */
    const keep = page.getByText('Keep the hire', { exact: true }).first();
    if (await keep.count()) {
      await keep.scrollIntoViewIfNeeded().catch(() => {});
      await keep.click().catch(() => {});
      log('end state chosen: Keep the hire');
      await page.screenshot({ path: path.join(OUT, 'c07-end-state.png'), fullPage: true });
      await page.waitForTimeout(400);
    }

    /**
     * The last step is Sahar's own brief, and "Open the ground" stays disabled while it is empty
     * (the counter reads "0 words"). Worth noting that the gate is silent: nothing says the brief is
     * required, so a first-time admin can sit on a finished-looking summary and not know why the
     * button will not go.
     */
    const brief = page.locator('textarea:visible').first();
    if (await brief.count()) {
      await brief.fill(
        'Abubakar starts Monday as a delivery lead. Hafsah is his manager. I want the two of them to '
        + 'agree what he owns and what doing well looks like in the first 90 days, before anything '
        + 'drifts. My worry is that the handover from the last person was thin.',
      ).catch(() => {});
      const nameBox = page.locator('input[type="text"]:visible').first();
      if (await nameBox.count()) await nameBox.fill('Abubakar, first 90 days').catch(() => {});
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(OUT, 'c09-brief-and-summary.png'), fullPage: true });
    }

    await next(/^(Open the ground|Continue|Create|Save|Done|Finish)/i);
    await page.screenshot({ path: path.join(OUT, `c10-finish-${i}.png`), fullPage: true });
  }

  const m = page.url().match(/\/grounds\/([0-9a-f-]{36})/);
  log(m ? `GROUND CREATED: ${m[1]}` : `NOT CREATED, ended at ${page.url()}`);
  if (!m) log(`page text: ${((await page.textContent('body')) ?? '').replace(/\s+/g, ' ').slice(0, 700)}`);

  fs.writeFileSync(path.join(OUT, 'create.log'), LOG.join('\n'));
  if (m) fs.writeFileSync(path.join(OUT, 'ground-id.txt'), m[1]);
  await c.close();
  expect(LOG.join('\n')).toContain('added hafsah');
});
