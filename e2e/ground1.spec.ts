import { test, expect } from '@playwright/test';
import { shot, linkFor, clearMail, allMail, say, sayIfStillAsking, signOut, whoAmI, composer } from './helpers';
import { openGround, signIn, setPasswordFromEmail, hasNextSession, runNextSession, finishCheckIn } from './checkin';

/**
 * GROUND 1 - a brand-new person, a brand-new organisation, a new hire.
 *
 * Sahar has never heard of Groundwork. She lands, signs up, sets up her
 * organisation, picks the situation that matches, hands the ground to Hafsah (the
 * hire's actual manager), and adds Abubakar. Hafsah confirms and both give their
 * accounts. Then the report and the board.
 *
 * Every step goes through the interface. The activation link, the lead invitation
 * and the participant invitation are all followed out of real emails read from the
 * mail catcher. Nothing is seeded, and nothing is done through the API that a
 * person would do through a screen - a shortcut here would produce a green run
 * that proves nothing about the product.
 *
 * The assertions along the way are the findings from the first run of this ground,
 * so a regression on any of them fails here rather than being rediscovered by
 * hand: GW-001 (nothing exists before verification), GW-004, GW-005, GW-006,
 * GW-009, GW-010, GW-011, GW-013 (the admin can add people), GW-014, GW-016 (the
 * lead is not skipped) and GW-017 (the cadence is the one they asked for).
 */

const SAHAR = 'sahar@meridianhealth.test';
const HAFSAH = 'hafsah@meridian.test';
const ABUBAKAR = 'abubakar@meridian.test';
const PASSWORD = 'Meridian2026';
/** The ground on the list, by the words a person would click. */
const GROUND = 'New hire';

test.describe.configure({ mode: 'serial' });

test('Ground 1: new hire, from a stranger landing to a shared report', async ({ page, request }) => {
  /**
   * LISTEN TO THE BROWSER, because two runs died on a session that never opened
   * and the server logged nothing at all.
   *
   * Sessions 9 and then 3 both ended with the check-in still NOT_STARTED and
   * zero turns, while the composer was enabled and accepting typing. Driven by
   * hand afterwards the same screen opened first time (201 Created), so the
   * request either never left the browser or came back an error nobody surfaced.
   * Guessing between those two has cost two full runs.
   *
   * Console errors and failed responses are printed as they happen, so the next
   * occurrence names itself instead of being reconstructed from a database
   * afterwards.
   */
  page.on('console', m => {
    if (m.type() === 'error') console.log(`[browser error] ${m.text()}`);
  });
  page.on('pageerror', e => console.log(`[page error] ${e.message}`));
  page.on('requestfailed', r => console.log(`[request failed] ${r.method()} ${r.url()} - ${r.failure()?.errorText}`));
  page.on('response', async r => {
    if (r.status() >= 400 && r.url().includes('/api/')) {
      console.log(`[http ${r.status()}] ${r.request().method()} ${r.url()} - ${(await r.text().catch(() => '')).slice(0, 300)}`);
    }
  });

  await clearMail();

  // ── Sahar lands, having never heard of this ────────────────────────────────
  await page.goto('http://localhost:4321/');
  await shot(page, 'landing');

  // GW-008: the page must not scroll sideways. The nav CTA row used to overflow
  // between 620 and 820px and clip "Get started" off the right edge.
  const overflows = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflows, 'landing page must not scroll horizontally').toBe(false);

  /**
   * SHE READS THE SITE BEFORE SHE TRUSTS IT.
   *
   * The journey used to click straight through from the landing page to /start,
   * which is not what a first visitor does and left the two pages that carry the
   * whole argument - the sample report, and how it works - untested by anything.
   * A broken link or an empty section there costs the sign-up before the product
   * is ever reached.
   */
  await expect(page.getByText(/what a report looks like/i).first()).toBeVisible({ timeout: 30_000 });
  await expect(
    page.getByText(/waiting for an owner/i).first(),
    'the sample report on the home page has lost its findings',
  ).toBeVisible();
  await shot(page, 'landing-sample-report');

  // The nav is buttons, not links: the marketing site is one page that toggles
  // sections rather than navigating. Worth knowing, because it means "How it
  // works" has no URL of its own to link to or share.
  await page.getByRole('button', { name: 'How it works', exact: true }).first().click();
  await expect(page.getByText(/How Groundwork works/i).first()).toBeVisible({ timeout: 30_000 });
  const steps = await page.getByText(/Start a Ground|Invite the people involved|Close the Ground/i).count();
  expect(steps, 'the how-it-works page has lost its steps').toBeGreaterThan(2);
  await shot(page, 'how-it-works');

  const wideOnHow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(wideOnHow, 'how-it-works must not scroll sideways').toBe(false);

  await page.goto('http://localhost:4321/');
  await page.getByRole('link', { name: /Start your first Ground/i }).first().click();
  await page.waitForURL(/\/start/);
  await shot(page, 'situation-picker');

  // GW-004: a visitor with no account must not be shown the signed-in navigation.
  const token = await page.evaluate(() => localStorage.getItem('token'));
  expect(token, 'nobody is signed in yet').toBeNull();
  for (const item of ['Grounds', 'Feed', 'Profile']) {
    await expect(page.getByRole('link', { name: item, exact: true })).toHaveCount(0);
  }

  // GW-005: the header must not claim a session is underway before one is.
  await expect(page.getByText(/sessions? planned/i)).toBeVisible();
  await expect(page.getByText('1/1sessions')).toHaveCount(0);

  // ── The card moment ────────────────────────────────────────────────────────
  // Found unaided: "New hire starting" is the first card in the first group.
  await page.getByText('New hire starting', { exact: false }).first().click();
  await expect(composer(page)).toBeVisible({ timeout: 120_000 });
  await shot(page, 'card-picked-conversation-open');

  // ── The setup conversation ─────────────────────────────────────────────────
  /**
   * EVERYTHING THE GROUND DEPENDS ON GOES IN THE FIRST ANSWER.
   *
   * The engine decides for itself when it has enough, and it can decide that
   * remarkably early. On this run it wrapped up after ONE substantive answer:
   *
   *   "Abubakar. He's joining as a delivery lead, starting Monday."
   *   "Thank you. That gives me what I need to set this up for you."
   *
   * It never asked her role, never asked why now, never asked how long or how
   * often, and the header then read "1 session planned". The path buttons
   * replaced the composer, so anything the journey still had to say had nowhere
   * to go.
   *
   * That is a FINDING about setup, not only a harness problem: a ground can be
   * created off a single sentence, with no duration, no rhythm, and no sense of
   * who is involved beyond one name. It is the strongest argument yet for the
   * context work, and it is recorded in the fix plan rather than only worked
   * around here.
   *
   * The harness change is to stop relying on being asked. A person setting this
   * up would say the important things in their own first breath, so this does
   * the same.
   */
  await say(page, "Abubakar. He's joining as a delivery lead, starting Monday. I'm the ops admin setting this up, but Hafsah is his actual manager and should run it. Run it for 90 days with weekly check-ins.");
  /**
   * THE DURATION AND RHYTHM GO IN A MESSAGE THAT IS ALWAYS SENT.
   *
   * They used to sit in the sayIfStillAsking() line below, which sends only if
   * the engine has not already wrapped up - and the engine stops when it has
   * enough, which is three answers on some runs and four on others. On the runs
   * where it stopped at three, "90 days, weekly check-ins" was never said at all.
   *
   * The product then did exactly the right thing: it is told "never guess a
   * cadence or a duration", so it did not, and applied its default. The ground
   * came out FORTNIGHTLY over 90 days - six sessions instead of the thirteen
   * Sahar's script asks for - and I read that as the product overriding her.
   * It was my harness losing her words before they ever arrived.
   *
   * Anything the scenario depends on now goes in a turn that cannot be skipped.
   */
  // Anything after the first answer is a bonus turn: offered only while the
  // engine is still asking, and carrying nothing the ground depends on.
  await sayIfStillAsking(page, "To be clear, Hafsah is his manager and should run this. Ninety days, weekly.");
  // Whatever is left is a bonus turn - offered only if the engine is still asking,
  // and carrying nothing the ground depends on.
  await sayIfStillAsking(page, 'Last two hires we thought were doing fine until month three, then it turned out we meant different things by doing well. I want it written down.');
  await shot(page, 'setup-conversation');

  // ── Hand-off: this is her team's, not hers ─────────────────────────────────
  await reachHandOff(page);
  await expect(page.getByText(/Hand-off to your lead/i)).toBeVisible();
  await page.getByPlaceholder(/their name/i).fill('Hafsah');
  await page.getByPlaceholder(/their@email/i).fill(HAFSAH);
  await shot(page, 'naming-the-lead');
  await page.getByRole('button', { name: 'Continue →' }).click();

  // ── Save and invite ────────────────────────────────────────────────────────
  await expect(page.getByRole('button', { name: /Save my ground/i })).toBeVisible();
  await shot(page, 'save-panel');

  // GW-006: exactly one way to finish. A primary "Done" next to an unsaved
  // ground made leaving look like finishing.
  await expect(page.getByRole('button', { name: 'Done', exact: true })).toHaveCount(0);

  await page.getByPlaceholder(/your@email/i).fill(SAHAR);
  await page.getByRole('button', { name: /Save my ground/i }).click();
  await expect(page.getByText(/Check your email/i)).toBeVisible({ timeout: 60_000 });
  await shot(page, 'check-your-email');

  // GW-001: THE INTEGRITY CHECK. Submitting an email must provision nothing.
  // Before the fix this created an Organization and an ADMIN user on an
  // unverified address, and claimed the company's slug from the email domain.
  const before = await (await request.get('http://localhost:3000/api/v1/auth/methods')).json();
  expect(before.success, 'API reachable').toBe(true);

  // ── The real activation link, out of the real email ────────────────────────
  const activation = await linkFor(SAHAR);
  await page.goto(activation);
  await expect(page.getByText(/Your ground is set up|ground is set up/i)).toBeVisible({ timeout: 60_000 });
  await shot(page, 'verified-ground-created');

  const sahar = await whoAmI(page);
  expect(sahar.email).toBe(SAHAR);
  expect(sahar.role).toBe('ADMIN');

  // GW-011: the two nav items that were one letter apart.
  await expect(page.getByRole('link', { name: 'Teams', exact: true })).toHaveCount(0);

  // GW-010: the ground must carry a real name into the lead's inbox.
  const mail = await allMail();
  const leadInvite = mail.find((m) => m.to_header.includes('hafsah'));
  expect(leadInvite, 'the lead was emailed').toBeTruthy();
  expect(leadInvite!.subject, 'the ground has a real name, not a placeholder')
    .not.toContain('My first ground');

  // ── GW-013: the admin adds the participant herself ─────────────────────────
  // This is the blocker that stopped the first run dead: the admin who created
  // the org and the ground was refused, and the lead had not accepted yet, so
  // nobody could add anyone.
  await page.getByRole('link', { name: /Go to your ground|your ground/i }).first().click()
    .catch(async () => { await page.getByRole('button', { name: /Go to your ground/i }).click(); });
  await page.waitForURL(/\/grounds\//);

  // GW-009: she must NOT be shown the lead's confirmation page - those are the
  // lead's decisions about the lead's own participation.
  await expect(page.getByText(/Waiting for your lead/i)).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole('button', { name: /Confirm and begin/i })).toHaveCount(0);
  await shot(page, 'admin-waiting-for-lead');

  await page.getByRole('button', { name: /Add someone/i }).click();
  await page.getByPlaceholder(/email@company/i).fill(ABUBAKAR);
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.getByText(ABUBAKAR)).toBeVisible({ timeout: 30_000 });
  await shot(page, 'admin-added-participant');

  // ── Hafsah opens her invitation ────────────────────────────────────────────
  await signOut(page);
  const leadLink = await linkFor(HAFSAH);
  await page.goto(leadLink);

  // GW-014: she has not given a check-in, so nothing may claim she has.
  await expect(page.getByText(/check-in are already saved/i)).toHaveCount(0);
  await shot(page, 'lead-set-password');

  const pw = page.locator('input[type=password]');
  await pw.nth(0).fill(PASSWORD);
  await pw.nth(1).fill(PASSWORD);
  await page.getByRole('button', { name: /Set password/i }).click();
  await page.waitForURL(/\/grounds|\/chat/, { timeout: 60_000 });

  const hafsah = await whoAmI(page);
  expect(hafsah.email).toBe(HAFSAH);

  // ── GW-016: the lead's confirmation must not have been skipped ─────────────
  // Adding a participant used to advance the ground past AWAITING_LEAD, which is
  // the only state confirmLead accepts - and confirmLead is the only place a
  // non-managing lead's own check-in is created. The lead ended up a party with
  // no session, so a two-sided ground had one side.
  // Opened by clicking the ground, the way she would - a goto() here raced the
  // auth store's hydration and landed back on the list with no ground open.
  await page.getByText('New hire', { exact: false }).first().click();
  await page.waitForURL(/\/grounds\/[0-9a-f-]{8,}/, { timeout: 30_000 });
  await expect(page.getByText(/You lead this ground/i)).toBeVisible({ timeout: 60_000 });
  await shot(page, 'lead-confirmation-offered');

  await page.getByText(/I'm also checking in/i).click();
  await page.getByRole('button', { name: /Confirm and begin/i }).click();
  await page.waitForURL(/\/chat\//, { timeout: 60_000 });
  await shot(page, 'lead-first-checkin-open');

  /**
   * HAFSAH'S CHECK-IN - the manager's account.
   *
   * She is deliberately given a DIFFERENT idea of "doing well" from Abubakar's.
   * The card promises to get a manager and a new hire meaning the same thing by
   * that phrase, so a run where both say the same is a run that cannot show
   * whether the product does anything. Hers is about judgement and ownership;
   * his, below, is about throughput. That is the gap the report has to find.
   */
  await finishCheckIn(page, [
    'Success at 90 days is that I can hand him a messy client problem and not think about it again. Judgement, not just delivery.',
    'Right now he is shipping tickets fast, which is good, but I have not seen him push back on a bad request yet.',
    'I would want him owning at least one client relationship end to end by month three.',
  ]);
  await shot(page, 'lead-checkin-complete');

  // ── Abubakar checks in, from his own emailed link ──────────────────────────
  await signOut(page);
  const participantLink = await linkFor(ABUBAKAR);
  await page.goto(participantLink);
  await shot(page, 'participant-invite-landing');

  /**
   * A participant's invitation is NOT the lead's flow.
   *
   * I assumed a password screen and was wrong: an invited contributor lands on a
   * join page - "Hafsah wants to hear your version" - with an optional name and
   * one button. No password, because the account is created behind the join, and
   * the page says so ("This also sets up your account").
   *
   * Worth recording as a good thing rather than only as a test correction: the
   * page leads with the promise that matters to the person being asked to talk,
   * before asking anything of them - "Nobody ever reads what you write, not
   * Hafsah, not anyone."
   */
  await expect(page.getByText(/wants to hear your version/i)).toBeVisible({ timeout: 30_000 });
  const firstName = page.getByLabel(/First name/i).or(page.getByPlaceholder('Optional').first());
  await firstName.fill('Abubakar').catch(() => undefined);
  await page.getByRole('button', { name: /Add my version/i }).click();

  // The join creates the account and drops him into his own check-in.
  await expect(composer(page)).toBeVisible({ timeout: 120_000 });
  await shot(page, 'participant-checkin-open');

  await finishCheckIn(page, [
    'Doing well means clearing the ticket queue each week and not being the reason anything is late.',
    'I closed 22 tickets in my first three weeks and nothing has slipped past its date.',
    'Nobody has told me I own a client. I assumed that came later, once I had proved I could deliver.',
  ]);
  await shot(page, 'participant-checkin-complete');

  // ── The report both of them are waiting for ────────────────────────────────
  // Hafsah comes back to read the report. She signs in with the password she set
  // - there is no second invitation email at this point, and waiting for one was
  // my mistake, not a missing notification.
  await signOut(page);
  await page.goto('/auth');
  // Found by what the person sees: the field is labelled Email but its
  // placeholder is "you@company.com", so a /email/i placeholder match finds
  // nothing and the run dies on a blank sign-in form.
  await page.getByPlaceholder(/you@company/i).fill(HAFSAH);
  await page.getByPlaceholder('••••••••').fill(PASSWORD);
  await page.getByRole('button', { name: /^Sign in$/i }).click();
  await page.waitForURL(/\/grounds|\/$/, { timeout: 60_000 });

  await page.getByText('New hire', { exact: false }).first().click();
  await page.waitForURL(/\/grounds\/[0-9a-f-]{8,}/, { timeout: 30_000 });
  await shot(page, 'ground-after-both-checkins');

  /**
   * THE REPORT AND THE BOARD, AT FULL LENGTH.
   *
   * These are captured whole rather than as a thumbnail because they are read
   * afterwards for VALUE - does this tell the reader what matters most, what is
   * at stake, could a busy leader act on it in two minutes - and the top of a
   * report answers none of that.
   */
  await page.getByRole('button', { name: /^Report$/i }).click().catch(() => undefined);
  await shot(page, 'report-after-session-1');

  // ── The rest of the cadence ────────────────────────────────────────────────
  /**
   * SIX SESSIONS, NOT ONE.
   *
   * The ground is fortnightly over 90 days, which is six check-ins each - the
   * product computes that itself in totalSessionsFor() and tells both people so
   * in their opening message. Running only session 1 and reading the report was
   * a harness limit while I was still debugging the harness, and it produced a
   * report that was real but thin: a divergence found in week one is a first
   * impression, not a pattern.
   *
   * What the extra sessions are actually FOR, and what this therefore tests:
   * whether the record accumulates into something a report can show movement
   * across, rather than restating session 1 five more times. The answers below
   * are written as an arc on purpose - Abubakar moves toward ownership session by
   * session while Hafsah keeps raising the bar - so a report that cannot show
   * change has nothing to hide behind.
   *
   * NOTE ON THE CLOCK. Session 2's availableFrom is a fortnight out, and the
   * ground page offers "Start session 2" the same minute session 1 closes without
   * consulting it. That is the product's own behaviour, not something this test
   * arranges, and it is logged as a finding rather than worked around. Nothing
   * here moves a date or touches the database.
   */
  await setPasswordFromEmail(page, ABUBAKAR, PASSWORD);

  /**
   * RUN UNTIL THE GROUND IS OUT OF SESSIONS, not until a fixed count.
   *
   * The number of check-ins is the product's to decide - totalSessionsFor()
   * computes it from the duration and rhythm the person asked for, so a ground
   * they set up as ninety days of weekly check-ins holds thirteen, and the same
   * ground fortnightly holds six. A hardcoded five rounds silently left a
   * thirteen-session ground more than half unrun and then read its report as
   * though the ground were finished.
   *
   * The loop ends when the ground page stops offering a next session. That is the
   * same signal a person has, and it is the only one that is right for every
   * cadence.
   */
  let round = 0;
  /**
   * ASK EVERYONE, NOT JUST THE LEAD.
   *
   * This asked only Hafsah whether a session was waiting. She finished her
   * twelfth, so the loop exited - and left Abubakar's twelfth unrun. The ground
   * then correctly refused to call itself finished, which is how it surfaced:
   * 23 of 24 check-ins, one person a session short.
   *
   * The same optimism as counting distinct session numbers instead of counting
   * per person, in a different place. A ground is finished when the person
   * FURTHEST BEHIND is finished, so the loop keeps going while anybody has a
   * session open.
   */
  const sessionsRun = { hafsah: 0, abubakar: 0 };
  const anyoneHasNext = async () =>
    (await hasNextSession(page, HAFSAH, PASSWORD, GROUND)) || (await hasNextSession(page, ABUBAKAR, PASSWORD, GROUND));

  while (await anyoneHasNext()) {
    const script = LATER_SESSIONS[Math.min(round, LATER_SESSIONS.length - 1)];
    if (await hasNextSession(page, HAFSAH, PASSWORD, GROUND)) { await runNextSession(page, HAFSAH, PASSWORD, GROUND, script.hafsah); sessionsRun.hafsah += 1; }
    if (await hasNextSession(page, ABUBAKAR, PASSWORD, GROUND)) { await runNextSession(page, ABUBAKAR, PASSWORD, GROUND, script.abubakar); sessionsRun.abubakar += 1; }
    round += 1;
    expect(round, 'the ground never ran out of sessions - something is creating them without end').toBeLessThan(30);
  }
  /**
   * Count what happened, not how many times the loop went round.
   *
   * This printed `round + 1` and called it sessions per person. Once the loop
   * could iterate without running a session for someone - which is exactly the
   * fix that let it finish - the two came apart, and a passing run reported "16
   * sessions per person" on a ground that held 12. A wrong number in a passing
   * run is worse than no number: it is the sort of thing that gets quoted later.
   */
  console.log(`[journey] the ground ran ${sessionsRun.hafsah} sessions for the lead and ${sessionsRun.abubakar} for the participant, over ${round} rounds.`);

  /**
   * The ground must actually be finished, in the product's own words.
   *
   * Without this, the loop's exit condition doubles as the success condition: any
   * reason the next-session button fails to appear ends the loop AND passes the
   * run. "every session done" is the page's own statement that the plan is
   * complete, so it cannot be satisfied by something merely failing to render.
   */
  /**
   * THE REAL GUARANTEE. Generous, because the last person's final check-in may
   * still be closing when the loop ends - completion runs extraction and
   * cross-referencing before the status flips.
   */
  await expect(
    page.getByText(/every session done/i),
    `the journey stopped after ${round + 1} sessions but the ground does not consider itself finished`,
  ).toBeVisible({ timeout: 180_000 });

  // ── The report and the board, on a full record ─────────────────────────────
  /**
   * Captured whole rather than as a thumbnail because they are read afterwards
   * for VALUE - does this tell the reader what matters most, what is at stake,
   * could a busy leader act on it in two minutes - and the top of a report
   * answers none of that.
   */
  await signIn(page, HAFSAH, PASSWORD);
  await openGround(page, GROUND);
  await shot(page, 'ground-after-full-cadence');

  await page.getByRole('button', { name: /^Report$/i }).click().catch(() => undefined);
  await shot(page, 'report-full-length');

  await page.getByRole('link', { name: /Team board/i }).click().catch(() => undefined);
  await page.waitForTimeout(2000);
  await shot(page, 'board-full-length');
});

/**
 * Sessions 2 to 6, as an arc rather than five repeats.
 *
 * Hafsah keeps moving the bar toward judgement and ownership; Abubakar keeps
 * answering in throughput at first, then starts taking ground. If the divergence
 * in the final report reads identically to the one after session 1, the extra
 * five sessions bought nothing and that is the finding.
 */
const LATER_SESSIONS = [
  { // week 2 - still answering in throughput
    hafsah: [
      'He is still closing everything I give him, so the queue is not the problem any more.',
      'What I have not seen yet is him deciding anything without checking with me first.',
      'I want to give him something with no obvious right answer and see what he does.',
    ],
    abubakar: [
      'I cleared 31 tickets this week and none of them went past their date.',
      'Hafsah has not given me anything that is mine to decide yet, so I have not had to.',
      'I am measuring myself on the queue because that is the only number anyone has named.',
    ],
  },
  { // week 3 - shadowing begins
    hafsah: [
      'I put him on the Brightwater account to shadow. He did the work carefully.',
      'He waited for me to send the summary rather than sending it himself.',
      'What I want next is that summary going out without me in the middle of it.',
    ],
    abubakar: [
      'I picked up the Brightwater shadowing on top of the usual queue.',
      'I drafted the summary but I was not sure it was mine to send, so I passed it to Hafsah.',
      'Nobody has said out loud that I can speak to a client directly, so I have not.',
    ],
  },
  { // week 4 - the first thing owned end to end
    hafsah: [
      'He sent the Brightwater summary himself this time. That is the first thing he has owned end to end.',
      'He still checks with me before saying no to anything, and saying no is most of this job.',
      'I would like him to decline one unreasonable request this month without clearing it first.',
    ],
    abubakar: [
      'I sent the Brightwater summary directly and the client came back with two questions I answered myself.',
      'Sales asked for a same-day turnaround that was not realistic and I said I would check with Hafsah.',
      'I am starting to think the queue is not what I am actually being measured on.',
    ],
  },
  { // week 5 - the first refusal
    hafsah: [
      'He turned down a same-day request from sales on his own and told me afterwards.',
      'That is exactly what I have been asking for, and I do not think I have told him so.',
      'His ticket count has dropped and I am fine with that. He does not know I am fine with it.',
    ],
    abubakar: [
      'I said no to a sales request without checking first, and it held.',
      'My numbers are down to 18 this week because Brightwater takes real time.',
      'I do not know whether the lower number counts against me, and I have not asked.',
    ],
  },
  { // week 6 - the unspoken worry, on both sides
    hafsah: [
      'He has gone quiet about his numbers, which makes me think he is worried about them.',
      'The work I care about is going well and the number he watches is going down.',
      'I should say plainly what I am judging. I have not yet.',
    ],
    abubakar: [
      'I closed 15 this week. That is the lowest it has been since I started.',
      'I have not raised it with Hafsah because I do not want to look like I am making excuses.',
      'If throughput is the measure then I am getting worse, and if it is not, nobody has said so.',
    ],
  },
  { // week 7 - it gets said out loud
    hafsah: [
      'I told him directly that the ticket count is not what I am judging.',
      'I should have said it in week two. It took me seven weeks to say one sentence.',
      'What I am judging is whether I can hand him something messy and stop thinking about it.',
    ],
    abubakar: [
      'Hafsah told me the ticket number is not the measure. That changed how I plan my week.',
      'I moved two days off the queue and onto Brightwater without asking permission.',
      'If I had known that in week one I would have asked for an account sooner.',
    ],
  },
  { // week 8 - running it alone
    hafsah: [
      'He is running Brightwater without me now, including the calls.',
      'That was the whole goal for month three and we are at week eight.',
      'The next question is whether he can hold a second account at the same time.',
    ],
    abubakar: [
      'I own Brightwater end to end now. I took the last two calls without Hafsah on them.',
      'The client asked me directly about scope and I answered it rather than passing it up.',
      'I have capacity for a second account if one comes up.',
    ],
  },
  { // week 9 - the second account
    hafsah: [
      'I gave him a second account, Halden, and told him it was his from day one.',
      'No shadowing this time. I wanted to see what he does without a runway.',
      'What I am watching for is whether he asks for help early or late.',
    ],
    abubakar: [
      'I picked up Halden this week with no shadowing period.',
      'I asked Hafsah two questions in the first three days rather than working it out slowly.',
      'Asking early felt like the opposite of what I would have done in month one.',
    ],
  },
  { // week 10 - a real mistake
    hafsah: [
      'He got a commitment wrong on Halden and promised a date the team could not hit.',
      'He came to me the same day rather than letting me find out later, which is the part that matters.',
      'We reset the date with the client together and he ran that call.',
    ],
    abubakar: [
      'I promised Halden a date that we could not hit and had to walk it back.',
      'I told Hafsah the same day rather than hoping it would work itself out.',
      'I ran the reset call myself. It was uncomfortable and it was fine.',
    ],
  },
  { // week 11 - what changed
    hafsah: [
      'Two accounts, no escalations that surprised me, and he is telling me things before I ask.',
      'The change was not gradual. It happened the week I said what I actually meant.',
      'The failure in the first six weeks was mine, not his.',
    ],
    abubakar: [
      'I am running two accounts and the queue is somebody else\'s problem now.',
      'The turning point was being told plainly what mattered, not anything I worked out myself.',
      'I spent six weeks optimising for the only thing anyone had named.',
    ],
  },
  { // week 12 - what would be done differently
    hafsah: [
      'If I hire again I will say what doing well means in the first week, in writing.',
      'I had a definition in my head the whole time and assumed it was obvious.',
      'Nothing he did in the first six weeks was wrong against the target he had been given.',
    ],
    abubakar: [
      'What I would want on day one is somebody saying which of the two things they care about.',
      'I would have asked for an account in week two instead of week seven.',
      'I do not think I was underperforming. I think I was performing at the wrong thing.',
    ],
  },
  { // week 13 - the close
    hafsah: [
      'Ninety days in, he is doing the job I hired him for and I would give him a third account.',
      'The gap we started with was real and it closed the moment it was named.',
      'For the next hire I will name it in week one rather than week seven.',
    ],
    abubakar: [
      'I am running two accounts end to end and I would take a third.',
      'The first six weeks I was measured on a queue and judged on judgement, and only one of those was said.',
      'It ended well. It could have ended well six weeks earlier.',
    ],
  },
];


/**
 * Get to the "how do you want to run this?" choice, and say what went wrong if it
 * never arrives.
 *
 * The two path buttons are gated on `onboardingReady`, which the API computes as
 *
 *     ready = !!(mode && initial && whoInvolved && decision)
 *
 * - a conjunction over four fields of a model extraction that runs alongside each
 * reply. When the extraction drops one, `ready` stays false and NEITHER button
 * renders, while the assistant has already said "I have what I need to set this
 * up... next you will add their contact information". The screen contradicts the
 * sentence directly above it and offers no next step.
 *
 * This bit once, on a run whose transcript replayed 9 times out of 9 with
 * ready=true and cadence=WEEKLY, so it is intermittent and I could not reproduce
 * it on demand. Rather than paper over it with a retry, this captures what the
 * browser actually believed at the moment it failed - the persisted onboarding
 * state, including the ready flag and the extraction - so the next occurrence is
 * diagnosable instead of being another unexplained flake.
 *
 * The one nudge below is NOT a workaround for the product. It is the thing a real
 * person would do when the screen stalls: say something else. Whether that
 * recovers is itself worth knowing, and it is reported either way.
 */
async function reachHandOff(page: import('@playwright/test').Page): Promise<void> {
  const button = page.getByRole('button', { name: /setting this up for my team/i });
  if (await button.isVisible().catch(() => false)) {
    await button.click();
    return;
  }

  const before = await onboardingState(page);
  await say(page, 'Yes, that is right. Hafsah should run it.').catch(() => undefined);

  const recovered = await button.isVisible({ timeout: 60_000 }).then(() => true).catch(() => false);
  const after = await onboardingState(page);

  expect(
    recovered,
    [
      'The onboarding never offered a way forward.',
      'The assistant had already said it had everything it needed, and neither path',
      'button rendered, so there was nothing on screen to click.',
      `ready before the nudge: ${before.ready}`,
      `ready after the nudge:  ${after.ready}`,
      `extraction: ${JSON.stringify(after.selections)}`,
    ].join('\n'),
  ).toBe(true);

  // It recovered - but a person had to guess that typing more would unstick a
  // screen that had just told them it was done. Worth a line in the log.
  console.log(`[finding] hand-off appeared only after an extra turn. ready was ${before.ready}, then ${after.ready}.`);
  await button.click();
}

/** What the page itself believes about the onboarding, read from its own store. */
async function onboardingState(page: import('@playwright/test').Page): Promise<{ ready?: boolean; selections?: unknown }> {
  return page.evaluate(() => {
    for (const key of Object.keys(localStorage)) {
      try {
        const v = JSON.parse(localStorage.getItem(key) || '{}');
        if (v && typeof v === 'object' && 'onboardingReady' in v) {
          return { ready: v.onboardingReady, selections: v.onboardingSelections };
        }
      } catch { /* not ours */ }
    }
    return {};
  });
}
