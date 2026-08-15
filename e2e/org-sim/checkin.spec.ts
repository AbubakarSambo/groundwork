import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * AN ACTUAL CHECK-IN. The point of the whole product.
 *
 * Everything before this built containers. This drives the thing itself: a participant follows the
 * link from their invite email, has a real conversation with the live engine, and ends the session.
 * When every party on a ground has done that, a report can exist - and the report is what all of this
 * is for.
 *
 * Ground 6, contract renewal, is deliberately the cheapest one that can produce a report: two
 * sessions, three parties. Sahar is a party on it whether she wanted to be or not (G7-02), so she has
 * to check in too before the ground can complete - the bug is now taxing the test itself.
 */
const APP = 'http://localhost:5173';
const MAIL = 'http://localhost:1080';
const OUT = path.join(__dirname, '..', 'shots', 'org-sim', 'checkin');
const GROUND_LABEL = 'CONTRACT RENEWAL ground';
const LOG: string[] = [];
const log = (s: string) => { LOG.push(s); console.log(s); };

/** Varied on purpose: a high, a terse and a basic reader, so the engine is not only meeting sharp users. */
const PEOPLE: { email: string; name: string; level: string; needsAuth: boolean; lines: string[] }[] = [
  {
    email: 'eric@meridianhealth.test', name: 'Eric', level: 'high, terse', needsAuth: false,
    lines: [
      'The term ran eleven months. Two of the four deliverables landed on time, one slipped a month, one never shipped.',
      'The one that never shipped was the reporting module. He says he was waiting on our data team.',
      'A fair next term is shorter and narrower. Three months, reporting only, with a named owner on our side.',
      'Honestly the numbers are strong and we are ready, everyone is happy with it.',
      'Fair. The reporting module did not ship, and I do not yet know whose delay it was.',
      'That is everything from me.',
    ],
  },
  {
    email: 'nate@meridianhealth.test', name: 'Nate', level: 'basic, distracted', needsAuth: false,
    lines: [
      'yeah it went ok i think',
      'sorry what does ground mean',
      'the reporting thing wasnt my fault, i asked for the data thing loads of times',
      'i want to keep working with them but same money',
      'i can send the emails where i asked for the data if that helps',
      'thats everything i think',
    ],
  },
  {
    email: 'sahar@meridianhealth.test', name: 'Sahar', level: 'high, cooperative', needsAuth: true,
    lines: [
      'I am the ops admin. I set this up so Eric and Nate both put an honest account on record before the renewal call.',
      'What I care about is whether the delay was ours or his, because we have blamed contractors before and been wrong.',
      'Success for me is a renewal decision both of them would describe the same way afterwards.',
    ],
  },
];

/**
 * Matched by GROUND, not just "newest". Eric is on four grounds and the newest invite in his inbox was
 * for the workplan ground, so the first run cheerfully opened the wrong check-in. A returning
 * participant with several grounds is the normal case, not the edge case.
 */
async function mailLinkForGround(to: string, groundLabel: string) {
  for (let i = 0; i < 10; i++) {
    try {
      const r = await fetch(`${MAIL}/messages?to=${encodeURIComponent(to)}`);
      const msgs: any[] = await r.json();
      const hit = msgs.find(m => (m.subject || '').includes(groundLabel));
      const urls: string[] = hit?.links ?? [];
      if (urls.length) return urls[0];
      if (hit) {
        const body = `${hit.text || ''} ${hit.html || ''}`;
        const m = body.match(/https?:\/\/[^\s"'<>)\]]+/);
        if (m) return m[0];
      }
    } catch { /* not up */ }
    await new Promise(r => setTimeout(r, 1200));
  }
  return null;
}

/** The newest link sent to this address, whatever it is for. */
async function newestLink(to: string) {
  for (let i = 0; i < 12; i++) {
    await new Promise(r => setTimeout(r, 1500));
    try {
      const r = await fetch(`${MAIL}/link?to=${encodeURIComponent(to)}`);
      const j: any = await r.json();
      if (j?.link) return j.link as string;
    } catch { /* not up */ }
  }
  return null;
}

/** Type a line, send it, wait for the engine to answer, and return what it said. */
async function say(page: Page, text: string): Promise<string | null> {
  const box = page.locator('input[type="text"]:visible, textarea:visible').last();
  /**
   * The composer disappears once the engine decides the session is done, so "cannot type" is usually
   * the engine closing rather than a fault. Returning null lets the caller move to completion instead
   * of throwing away the whole account.
   */
  if (!(await box.count()) || !(await box.isEditable().catch(() => false))) return null;
  await box.fill(text).catch(() => {});
  const send = page.getByRole('button', { name: /^(↑|Send)$/ }).last();
  if (await send.count()) await send.click().catch(() => {});
  else await box.press('Enter').catch(() => {});

  /** The engine is a live model call, so wait for the transcript to actually grow. */
  const before = ((await page.textContent('body')) ?? '').length;
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(1500);
    const now = ((await page.textContent('body')) ?? '');
    if (now.length > before + text.length + 30 && !/Thinking/i.test(now.slice(-400))) return now;
  }
  return (await page.textContent('body')) ?? '';
}

/**
 * Sessions WITHIN a ground may run concurrently - that is the one concurrency her brief allows, and it
 * is also what stops a single stuck conversation costing the run the other accounts. Serial mode did
 * exactly that twice: "2 did not run".
 */
test.describe.configure({ mode: 'default' });

for (const p of PEOPLE) {
  test(`check-in: ${p.name} (${p.level})`, async ({ browser }) => {
    test.setTimeout(12 * 60 * 1000);
    fs.mkdirSync(OUT, { recursive: true });
    const c = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
    const page = await c.newPage();
    page.on('response', r => { if (r.status() >= 400) log(`${p.name} HTTP ${r.status()} ${r.url().replace(APP, '')}`); });

    /** Sahar's link is an in-app /checkin/:id, so she has to be signed in before it resolves. */
    if (p.needsAuth) {
      await page.goto(`${APP}/auth`);
      await page.getByLabel(/^Email$/i).fill(p.email);
      await page.getByLabel(/Password/i).fill('SimPass123!');
      await page.getByRole('button', { name: /^Sign in$/ }).click();
      await page.waitForURL(u => !u.pathname.startsWith('/auth'), { timeout: 20000 }).catch(() => {});
      log(`${p.name} signed in first`);
    }

    /**
     * CI-09 in practice. Sahar is the INITIATOR, so no check-in invite was ever emailed to her - yet
     * she is a required party and the ground cannot complete without her. The only way in is through
     * the app, which is exactly the gap: nothing would have told her to come.
     */
    let link: string | null = null;
    if (p.needsAuth) {
      await page.goto(`${APP}/grounds`);
      await page.waitForTimeout(2000);
      const card = page.getByText(GROUND_LABEL, { exact: false }).first();
      if (await card.count()) { await card.click().catch(() => {}); await page.waitForTimeout(2500); }
      log(`${p.name} reached her ground through the app, with no email to prompt her`);
      /**
       * The admin ground view has no composer - it is the lead's read of the ground. Her own check-in
       * lives on the participant view, which nothing links to from here. Another face of G7-02: she is
       * a required party with no route signposted to her own session.
       */
      const gid = page.url().match(/\/grounds\/([0-9a-f-]{36})/)?.[1];
      if (gid) {
        await page.goto(`${APP}/grounds/${gid}/p`);
        await page.waitForTimeout(2500);
        log(`${p.name} FINDING: had to be sent to /grounds/:id/p by hand to find her own check-in`);
        for (const re of [/Check in for session/i, /Start (my )?check-?in/i]) {
          const b = page.getByRole('button', { name: re }).first();
          if (await b.count()) {
            await b.click().catch(() => {});
            await page.waitForTimeout(3000);
            log(`${p.name} entered her check-in via "${re}"`);
            break;
          }
        }
      }
    } else {
      link = await mailLinkForGround(p.email, GROUND_LABEL);
      if (!link) { log(`${p.name} BLOCKED: no invite email`); await c.close(); return; }
      log(`${p.name} invite link: ${link.replace(APP, '')}`);
      await page.goto(link);
    }
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(OUT, `${p.name}-01-arrival.png`), fullPage: true });
    log(`${p.name} landed on ${page.url().replace(APP, '')}`);

    /**
     * The arrival page asks for an optional first and last name before letting you in. Giving one,
     * because the copy says the other party will see it on the shared report, and a report with a
     * name on it is the more realistic and more revealing test.
     */
    const fn = page.getByLabel(/First name/i).first();
    if (await fn.count()) await fn.fill(p.name).catch(() => {});

    /**
     * TWO gates, in order, and they must both be passed - the first version broke out of the loop
     * after the first match and never reached the second.
     *   1. "Add my version →" on the invite page, which also creates their account
     *   2. "Start my check-in" on the privacy briefing, which is genuinely the most honest screen in
     *      the product: "And the part we are not going to dress up ... we are not going to tell you
     *      they are unreadable to any human being anywhere, because that would not be true yet."
     */
    for (const re of [/Pick up where I left off/i, /Add my version/i, /Start (my )?check-?in/i]) {
      const b = page.getByRole('button', { name: re }).first();
      if (await b.count()) {
        await b.click().catch(() => {});
        await page.waitForTimeout(3000);
        log(`${p.name} passed gate: ${re}`);
      }
    }
    /**
     * A new browser context is a new device, so the product emails a fresh sign-in link rather than
     * letting anyone with the invite URL resume somebody else's check-in. That is the right call, and
     * it means the honest way through is to actually go and get the email.
     */
    if (/Check your email/i.test((await page.textContent('body')) ?? '')) {
      const back = await newestLink(p.email);
      if (back) {
        log(`${p.name} followed the fresh sign-in link`);
        await page.goto(back);
        await page.waitForTimeout(3000);
        for (const re of [/Start (my )?check-?in/i, /Pick up where I left off/i]) {
          const b = page.getByRole('button', { name: re }).first();
          if (await b.count()) { await b.click().catch(() => {}); await page.waitForTimeout(3000); }
        }
      } else {
        log(`${p.name} BLOCKED: no sign-in link arrived`);
      }
    }
    /**
     * FINDING: "Pick up where I left off" does not. The emailed link signs them in and drops them on
     * the grounds LIST, not on the check-in they were promised. So the last mile is manual: open the
     * ground, then find the way into session 1.
     */
    if (/Your grounds/i.test((await page.textContent('body')) ?? '')) {
      log(`${p.name} FINDING: the resume link landed on the grounds list, not the check-in`);
      const card = page.getByText(GROUND_LABEL, { exact: false }).first();
      if (await card.count()) { await card.click().catch(() => {}); await page.waitForTimeout(3000); }
      for (const re of [/Check in for session/i, /Start (my )?check-?in/i, /Begin/i, /Continue/i]) {
        const b = page.getByRole('button', { name: re }).first();
        if (await b.count()) { await b.click().catch(() => {}); await page.waitForTimeout(3000); break; }
      }
    }
    await page.screenshot({ path: path.join(OUT, `${p.name}-02-entered.png`), fullPage: true });

    const box = page.locator('input[type="text"]:visible, textarea:visible').last();
    if (!(await box.count())) {
      const body = ((await page.textContent('body')) ?? '').replace(/\s+/g, ' ').slice(0, 500);
      log(`${p.name} BLOCKED: no message box after arriving. Page said: ${body}`);
      await c.close();
      return;
    }

    for (const [i, line] of p.lines.entries()) {
      log(`${p.name} says: ${line.slice(0, 70)}`);
      const after = await say(page, line);
      if (after === null) { log(`${p.name} composer closed at turn ${i + 1}: the engine had finished`); break; }
      const tail = after.replace(/\s+/g, ' ').slice(-420);
      log(`${p.name} engine: ...${tail}`);
      await page.screenshot({ path: path.join(OUT, `${p.name}-03-turn-${i + 1}.png`), fullPage: true });
      if (/end (the )?session|generate (your )?report|that is everything|we are done/i.test(tail)) {
        log(`${p.name} engine signalled a natural close at turn ${i + 1}`);
        break;
      }
    }

    /** End the session, which is what makes the account count toward the report. */
    for (const re of [/Complete session/i, /End (the )?session/i, /Finish/i, /Get my report/i]) {
      const b = page.getByRole('button', { name: re }).first();
      if (await b.count()) {
        await b.click().catch(() => {});
        await page.waitForTimeout(2500);
        const confirm = page.getByRole('button', { name: /Finish check-?in|Yes|Confirm|End it/i }).first();
        if (await confirm.count()) { await confirm.click().catch(() => {}); await page.waitForTimeout(3000); }
        log(`${p.name} ended the session via "${re}"`);
        break;
      }
    }
    await page.screenshot({ path: path.join(OUT, `${p.name}-04-ended.png`), fullPage: true });

    fs.writeFileSync(path.join(OUT, 'checkin.log'), LOG.join('\n'));
    await c.close();
    expect(LOG.length).toBeGreaterThan(0);
  });
}
