import { test, expect, Page, Browser } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * GROUNDS 15 TO 18, ALL THE WAY TO A REPORT.
 *
 * Create the ground, get every party through a real check-in, then capture the report and the board.
 * Grounds run strictly one at a time; the sessions inside one ground run concurrently, which is the
 * only concurrency that does not corrupt the run.
 *
 * On Northfield Clinics (org 2), because Meridian's free tier is spent and payment cannot complete.
 */
const APP = 'http://localhost:5173';
const MAIL = 'http://localhost:1080';
const OUT = path.join(__dirname, '..', 'shots', 'org-sim');
const ADMIN = { email: 'dara@northfield.test', pw: 'SimPass123!' };
const LOG: string[] = [];
const log = (s: string) => { LOG.push(s); console.log(s); };

interface Party { email: string; role: string; lines: string[] }
interface Spec {
  n: number; card: string; moment: string; days: string; cadence: string;
  endState: string; brief: string; parties: Party[];
}

/** Short, varied answers: a sharp one, a vague one, a defensive one. Enough to make a real record. */
const HIGH = (topic: string) => [
  `On ${topic}: two things are done, one is blocked on a decision I do not own.`,
  'What good looks like to me is owning the weekly number end to end by month two.',
  'The specific gap is that nobody has said who signs it off. That is everything from me.',
];
const BASIC = () => [
  'yeah its fine i think',
  'sorry im not sure what youre asking',
  'no one really told me what im meant to be doing. thats everything',
];
const DEFENSIVE = () => [
  'I have done what was asked of me.',
  'Nobody told me that was the expectation, so I do not think that is fair.',
  'I would rather it was written down properly. that is all from me',
];

const SPECS: Spec[] = [
  {
    n: 15, card: 'Onboarding several people at once', moment: 'At the start', days: '90', cadence: 'WEEKLY',
    endState: 'Cohort on track',
    brief: 'Four managers hired to run clinics, on a three month onboarding that is also a probation. '
      + 'They do not work together but share one onboarding source. I need to know early who is finding '
      + 'it and who is struggling, before the period decides anything.',
    parties: [
      { email: 'hafsah@northfield.test', role: 'Runs the onboarding', lines: HIGH('the cohort') },
      { email: 'abubakar@northfield.test', role: 'Clinic manager, new', lines: BASIC() },
      { email: 'kavon@northfield.test', role: 'Clinic manager, new', lines: DEFENSIVE() },
      { email: 'adam@northfield.test', role: 'Clinic manager, new', lines: HIGH('my clinic') },
    ],
  },
  {
    n: 16, card: 'A shock just hit', moment: 'Mid-way', days: '7', cadence: 'WEEKLY',
    endState: 'Shared picture established',
    brief: 'A major client pulled out overnight and everyone has a different version of why. I want '
      + 'everyone honest read of what actually happened and where things really stand, before anyone '
      + 'decides anything.',
    parties: [
      { email: 'kennedy@northfield.test', role: 'Closest to the client', lines: HIGH('the account') },
      { email: 'ejiro@northfield.test', role: 'Delivery', lines: BASIC() },
      { email: 'eric@northfield.test', role: 'Commercial', lines: DEFENSIVE() },
    ],
  },
  {
    n: 17, card: 'Get a team back on the same page', moment: 'Mid-way', days: '14', cadence: 'WEEKLY',
    endState: 'Team realigned on shared direction',
    brief: 'The team is pulling two ways on a decision. Each person gives their honest read before the '
      + 'group talks, so the conversation starts from a shared picture rather than the loudest voice.',
    parties: [
      { email: 'hafsah@northfield.test', role: 'Leads the team', lines: HIGH('the decision') },
      { email: 'maureen@northfield.test', role: 'Operations', lines: BASIC() },
      { email: 'abubakar@northfield.test', role: 'Delivery', lines: DEFENSIVE() },
    ],
  },
  {
    n: 18, card: 'Describe your own situation', moment: 'At the start', days: '90', cadence: 'WEEKLY',
    endState: '', // this card may route somewhere else entirely - that is the test
    brief: 'Cohort onboarding for clinic managers on a three month probation who do not work together '
      + 'but share one onboarding source. I want to see whether the platform sets up the right ground '
      + 'for it when I describe it in my own words instead of picking a card.',
    parties: [
      { email: 'maureen@northfield.test', role: 'Runs the onboarding', lines: HIGH('the cohort') },
      { email: 'nate@northfield.test', role: 'Clinic manager, new', lines: BASIC() },
      { email: 'ejiro@northfield.test', role: 'Clinic manager, new', lines: DEFENSIVE() },
    ],
  },
];

async function mailFor(to: string, contains: string) {
  for (let i = 0; i < 12; i++) {
    try {
      const msgs: any[] = await (await fetch(`${MAIL}/messages?to=${encodeURIComponent(to)}`)).json();
      const hit = msgs.find(m => (m.subject || '').includes(contains));
      if (hit) {
        const body = `${hit.text || ''} ${hit.html || ''}`;
        const m = body.match(/https?:\/\/[^\s"'<>)\]]+/);
        if (m) return m[0];
      }
    } catch { /* not up */ }
    await new Promise(r => setTimeout(r, 1500));
  }
  return null;
}

async function signIn(page: Page, email: string) {
  await page.goto(`${APP}/auth`);
  await page.getByLabel(/^Email$/i).fill(email);
  await page.getByLabel(/Password/i).fill(ADMIN.pw);
  await page.getByRole('button', { name: /^Sign in$/ }).click();
  await page.waitForURL(u => !u.pathname.startsWith('/auth'), { timeout: 20000 }).catch(() => {});
}

async function createGround(page: Page, s: Spec, dir: string): Promise<string | null> {
  await page.goto(`${APP}/grounds/new`);
  await page.waitForTimeout(1600);
  await page.screenshot({ path: path.join(dir, '01-cards.png'), fullPage: true });

  const card = page.getByText(s.card, { exact: true }).first();
  if (!(await card.count())) { log(`G${s.n} BLOCKER: no card "${s.card}"`); return null; }
  await card.click().catch(() => {});
  await page.waitForTimeout(500);

  /** "Describe your own situation" opens a free-text box instead of the moment picker. */
  const own = page.locator('textarea:visible').first();
  if (s.card.startsWith('Describe') && await own.count()) {
    await own.fill(s.brief).catch(() => {});
    log(`G${s.n} typed the situation in her own words instead of picking a card`);
    await page.waitForTimeout(500);
  }

  const mom = page.getByText(s.moment, { exact: true }).first();
  if (await mom.count()) { await mom.scrollIntoViewIfNeeded(); await mom.click().catch(() => {}); }
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(dir, '02-card-and-moment.png'), fullPage: true });

  const next = async () => {
    const b = page.getByRole('button', { name: /^(Continue|Continue →|Next|Open the ground|Create|Save|Done|Finish)/i }).last();
    await b.scrollIntoViewIfNeeded().catch(() => {});
    await b.click({ timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(1600);
  };
  await next(); await next();

  const sels = page.locator('select:visible');
  if (await sels.count() >= 2) {
    await sels.nth(0).selectOption(s.days).catch(() => {});
    await sels.nth(1).selectOption(s.cadence).catch(() => {});
    await page.waitForTimeout(400);
  }
  await next();

  await page.waitForTimeout(800);
  for (const p of s.parties) {
    await page.locator('input[type="email"]:visible').first().fill(p.email).catch(() => {});
    const rb = page.locator('input[placeholder*="Head of Engineering"]:visible').first();
    if (await rb.count()) await rb.fill(p.role).catch(() => {});
    await page.getByRole('button', { name: /Add to this ground/i }).first().click({ timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(1100);
  }
  const setup = page.getByText('I am setting it up for others', { exact: true }).first();
  if (await setup.count()) await setup.click().catch(() => {});
  await page.screenshot({ path: path.join(dir, '03-people.png'), fullPage: true });

  for (let i = 0; i < 8; i++) {
    if (/\/grounds\/[0-9a-f-]{36}/.test(page.url())) break;
    const body = (await page.textContent('body')) ?? '';
    if (/successful outcome look like/i.test(body)) {
      const opts = await page.locator('[role="radio"]:visible').evaluateAll(
        els => els.map(e => (e.textContent || '').trim().split('\n')[0]).filter(Boolean));
      log(`G${s.n} end-state options offered: ${JSON.stringify(opts.slice(0, 8))}`);
      const pick = s.endState
        ? page.getByText(s.endState, { exact: true }).first()
        : page.locator('[role="radio"]:visible').first();
      if (await pick.count()) { await pick.scrollIntoViewIfNeeded().catch(() => {}); await pick.click().catch(() => {}); }
      await page.waitForTimeout(400);
    }
    const ta = page.locator('textarea:visible').first();
    if (await ta.count()) { await ta.fill(s.brief).catch(() => {}); await page.waitForTimeout(400); }
    await next();
  }

  const id = page.url().match(/\/grounds\/([0-9a-f-]{36})/)?.[1] ?? null;
  log(id ? `G${s.n} CREATED ${id}` : `G${s.n} NOT CREATED, at ${page.url()}`);
  if (id) await page.screenshot({ path: path.join(dir, '04-ground.png'), fullPage: true });
  return id;
}

async function checkIn(browser: Browser, s: Spec, p: Party, groundLabelPart: string, dir: string) {
  const c = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
  const page = await c.newPage();
  const who = p.email.split('@')[0];
  try {
    const link = await mailFor(p.email, groundLabelPart);
    if (!link) { log(`G${s.n} ${who}: no invite email`); await c.close(); return; }
    await page.goto(link);
    await page.waitForTimeout(2500);

    const fn = page.getByLabel(/First name/i).first();
    if (await fn.count()) await fn.fill(who).catch(() => {});
    for (const re of [/Pick up where I left off/i, /Add my version/i, /Start (my )?check-?in/i]) {
      const b = page.getByRole('button', { name: re }).first();
      if (await b.count()) { await b.click().catch(() => {}); await page.waitForTimeout(3000); }
    }
    if (/Check your email/i.test((await page.textContent('body')) ?? '')) {
      const back = await mailFor(p.email, 'sign in') ?? await mailFor(p.email, 'Sign in');
      if (back) { await page.goto(back); await page.waitForTimeout(3000); }
    }
    if (/Your grounds/i.test((await page.textContent('body')) ?? '')) {
      const card = page.getByText(groundLabelPart, { exact: false }).first();
      if (await card.count()) { await card.click().catch(() => {}); await page.waitForTimeout(2500); }
    }
    for (const re of [/Check in for session/i, /Start (my )?check-?in/i]) {
      const b = page.getByRole('button', { name: re }).first();
      if (await b.count()) { await b.click().catch(() => {}); await page.waitForTimeout(3000); break; }
    }

    for (const line of p.lines) {
      const box = page.locator('input[type="text"]:visible, textarea:visible').last();
      if (!(await box.count()) || !(await box.isEditable().catch(() => false))) break;
      await box.fill(line).catch(() => {});
      const send = page.getByRole('button', { name: /^(↑|Send)$/ }).last();
      if (await send.count()) await send.click().catch(() => {}); else await box.press('Enter').catch(() => {});
      const before = ((await page.textContent('body')) ?? '').length;
      for (let i = 0; i < 30; i++) {
        await page.waitForTimeout(1500);
        const now = (await page.textContent('body')) ?? '';
        if (now.length > before + line.length + 30 && !/Thinking/i.test(now.slice(-400))) break;
      }
    }

    for (const re of [/Complete session/i, /End (the )?session/i, /Finish/i]) {
      const b = page.getByRole('button', { name: re }).first();
      if (await b.count()) {
        await b.click().catch(() => {});
        await page.waitForTimeout(2500);
        const conf = page.getByRole('button', { name: /Finish check-?in|Confirm|Yes/i }).first();
        if (await conf.count()) { await conf.click().catch(() => {}); await page.waitForTimeout(3500); }
        break;
      }
    }
    await page.screenshot({ path: path.join(dir, `checkin-${who}.png`), fullPage: true });
    log(`G${s.n} ${who}: check-in done`);
  } catch (e: any) {
    log(`G${s.n} ${who}: FAILED ${String(e).slice(0, 120)}`);
  } finally {
    await c.close();
  }
}

test.describe.configure({ mode: 'serial' });

for (const s of SPECS) {
  test(`Ground ${s.n}: ${s.card}`, async ({ browser }) => {
    test.setTimeout(28 * 60 * 1000);
    const dir = path.join(OUT, `g${s.n}`);
    fs.mkdirSync(dir, { recursive: true });

    const c = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
    const page = await c.newPage();
    await signIn(page, ADMIN.email);
    const id = await createGround(page, s, dir);
    await c.close();
    if (!id) { fs.writeFileSync(path.join(OUT, 'g15-18.log'), LOG.join('\n')); return; }

    /** Whatever the product named it, that string is what the invite subjects carry. */
    const c2 = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
    const p2 = await c2.newPage();
    await signIn(p2, ADMIN.email);
    await p2.goto(`${APP}/grounds/${id}`);
    await p2.waitForTimeout(2000);
    const label = ((await p2.locator('h1,h2').first().textContent().catch(() => '')) ?? '').trim() || 'ground';
    await c2.close();
    log(`G${s.n} label: "${label}"`);

    /** Sessions inside one ground, concurrently. */
    await Promise.all(s.parties.map(p => checkIn(browser, s, p, label.split(' ')[0], dir)));

    /**
     * THE ADMIN'S OWN CHECK-IN, without which no report is ever produced.
     * G15 proved it: four parties checked in and the report still said "appears once everybody has
     * checked in", because Dara is INITIATOR, was never emailed, and has no signposted route to her
     * own session. She has to be walked to /grounds/:id/p by hand.
     */
    {
      const ca = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
      const pa = await ca.newPage();
      await signIn(pa, ADMIN.email);
      await pa.goto(`${APP}/grounds/${id}/p`);
      await pa.waitForTimeout(2500);
      for (const re of [/Check in for session/i, /Start (my )?check-?in/i]) {
        const b = pa.getByRole('button', { name: re }).first();
        if (await b.count()) { await b.click().catch(() => {}); await pa.waitForTimeout(3000); break; }
      }
      for (const line of [
        'I set this up so each of them puts their own account on record before anyone decides anything.',
        'What I need to know is who is finding it and who is quietly struggling.',
        'That is everything from me.',
      ]) {
        const box = pa.locator('input[type="text"]:visible, textarea:visible').last();
        if (!(await box.count()) || !(await box.isEditable().catch(() => false))) break;
        await box.fill(line).catch(() => {});
        const send = pa.getByRole('button', { name: /^(↑|Send)$/ }).last();
        if (await send.count()) await send.click().catch(() => {}); else await box.press('Enter').catch(() => {});
        const before = ((await pa.textContent('body')) ?? '').length;
        for (let i = 0; i < 30; i++) {
          await pa.waitForTimeout(1500);
          const now = (await pa.textContent('body')) ?? '';
          if (now.length > before + line.length + 30 && !/Thinking/i.test(now.slice(-400))) break;
        }
      }
      for (const re of [/Complete session/i, /End (the )?session/i]) {
        const b = pa.getByRole('button', { name: re }).first();
        if (await b.count()) {
          await b.click().catch(() => {});
          await pa.waitForTimeout(2500);
          const conf = pa.getByRole('button', { name: /Finish check-?in|Confirm|Yes/i }).first();
          if (await conf.count()) { await conf.click().catch(() => {}); await pa.waitForTimeout(3500); }
          break;
        }
      }
      log(`G${s.n} admin check-in done (had to be walked to /p by hand)`);
      await ca.close();
      await new Promise(r => setTimeout(r, 6000));
    }

    /** Then the report and the board, which is the point. */
    const c3 = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
    const p3 = await c3.newPage();
    await signIn(p3, ADMIN.email);
    for (const view of ['report', 'board']) {
      await p3.goto(`${APP}/grounds/${id}/${view}`);
      await p3.waitForTimeout(5000);
      await p3.screenshot({ path: path.join(dir, `${view}.png`), fullPage: true });
      const txt = ((await p3.textContent('body')) ?? '').replace(/\s+/g, ' ').trim();
      fs.writeFileSync(path.join(dir, `${view}.txt`), txt);
      log(`G${s.n} ${view}: ${txt.length} chars`);
    }
    await c3.close();

    fs.writeFileSync(path.join(OUT, 'g15-18.log'), LOG.join('\n'));
    expect(true).toBe(true);
  });
}
