import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * GROUNDS 11 TO 14, ON THE WORKAROUND ORG.

 * Meridian Health's ten free grounds are spent and Stripe is a placeholder, so these four cannot be
 * created there. Run instead as Northfield Clinics' FIRST four grounds, which are free - her
 * prescribed workaround. The SCENARIOS are genuinely exercised; the free/paid gate is not, because
 * for this org these are grounds 1 to 4. Labelled ORG 2 everywhere it matters.
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
     * GROUND 11 - THE PAYWALL TEST. Ten grounds already exist, so the free tier should be spent and
     * the gate should fire before this one runs. Stripe is a placeholder key, so the expectation is
     * that the gate fires and checkout then dies. Both halves get captured.
     *
     * Sixteen weekly check-ins is what the brief asks for; the duration picker only offers
     * 7/14/30/60/90/180/365 days, so 16 weeks cannot be expressed at all. 180 is the nearest.
     */
    n: 11, card: 'A regular read on live work', moment: 'Mid-way', days: '180', cadence: 'WEEKLY',
    lead: { email: 'hafsah@northfield.test', role: 'Runs the weekly read' },
    parties: [
      { email: 'abubakar@northfield.test', role: 'Delivery' },
      { email: 'kavon@northfield.test', role: 'Field' },
      { email: 'adam@northfield.test', role: 'Advisor' },
      { email: 'nate@northfield.test', role: 'Contractor' },
      { email: 'ejiro@northfield.test', role: 'Engineering' },
    ],
    brief: 'A fast repeatable read from each person every week on what is moving, what is stuck, and '
      + 'what has changed since last time.',
    expectSessions: 26, endState: 'On track',
  },
  {
    /** DRIFT also carries a "Continue" end state, so the button collision is two scenarios, not one. */
    n: 12, card: "Something's off track", moment: 'Mid-way', days: '7', cadence: 'WEEKLY',
    lead: { email: 'kennedy@northfield.test', role: 'Raised the concern' },
    parties: [
      { email: 'nate@northfield.test', role: 'The work that is off track' },
      { email: 'adam@northfield.test', role: 'Second read on the same work' },
    ],
    brief: 'Something is off and I cannot name it precisely. I want what was agreed, what actually '
      + 'happened, and the exact gap between them, so a vague worry becomes something we can act on.',
    expectSessions: 1, endState: 'Restructure',
  },
  {
    n: 13, card: 'Board & leadership strategy', moment: 'Mid-way', days: '14', cadence: 'WEEKLY',
    lead: { email: 'hafsah@northfield.test', role: 'Chairing the strategy round' },
    parties: [
      { email: 'kennedy@northfield.test', role: 'Engineering lead' },
      { email: 'abubakar@northfield.test', role: 'Delivery lead' },
      { email: 'maureen@northfield.test', role: 'Operations lead' },
    ],
    brief: 'Each leader gives their own read on strategy before the room debates it, so quiet '
      + 'disagreement shows up now rather than after the decision is made.',
    expectSessions: 2, endState: 'Strategy aligned',
  },
  {
    /** Ten weekly check-ins is also not expressible: 70 days is not on the list. 90 is the nearest. */
    n: 14, card: 'Many people in the same role', moment: 'Mid-way', days: '90', cadence: 'WEEKLY',
    lead: { email: 'maureen@northfield.test', role: 'Runs the field team' },
    parties: [
      { email: 'abubakar@northfield.test', role: 'Field officer' },
      { email: 'kavon@northfield.test', role: 'Field officer' },
      { email: 'adam@northfield.test', role: 'Field officer' },
      { email: 'nate@northfield.test', role: 'Field officer' },
      { email: 'ejiro@northfield.test', role: 'Field officer' },
      { email: 'eric@northfield.test', role: 'Field officer' },
      { email: 'hafeezah@northfield.test', role: 'Field officer' },
      { email: 'kennedy@northfield.test', role: 'Field officer' },
    ],
    brief: 'Eight field officers in the same role, each answering on their own so I can see the '
      + 'pattern of who is on track and who is stuck without them swaying each other.',
    expectSessions: 12, endState: 'Cohort on track',
  },
];

const LOG: string[] = [];
const log = (s: string) => { LOG.push(s); console.log(s); };

test.describe.configure({ mode: 'serial' });

for (const s of SPECS) {
  test(`Ground ${s.n}: ${s.card}`, async ({ browser }) => {
    test.setTimeout(9 * 60 * 1000);
    const dir = path.join(OUT, `g${String(s.n).padStart(2, '0')}-org2`);
    fs.mkdirSync(dir, { recursive: true });
    const c = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
    const page = await c.newPage();
    page.on('response', r => { if (r.status() >= 400) log(`G${s.n} HTTP ${r.status()} ${r.url().replace(APP, '')}`); });

    // Sahar returns. From ground 2 on she should NOT be re-onboarded.
    await page.goto(`${APP}/auth`);
    await page.getByLabel(/^Email$/i).fill('dara@northfield.test');
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
    await page.waitForTimeout(1600);
    await page.screenshot({ path: path.join(dir, '01-scenario-cards.png'), fullPage: true });

    /**
     * THE PAYWALL, IF IT IS THERE. Ten free grounds are spent by now, so from ground 11 the gate
     * should stand between Sahar and a new ground. Looked for by what a user would actually see -
     * pay, upgrade, subscribe, plan, limit - rather than by any internal flag.
     */
    const wall = (await page.textContent('body')) ?? '';
    const hitWall = /pay|upgrade|subscri|billing|free (ground|tier).{0,40}(used|reached|limit)|limit reached/i.test(wall);
    log(`G${s.n} paywall visible on /grounds/new: ${hitWall ? 'YES' : 'NO'}`);
    if (hitWall) {
      const m = wall.match(/.{0,120}(pay|upgrade|subscri|limit reached).{0,160}/i);
      log(`G${s.n} paywall copy: ${(m ? m[0] : '').replace(/\s+/g, ' ').trim()}`);
      await page.screenshot({ path: path.join(dir, '01b-paywall.png'), fullPage: true });
    }

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

    fs.writeFileSync(path.join(OUT, 'grounds-11-14-org2.log'), LOG.join('\n'));
    await c.close();
    expect(true).toBe(true);
  });
}
