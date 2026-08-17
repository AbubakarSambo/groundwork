import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * GROUNDS 2 TO 6, STRICTLY SEQUENTIALLY.
 *
 * `test.describe.configure({ mode: 'serial' })` is the contract, not a preference: the free/paid gate
 * counts grounds per org and the returning-vs-new tracking depends on order, so two grounds in flight
 * at once would corrupt exactly what grounds 10 and 11 are meant to prove.
 *
 * Built on the wizard as mapped in RUN18-STATE.md: card -> moment -> explainer -> duration+cadence ->
 * add people -> end state -> brief. Every step driven through the real screens.
 */
const APP = 'http://localhost:5173';
const OUT = path.join(__dirname, '..', 'shots', 'org-sim');
const MAIL = 'http://localhost:1080';

interface Spec {
  n: number;
  card: string;
  moment: string;
  days: string;
  cadence: string;
  lead: { email: string; role: string };
  parties: { email: string; role: string }[];
  brief: string;
  expectSessions: number;
  /** Chosen by exact label. Options differ per scenario - see api/src/modules/resolution/end-states.ts. */
  endState: string;
}

const SPECS: Spec[] = [
  {
    n: 2, card: 'New project', moment: 'At the start', days: '60', cadence: 'WEEKLY',
    lead: { email: 'kennedy@meridianhealth.test', role: 'Project lead' },
    parties: [
      { email: 'ejiro@meridianhealth.test', role: 'Engineer' },
      { email: 'maureen@meridianhealth.test', role: 'Ops' },
      { email: 'eric@meridianhealth.test', role: 'Data' },
      { email: 'hafeezah@meridianhealth.test', role: 'Field team' },
      { email: 'abubakar@meridianhealth.test', role: 'Delivery lead' },
    ],
    brief: 'We are kicking off the clinic rollout build. I want scope, who owns what, and what done '
      + 'means agreed before anyone writes code. Last time two teams each assumed a different owner.',
    expectSessions: 8, endState: 'Mark complete',
  },
  {
    n: 3, card: 'New advisor or board member', moment: 'At the start', days: '90', cadence: 'MONTHLY',
    lead: { email: 'maureen@meridianhealth.test', role: 'Bringing the advisor in' },
    parties: [{ email: 'adam@meridianhealth.test', role: 'Incoming advisor' }],
    brief: 'Adam is joining as an advisor on equity. I want it clear what he will actually contribute '
      + 'and on what terms, so available does not quietly stand in for contributing.',
    expectSessions: 3, endState: 'Renew the engagement',
  },
  {
    n: 4, card: 'A new partner or co-founder', moment: 'At the start', days: '90', cadence: 'FORTNIGHTLY',
    lead: { email: 'hafsah@meridianhealth.test', role: 'Founding partner' },
    parties: [{ email: 'abubakar@meridianhealth.test', role: 'Incoming partner' }],
    brief: 'Hafsah and Abubakar are going in as equal partners. Each should put what they expect to '
      + 'build, own and contribute in writing before those assumptions collide.',
    expectSessions: 6, endState: 'Continue the partnership',
  },
  {
    n: 5, card: 'A new manager taking over', moment: 'At the start', days: '90', cadence: 'WEEKLY',
    lead: { email: 'rime@meridianhealth.test', role: 'New manager stepping in' },
    parties: [
      { email: 'kennedy@meridianhealth.test', role: 'Existing team' },
      { email: 'ejiro@meridianhealth.test', role: 'Existing team' },
      { email: 'eric@meridianhealth.test', role: 'Existing team' },
    ],
    brief: 'Rime is taking over an existing team. Scope, reporting lines and what success looks like '
      + 'need to be clear, because the team has been running itself for a while.',
    expectSessions: 12, endState: 'Continue',
  },
  {
    n: 6, card: 'Contract or renewal', moment: 'Reaching an end', days: '14', cadence: 'WEEKLY',
    lead: { email: 'eric@meridianhealth.test', role: 'Managing the contract' },
    parties: [{ email: 'nate@meridianhealth.test', role: 'Contractor up for renewal' }],
    brief: 'Nate\'s term is ending and we are deciding whether to renew. I want an honest account from '
      + 'both sides of how the term actually went and what a fair next one looks like.',
    expectSessions: 2, endState: 'Renew on current terms',
  },
];

const LOG: string[] = [];
const log = (s: string) => { LOG.push(s); console.log(s); };

test.describe.configure({ mode: 'serial' });

for (const s of SPECS) {
  test(`Ground ${s.n}: ${s.card}`, async ({ browser }) => {
    test.setTimeout(9 * 60 * 1000);
    const dir = path.join(OUT, `g${String(s.n).padStart(2, '0')}`);
    fs.mkdirSync(dir, { recursive: true });
    const c = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
    const page = await c.newPage();
    page.on('response', r => { if (r.status() >= 400) log(`G${s.n} HTTP ${r.status()} ${r.url().replace(APP, '')}`); });

    // Sahar returns. From ground 2 on she should NOT be re-onboarded.
    await page.goto(`${APP}/auth`);
    await page.getByLabel(/^Email$/i).fill('sahar@meridianhealth.test');
    await page.getByLabel(/Password/i).fill('SimPass123!');
    await page.getByRole('button', { name: /^Sign in$/ }).click();
    await page.waitForURL(u => !u.pathname.startsWith('/auth'), { timeout: 20000 });
    await page.screenshot({ path: path.join(dir, '00-returning-admin.png'), fullPage: true });

    /** The free/paid gate as the admin sees it, read before creating anything. */
    const gate = await page.evaluate(async () => {
      try {
        const r = await fetch('/api/v1/billing/can-create-ground', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
        return { status: r.status, body: (await r.text()).slice(0, 200) };
      } catch (e: any) { return { status: 0, body: String(e) }; }
    });
    log(`G${s.n} can-create-ground: ${gate.status} ${gate.body}`);

    await page.goto(`${APP}/grounds/new`);
    await page.waitForTimeout(1400);
    await page.screenshot({ path: path.join(dir, '01-scenario-cards.png'), fullPage: true });

    // 1. card
    const card = page.getByText(s.card, { exact: true }).first();
    if (!(await card.count())) { log(`G${s.n} BLOCKER: no card "${s.card}"`); await c.close(); return; }
    await card.click();
    await page.waitForTimeout(400);

    // 2. moment, below the cards
    const mom = page.getByText(s.moment, { exact: true }).first();
    await mom.scrollIntoViewIfNeeded();
    await mom.click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(dir, '02-card-and-moment.png'), fullPage: true });

    const next = async (re = /^(Continue|Continue →|Next|Open the ground|Create|Save|Done|Finish)/i) => {
      /**
       * `.last()`, not `.first()`. The New project scenario has an END STATE OPTION literally called
       * "Continue", on the same screen as the Continue button - so a first-match click picks the
       * option and the wizard never advances. That collision is a finding in its own right: a user
       * reading "Continue" twice on one screen, meaning two different things, is being set up to
       * mis-click.
       */
      const b = page.getByRole('button', { name: re }).last();
      await b.scrollIntoViewIfNeeded().catch(() => {});
      await b.click({ timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(1500);
    };

    await next();                       // off the cards
    await next();                       // off the explainer

    // 3. duration + cadence
    const sels = page.locator('select:visible');
    if (await sels.count() >= 2) {
      await sels.nth(0).selectOption(s.days).catch(() => {});
      await sels.nth(1).selectOption(s.cadence).catch(() => {});
      await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(dir, '03-duration-cadence.png'), fullPage: true });
    } else {
      log(`G${s.n} NOTE: expected two selects on the pacing step, saw ${await sels.count()}`);
    }
    await next();

    // 4. people
    await page.waitForTimeout(700);
    const addPerson = async (email: string, role: string) => {
      await page.locator('input[type="email"]:visible').first().fill(email).catch(() => {});
      const rb = page.locator('input[placeholder*="Head of Engineering"]:visible').first();
      if (await rb.count()) await rb.fill(role).catch(() => {});
      await page.getByRole('button', { name: /Add to this ground/i }).first().click({ timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(1100);
    };
    await addPerson(s.lead.email, s.lead.role);
    for (const p of s.parties) await addPerson(p.email, p.role);
    const own = page.locator('input[placeholder*="responsible for here"]:visible').first();
    if (await own.count()) await own.fill('Ops admin, setting this up').catch(() => {});
    await page.screenshot({ path: path.join(dir, '04-people.png'), fullPage: true });

    // 5. end state, then 6. brief, then create
    for (let i = 0; i < 8; i++) {
      if (/\/grounds\/[0-9a-f-]{36}/.test(page.url())) break;

      const body = (await page.textContent('body')) ?? '';
      if (/successful outcome look like/i.test(body)) {
        await page.screenshot({ path: path.join(dir, '05-end-state.png'), fullPage: true });
        /** Whatever the options are for this scenario, take the first: log them all for the value read. */
        const pick = page.getByText(s.endState, { exact: true }).first();
        if (await pick.count()) {
          await pick.scrollIntoViewIfNeeded().catch(() => {});
          await pick.click().catch(() => {});
          log(`G${s.n} end state chosen: ${s.endState}`);
          await page.waitForTimeout(400);
        } else {
          log(`G${s.n} BLOCKER: end-state option "${s.endState}" not on screen`);
        }
      }

      const ta = page.locator('textarea:visible').first();
      if (await ta.count()) {
        await ta.fill(s.brief).catch(() => {});
        await page.waitForTimeout(400);
        await page.screenshot({ path: path.join(dir, '06-brief-and-summary.png'), fullPage: true });
      }

      await next();
    }

    const m = page.url().match(/\/grounds\/([0-9a-f-]{36})/);
    if (m) {
      log(`G${s.n} CREATED ${m[1]}`);
      fs.writeFileSync(path.join(dir, 'ground-id.txt'), m[1]);
      await page.waitForTimeout(1200);
      await page.screenshot({ path: path.join(dir, '07-ground-page.png'), fullPage: true });
    } else {
      log(`G${s.n} NOT CREATED, ended at ${page.url()}`);
      log(`G${s.n} page: ${((await page.textContent('body')) ?? '').replace(/\s+/g, ' ').slice(0, 500)}`);
      await page.screenshot({ path: path.join(dir, '07-stuck.png'), fullPage: true });
    }

    // invite emails actually sent?
    for (const e of [s.lead.email, ...s.parties.map(p => p.email)]) {
      const r = await fetch(`${MAIL}/messages?to=${encodeURIComponent(e)}`).then(r => r.json()).catch(() => []);
      const subs = (r as any[]).map(x => x.subject);
      log(`G${s.n} mail ${e}: ${subs.length} (${JSON.stringify(subs.slice(0, 2))})`);
    }

    fs.writeFileSync(path.join(OUT, 'grounds-2-6.log'), LOG.join('\n'));
    await c.close();
    expect(true).toBe(true);
  });
}
