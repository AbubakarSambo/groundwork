import { CheckInStatus, GroundStatus } from '@prisma/client';
import { nameToCall, aNameToList } from '../engagement/a-name-to-call-them';
import { isNotLetInYet } from '../grounds/who-an-admin-did-not-let-in';
import { A_GROUND_NO_MESSAGE_IS_ABOUT } from '../grounds/a-ground-that-has-ended';
import { everyRowAPageAtATime } from '../whatsapp/every-row-a-page-at-a-time';

import { WHERE_A_GROUND_IS_THE_ANCHORS, WHERE_A_GROUND_IS_NOT_THE_ANCHORS } from '../conversation/the-anchor-weekly-check-in';
import { theNextCheckInFor, theSuggestionSaid } from '../engagement/the-next-check-in-from-what-happened';

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
   * THE REST OF THE SPEC'S WEEKLY LETTER (engagement spec section 24), for a check-in of any kind. Each is absent when it has nothing to say, and a letter built
   * without them is the letter it always was.
   *
   * What moved this week, in the sentences of the lead's own weekly report (served to her by the wrapper that swaps names in), at most three.
   */
  moved?: string[];
  /** What to do this week, from the same report's "for you to do next week" (what only the lead can settle), at most three. */
  toDo?: { do: string; why: string }[];
  /** People who did not check in and were really sent a reminder this week by Groundwork (the participant row's `lastNudgedAt`, set only when one went). */
  reminded?: string[];
  /** One real next check-in, said in a sentence, only where it is a different one and the record gives a reason. */
  next?: string | null;
}

const aName = (n: string) => n;

/** "Four things people said they would do were done, all by Abigail." Named only when ONE person closed ALL of them. */
function theDoneSentence(w: AWeekInOneCheckIn): string | null {
  if (w.done <= 0) return null;
  const base = `${capital(aNumber(w.done))} ${w.done === 1 ? 'thing people said they would do was' : 'things people said they would do were'} done`;
  const one = w.closedBy?.length === 1 && w.closedBy[0].count === w.done ? aName(w.closedBy[0].name) : null;
  return one ? `${base}, ${w.done === 1 ? 'by' : w.done === 2 ? 'both by' : 'all by'} ${one}` : base;
}

/** "Two handoffs are still waiting, both on James." Named only when ALL of them wait on one person. */
function theWaitingSentence(w: AWeekInOneCheckIn): string | null {
  if (w.waiting <= 0) return null;
  const base = `${capital(aNumber(w.waiting))} ${w.waiting === 1 ? 'handoff is' : 'handoffs are'} still waiting`;
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
  const facts = [theDoneSentence(w), theWaitingSentence(w)].filter((x): x is string => !!x);
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
    return done > 0 ? `This week, ${aNumber(done)} of ${aNumber(of)} people checked in across your ${aNumber(counted.length)} check-ins` : THE_SUBJECT;
  }
  const w = counted[0];
  const facts = [theDoneSentence(w), theWaitingSentence(w)].filter((x): x is string => !!x);
  if (facts.length) return facts.map((f, i) => (i ? lowerFirst(f) : f)).join('; ');
  return w.checkedIn > 0 ? `This week, ${aNumber(w.checkedIn)} of ${aNumber(w.ofHowMany)} people checked in` : THE_SUBJECT;
}

/** The sentences for one check-in, in order. Nothing is said that the count does not hold. */
export function theWeekInSentences(w: AWeekInOneCheckIn): string[] {
  const out: string[] = [];
  if (w.checkedIn <= 0) out.push('Nobody has checked in this week.');
  else if (w.checkedIn >= w.ofHowMany) out.push(w.ofHowMany === 1 ? 'This week, the one person who can answer checked in.' : `This week, all ${aNumber(w.ofHowMany)} people checked in.`);
  else out.push(`This week, ${aNumber(w.checkedIn)} of ${aNumber(w.ofHowMany)} people checked in.`);
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
  if (w.moved?.length) out.push(`Here is what moved this week. ${w.moved.slice(0, 3).join(' ')}`);
  const reminded = (w.reminded ?? []).filter(aNameToList).filter((n) => w.notYet.includes(n));
  if (reminded.length) out.push(`I have already sent reminders to ${listed(reminded)} this week.`);
  const todo = (w.toDo ?? []).slice(0, Math.max(0, roomForToDo));
  if (todo.length) {
    out.push('Here is what I would do this week.');
    for (const t of todo) out.push(`${t.do.trim()}${t.why?.trim() ? ` ${t.why.trim()}` : ''}`);
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
  for (const w of counted) {
    if (counted.length > 1) lines.push(`"${w.label}"`);
    lines.push(theWeekInSentences(w).join(' '));
    const rest = theRestOfTheWeekIn(w, room);
    room -= Math.min(room, (w.toDo ?? []).length);
    lines.push(...rest);
  }
  return { subject: theSubjectFor(counted), lines, linkLabel: THE_LINK_SAYS, linkPath: counted.length === 1 ? 'board' : 'grounds', groundId: counted.length === 1 ? counted[0].groundId : null };
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
    prisma.groundParticipant.findMany({ where: { groundId: g.id }, select: { id: true, userId: true, managingOnly: true, nameGiven: true, lastNudgedAt: true, user: { select: { firstName: true, lastName: true, awaitingOrgApproval: true } } } }),
    prisma.checkIn.findMany({ where: { groundId: g.id, status: CheckInStatus.COMPLETED, completedAt: { gte: since, lte: now } }, select: { participantId: true } }),
    prisma.groundCommitment.findMany({ where: { groundId: g.id, participantId: { not: null }, createdAt: { gte: since, lte: now } }, select: { participantId: true } }),
    prisma.groundCommitment.count({ where: { groundId: g.id, status: 'DONE', settledAt: { gte: since, lte: now } } }),
    prisma.groundDependency.count({ where: { groundId: g.id, status: { not: 'CLEARED' } } }),
    /* Who settled what, and whom handoffs wait on: ids only, for the subject. Never what anybody said. */
    (async () => prisma.groundCommitment.findMany({ where: { groundId: g.id, status: 'DONE', participantId: { not: null }, settledAt: { gte: since, lte: now } }, select: { participantId: true, status: true } }))().catch(() => []),
    (async () => prisma.groundDependency.findMany({ where: { groundId: g.id, status: { not: 'CLEARED' }, onParticipantId: { not: null } }, select: { onParticipantId: true, status: true } }))().catch(() => []),
  ]);
  const counted = (people as any[]).filter((p) => !p.managingOnly && !isNotLetInYet(p));
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
  const waitingOn = tally((waitingRows as any[]).filter((r) => r.status !== 'CLEARED').map((r) => r.onParticipantId));
  /* Reminders Groundwork really sent this week to people who still have not checked in: `lastNudgedAt` is set only when a reminder went. */
  const reminded = counted
    .filter((p) => !finishedIds.has(p.id) && p.userId !== g.initiatorId && p.lastNudgedAt && new Date(p.lastNudgedAt) >= since && new Date(p.lastNudgedAt) <= now)
    .map((p) => nameToCall(p))
    .filter((n: string) => !!n);
  const saidNextBy = new Set((saidNext as any[]).map((r) => r.participantId).filter((id: string) => countedIds.has(id)));
  return { groundId: g.id, label: g.label, ofHowMany: counted.length, checkedIn: finishedIds.size, answerableIds: counted.map((p) => p.userId ?? p.id), checkedInIds: counted.filter((p) => finishedIds.has(p.id)).map((p) => p.userId ?? p.id), notYet, saidWhatNext: saidNextBy.size, done: done as number, waiting: waiting as number, closedBy, waitingOn, ...(reminded.length ? { reminded } : {}) };
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
          const report = await every.weeklyReport?.(g, now).catch(() => null);
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
