import { test, expect } from '@playwright/test';
import { shot, linkFor, linkFromEmail, clearMail, allMail, signOut, whoAmI, composer } from './helpers';
import { openGround, signIn, setPasswordFromEmail, hasNextSession, runNextSession, finishCheckIn } from './checkin';

/**
 * GROUND 2 - the Atlas build. Six people, weekly, sixty days.
 *
 * THIS RUNS IN THE SAME ORGANISATION AS GROUND 1, ON THE SAME DATABASE, and that
 * is the point of doing them in order. Sahar already exists, the org already
 * exists, one ground is already closed, and the free-ground counter is already
 * at one. Nothing here is a fresh start, so anything that only works for a brand
 * new account fails at this ground rather than at ground eighteen.
 *
 * WHAT ONLY A GROUND THIS SIZE CAN TEST. Ground 1 had two people in it, and two
 * people cannot exercise the rules that matter most in a report:
 *
 *   - CROSS-ATTRIBUTION. Two people here believe they own the same piece of work
 *     (Ejiro and Maureen, the Atlas schema) and one piece of work is claimed by
 *     nobody (the customer cutover, which only Abubakar ever mentions). With two
 *     parties that is a disagreement. With six it is a map, and the report has to
 *     draw it without turning it into an accusation.
 *
 *   - NEVER COUNT THE ACCOUNTS. "Four of the six described the same delay" is a
 *     verdict reached by arithmetic, and it is forbidden. On a two-person ground
 *     there is nothing to count, so the rule has never actually been under test.
 *
 *   - THE CONFIDENCE FLOOR. Hafeezah names nothing specific for eight sessions.
 *     A record that only reports absence is safe to show, because it describes
 *     the record and not the person. That distinction is invisible unless
 *     somebody in the ground is genuinely vague throughout.
 *
 * Sahar is the admin and NOT a party: she hands the ground to Kennedy and never
 * checks in. Everything goes through the interface, every link comes out of a
 * real email, and nothing is seeded.
 */

const PASSWORD = 'Meridian2026';
const GROUND = 'Atlas';

const SAHAR = 'sahar@meridianhealth.test';

/** The five who check in, plus Kennedy who leads and checks in too. */
const KENNEDY = 'kennedy@meridian.test';
const EJIRO = 'ejiro@meridian.test';
const MAUREEN = 'maureen@meridian.test';
const ERIC = 'eric@meridian.test';
const HAFEEZAH = 'hafeezah@meridian.test';
const ABUBAKAR = 'abubakar@meridian.test';   // returning from ground 1, already has an account

const NEW_PEOPLE = [
  { email: EJIRO, name: 'Ejiro', role: 'Data' },
  { email: MAUREEN, name: 'Maureen', role: 'Product' },
  { email: ERIC, name: 'Eric', role: 'Infrastructure' },
  { email: HAFEEZAH, name: 'Hafeezah', role: 'Support' },
];

const EVERYONE = [KENNEDY, EJIRO, MAUREEN, ERIC, HAFEEZAH, ABUBAKAR];

test.describe.configure({ mode: 'serial' });

test('Ground 2: six people build Atlas, and find out who owns what', async ({ page }) => {
  page.on('console', m => { if (m.type() === 'error') console.log(`[browser error] ${m.text()}`); });
  page.on('pageerror', e => console.log(`[page error] ${e.message}`));
  page.on('requestfailed', r => console.log(`[request failed] ${r.method()} ${r.url()} - ${r.failure()?.errorText}`));
  page.on('response', async r => {
    if (r.status() >= 400 && r.url().includes('/api/')) {
      console.log(`[http ${r.status()}] ${r.request().method()} ${r.url()} - ${(await r.text().catch(() => '')).slice(0, 300)}`);
    }
  });

  await clearMail();

  // ── Sahar comes back, and cannot use a password ────────────────────────────
  /**
   * SHE NEVER SET ONE.
   *
   * Ground 1 created her account by activating an emailed link, and the flow
   * never asked her to choose a password - so the only way back in is another
   * link. The product does offer that, and it works. What it offers it under is
   * "New here? Get a sign-in link instead", which is the wrong sentence for the
   * person who owns the organisation and has closed a ground in it. Recorded as
   * a finding; the run continues, because the mechanism is sound.
   */
  await page.goto('/auth');
  await page.getByText(/Get a sign-in link instead/i).click();
  await page.getByPlaceholder(/you@company/i).fill(SAHAR);
  await page.getByRole('button', { name: /Send|Email me|Continue/i }).first().click();
  await shot(page, 'g2-sahar-asks-for-a-link');

  const back = await linkFor(SAHAR);
  await page.goto(back);

  /**
   * WAIT FOR HER TO BE SIGNED IN, NOT FOR A PARTICULAR PAGE.
   *
   * The link works and signs her in. Where it puts her is the finding: the same
   * first-run landing a brand new account gets, headed
   *
   *     "Your ground is set up. Your session is on record and your account is
   *      live."
   *
   * with a link to share, three steps explaining what happens next, and "Go to
   * your ground" pointing at the ground she closed weeks ago. She has been here
   * before, has a finished ground behind her, and is being welcomed as though she
   * had just arrived. Nothing is broken - the sidebar is there, "New ground" is
   * there - but the whole screen is written for somebody else.
   *
   * So the journey waits for the auth store rather than for a URL, and carries on
   * the way she would: past the welcome, into the grounds list.
   */
  await expect
    .poll(async () => (await whoAmI(page)).email, { timeout: 60_000, intervals: [1000] })
    .toBe(SAHAR);
  await shot(page, 'g2-returning-admin-lands-on-the-first-run-welcome');
  console.log('[finding] a returning admin\'s sign-in link lands on the new-account welcome screen, pointing at her old ground.');

  const sahar = await whoAmI(page);
  expect(sahar.email, 'the returning admin is signed in as herself').toBe(SAHAR);
  expect(sahar.role).toBe('ADMIN');

  // Ground 1 is still there, closed, and she can see it. A second ground must
  // not erase or replace the first.
  await page.goto('/grounds');
  await expect(page.getByText('New hire', { exact: false }).first()).toBeVisible({ timeout: 30_000 });
  await shot(page, 'g2-grounds-list-with-ground-one');

  // ── Opening the second ground ──────────────────────────────────────────────
  await page.goto('/grounds/new');
  await expect(page.getByText(/What is this ground for/i)).toBeVisible({ timeout: 30_000 });
  await shot(page, 'g2-scenario-picker');

  await page.getByText('New project', { exact: true }).first().click();
  await page.getByText('At the start', { exact: true }).first().click();
  await page.getByRole('button', { name: /^Continue$/ }).click();

  /**
   * THE FREE-GROUND COUNTER IS THE POINT OF THIS STEP.
   *
   * She has used one. The billing step must say so, and must not offer to charge
   * her - the free plan covers ten. A run that starts from an empty database can
   * never catch a counter that reads wrong on the second ground, which is exactly
   * the sort of thing that reads wrong on the second ground.
   */
  await expect(page.getByText(/No payment needed/i)).toBeVisible({ timeout: 60_000 });
  await expect(
    page.getByText(/You have used/i),
    'the free plan says what has been used, and this is the first ground where that number is not zero',
  ).toBeVisible();
  await shot(page, 'g2-billing-second-ground-is-free');
  await page.getByRole('button', { name: /Continue →/ }).click();

  /**
   * Sixty days, weekly.
   *
   * FOUND HERE, NOT LOOKED FOR: neither of these selects can be reached by its
   * label. The page renders "Timeframe" and "Check-in cadence" as plain
   * `<label class="gw-label">` with no htmlFor and no wrapping, so nothing ties
   * the words to the control. Sighted with a mouse it is obvious; to a screen
   * reader both are unlabelled dropdowns, and this is the step where a person
   * decides how long the ground runs and how often they are asked.
   *
   * Worth flagging rather than only working around, because the scenario cards on
   * the step before this one were deliberately rebuilt as real radios for exactly
   * this reason. The fix stopped one step short.
   */
  const timeframe = page.locator('select').first();
  const cadence = page.locator('select').nth(1);
  await expect(timeframe, 'the timeframe control is not on this step').toBeVisible();
  await timeframe.selectOption('60');
  await cadence.selectOption('WEEKLY');
  await expect(page.getByText(/sessions over 60 days/i)).toBeVisible();
  await shot(page, 'g2-timeframe-and-cadence');
  await page.getByRole('button', { name: /^Continue$/ }).click();

  // ── Who is in it ───────────────────────────────────────────────────────────
  await expect(page.getByText(/Who is in this ground/i)).toBeVisible({ timeout: 30_000 });

  // She is not a party. Kennedy runs it.
  await page.getByText('Someone else runs this', { exact: true }).click();
  await page.getByLabel(/The lead's email address/i).fill(KENNEDY);
  await page.getByLabel(/The lead's name/i).fill('Kennedy');
  await page.getByLabel(/What the lead is responsible for/i).fill('Delivering Atlas by the end of the quarter');

  for (const person of NEW_PEOPLE) {
    await page.getByPlaceholder('their@email.com').fill(person.email);
    await page.getByPlaceholder(/Head of Engineering/i).fill(person.role);
    await page.getByRole('button', { name: /Add to this ground/i }).click();
    await expect(page.getByText(person.email)).toBeVisible({ timeout: 15_000 });
  }

  /**
   * ABUBAKAR IS ALREADY IN THIS ORGANISATION, from ground 1.
   *
   * Adding somebody who already has an account must not create a second one, and
   * must not fail. This is the first time in the eighteen that anybody is in two
   * grounds at once, and it is the whole reason for running them in order.
   */
  await page.getByPlaceholder('their@email.com').fill(ABUBAKAR);
  await page.getByPlaceholder(/Head of Engineering/i).fill('Delivery');
  await page.getByRole('button', { name: /Add to this ground/i }).click();
  await expect(page.getByText(ABUBAKAR)).toBeVisible({ timeout: 15_000 });

  await expect(page.getByText(/5 people added/i)).toBeVisible();
  await shot(page, 'g2-six-people-added');
  await page.getByRole('button', { name: /^Continue$/ }).click();

  // ── Where it can land ──────────────────────────────────────────────────────
  await expect(page.getByText(/What does a successful outcome look like/i)).toBeVisible({ timeout: 30_000 });
  await shot(page, 'g2-end-states');
  /**
   * A NEW PROJECT CAN LAND IN FOUR PLACES, and they are this scenario's own
   * words rather than generic ones: mark complete, continue, descope, stop the
   * project. Sahar picks the one she is aiming at.
   *
   * Worth noticing while here: she is choosing where this ground lands, and she
   * is not a party to it. On a scenario with a subject that would be the lead's
   * to choose. On a project it is reasonable that the person who commissioned it
   * names the target, and everybody sees it before the first session.
   */
  await expect(page.getByText('Where this ground can land')).toBeVisible();
  await page.getByText('Mark complete', { exact: true }).click();
  const continueFromEndStates = page.getByRole('button', { name: /^Continue$/ });
  await expect(
    continueFromEndStates,
    'an end state was selected and Continue stayed disabled, so the ground cannot say where it is heading',
  ).toBeEnabled({ timeout: 15_000 });
  await continueFromEndStates.click();

  // ── The brief ──────────────────────────────────────────────────────────────
  await expect(page.getByText(/What is this ground about/i)).toBeVisible({ timeout: 30_000 });
  await page.locator('textarea').first().fill(
    [
      'Atlas is the replacement for the scheduling system every clinic runs on. Six of us are',
      'building it over the next two months and I do not think we agree on who owns which part.',
      'Kennedy is delivering it. Ejiro is on the data side, Maureen on product, Eric on',
      'infrastructure, Abubakar on the API, Hafeezah on support readiness. What needs to be true',
      'at the end is that every piece of this has exactly one name against it and everybody knows',
      'which name. Last time we built something this size two people wrote the same service and',
      'nobody wrote the migration.',
    ].join(' '),
  );
  // Same unassociated-label problem as the timeframe selects, so this goes in by
  // the placeholder the person actually sees.
  await page.getByPlaceholder(/COO onboarding/i).fill('Atlas build, scope and ownership');
  await shot(page, 'g2-brief-and-summary');
  await page.getByRole('button', { name: /Open the ground →/ }).click();
  await page.waitForURL(/\/grounds\/[0-9a-f-]{8,}/, { timeout: 90_000 });
  await shot(page, 'g2-ground-open-admin-view');

  /**
   * SHE HANDED IT OVER, SO SHE IS WAITING - and must not be shown the lead's
   * decisions about the lead's own participation.
   */
  await expect(page.getByText(/Waiting for your lead/i)).toBeVisible({ timeout: 60_000 });
  await expect(page.getByRole('button', { name: /Confirm and begin/i })).toHaveCount(0);

  // Everybody was actually written to, with a ground name that means something.
  const mail = await allMail();
  for (const email of [KENNEDY, ...NEW_PEOPLE.map(p => p.email), ABUBAKAR]) {
    expect(
      mail.some(m => m.to_header.toLowerCase().includes(email.split('@')[0])),
      `${email} was never emailed, so they have no way in`,
    ).toBe(true);
  }
  const kennedyInvite = mail.find(m => m.to_header.includes('kennedy'));
  expect(kennedyInvite!.subject, 'the ground carries its real name into the invitation')
    .not.toMatch(/My first ground|undefined|null/i);

  // ── Kennedy accepts and leads ──────────────────────────────────────────────
  await signOut(page);
  await page.goto(await linkFromEmail(KENNEDY, 'asked you to lead'));
  await shot(page, 'g2-lead-invitation');

  const pw = page.locator('input[type=password]');
  await expect(pw.first(), 'the lead invitation led somewhere with no password field').toBeVisible({ timeout: 30_000 });
  await pw.nth(0).fill(PASSWORD);
  await pw.nth(1).fill(PASSWORD).catch(() => undefined);
  await page.getByRole('button', { name: /Set password/i }).click();
  await page.waitForURL(/\/grounds|\/chat/, { timeout: 60_000 });

  await openGround(page, GROUND);
  await expect(page.getByText(/You lead this ground/i)).toBeVisible({ timeout: 60_000 });
  await shot(page, 'g2-lead-confirmation');

  await page.getByText(/I'm also checking in/i).click();
  await page.getByRole('button', { name: /Confirm and begin/i }).click();
  await page.waitForURL(/\/chat\//, { timeout: 60_000 });

  await finishCheckIn(page, ARC.kennedy[0]);
  await shot(page, 'g2-lead-session-1');

  // ── The five join from their own emails ────────────────────────────────────
  /**
   * FIVE PEOPLE, FIVE LINKS, NO SHORTCUTS.
   *
   * Ground 1 had one participant, so "the join flow works" meant one person got
   * through once. Five at a time is where a join flow that quietly assumes it is
   * the only one falls over.
   *
   * Abubakar is different from the other four and deliberately last: he already
   * has an account and a password from ground 1, so his link must recognise him
   * rather than trying to sign him up again.
   */
  for (const person of NEW_PEOPLE) {
    await signOut(page);
    await page.goto(await linkFromEmail(person.email, 'invited you to check in'));
    await expect(
      page.getByText(/wants to hear your version/i),
      `${person.name}'s invitation did not lead to a join page`,
    ).toBeVisible({ timeout: 30_000 });
    await page.getByLabel(/First name/i).fill(person.name).catch(() => undefined);
    await page.getByRole('button', { name: /Add my version/i }).click();
    await expect(composer(page), `${person.name} joined but never reached a check-in`).toBeVisible({ timeout: 120_000 });
    await shot(page, `g2-${person.name.toLowerCase()}-joined`);
    await finishCheckIn(page, arcFor(person.email)[0]);
  }

  // Abubakar, returning.
  await signOut(page);
  await page.goto(await linkFromEmail(ABUBAKAR, 'invited you to check in'));
  await shot(page, 'g2-returning-participant-landing');
  const joinButton = page.getByRole('button', { name: /Add my version/i });
  if (await joinButton.isVisible().catch(() => false)) {
    await joinButton.click();
  } else {
    // He may be signed straight through, having an account already. Either is
    // fine; being stranded is not.
    console.log('[journey] the returning participant was not offered a join button. Reading what he was offered instead.');
  }
  if (!(await composer(page).isVisible().catch(() => false))) {
    await signIn(page, ABUBAKAR, PASSWORD);
    await openGround(page, GROUND);
    const start = page.getByRole('button', { name: /Start session \d+/i });
    await expect(start, 'the returning participant has no way into his first Atlas session').toBeVisible({ timeout: 60_000 });
    await start.click();
    await page.waitForURL(/\/checkin\/|\/chat\//, { timeout: 60_000 });
  }
  await finishCheckIn(page, ARC.abubakar[0]);
  await shot(page, 'g2-returning-participant-session-1');

  // The four new joiners have no password yet, and cannot come back without one.
  for (const person of NEW_PEOPLE) {
    await setPasswordFromEmail(page, person.email, PASSWORD);
  }

  // ── The rest of the cadence, all six of them ───────────────────────────────
  /**
   * RUN UNTIL THE GROUND IS OUT OF SESSIONS, not until a fixed count, and ask
   * EVERYBODY rather than just the lead.
   *
   * A ground is finished when the person furthest behind is finished. On ground 1
   * asking only the lead left the participant's twelfth session unrun and the
   * ground correctly refusing to call itself complete: 23 of 24. With six people
   * there are five ways to make that mistake instead of one.
   */
  const run: Record<string, number> = Object.fromEntries(EVERYONE.map(e => [e, 1]));
  let round = 1;

  const anyoneHasNext = async () => {
    for (const email of EVERYONE) {
      if (await hasNextSession(page, email, PASSWORD, GROUND)) return true;
    }
    return false;
  };

  while (await anyoneHasNext()) {
    for (const email of EVERYONE) {
      if (!(await hasNextSession(page, email, PASSWORD, GROUND))) continue;
      const arc = arcFor(email);
      await runNextSession(page, email, PASSWORD, GROUND, arc[Math.min(round, arc.length - 1)]);
      run[email] += 1;
    }
    round += 1;
    expect(round, 'the ground never ran out of sessions - something is creating them without end').toBeLessThan(20);
  }

  console.log('[journey] sessions completed per person: ' +
    EVERYONE.map(e => `${e.split('@')[0]} ${run[e]}`).join(', '));

  /**
   * The ground must actually be finished, in the product's own words. Without
   * this, the loop's exit condition doubles as the success condition, and any
   * reason a button fails to render ends the loop AND passes the run.
   */
  await expect(
    page.getByText(/every session done/i),
    `the journey stopped after ${round} rounds but the ground does not consider itself finished`,
  ).toBeVisible({ timeout: 240_000 });

  // ── What six accounts produced ─────────────────────────────────────────────
  await signIn(page, KENNEDY, PASSWORD);
  await openGround(page, GROUND);
  await shot(page, 'g2-ground-complete-lead-view');

  await page.getByRole('button', { name: /^Report$/i }).click().catch(() => undefined);
  await shot(page, 'g2-report-lead-full-length');

  await page.getByRole('link', { name: /Team board/i }).click().catch(() => undefined);
  await page.waitForTimeout(2000);
  await shot(page, 'g2-board-full-length');

  /**
   * THE SAME REPORT, READ BY SOMEBODY WHO IS NOT THE LEAD.
   *
   * Ground 1 could not test this properly: with two people, "everyone else" is
   * one person, and the naming rule - the lead sees everybody, anybody else sees
   * themselves and the lead - collapses into something indistinguishable from
   * showing all names. With six, Eric must see Eric and Kennedy, and must not see
   * Maureen, Ejiro, Hafeezah or Abubakar named anywhere.
   */
  await signIn(page, ERIC, PASSWORD);
  await openGround(page, GROUND);
  await page.getByRole('button', { name: /^Report$/i }).click().catch(() => undefined);
  await shot(page, 'g2-report-as-a-participant');

  const asEric = (await page.locator('body').textContent()) ?? '';
  for (const hidden of ['Maureen', 'Ejiro', 'Hafeezah', 'Abubakar']) {
    expect(
      asEric.includes(hidden),
      `a participant is reading the shared report and it names ${hidden}, who is neither them nor the lead`,
    ).toBe(false);
  }
});

/**
 * Eight sessions each, written as six arcs that pull against each other.
 *
 * The point is not that they answer, it is WHAT they answer. Three things are
 * planted, and a report that finds none of them has found nothing:
 *
 *   1. Ejiro and Maureen both believe the Atlas schema is theirs, and neither
 *      ever says so to the other. It surfaces in week 4 as a clash and is only
 *      resolved in week 6.
 *   2. Nobody owns the customer cutover. Abubakar mentions it four times and
 *      nobody else mentions it at all - so the gap has to be found from an
 *      absence across five accounts, not from anybody reporting it.
 *   3. Hafeezah never names anything specific. Eight sessions of "going fine".
 *      Her read should say exactly that, and should not call her a problem.
 *
 * Kennedy, leading, believes ownership is settled throughout and only learns
 * otherwise in week 6.
 */
const ARC = {
  kennedy: [
    [
      'Atlas replaces the scheduling system in every clinic. Sixty days, six of us, and the deadline is not moving.',
      'Everybody knows their part. Ejiro has data, Maureen has product, Eric has infrastructure, Abubakar has the API.',
      'What worries me is speed rather than confusion. I think the scope is clear.',
    ],
    [
      'Design is done and two of them have started building. I have not had to arbitrate anything.',
      'I am in four other things this quarter so I am reviewing rather than reading closely.',
      'If something were being built twice I would expect somebody to tell me.',
    ],
    [
      'The API and the ingest both landed this week and they fit together, which is the main risk gone.',
      'I have not looked at the schema myself. That is Ejiro\'s and I have not needed to.',
      'Nobody has raised a blocker with me in three weeks.',
    ],
    [
      'Ejiro and Maureen disagreed in review about the appointment table and it got uncomfortable.',
      'I assumed one of them owned it. It turns out they both thought they did.',
      'That is my failure. I never wrote down who owns what, I only said it out loud once.',
    ],
    [
      'I spent this week writing down who owns each piece and it took two hours and should have taken two hours in week one.',
      'The schema is Ejiro\'s. Maureen owns what the product does with it, not the shape of it.',
      'Doing that raised a question I could not answer, which is who moves the existing customers over.',
    ],
    [
      'Nobody owns the cutover. I went back through everything and the only person who has ever mentioned it is Abubakar.',
      'Five of us have been building a system with no plan for getting anyone onto it.',
      'I have given it to Eric because it is closest to his work, and I have taken two things off him to make room.',
    ],
    [
      'The cutover plan exists now and it has a name against it, which it did not have a fortnight ago.',
      'Since the ownership list went up I have not arbitrated a single thing.',
      'The cost of not writing it down was about three weeks of two people building near each other.',
    ],
    [
      'Atlas is built and the migration runs next month, which is later than I wanted and it will hold.',
      'What I would do differently is one page of who owns what, in week one, before anybody writes anything.',
      'The two things that nearly cost us were the piece two people owned and the piece nobody did.',
    ],
  ],
  ejiro: [
    [
      'I am doing the data side of Atlas. I am not completely sure what this is or what a ground is, to be honest.',
      'My part is the ingest from the old system and the schema underneath everything.',
      'I have started on the appointment table because everything else depends on its shape.',
    ],
    [
      'The ingest reads the old scheduling export and I have it loading about eighty percent of the records.',
      'I am designing the appointment table this week. It is the centre of the whole thing.',
      'Nobody has told me the schema is not mine, so I am carrying on.',
    ],
    [
      'Ingest is complete and I moved onto indexes and the shape of the appointment records.',
      'Maureen asked me for a field I had not planned for and I added it.',
      'I did not ask why she was designing fields. I assumed she was asking on behalf of a clinic.',
    ],
    [
      'Maureen has been writing her own version of the appointment table. We found out in review.',
      'I have spent three weeks on something somebody else was also spending three weeks on.',
      'I am not angry with her. Nobody ever said out loud whose it was.',
    ],
    [
      'Kennedy wrote down that the schema is mine and Maureen owns what the product does with it.',
      'We threw away her version and kept mine, and two of her ideas in it were better than mine.',
      'Three weeks of my work and three of hers to end up with one table.',
    ],
    [
      'Back to real work. Reporting views on top of the appointment data this week.',
      'I asked whether the migration reads through my schema and nobody could tell me.',
      'That is the second time something has turned out to have no name against it.',
    ],
    [
      'The reporting views are done and Eric is pulling migration data through my schema, which works.',
      'Having it written down means I stopped checking whether I was allowed to decide things.',
      'I would want that list on day one next time.',
    ],
    [
      'My part is finished. Ingest, schema and reporting, all of it mine and all of it named.',
      'The three weeks I lost were not lost to difficulty, they were lost to nobody writing one line down.',
      'I also did not ask when I should have. I noticed something odd in week three and said nothing.',
    ],
  ],
  maureen: [
    [
      'I am on the product side of Atlas, which for me means what the clinic staff actually see and do.',
      'I have been mapping the booking flow and what the appointment record needs to hold for it to work.',
      'I am very glad we are doing this, because the last build was a mess of assumptions.',
    ],
    [
      'I designed the appointment structure this week, all the fields a booking needs end to end.',
      'I checked one field with Ejiro because her ingest has to fill it.',
      'The booking flow is drawn and I have walked two clinic managers through it.',
    ],
    [
      'I extended the appointment design to cover recurring bookings, which nobody had thought about.',
      'It is a lot of detail and I think it is the most important part of the system.',
      'Ejiro and I are talking regularly, though mostly about her ingest rather than about the design.',
    ],
    [
      'Ejiro has been designing the same table I have. I found out in review and it was horrible.',
      'I was completely sure it was mine because it is the product surface and product is my remit.',
      'She was completely sure it was hers because it is the database and data is her remit. We were both right.',
    ],
    [
      'The schema is Ejiro\'s now and I own what the product does with it, which is the correct split.',
      'Two of my ideas survived into her version, including recurring bookings, which she had not covered.',
      'I lost three weeks and I would rather find this out in week four than in week eight.',
    ],
    [
      'Back on the booking flow properly, with the clinic managers rather than with a table.',
      'The thing I keep thinking about is that we both said "mine" for a month without either of us saying it out loud.',
      'The written list works because it is written, not because it is right.',
    ],
    [
      'Flow is signed off by four clinic managers and the build matches it.',
      'I have stopped designing anything that touches storage, which was never my job.',
      'It made me faster, not smaller.',
    ],
    [
      'My part is done and it is genuinely better for the argument we had in week four.',
      'Next time I want the ownership list before anybody starts, not after two people collide.',
      'Recurring bookings would have been missed entirely if we had not overlapped, which is uncomfortable to admit.',
    ],
  ],
  eric: [
    [
      'Infrastructure. Before I go further, who reads what I write here and what happens to it.',
      'Right, then I will be direct. I am building the environments and the deployment pipeline for Atlas.',
      'The staging environment is up and the production one is not.',
    ],
    [
      'Production environment is up. Pipeline deploys to both.',
      'I do what I am asked and I do not tend to comment on other people\'s parts.',
      'Nothing is blocked from my side.',
    ],
    [
      'Monitoring and alerting are in. Backups run nightly and I have tested a restore.',
      'The API deploys cleanly, so Abubakar and I are fine.',
      'I have no view on the schema argument. It is not mine.',
    ],
    [
      'Everything I own is done and stable and I have been waiting rather than building.',
      'I heard about the appointment table thing. I stayed out of it.',
      'If somebody wants something from me they will ask.',
    ],
    [
      'Kennedy asked whether the environments could support a migration run and I said yes.',
      'That is the first anybody has asked me anything about moving customers over.',
      'It is a bigger job than the question suggested.',
    ],
    [
      'The cutover is mine now. Kennedy took two things off me to make room, which I did not expect.',
      'It is the largest single piece left and it was not on anybody\'s list until this week.',
      'I have started on the sequencing: which clinics move first, and what happens if one fails halfway.',
    ],
    [
      'Cutover plan is written. Dry run on three clinics next week using Ejiro\'s schema.',
      'I will say plainly that I would not have volunteered for this. I was asked and I said yes.',
      'It needed one person and it now has one.',
    ],
    [
      'Dry run worked on all three clinics. Rollback tested, which matters more than the run.',
      'For six weeks the biggest job on this project belonged to nobody and none of us noticed.',
      'I was one of the ones who did not notice, and I had the best view of it.',
    ],
  ],
  hafeezah: [
    [
      'I am on support readiness for Atlas. It is going fine so far.',
      'Mostly getting up to speed with what everyone else is doing.',
      'Nothing to flag.',
    ],
    [
      'Still going well. I have been reading through the documents.',
      'No problems this week.',
      'I will know more once things are further along.',
    ],
    [
      'Fine, yes. Keeping across it.',
      'A few meetings, nothing that changed anything.',
      'Nothing blocked.',
    ],
    [
      'Good week. Support side is progressing.',
      'I heard there was a disagreement about a table but it did not involve me.',
      'Nothing from me.',
    ],
    [
      'All fine. I am preparing for when it launches.',
      'Nothing specific to report yet.',
      'It will pick up nearer the end I think.',
    ],
    [
      'Going okay. Still preparing.',
      'No issues.',
      'Nothing to add.',
    ],
    [
      'Fine. Getting ready for the migration in terms of support.',
      'I have not written anything down yet.',
      'Nothing outstanding.',
    ],
    [
      'It has gone well overall from where I sit.',
      'I did not have much to do until quite late.',
      'Nothing I would change.',
    ],
  ],
  abubakar: [
    [
      'I have the API for Atlas. Endpoints for booking, cancelling and querying appointments.',
      'Booking and cancelling are done. Querying needs the schema settled first.',
      'One thing nobody has mentioned: how do the existing customers get onto this.',
    ],
    [
      'Query endpoints are done against Ejiro\'s draft schema.',
      'Authentication is in and the API deploys through Eric\'s pipeline.',
      'I raised the migration question in standup and it moved on.',
    ],
    [
      'The API is functionally complete. I am on error handling and rate limits.',
      'It fits with the ingest, which was the thing I was most worried about.',
      'Still nobody has said who moves the old data and the old customers.',
    ],
    [
      'Rate limits done. I have started writing the endpoints a migration would need, without being asked.',
      'I did that because I think somebody is going to need them and nobody owns it.',
      'The table argument did not touch me. My part reads whatever shape it ends up.',
    ],
    [
      'Kennedy asked me directly about the cutover this week, which is the first time anybody has.',
      'I have mentioned it in three sessions. I never pushed it because it is not my part.',
      'The endpoints I wrote speculatively turn out to be exactly what is needed.',
    ],
    [
      'Eric owns the cutover now and is using my migration endpoints.',
      'Being terse about it for five weeks was not the right call.',
      'I said it, but I said it quietly, and quietly is the same as not saying it.',
    ],
    [
      'API is done. I am supporting Eric on the dry run.',
      'Nothing of mine has changed in two weeks, which is what finished looks like.',
      'The migration endpoints saved about a fortnight.',
    ],
    [
      'Finished. The API does what it needs and the dry run passed through it.',
      'What I would do differently is say the uncomfortable thing loudly the first time rather than three times quietly.',
      'It was in my account from week one and it still took six weeks for anybody to act on it.',
    ],
  ],
};

function arcFor(email: string): string[][] {
  switch (email) {
    case KENNEDY: return ARC.kennedy;
    case EJIRO: return ARC.ejiro;
    case MAUREEN: return ARC.maureen;
    case ERIC: return ARC.eric;
    case HAFEEZAH: return ARC.hafeezah;
    case ABUBAKAR: return ARC.abubakar;
    default: throw new Error(`no script for ${email} - a person in this ground has nothing to say, which is a harness bug`);
  }
}
