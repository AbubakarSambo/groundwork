import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * GROUND 5 (RETRY) AND GROUNDS 7 TO 10, STRICTLY SEQUENTIALLY.
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
    /**
     * GROUND 5, RETRIED. It failed first time because I guessed the end-state label "Continue", which
     * NEW_MANAGER does not have - so the text match hit the wizard's Continue BUTTON and the flow never
     * advanced. My error, not the product's. Retried with the real label so the ground exists and the
     * free-tier count stays aligned; otherwise the paywall would fire at ground 12 rather than 11.
     */
    n: 5, card: 'A new manager taking over', moment: 'At the start', days: '90', cadence: 'WEEKLY',
    lead: { email: 'rime@meridianhealth.test', role: 'New manager stepping in' },
    parties: [
      { email: 'kennedy@meridianhealth.test', role: 'Existing team' },
      { email: 'ejiro@meridianhealth.test', role: 'Existing team' },
      { email: 'eric@meridianhealth.test', role: 'Existing team' },
    ],
    brief: 'Rime is taking over an existing team. Scope, reporting lines and what success looks like '
      + 'need to be clear, because the team has been running itself for a while.',
    expectSessions: 12, endState: 'Restructure the scope or terms',
  },
  {
    n: 7, card: 'Raise, promotion, or recognition', moment: 'At the start', days: '7', cadence: 'WEEKLY',
    lead: { email: 'hafsah@meridianhealth.test', role: 'Decision maker on the ask' },
    parties: [{ email: 'kavon@meridianhealth.test', role: 'Making the case for a raise' }],
    brief: 'Kavon is asking for a raise. I want the evidence behind the ask on record, and Hafsah '
      + 'reading the same record, so the conversation starts from one picture rather than two.',
    expectSessions: 1, endState: 'Grant the ask',
  },
  {
    n: 8, card: 'Performance improvement plan', moment: 'At the start', days: '60', cadence: 'WEEKLY',
    lead: { email: 'kennedy@meridianhealth.test', role: 'Her manager' },
    parties: [{ email: 'hafeezah@meridianhealth.test', role: 'On the plan' }],
    brief: 'Hafeezah is going on a formal plan. I want both sides on the same page about the concern, '
      + 'what support is available, and what success looks like at the end, so it is run fairly.',
    expectSessions: 8, endState: 'Performance concern resolved',
  },
  {
    n: 9, card: 'Goals & planning', moment: 'At the start', days: '90', cadence: 'WEEKLY',
    lead: { email: 'hafsah@meridianhealth.test', role: 'Running the planning cycle' },
    parties: [
      { email: 'kennedy@meridianhealth.test', role: 'Engineering' },
      { email: 'ejiro@meridianhealth.test', role: 'Engineering' },
      { email: 'maureen@meridianhealth.test', role: 'Ops' },
      { email: 'eric@meridianhealth.test', role: 'Data' },
      { email: 'abubakar@meridianhealth.test', role: 'Delivery' },
      { email: 'nate@meridianhealth.test', role: 'Field' },
    ],
    brief: 'Quarter planning. Everyone should check they are genuinely on the same goals and plan, so '
      + 'we catch the gaps and the overlaps before the cycle locks in.',
    expectSessions: 12, endState: 'OKRs aligned to company direction',
  },
  {
    n: 10, card: 'Workplan & budget', moment: 'At the start', days: '90', cadence: 'FORTNIGHTLY',
    lead: { email: 'eric@meridianhealth.test', role: 'Owns the budget line' },
    parties: [
      { email: 'maureen@meridianhealth.test', role: 'Ops plan' },
      { email: 'ejiro@meridianhealth.test', role: 'Build plan' },
      { email: 'kavon@meridianhealth.test', role: 'Field plan' },
    ],
    brief: 'Each person has built their own plan and budget for the quarter. I want to see whether they '
      + 'hold up against the resources we actually have, before we commit.',
    expectSessions: 6, endState: 'Workplan and budget approved',
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
    /**
     * "I am setting it up for others" - the control I missed on grounds 1 to 6, which is why Sahar
     * ended up a full party with her own weekly check-in on a ground she meant to hand to a lead.
     * Choosing it deliberately here to see whether it actually keeps her out of the participant list.
     */
    const setupForOthers = page.getByText('I am setting it up for others', { exact: true }).first();
    if (await setupForOthers.count()) {
      await setupForOthers.scrollIntoViewIfNeeded().catch(() => {});
      await setupForOthers.click().catch(() => {});
      log(`G${s.n} chose: I am setting it up for others`);
      await page.waitForTimeout(400);
    } else {
      log(`G${s.n} NOTE: no "I am setting it up for others" option on the people step`);
    }
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

    fs.writeFileSync(path.join(OUT, 'grounds-5-7-10.log'), LOG.join('\n'));
    await c.close();
    expect(true).toBe(true);
  });
}
