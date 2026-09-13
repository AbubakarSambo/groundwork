import { call, mailMark, mailSince, tokenIn, anAddress } from '../hundred/harness';
import { EVERY_SURFACE, nothingInternalLeaked, type Stage } from './what-every-surface-should-hold';

/**
 * THE TWO GOAL SCENARIOS, END TO END, WITH EVERY SURFACE CHECKED AFTER EVERY ROUND.
 *
 * Three people, three rounds, both cards. The answers are deliberately the ones that broke things
 * before: a dodge, a hedged number, a blocker with no owner, a flat refusal. A run where everybody
 * answers well proves nothing - the product was already fine with those.
 *
 * Run it with the API up:  npx ts-node journey/two-scenarios/run.ts
 *
 * It writes a table of surface x round and exits non-zero if anything is red, so it can be the
 * thing that says "green" rather than a person deciding it looked right.
 */

const now = () => new Date().toISOString().slice(11, 19);
const log = (s: string) => process.stdout.write(`${now()}  ${s}\n`);

interface Person { who: string; email: string; role: string; token?: string | null; participantId?: string; checkInId?: string }

interface Result { surface: string; check: string; scenario: string; round: number; ok: boolean; why?: string }
const results: Result[] = [];

function record(scenario: string, round: number, surface: string, check: string, r: true | string) {
  results.push({ scenario, round, surface, check, ok: r === true, why: r === true ? undefined : r });
}

/**
 * A FRESH ORGANISATION EVERY RUN, THROUGH THE DOOR A LEAD ACTUALLY USES.
 *
 * Two reasons this is the entry chat rather than a login and a POST.
 *
 * The first is the free allowance. The run used to sign in as a seeded lead and on the second card
 * of the second run it hit "Your free plan includes 10 check-ins" - correctly, because the
 * allowance is real and the harness had been spending it since the first run. A test that
 * eventually fails on a limit the product is right to enforce is a test that expires.
 *
 * The second is worth more. Two of the eight report surfaces draw from a report OBJECT that only
 * the entry chat ever writes - ten of four hundred and ninety-five finished sittings have one. A
 * run that creates its check-in with POST /grounds can never exercise them, and a check it can
 * never exercise is a check that is either always red or quietly skipped. So the lead talks to the
 * chat, signs up out of it, and commits the conversation into the check-in, which is the sequence
 * the product is built around.
 */
async function aFreshLead(brief: string, scenario: string, label: string, people: { email: string; role: string }[]):
  Promise<{ email: string; token: string | null; groundId: string | null; why?: string; readAtTheEnd?: boolean }> {
  const opener = await call('POST', '/entry/opener', { scenario });
  if (opener.status >= 400) return { email: '', token: null, groundId: null, why: `POST /entry/opener ${opener.status}` };

  const history: { role: 'user' | 'assistant'; content: string }[] = [
    { role: 'assistant', content: String(opener.data?.reply ?? '') },
  ];
  for (const line of [brief, 'Three of us, and I want to see it by person rather than in total.', 'Weekly, for the next three weeks.']) {
    history.push({ role: 'user', content: line });
    const r = await call('POST', '/entry/chat', { messages: history, scenario });
    if (r.status >= 400) return { email: '', token: null, groundId: null, why: `POST /entry/chat ${r.status}` };
    history.push({ role: 'assistant', content: String(r.data?.reply ?? '') });
  }

  const email = anAddress('lead');
  const mark = mailMark();
  await call('POST', '/auth/entry-save', { email, draft: { payload: { situation: brief }, history } });
  await theEmailArrives();
  const link = mailSince(mark).filter((m) => m.to === email).map((m) => m.link).filter(Boolean).pop() ?? null;
  if (!link) return { email, token: null, groundId: null, why: 'no sign-up email arrived' };
  const verified = await call('POST', '/auth/verify-email', { token: tokenIn(link) });
  const token = verified.data?.accessToken ?? null;
  if (!token) return { email, token: null, groundId: null, why: `POST /auth/verify-email ${verified.status}` };

  /*
   * THE REPORT THE PERSON READS AT THE END OF THE CHAT, ASKED FOR AND THEN SENT ON.
   *
   * This is the object surfaces 02 and 03 draw, and the commit is the only thing that ever writes
   * it. A run that committed without it produced a check-in whose own close card said "nothing
   * stored" - which is exactly what the client would produce if it skipped this call, so it is
   * worth the round trip to prove the path end to end.
   */
  const read = await call('POST', '/entry/report', { messages: history, scenario, groundLabel: label });
  const reportSummary = read.status < 300 ? read.data?.report ?? null : null;

  const committed = await call('POST', '/entry/commit', {
    groundLabel: label, scenario, history,
    ...(reportSummary ? { reportSummary } : {}),
    roleAsDescribed: 'Chief of staff',
    /*
     * EMAIL ONLY. The commit's contributor takes an email and a context note, not a role - the role
     * is set afterwards, from the panel, which is why `PATCH /participants/:id` exists. Sending it
     * here is a 400 on `contributors.0.property`, and the harness earned that one honestly.
     */
    contributors: people.map((x) => ({ email: x.email })),
  }, token);
  if (committed.status >= 400) {
    return { email, token, groundId: null, why: `POST /entry/commit ${committed.status}: ${JSON.stringify(committed.raw).slice(0, 140)}` };
  }
  return { email, token, groundId: String(committed.data?.groundId ?? '') || null, readAtTheEnd: !!reportSummary };
}

/**
 * Mail is delivered by the API after the response has gone back, so reading the mailbox on the next
 * line finds it empty. Every invitation in the first run of this harness was "no invitation link
 * arrived" for exactly that reason, and the invitations were fine.
 */
const theEmailArrives = () => new Promise((r) => setTimeout(r, 900));

/** One person's round: open, answer until it will close, close. */
async function aRound(p: Person, checkInId: string, answers: string[]): Promise<void> {
  await call('POST', `/check-ins/${checkInId}/open`, undefined, p.token);
  for (const a of answers) {
    const r = await call('POST', `/check-ins/${checkInId}/messages`, { message: a }, p.token);
    const reply = String(r.data?.reply ?? '');
    /* Every reply is a surface too - the one the person actually reads. */
    record('both', 0, 'the reply', `to "${a.slice(0, 28)}..."`, reply.trim() ? nothingInternalLeaked(reply) : 'empty reply');
  }
  /*
   * The close gate refuses a thin record and asks for more, which is correct and is why this loops
   * rather than forcing the close.
   *
   * EVERY NUDGE HAS TO BE A DIFFERENT SENTENCE. The first version sent the same filler line ten
   * times and the round never closed. The product was right and the harness was wrong: repeating
   * yourself is caught by `theSameAnswerAgain`, which replies without writing a turn, so the turn
   * count the gate reads never moved. Ten identical lines are one answer.
   *
   * The last nudge asks to finish in words `askedToFinish` honours, because a person who really has
   * nothing more must be able to leave - and if THAT does not let them out, it is a finding about
   * the gate rather than about the answers.
   */
  const NUDGES = [
    'That is the whole picture from my side this round.',
    'No other blockers that I can name right now.',
    'Nobody else is waiting on me as far as I know.',
    'I have not put a date on it beyond what I said.',
    'That is everything I have for you.',
  ];
  for (let i = 0; i < NUDGES.length + 1; i += 1) {
    const done = await call('POST', `/check-ins/${checkInId}/complete`, undefined, p.token);
    if (done.status < 300) { record('both', 0, 'the close', `${p.who} can close a round`, true); return; }
    if (i === NUDGES.length) break;
    await call('POST', `/check-ins/${checkInId}/messages`, { message: NUDGES[i] }, p.token);
  }
  record('both', 0, 'the close', `${p.who} can close a round`, 'still refused to close after five more turns');
}

async function checkEverySurface(scenario: string, round: number, rounds: number, groundId: string, lead: Person, someone: Person) {
  /*
   * RELEASE FIRST. The round index is empty until somebody releases, by design - "nothing has been
   * revealed yet, so there is nothing anybody may read". Checking the index against an unreleased
   * report is checking that the product withheld it, which it did. A lead reading their board after
   * a round has released it; the harness does the same thing, through the same route.
   */
  /*
   * NOBODY PRESSES ANYTHING. This used to POST /report/release, and that was the harness inventing
   * a step the product does not ask a person to take.
   *
   * There is no "release" in the sense of somebody deciding. The listener releases on the
   * `checkin.completed` of whoever finishes LAST - that is the mutual moment, and it is the same
   * moment the ground goes active and the mail goes out. The admin route exists as a back-up and
   * calling it here only ever returned the report that had already released a moment earlier, so
   * the run was proving the back-up worked and saying nothing about the path everybody is on.
   *
   * What is left is the wait, which is the honest part: the round has to arrive on its own.
   */
  const waited = await theRoundArrives(groundId, round, lead);
  record(scenario, round, '09 report tab', 'the round arrives after release', waited);
  /*
   * ALL EIGHT, NOT THE FOUR THAT WERE EASY. Nine surfaces are numbered on the preview page and two
   * of them - the WhatsApp message and the report-ready mail - carry no report by decision, so they
   * are not here for the same reason they name no cell. The rest are, read as the person each one
   * belongs to: the shared half and the board are the lead's, the three about somebody's own half
   * are read with that person's own token.
   */
  const [shared, theirs, board, index, sitting, leadsOwn, run] = await Promise.all([
    call('GET', `/grounds/${groundId}/report/session/${round}`, undefined, lead.token),
    call('GET', `/grounds/${groundId}/report`, undefined, someone.token),
    call('GET', `/grounds/${groundId}/board`, undefined, lead.token),
    call('GET', `/grounds/${groundId}/report/rounds`, undefined, lead.token),
    /*
     * READ AS THE LEAD, because the lead is the one who came through the entry chat and the entry
     * chat is the only door that writes this. Reading it as somebody who was invited asks the
     * product for a thing it never claimed to make for them, and calls the correct answer a defect.
     */
    lead.checkInId
      ? call('GET', `/check-ins/${lead.checkInId}/session-report`, undefined, lead.token)
      : Promise.resolve({ status: 0, data: null } as any),
    /* The lead's own ground report, for the solo record the sitting falls back to. */
    call('GET', `/grounds/${groundId}/report`, undefined, lead.token),
    call('GET', `/grounds/${groundId}/my-record`, undefined, someone.token),
  ]);
  const data: Record<string, any> = {
    sharedHalf: shared.data, theirClose: theirs.data, board: board.data, index: index.data,
    theSitting: { sitting: sitting.data, solo: leadsOwn.data?.soloArtifact ?? null },
    acrossTheRun: run.data,
  };
  const answered = (shared.data?.counting ?? []).filter((c: any) => c.answered).length;
  const of = (shared.data?.counting ?? []).length || 1;
  const stage: Stage = round === 1 ? 'first' : round >= rounds ? 'last' : 'middle';
  /* What the product says about itself: eight of the twenty-two situations have no board, on purpose. */
  const renders = board.data?.renders !== false;

  for (const s of EVERY_SURFACE) {
    for (const c of s.checks) {
      if (c.when && !c.when(stage, answered, of, renders)) continue;
      record(scenario, round, s.name, c.what, c.holds(data[s.key]));
    }
  }
}

/** Poll for the round the release was supposed to produce. Bounded, so a stuck one is still red. */
const A_REASONABLE_WAIT_MS = 90_000;
async function theRoundArrives(groundId: string, round: number, lead: Person): Promise<true | string> {
  const until = Date.now() + A_REASONABLE_WAIT_MS;
  let last = 0;
  while (Date.now() < until) {
    const r = await call('GET', `/grounds/${groundId}/report/rounds`, undefined, lead.token);
    last = (r.data?.rounds ?? []).length;
    if (last >= round) return true;
    await new Promise((res) => setTimeout(res, 3_000));
  }
  return `round ${round} was released but no report for it arrived within ${A_REASONABLE_WAIT_MS / 1000}s (the index holds ${last})`;
}

function table(): boolean {
  const red = results.filter((r) => !r.ok);
  const bySurface = new Map<string, { ok: number; bad: number }>();
  for (const r of results) {
    const e = bySurface.get(r.surface) ?? { ok: 0, bad: 0 };
    r.ok ? (e.ok += 1) : (e.bad += 1);
    bySurface.set(r.surface, e);
  }
  log('');
  log('SURFACE                     PASS  FAIL');
  for (const [name, e] of bySurface) log(`${name.padEnd(26)}  ${String(e.ok).padStart(4)}  ${String(e.bad).padStart(4)}`);
  if (red.length) {
    log('');
    log('RED:');
    for (const r of red) log(`  ${r.scenario} round ${r.round} · ${r.surface} · ${r.check} — ${r.why}`);
  }
  log('');
  log(red.length ? `${red.length} failing of ${results.length}` : `all ${results.length} green`);
  return red.length === 0;
}

export { aRound, checkEverySurface, aFreshLead, theEmailArrives, table, record, log, type Person };
