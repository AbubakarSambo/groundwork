import { NOT_A_QUIET_CLOSE } from '../grounds/an-answer-includes-a-refusal';
import { CheckInStatus, GroundStatus } from '@prisma/client';
import { owesThisSession } from '../grounds/the-lead-checks-in-when-they-choose';
import { theConfirmedWaits, whatTheyTriedInFull, theNoteBesideTheClaim } from '../grounds/a-wait-is-the-speakers-account';
import { theReleaseOneSalesBoardIsOnFor } from '../board/release-one-sales-board';
import { nameToCall, aNameToList } from '../engagement/a-name-to-call-them';
import { withoutRepeats, saysTheSame } from '../engagement/a-sentence-said-twice';
import { isNotLetInYet } from '../grounds/who-an-admin-did-not-let-in';
import { whoHasNotJoinedYet, WHAT_SAYS_SOMEBODY_JOINED } from '../grounds/invited-not-joined-yet';
import { A_GROUND_NO_MESSAGE_IS_ABOUT } from '../grounds/a-ground-that-has-ended';
import { everyRowAPageAtATime } from '../whatsapp/every-row-a-page-at-a-time';
import { whoWasReallyRemindedToCheckIn } from './a-reminder-really-sent';

import { WHERE_A_GROUND_IS_THE_ANCHORS, WHERE_A_GROUND_IS_NOT_THE_ANCHORS } from '../conversation/the-anchor-weekly-check-in';
import { theNextCheckInFor, theSuggestionSaid } from '../engagement/the-next-check-in-from-what-happened';
import { everyLineTheFinalCheckPasses } from '../conversation/the-final-check';
import { whatTheRecordHolds } from '../conversation/what-the-record-holds';
import { dedupeDependencies, theSameThingInOtherWords } from '../board/reads';
import { theirClosedSessions } from '../grounds/missed-check-ins';

/**
 * THE LEAD'S WEEKLY LETTER (docs/anchor-scenario-plan.md, piece 29; the prototype's "one weekly letter",
 * C1/every-email-and-message; docs/anchor-scenario.md, section 23: "Email can carry the fuller weekly
 * summary").
 *
 * Friday afternoon, short, and only what is the lead's. For each check-in the lead started from the
 * anchor link, it says what the record of the past seven days shows: how many people checked in, how
 * many said what they will do next, how many of the things people said they would do were done, how
 * many handoffs are still waiting, and who did not check in. It is built only from counts and from the
 * first names of people who did not check in, as the lead's morning WhatsApp already names them. It
 * never holds anything anybody said, nothing from Ask Groundwork, and no one person's load across
 * check-ins: each check-in is counted on its own and never added to another.
 *
 * The weekly WhatsApp insight is not this: it waits on Needs Hafsah, item 2.
 */

const NUMBERS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const aNumber = (n: number) => (n <= 10 ? NUMBERS[n] : String(n));
/**
 * ONE FORM FOR THE COUNTS OF ONE SENTENCE (Drop Access run 1, item 20). The subject read "Ten things people said they would do were done; 14
 * handoffs are still waiting": words and digits in one sentence. Every count in it is said in words when all are ten or fewer, else in digits.
 */
export function theCountsOf(...counts: number[]): (n: number) => string {
  return counts.some((n) => n > 10) ? (n: number) => String(n) : aNumber;
}
/** The same, where Release 1's switch is on for the check-in's organisation; off, each count is said as before (release-one-sales-board). */
const countsFor = (releaseOne: boolean | undefined, ...counts: number[]): ((n: number) => string) => (releaseOne ? theCountsOf(...counts) : aNumber);
const capital = (s: string) => `${s.charAt(0).toUpperCase()}${s.slice(1)}`;
const listed = (names: string[]) => (names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`);

export const THE_SUBJECT = "Your team's week";
export const THE_LINK_SAYS = "See this week's picture";

/** One check-in's week, counted. */
export interface AWeekInOneCheckIn {
  groundId: string;
  label: string;
  /** People who can answer: not managing only, and let in. */
  ofHowMany: number;
  checkedIn: number;
  /** First names of those who did not check in; the lead herself is 'you'. */
  notYet: string[];
  /** People who said what they will do next this week. */
  saidWhatNext: number;
  /** Things people said they would do that were settled as done this week. */
  done: number;
  /** Handoffs still waiting on someone. */
  waiting: number;
  /** Who settled things this week, and how many each. The lead herself is 'you'. Names only for people who can answer. */
  closedBy?: { name: string; count: number }[];
  /** Who can answer, and who checked in, by a stable id for the person (their account, else their place here), so a person in two check-ins is one person. */
  answerableIds?: string[];
  checkedInIds?: string[];
  /** Whom open handoffs wait on inside this check-in, and how many each. The lead herself is 'you'. */
  waitingOn?: { name: string; count: number }[];
  /**
   * WAITS ON A COLLEAGUE THAT COLLEAGUE HAS NOT CONFIRMED (decision 137; change 4), each as the speaker's account with the note beside it:
   * "Kevin Odhiambo says the work is waiting on Fatuma Bello for the final prices. Not backed: no attempt to unblock mentioned." They are never
   * counted in `waitingOn`, so the subject never names the colleague as the one the handoffs wait on.
   */
  claims?: string[];
  /**
   * THE REST OF THE SPEC'S WEEKLY LETTER (engagement spec section 24), for a check-in of any kind. Each is absent when it has nothing to say, and a letter built
   * without them is the letter it always was.
   *
   * What moved this week, in the sentences of the lead's own weekly report (served to her by the wrapper that swaps names in), at most three.
   */
  moved?: string[];
  /** What to do this week, from the same report's "for you to do next week" (what only the lead can settle), at most three. */
  toDo?: { do: string; why: string }[];
  /**
   * People who did not check in and were really sent a reminder to check in this week by Groundwork: the record of messages holds one to their
   * address in the week (a-reminder-really-sent.ts), and this check-in's own row was stamped. The stamp alone is not enough, because the "your
   * report is ready" mail stamps it too (final evaluation, profile 1).
   */
  reminded?: string[];
  /** One real next check-in, said in a sentence, only where it is a different one and the record gives a reason. */
  next?: string | null;
  /**
   * THE CHECK-INS MADE, NOT ONLY THE PEOPLE (Drop Access run 1, item 17). "This week, all four people checked in." went to Grace in a week
   * Joseph missed two of his five. Of the sessions that closed in the week for the people who owe one (never the lead's own, which are hers
   * to choose), how many were answered, and who missed which. Absent where the caller did not count them.
   */
  checkInsDue?: number;
  checkInsMade?: number;
  missedBy?: { name: string; missed: number; of: number }[];
  /** Release 1's sales board is on for the check-in's organisation: counts in one form, one decision said once, what was tried in full. Never said. */
  releaseOne?: boolean;
}

const aName = (n: string) => n;

/** "Four things people said they would do were done, all by Abigail." Named only when ONE person closed ALL of them. */
function theDoneSentence(w: AWeekInOneCheckIn, said: (n: number) => string = aNumber): string | null {
  if (w.done <= 0) return null;
  const base = `${capital(said(w.done))} ${w.done === 1 ? 'thing people said they would do was' : 'things people said they would do were'} done`;
  const one = w.closedBy?.length === 1 && w.closedBy[0].count === w.done ? aName(w.closedBy[0].name) : null;
  return one ? `${base}, ${w.done === 1 ? 'by' : w.done === 2 ? 'both by' : 'all by'} ${one}` : base;
}

/** "Two handoffs are still waiting, both on James." Named only when ALL of them wait on one person. */
function theWaitingSentence(w: AWeekInOneCheckIn, said: (n: number) => string = aNumber): string | null {
  if (w.waiting <= 0) return null;
  const base = `${capital(said(w.waiting))} ${w.waiting === 1 ? 'handoff is' : 'handoffs are'} still waiting`;
  const one = w.waitingOn?.length === 1 && w.waitingOn[0].count === w.waiting ? w.waitingOn[0].name : null;
  return one ? `${base}, ${w.waiting === 1 ? 'on' : w.waiting === 2 ? 'both on' : 'all on'} ${one}` : base;
}

const lowerFirst = (s: string) => `${s.charAt(0).toLowerCase()}${s.slice(1)}`;

/**
 * THE SUBJECT SAYS WHAT HAPPENED (decision 109 item 3; spec section 13). Names, to the lead only, as facts and never as comparisons:
 * "Four things people said they would do were done, all by Abigail; two handoffs are still waiting, both on James". A person is named only when the
 * fact is wholly about them (they closed all of them; all of them wait on them), so a name never reads as the best or worst of several. Nobody is
 * called ahead or behind. The body says the same two facts in the same words.
 */
/** The two facts of a week as one phrase, or null where neither holds. Used by the weekly letter and by the report-ready notice to the lead. */
export function theFactsOfTheWeek(w: AWeekInOneCheckIn): string | null {
  /* One sentence: its two counts in one form (item 20). */
  const said = countsFor(w.releaseOne, w.done, w.waiting);
  const facts = [theDoneSentence(w, said), theWaitingSentence(w, said)].filter((x): x is string => !!x);
  return facts.length ? facts.map((f, i) => (i ? lowerFirst(f) : f)).join('; ') : null;
}

export function theSubjectFor(weeks: AWeekInOneCheckIn[]): string {
  const counted = weeks.filter((w) => w.ofHowMany > 0);
  if (counted.length !== 1) {
    /* A person who is in two of her check-ins is one person, counted once. */
    const answerable = new Set(counted.flatMap((w) => w.answerableIds ?? []));
    const checkedIn = new Set(counted.flatMap((w) => w.checkedInIds ?? []));
    const of = answerable.size || counted.reduce((n, w) => n + w.ofHowMany, 0);
    const done = checkedIn.size || counted.reduce((n, w) => n + w.checkedIn, 0);
    const n = countsFor(counted.some((w) => w.releaseOne), done, of, counted.length);
    return done > 0 ? `This week, ${n(done)} of ${n(of)} people checked in across your ${n(counted.length)} check-ins` : THE_SUBJECT;
  }
  const w = counted[0];
  const said = countsFor(w.releaseOne, w.done, w.waiting);
  const facts = [theDoneSentence(w, said), theWaitingSentence(w, said)].filter((x): x is string => !!x);
  if (facts.length) return facts.map((f, i) => (i ? lowerFirst(f) : f)).join('; ');
  const n = countsFor(w.releaseOne, w.checkedIn, w.ofHowMany);
  return w.checkedIn > 0 ? `This week, ${n(w.checkedIn)} of ${n(w.ofHowMany)} people checked in` : THE_SUBJECT;
}

/** The sentences for one check-in, in order. Nothing is said that the count does not hold. */
export function theWeekInSentences(w: AWeekInOneCheckIn): string[] {
  const out: string[] = [];
  const someMissed = (w.checkInsDue ?? 0) > 0 && (w.checkInsMade ?? 0) < (w.checkInsDue ?? 0) && w.checkedIn > 0;
  if (w.checkedIn <= 0) out.push('Nobody has checked in this week.');
  else if (someMissed) {
    /* Counted by the check-ins made, and who missed which, said as facts (item 17). */
    const said = theCountsOf(w.checkInsMade ?? 0, w.checkInsDue ?? 0);
    out.push(`This week, ${said(w.checkInsMade ?? 0)} of the ${said(w.checkInsDue ?? 0)} check-ins were made.`);
    for (const m of (w.missedBy ?? []).filter((x) => aNameToList(x.name) && x.missed > 0).slice(0, 3)) {
      const each = theCountsOf(m.missed, m.of);
      out.push(`${capital(m.name)} missed ${each(m.missed)} of ${each(m.of)}.`);
    }
  }
  else if (w.checkedIn >= w.ofHowMany) out.push(w.ofHowMany === 1 ? 'This week, the one person who can answer checked in.' : `This week, all ${aNumber(w.ofHowMany)} people checked in.`);
  else out.push(`This week, ${countsFor(w.releaseOne, w.checkedIn, w.ofHowMany)(w.checkedIn)} of ${countsFor(w.releaseOne, w.checkedIn, w.ofHowMany)(w.ofHowMany)} people checked in.`);
  if (w.saidWhatNext > 0) out.push(`${capital(aNumber(w.saidWhatNext))} ${w.saidWhatNext === 1 ? 'person' : 'people'} said what they will do next.`);
  const done = theDoneSentence(w);
  if (done) out.push(`${done}.`);
  const waiting = theWaitingSentence(w);
  if (waiting) out.push(`${waiting}.`);
  if (w.checkedIn > 0 && w.notYet.length) {
    /* Somebody with no name is counted with the others, never listed as "Someone". */
    const named = w.notYet.filter(aNameToList).slice(0, w.notYet.length > 3 ? 2 : 3);
    const others = w.notYet.length - named.length;
    const who = !named.length
      ? (others === 1 ? 'someone' : `${aNumber(others)} people`)
      : listed(others > 0 ? [...named, others === 1 ? 'one other person' : `${aNumber(others)} others`] : named);
    out.push(`${capital(who)} did not check in.`);
  }
  return out;
}

export interface TheLetter {
  subject: string;
  /** One paragraph each, as plain sentences. A check-in's own name is a paragraph of its own only when there is more than one. */
  lines: string[];
  linkLabel: string;
  linkPath: 'board' | 'grounds';
  /** The one check-in the link opens, when there is one. */
  groundId: string | null;
}

/** Something happened this week that a lead would want to read: somebody checked in, or something was settled. */
/* A lead alone in her own check-in has no team to write to about. */
export const somethingUsefulHappened = (w: AWeekInOneCheckIn): boolean => w.ofHowMany >= 2 && (w.checkedIn > 0 || w.done > 0 || (w.moved?.length ?? 0) > 0);

/** The sentences after the week's counts, for one check-in: what moved, what Groundwork is already doing, what to do, and what to start next. */
export function theRestOfTheWeekIn(w: AWeekInOneCheckIn, roomForToDo: number): string[] {
  const out: string[] = [];
  const moved = withoutRepeats(w.moved ?? []).slice(0, 3);
  if (moved.length) out.push(`Here is what moved this week. ${moved.join(' ')}`);
  const reminded = (w.reminded ?? []).filter(aNameToList).filter((n) => w.notYet.includes(n));
  if (reminded.length) out.push(`I have already sent reminders to ${listed(reminded)} this week.`);
  /* A thing to do that only says again what moved is not said a second time (a-sentence-said-twice.ts). */
  const todo = (w.toDo ?? []).filter((t) => !moved.some((m) => saysTheSame(m, `${t.do} ${t.why ?? ''}`))).slice(0, Math.max(0, roomForToDo));
  if (todo.length) {
    out.push('Here is what I would do this week.');
    /* Each thing to do is a sentence of its own, before its reason (messages test, 19 October, finding 5: "... or a signed order Kevin Omondi counted ..."). */
    const asASentence = (x: string) => (/[.!?]["\u201d]?$/.test(x.trim()) ? x.trim() : `${x.trim()}.`);
    for (const t of todo) out.push(`${asASentence(t.do)}${t.why?.trim() ? ` ${asASentence(t.why)}` : ''}`);
  }
  if (w.next) out.push(`Here is something worth doing next. ${w.next}`);
  return out;
}

/**
 * The whole letter. Null when no check-in has anybody who can answer, so there is nothing to say.
 * `onlyWhenSomethingHappened`: a quiet week is not written about (spec section 26, "if nothing useful happened, send nothing"). It is on for every check-in
 * that is not the anchor's; the anchor's letter keeps saying "Nobody has checked in this week."
 */
export function theLeadsLetter(weeks: AWeekInOneCheckIn[], opts: { onlyWhenSomethingHappened?: boolean } = {}): TheLetter | null {
  const counted = weeks.filter((w) => w.ofHowMany > 0).filter((w) => !opts.onlyWhenSomethingHappened || somethingUsefulHappened(w));
  if (!counted.length) return null;
  const moving = counted.some((w) => w.saidWhatNext > 0 || w.done > 0);
  const lines = [moving ? 'Your team is starting to move.' : "Here is your team's week."];
  /* Three recommendations at most, over the whole letter (spec section 24). */
  let room = 3;
  /* One next check-in in the whole letter, the first one: the same suggestion under each of two check-ins is the same advice twice (found on the test bed). */
  let nextAlreadyShown = false;
  for (let w of counted) {
    if (counted.length > 1) lines.push(`"${w.label}"`);
    lines.push(theWeekInSentences(w).join(' '));
    /* ONE DECISION ONCE (Drop Access run 1, item 19): a claim the letter's own to-do already says ("Sort out a decision on the KES 4,500
       price for Juja Hardware") is not said again above it, and to-dos that are the same thing in other words are said once. */
    /* Where Release 1's switch is on for the check-in's organisation; off, as before. */
    const toDo = w.releaseOne ? (w.toDo ?? []).filter((t, i, all) => !all.slice(0, i).some((u) => theSameThingInOtherWords(u.do, t.do))) : (w.toDo ?? []);
    if (w.releaseOne) w = { ...w, toDo };
    lines.push(...(w.claims ?? []).filter((c) => !w.releaseOne || !toDo.some((t) => theSameThingInOtherWords(c.replace(/^.*? the work is waiting on \S+ for /, '').replace(/\..*$/, ''), t.do))));
    const rest = theRestOfTheWeekIn(nextAlreadyShown ? { ...w, next: null } : w, room);
    if (w.next) nextAlreadyShown = true;
    room -= Math.min(room, (w.toDo ?? []).length);
    lines.push(...rest);
  }
  return { subject: theSubjectFor(counted), lines, linkLabel: THE_LINK_SAYS, linkPath: counted.length === 1 ? 'board' : 'grounds', groundId: counted.length === 1 ? counted[0].groundId : null };
}

/**
 * THE LETTER'S GENERATED PARTS GO THROUGH THE FINAL CHECK (Hafsah, 12 October). What moved and what to do are the report's sentences, which
 * the model wrote: "Collins Odhiambo committed to do ten kits, and it is now done." went out with nothing shown (quality run 1). A sentence
 * holding a number, status, date, name or credit the record does not hold is taken out; a thing to do left with nothing goes. The counts
 * above them are the code's own and are not read. A lookup that fails sends the words as they were.
 */
export async function theReportsWordsHeldToTheRecord<R extends { moved: string[]; toDo: { do: string; why: string }[] }>(prisma: any, groundId: string, report: R | null): Promise<R | null> {
  if (!report) return report;
  try {
    const value = { moved: report.moved, toDo: report.toDo };
    const held = await whatTheRecordHolds(prisma, { groundId, value });
    const checked = everyLineTheFinalCheckPasses(value, held, { where: `the weekly letter for ground ${groundId}` });
    return { ...report, moved: checked.value.moved, toDo: (checked.value.toDo ?? []).filter((t: any) => String(t?.do ?? '').trim()) };
  } catch {
    return report;
  }
}

const TERMINAL: GroundStatus[] = A_GROUND_NO_MESSAGE_IS_ABOUT;
const WEEK = 7 * 86_400_000;

/**
 * Counts one check-in's last seven days. Reads nothing anybody said: only who finished, counts of
 * commitments and handoffs, and first names.
 */
export async function theWeekOf(prisma: any, g: { id: string; label: string; initiatorId: string }, now: Date): Promise<AWeekInOneCheckIn> {
  const since = new Date(now.getTime() - WEEK);
  const [people, finished, saidNext, done, waiting, doneRows, waitingRows] = await Promise.all([
    prisma.groundParticipant.findMany({ where: { groundId: g.id }, select: { id: true, userId: true, email: true, managingOnly: true, nameGiven: true, lastNudgedAt: true, ...WHAT_SAYS_SOMEBODY_JOINED, user: { select: { firstName: true, lastName: true, awaitingOrgApproval: true } } } }),
    /* A session the clock closed with nothing said is not a check-in made (night quality run 1: "all four people checked in" with Jared missing). */
    prisma.checkIn.findMany({ where: { groundId: g.id, status: CheckInStatus.COMPLETED, completedAt: { gte: since, lte: now }, AND: [NOT_A_QUIET_CLOSE] }, select: { participantId: true } }),
    prisma.groundCommitment.findMany({ where: { groundId: g.id, participantId: { not: null }, createdAt: { gte: since, lte: now } }, select: { participantId: true } }),
    prisma.groundCommitment.count({ where: { groundId: g.id, status: 'DONE', settledAt: { gte: since, lte: now } } }),
    prisma.groundDependency.count({ where: { groundId: g.id, status: { not: 'CLEARED' } } }),
    /* Who settled what, and whom handoffs wait on: ids only, for the subject. Never what anybody said. */
    (async () => prisma.groundCommitment.findMany({ where: { groundId: g.id, status: 'DONE', participantId: { not: null }, settledAt: { gte: since, lte: now } }, select: { participantId: true, status: true } }))().catch(() => []),
    (async () => prisma.groundDependency.findMany({ where: { groundId: g.id, status: { not: 'CLEARED' }, onParticipantId: { not: null } }, select: { id: true, groundId: true, fromParticipantId: true, onParticipantId: true, status: true, what: true, triedSaid: true, createdAt: true } }))().catch(() => []),
  ]);
  /* Each session that closed in the week, for everybody who owes one (item 17). Read like the missed check-ins are (missed-check-ins.ts). */
  const sessions: any[] = await Promise.resolve(prisma.checkIn?.findMany?.({
    where: { groundId: g.id, isSetup: false },
    select: { participantId: true, sessionNumber: true, status: true, isSetup: true, optional: true, closedReason: true, availableFrom: true, createdAt: true, completedAt: true, missedReason: true, turns: { where: { role: 'PERSON' }, take: 1, select: { id: true } } },
  }) ?? []).catch(() => []);
  /* Decision 133: the lead is counted only in a week they checked in, and never listed as not yet. */
  const checkedInThisWeek = new Set((finished as any[]).map((r) => r.participantId));
  /* Invited, not joined yet: not counted and never "not yet" (decision 8 redone, night run 3). */
  const notJoined = await whoHasNotJoinedYet(prisma, people as any[]).catch(() => new Set<string>());
  const counted = (people as any[]).filter((p) => !notJoined.has(p.id) || checkedInThisWeek.has(p.id)).filter((p) => !p.managingOnly && (owesThisSession(p) || checkedInThisWeek.has(p.id)) && !isNotLetInYet(p));
  const countedIds = new Set(counted.map((p) => p.id));
  const finishedIds = new Set((finished as any[]).map((r) => r.participantId).filter((id: string) => countedIds.has(id)));
  const notYet = counted
    .filter((p) => !finishedIds.has(p.id))
    .map((p) => (p.userId && p.userId === g.initiatorId ? 'you' : nameToCall(p)))
    .filter((n: string) => !!n)
    .sort((a: string, b: string) => (a === 'you' ? -1 : b === 'you' ? 1 : 0));
  const nameOf = (id: string) => {
    const p = counted.find((c) => c.id === id);
    if (!p) return null;
    return p.userId && p.userId === g.initiatorId ? 'you' : nameToCall(p);
  };
  const tally = (ids: string[]) => {
    const by = new Map<string, number>();
    for (const id of ids) { const n = nameOf(id); if (n) by.set(n, (by.get(n) ?? 0) + 1); }
    return [...by].map(([name, count]) => ({ name, count }));
  };
  /* Only rows that really are what was asked for: the filter is in the query, and checked again here. */
  const closedBy = tally((doneRows as any[]).filter((r) => r.status === 'DONE').map((r) => r.participantId));
  const openOnSomebody = (waitingRows as any[]).filter((r) => r.status !== 'CLEARED');
  const confirmedWaits = await theConfirmedWaits(prisma, openOnSomebody.map((r, i) => ({ ...r, id: r.id ?? `w-${i}`, groundId: r.groundId ?? g.id })));
  const isConfirmed = (r: any, i: number) => confirmedWaits.has(r.id ?? `w-${i}`);
  const waitingOn = tally(openOnSomebody.filter(isConfirmed).map((r) => r.onParticipantId));
  const releaseOne = await theReleaseOneSalesBoardIsOnFor(prisma, g.id).catch(() => false);
  /* The same wait said again in other words is one claim, with the fullest words of what was tried (items 18 and 19), where Release 1's
     switch is on; off, each claim as before. */
  const unconfirmed = openOnSomebody.filter((r, i) => !isConfirmed(r, i) && String(r.what ?? '').trim());
  const claims = (releaseOne ? dedupeDependencies(unconfirmed) : unconfirmed)
    .map((r) => {
      const from = r.fromParticipantId ? nameOf(r.fromParticipantId) : null;
      const on = nameOf(r.onParticipantId);
      if (!from || !on) return null;
      /* What they said they tried, in full and with the day, or nothing: never "Not backed:" in a message (item 18), where Release 1's
         switch is on; off, the note beside the claim as before. */
      const tried = releaseOne ? whatTheyTriedInFull(r, from === 'you' ? 'You' : from) : theNoteBesideTheClaim(r, { by: from, on, lead: 'you' });
      return `${from === 'you' ? 'You say' : `${from} says`} the work is waiting on ${on} for ${String(r.what).trim().replace(/[.\s]+$/, '')}.${tried ? ` ${tried}` : ''}`;
    })
    .filter((x): x is string => !!x);
  /*
   * Reminders to check in that Groundwork really sent this week, to people who still have not checked in: this check-in's row was stamped in the
   * week AND the record of messages holds a reminder to check in sent to their address in the week. Never from the stamp alone: the "your report
   * is ready" mail stamps it too, and "I have already sent reminders to Brian this week" went to a lead when none was sent (final evaluation,
   * profile 1, problem 2). See a-reminder-really-sent.
   */
  const stamped = counted
    .filter((p) => !finishedIds.has(p.id) && p.userId !== g.initiatorId && p.lastNudgedAt && new Date(p.lastNudgedAt) >= since && new Date(p.lastNudgedAt) <= now);
  const reallySent = stamped.length ? await whoWasReallyRemindedToCheckIn(prisma, stamped.map((p) => p.email ?? ''), since, now) : new Set<string>();
  const reminded = stamped
    .filter((p) => reallySent.has(String(p.email ?? '').trim().toLowerCase()))
    .map((p) => nameToCall(p))
    .filter((n: string) => !!n);
  const saidNextBy = new Set((saidNext as any[]).map((r) => r.participantId).filter((id: string) => countedIds.has(id)));
  let checkInsDue = 0;
  let checkInsMade = 0;
  const missedBy: { name: string; missed: number; of: number }[] = [];
  for (const p of counted) {
    if (p.userId && p.userId === g.initiatorId) continue;
    const theirs = (Array.isArray(sessions) ? sessions : []).filter((c) => c.participantId === p.id);
    const inTheWeek = new Set(theirs.filter((c) => { const at = new Date(c.availableFrom ?? c.createdAt); return at >= since && at <= now; }).map((c) => c.sessionNumber));
    const closed = theirClosedSessions(theirs, [], now).filter((c) => inTheWeek.has(c.sessionNumber));
    const missed = closed.filter((c) => c.missed).length;
    checkInsDue += closed.length;
    checkInsMade += closed.length - missed;
    if (missed) missedBy.push({ name: nameToCall(p), missed, of: closed.length });
  }
  return { groundId: g.id, label: g.label, ofHowMany: counted.length, checkedIn: finishedIds.size, answerableIds: counted.map((p) => p.userId ?? p.id), checkedInIds: counted.filter((p) => finishedIds.has(p.id)).map((p) => p.userId ?? p.id), notYet, saidWhatNext: saidNextBy.size, done: done as number, waiting: waiting as number, closedBy, waitingOn, checkInsDue, checkInsMade, ...(missedBy.length ? { missedBy } : {}), ...(releaseOne ? { releaseOne: true } : {}), ...(claims.length ? { claims } : {}), ...(reminded.length ? { reminded } : {}) };
}

/**
 * Every lead with a check-in started from the anchor link that is still going gets one letter. The
 * sender decides whether it may go (stop link, quiet hours, a bounced address). Returns how many were tried.
 */
export async function sendTheLeadsWeeklyLetters(
  deps: {
    prisma: any; email: { sendTheLeadsWeeklyLetter: (to: string, subject: string, lines: string[], linkLabel: string, linkUrl: string) => Promise<unknown> }; frontendUrl: string;
    /**
     * EVERY LEAD'S CHECK-INS, NOT ONLY THE ANCHOR'S (engagement spec section 24; decision 117, the anchor follows through the normal flow). Given, the letter is
     * made for each check-in that is still going and whose lead has something useful to read, whatever it was started from, with the anchor's own kept only while
     * its switch is on. `weeklyReport` reads the lead's own weekly report as she is served it (what moved, what to do), and may be absent.
     */
    everyCheckIn?: { anchorIsOn: boolean; weeklyReport?: (g: { id: string; initiatorId: string }, now: Date) => Promise<{ moved: string[]; toDo: { do: string; why: string }[] } | null> };
  },
  now: Date = new Date(),
): Promise<{ tried: number }> {
  const { prisma } = deps;
  const every = deps.everyCheckIn;
  const kind = every ? (every.anchorIsOn ? {} : WHERE_A_GROUND_IS_NOT_THE_ANCHORS) : WHERE_A_GROUND_IS_THE_ANCHORS;
  const grounds: any[] = await everyRowAPageAtATime((page: any) => prisma.ground.findMany({
    where: { ...kind, status: { notIn: TERMINAL } },
    select: { id: true, label: true, initiatorId: true, ...(every ? { scenario: true } : {}) },
    ...page,
  }), 1000);
  const byLead = new Map<string, { id: string; label: string; initiatorId: string; scenario?: string | null }[]>();
  for (const g of grounds) byLead.set(g.initiatorId, [...(byLead.get(g.initiatorId) ?? []), g]);

  const base = (deps.frontendUrl || '').replace(/\/$/, '');
  let tried = 0;
  for (const [leadId, theirs] of byLead) {
    try {
      const user = await prisma.user.findUnique({ where: { id: leadId }, select: { email: true, deletedAt: true } });
      if (!user?.email || user.deletedAt) continue;
      const weeks: AWeekInOneCheckIn[] = [];
      for (const g of theirs) {
        const w = await theWeekOf(prisma, g, now);
        if (every) {
          const report = await theReportsWordsHeldToTheRecord(prisma, g.id, await every.weeklyReport?.(g, now).catch(() => null) ?? null);
          if (report?.moved.length) w.moved = report.moved;
          if (report?.toDo.length) w.toDo = report.toDo;
          /* One real next check-in, only where it is a different one and the record gives a reason. */
          const open = await prisma.groundCommitment.count({ where: { groundId: g.id, status: 'UNKNOWN' } }).catch(() => 0);
          const next = theNextCheckInFor({ scenario: g.scenario ?? null, done: w.done, cleared: 0, waiting: w.waiting, open: open as number });
          /* The reasons say "since the report", so only where a report has gone out. */
          const reported = await prisma.report?.findFirst?.({ where: { groundId: g.id, releasedAt: { not: null } }, select: { id: true } }).catch(() => null);
          if (next.kind === 'another' && w.checkedIn > 0 && reported) w.next = theSuggestionSaid(next);
        }
        weeks.push(w);
      }
      const letter = theLeadsLetter(weeks, every ? { onlyWhenSomethingHappened: true } : {});
      if (!letter) continue;
      const linkUrl = letter.linkPath === 'board' ? `${base}/grounds/${letter.groundId}/board` : `${base}/grounds`;
      await deps.email.sendTheLeadsWeeklyLetter(user.email, letter.subject, letter.lines, letter.linkLabel, linkUrl);
      tried++;
    } catch {
      /* One lead's letter that could not be put together never stops the others. */
    }
  }
  return { tried };
}
