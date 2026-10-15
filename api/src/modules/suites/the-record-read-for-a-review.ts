import type { PrismaService } from '../prisma/prisma.service';
import { whenItWas } from '../../common/a-date-reads-the-same-everywhere';
import { inOurVoice } from '../reports/what-the-record-shows-over-time';
import { theFirstNameFrom } from '../reports/a-title-is-not-a-first-name';
import { isThisTheUntoldGoal, type AnUntoldGoalRow } from '../board/an-untold-goal-is-not-a-board-objective';

/**
 * THE REVIEW AS THE RECORD INTERPRETED (decision 85, item 4; build step 12 of
 * docs/suites-against-the-workflow-model.md).
 *
 * "The review is an interpretation of the record, not a form. The person reads what Groundwork
 * understands they worked on, committed to, changed, completed, delayed and were blocked by, and
 * corrects it."
 *
 * BUILT FROM ROWS, WITHOUT A MODEL. Every line is made from a row that already exists: the check-ins
 * the person completed (`CheckIn`), the goals they own in a check-in (`GroundObjective`), the
 * work-plan items they own (`Subject`, an objective or a project), what they said they would do and
 * how each was settled (`GroundCommitment`), and what they said they were waiting on
 * (`GroundDependency`). No model words any of it, so `noticedPromptVersionId` stays empty. Never
 * hours, never leave (decision 10): nothing here reads either.
 *
 * WRITTEN ONCE, WHEN THE REVIEW STARTS, AS FACTS. What is stored is the facts with ids, not sentences
 * with names, so each reader is served the same line in their own words ("you" for the person, the
 * person's first name for anybody else), and opening the review never rebuilds it. Each commitment is
 * read as it stood the day the review started.
 *
 * WHO READS WHICH LINE. The person reads every line, since all of it is their own work. Anybody else
 * who may open the review reads only the lines from check-ins they are in, because each person's load
 * across check-ins is private (decision 4), and what people say in a check-in can be shown to the
 * people in that check-in. A goal is read only by the person and whoever runs that check-in, since a
 * colleague may see only their own target (decision 50). A work-plan item is not from a check-in, so
 * everybody who may open the review reads it.
 */

export type ARecordPart = 'worked-on' | 'committed' | 'completed' | 'changed' | 'delayed' | 'blocked';

interface InACheckIn { groundId: string; label: string }

export type ARecordLine =
  | ({ key: string; kind: 'worked'; leadUserId: string | null; leadFirst: string | null; personRanIt: boolean; checkIns: number; first: string; last: string } & InACheckIn)
  | ({ key: string; kind: 'goal'; name: string; count: number; target: number | null; at: string; dueOn: string | null } & InACheckIn)
  | { key: string; kind: 'work-plan'; groundId: null; title: string; dueOn: string | null; status: string | null }
  | ({ key: string; kind: 'commitments'; first: string; last: string; made: number; done: number; notDone: number; dropped: number; open: number; delayed: number } & InACheckIn)
  | ({ key: string; kind: 'commitment'; words: string; wordForWord: boolean; madeOn: string; status: 'DONE' | 'NOT_DONE' | 'DROPPED' | 'OPEN'; saidAgain: number; settledOn: string | null } & InACheckIn)
  | ({ key: string; kind: 'blocker'; what: string; onUserId: string | null; onFirst: string | null; onLabel: string | null; saidOn: string; clearedOn: string | null } & InACheckIn);

/** What one reader is allowed to read of the record: the check-ins they are in, and the ones they run. */
export interface WhatTheReaderIsIn {
  isThePerson: boolean; inCheckIns: ReadonlySet<string>; runsCheckIns: ReadonlySet<string>;
  /** The person's goals the lead has not told them about, as they stand now (decisions 48 and 56). Only whoever runs that check-in reads such a goal. */
  notTold?: readonly (AnUntoldGoalRow & { groundId: string })[];
}

/** How a line is said: to the person as "you", to anybody else with the person's first name. */
export interface WhoReadsIt { isThePerson: boolean; userId: string; personFirst: string }

const MOST_OF_EACH = { done: 6, delayed: 8, dropped: 5, blocked: 8 } as const;
const day = (d: Date | string): string => new Date(d).toISOString().slice(0, 10);
const said = (d: string): string => whenItWas(new Date(`${d}T12:00:00.000Z`), 'full', 'UTC');

/**
 * The first day of the review's period: the day this person's previous review started, or else as
 * many months back as the organisation's answer to "How often?" says ("Every 6 months"), 6 when it
 * says no number.
 */
export function theReviewsPeriodFrom(until: Date, every: string | null | undefined, previousStartedAt: Date | null | undefined): Date {
  if (previousStartedAt && previousStartedAt.getTime() < until.getTime()) return new Date(previousStartedAt);
  const words = String(every ?? '').toLowerCase();
  const n = Number(/(\d+)\s*month/.exec(words)?.[1]);
  const months = Number.isFinite(n) && n > 0 ? n : /year|annual/.test(words) ? 12 : /quarter/.test(words) ? 3 : 6;
  const from = new Date(until);
  from.setUTCMonth(from.getUTCMonth() - months);
  return from;
}

/** Read the record for one person over one period. Facts only; see the comment at the top. */
export async function theRecordForAReview(
  prisma: PrismaService,
  input: { organizationId: string; personUserId: string | null | undefined; personExternalId: string; from: Date; until: Date },
): Promise<ARecordLine[]> {
  const db = prisma as any;
  const { organizationId, from, until } = input;
  const inPeriod = (d: Date | string | null | undefined) => !!d && new Date(d).getTime() >= from.getTime() && new Date(d).getTime() <= until.getTime();
  const lines: ARecordLine[] = [];

  /* WORK-PLAN ITEMS THEY OWN, which do not need a sign-in. */
  const subjects: any[] = (await db.subject?.findMany?.({
    where: { organizationId, ownerExternalId: input.personExternalId, type: { in: ['OBJECTIVE', 'PROJECT'] }, sourceDeletedAt: null },
    select: { id: true, title: true, dueDate: true, startDate: true, status: true },
  }).catch(() => [])) ?? [];

  const participants: any[] = input.personUserId ? ((await db.groundParticipant?.findMany?.({
    where: { userId: input.personUserId, managingOnly: false, ground: { organizationId } },
    select: { id: true, groundId: true, ground: { select: { id: true, label: true, initiatorId: true } } },
  }).catch(() => [])) ?? []) : [];
  const groundOf = new Map<string, { id: string; label: string; initiatorId: string | null }>();
  for (const p of participants) if (p.ground) groundOf.set(p.id, p.ground);
  const pids = [...groundOf.keys()];

  const [checkIns, goals, commitments, waits] = pids.length
    ? await Promise.all([
      db.checkIn?.findMany?.({ where: { participantId: { in: pids }, status: 'COMPLETED', completedAt: { gte: from, lte: until } }, select: { participantId: true, completedAt: true } }).catch(() => []),
      db.groundObjective?.findMany?.({ where: { ownerParticipantId: { in: pids }, isADecisionAboutAPerson: false }, select: { id: true, ownerParticipantId: true, name: true, target: true, count: true, dueOn: true, updatedAt: true, createdAt: true } }).catch(() => []),
      db.groundCommitment?.findMany?.({
        where: { participantId: { in: pids }, explicit: true, source: { not: 'PASTE' }, createdAt: { gte: from, lte: until } },
        select: { id: true, participantId: true, text: true, saidWordForWord: true, status: true, saidAgainIn: true, settledAt: true, createdAt: true },
      }).catch(() => []),
      db.groundDependency?.findMany?.({
        where: { fromParticipantId: { in: pids }, createdAt: { gte: from, lte: until } },
        select: { id: true, fromParticipantId: true, what: true, onLabel: true, createdAt: true, clearedAt: true, onParticipant: { select: { userId: true, user: { select: { firstName: true, lastName: true } } } } },
      }).catch(() => []),
    ])
    : [[], [], [], []];

  /* WHAT THEY WORKED ON: each check-in they completed in the period, under the check-in it was in. */
  const leadIds = [...new Set([...groundOf.values()].map((g) => g.initiatorId).filter((x): x is string => !!x))];
  const leads: any[] = leadIds.length ? ((await db.user?.findMany?.({ where: { id: { in: leadIds } }, select: { id: true, firstName: true, lastName: true } }).catch(() => [])) ?? []) : [];
  /* A title is never said as a first name: "Dr Amina Bello" is "Amina" (a-title-is-not-a-first-name.ts). */
  const leadFirst = new Map(leads.map((u) => [u.id, theFirstNameFrom(u.firstName, u.lastName)]));
  const byParticipant = new Map<string, Date[]>();
  for (const c of (checkIns ?? []) as any[]) {
    if (!c?.completedAt) continue;
    byParticipant.set(c.participantId, [...(byParticipant.get(c.participantId) ?? []), new Date(c.completedAt)]);
  }
  for (const [pid, dates] of byParticipant) {
    const g = groundOf.get(pid);
    if (!g) continue;
    dates.sort((a, b) => a.getTime() - b.getTime());
    lines.push({
      key: `worked:${g.id}`, kind: 'worked', groundId: g.id, label: g.label,
      leadUserId: g.initiatorId, leadFirst: g.initiatorId ? leadFirst.get(g.initiatorId) ?? null : null,
      personRanIt: !!input.personUserId && g.initiatorId === input.personUserId,
      checkIns: dates.length, first: day(dates[0]), last: day(dates[dates.length - 1]),
    });
  }

  /* THE GOALS THEY OWN in a check-in, as they stood the day the review started. A goal that is a decision about a person is the lead's alone (decision 46). */
  for (const o of (goals ?? []) as any[]) {
    const g = groundOf.get(o.ownerParticipantId);
    if (!g || !String(o.name ?? '').trim()) continue;
    if (new Date(o.createdAt ?? 0).getTime() > until.getTime()) continue;
    const at = new Date(Math.min(new Date(o.updatedAt ?? until).getTime(), until.getTime()));
    lines.push({
      key: `goal:${o.id}`, kind: 'goal', groundId: g.id, label: g.label, name: String(o.name).trim().replace(/[.!?]+$/, ''),
      count: Number(o.count ?? 0), target: typeof o.target === 'number' ? o.target : null, at: day(at), dueOn: o.dueOn ? day(o.dueOn) : null,
    });
  }

  for (const s of subjects) {
    if (!String(s.title ?? '').trim()) continue;
    if (s.dueDate && new Date(s.dueDate).getTime() < from.getTime()) continue;
    if (s.startDate && new Date(s.startDate).getTime() > until.getTime()) continue;
    lines.push({ key: `work-plan:${s.id}`, kind: 'work-plan', groundId: null, title: String(s.title).trim(), dueOn: s.dueDate ? day(s.dueDate) : null, status: String(s.status ?? '').trim() || null });
  }

  /* WHAT THEY COMMITTED TO, and how each stood the day the review started. */
  const asItStood = (c: any): 'DONE' | 'NOT_DONE' | 'DROPPED' | 'OPEN' => {
    const st = String(c.status ?? '').toUpperCase();
    if (st === 'DROPPED') return 'DROPPED';
    if ((st === 'DONE' || st === 'NOT_DONE') && (!c.settledAt || new Date(c.settledAt).getTime() <= until.getTime())) return st;
    return 'OPEN';
  };
  const perGround = new Map<string, any[]>();
  for (const c of (commitments ?? []) as any[]) {
    const g = groundOf.get(c.participantId);
    if (!g) continue;
    perGround.set(g.id, [...(perGround.get(g.id) ?? []), { ...c, ground: g, stood: asItStood(c), again: new Set((c.saidAgainIn ?? []).filter((n: number) => Number.isFinite(n))).size }]);
  }
  const each: any[] = [];
  for (const [groundId, cs] of perGround) {
    const g = cs[0].ground;
    const dates = cs.map((c) => new Date(c.createdAt)).sort((a, b) => a.getTime() - b.getTime());
    const count = (s: string) => cs.filter((c) => c.stood === s).length;
    lines.push({
      key: `commitments:${groundId}`, kind: 'commitments', groundId, label: g.label, first: day(dates[0]), last: day(dates[dates.length - 1]),
      made: cs.length, done: count('DONE'), notDone: count('NOT_DONE'), dropped: count('DROPPED'), open: count('OPEN'),
      delayed: cs.filter((c) => c.stood === 'NOT_DONE' || c.again > 0).length,
    });
    each.push(...cs);
  }
  const newestFirst = (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  const delayed = each.filter((c) => c.stood === 'NOT_DONE' || (c.again > 0 && c.stood !== 'DROPPED')).sort(newestFirst).slice(0, MOST_OF_EACH.delayed);
  const dropped = each.filter((c) => c.stood === 'DROPPED').sort(newestFirst).slice(0, MOST_OF_EACH.dropped);
  const done = each.filter((c) => c.stood === 'DONE' && c.again === 0).sort(newestFirst).slice(0, MOST_OF_EACH.done);
  for (const c of [...delayed, ...dropped, ...done].sort((a, b) => -newestFirst(a, b))) {
    const words = String(c.text ?? '').trim();
    if (!words) continue;
    /* A line that cannot be said truly (their words are not word for word, and cannot be put in our voice) is left out. */
    if (!c.saidWordForWord && !inOurVoice(words)) continue;
    /* So is one that says nothing on its own, out of its check-in: "I will do that." */
    if (saysNothingOnItsOwn(words)) continue;
    lines.push({
      key: `commitment:${c.id}`, kind: 'commitment', groundId: c.ground.id, label: c.ground.label, words: words.slice(0, 400), wordForWord: !!c.saidWordForWord,
      madeOn: day(c.createdAt), status: c.stood, saidAgain: c.again, settledOn: c.stood === 'DONE' || c.stood === 'NOT_DONE' ? (c.settledAt ? day(c.settledAt) : null) : null,
    });
  }

  /* WHAT THEY SAID WAS HOLDING THEM UP. */
  const blockers = ((waits ?? []) as any[]).filter((w) => String(w.what ?? '').trim()).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()).slice(-MOST_OF_EACH.blocked);
  for (const w of blockers) {
    const g = groundOf.get(w.fromParticipantId);
    if (!g) continue;
    lines.push({
      key: `blocker:${w.id}`, kind: 'blocker', groundId: g.id, label: g.label, what: String(w.what).trim().replace(/[.!?]+$/, '').slice(0, 300),
      onUserId: w.onParticipant?.userId ?? null, onFirst: theFirstNameFrom(w.onParticipant?.user?.firstName, w.onParticipant?.user?.lastName), onLabel: (w.onLabel ?? '').trim() || null,
      saidOn: day(w.createdAt), clearedOn: inPeriod(w.clearedAt) ? day(w.clearedAt) : null,
    });
  }
  return lines;
}

/** "I will do that.", "I'll try it": a promise whose words mean nothing without the question before it. */
export function saysNothingOnItsOwn(words: string): boolean {
  const rest = String(words ?? '').trim().replace(/^(?:i will|i'll|i am going to|i'm going to|i plan to|we will|we'll)\s+/i, '').replace(/[.!?]+$/, '').trim();
  return rest.split(/\s+/).filter(Boolean).length <= 2;
}

/** The stored record, read defensively: anything that is not a line Groundwork wrote is left out. */
export function theStoredRecord(raw: unknown): ARecordLine[] {
  if (!Array.isArray(raw)) return [];
  const kinds = new Set(['worked', 'goal', 'work-plan', 'commitments', 'commitment', 'blocker']);
  return raw.filter((x: any) => x && typeof x.key === 'string' && kinds.has(x.kind)) as ARecordLine[];
}

/**
 * Whether this reader may read this line. The person reads all of it. Anybody else reads a line from a
 * check-in only when they are in that check-in, and a goal only when they run it. See the top.
 */
export function mayReadTheLine(line: ARecordLine, reader: WhatTheReaderIsIn): boolean {
  /* A goal the lead has not told the person about stays with whoever runs that check-in, the person included, and it is read as it stands now,
     so a line stored before the lead told them is read once they have. */
  if (line.kind === 'goal' && !reader.runsCheckIns.has(line.groundId)
    && (reader.notTold ?? []).some((g) => g.groundId === line.groundId && isThisTheUntoldGoal({ name: line.name, target: line.target }, g))) return false;
  if (reader.isThePerson) return true;
  if (line.groundId === null) return true;
  if (line.kind === 'goal') return reader.runsCheckIns.has(line.groundId);
  return reader.inCheckIns.has(line.groundId) || reader.runsCheckIns.has(line.groundId);
}

/** Which part of the review a line belongs to. */
export function thePartOf(line: ARecordLine): ARecordPart {
  switch (line.kind) {
    case 'worked': case 'goal': case 'work-plan': return 'worked-on';
    case 'commitments': return 'committed';
    case 'blocker': return 'blocked';
    case 'commitment':
      if (line.status === 'DROPPED') return 'changed';
      if (line.status === 'NOT_DONE' || line.saidAgain > 0) return 'delayed';
      return 'completed';
  }
}

/** The heading over each part, for this reader. */
export function thePartsHeading(part: ARecordPart, r: WhoReadsIt): string {
  const who = r.isThePerson ? 'you' : r.personFirst;
  switch (part) {
    case 'worked-on': return `What ${who} worked on`;
    case 'committed': return `What ${who} committed to`;
    case 'completed': return `What ${who} finished`;
    case 'changed': return 'What was dropped along the way';
    case 'delayed': return 'What took longer than first said';
    case 'blocked': return r.isThePerson ? 'What you said was holding you up' : `What ${who} said was holding the work up`;
  }
}

/** A number as people read it: 36,000,000, never 36000000. */
const aNumber = (n: number) => n.toLocaleString('en-GB');
const times = (n: number) => (n === 1 ? 'once' : n === 2 ? 'twice' : `${n} times`);
const plural = (n: number, one: string, many: string) => (n === 1 ? `1 ${one}` : `${n} ${many}`);
const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const andList = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
const between = (first: string, last: string) => (first === last ? `on ${said(first)}` : `between ${said(first)} and ${said(last)}`);
const inQuotes = (words: string) => `“${/[.!?…”"]$/.test(words) ? words : `${words}.`}”`;

/** One line of the record, as a full sentence for this reader. */
export function aRecordLineSaid(line: ARecordLine, r: WhoReadsIt): string {
  const who = r.isThePerson ? 'you' : r.personFirst;
  const Who = capital(who);
  const own = r.isThePerson ? 'own' : 'owns';
  switch (line.kind) {
    case 'worked': {
      if (line.personRanIt) return `${Who} ran “${line.label}”, and checked in ${times(line.checkIns)} ${between(line.first, line.last)}.`;
      const lead = line.leadUserId && line.leadUserId === r.userId ? 'you run' : line.leadFirst ? `${line.leadFirst} runs` : null;
      return `${Who} checked in ${times(line.checkIns)} in “${line.label}”${lead ? `, which ${lead},` : ''} ${between(line.first, line.last)}.`;
    }
    case 'goal': {
      const stood = line.target !== null
        ? ` On ${said(line.at)}, it stood at ${aNumber(line.count)}, against a target of ${aNumber(line.target)}.`
        : line.count > 0 ? ` On ${said(line.at)}, it stood at ${aNumber(line.count)}.` : '';
      const due = line.dueOn ? ` It is due on ${said(line.dueOn)}.` : '';
      return `${Who} ${own} the goal “${line.name}” in “${line.label}”.${stood}${due}`;
    }
    case 'work-plan': {
      const due = line.dueOn ? ` It is due on ${said(line.dueOn)}.` : '';
      const status = line.status ? ` Its status in the work plan is “${line.status}”.` : '';
      return `${Who} ${own} “${line.title}” in the work plan.${due}${status}`;
    }
    case 'commitments': {
      const parts: string[] = [];
      if (line.done) parts.push(`${line.done} ${line.done === 1 ? 'was' : 'were'} done`);
      if (line.notDone) parts.push(`${line.notDone} ${line.notDone === 1 ? 'was' : 'were'} not done`);
      if (line.dropped) parts.push(`${line.dropped} ${line.dropped === 1 ? 'was' : 'were'} dropped`);
      if (line.open) parts.push(`${line.open} ${line.open === 1 ? 'was' : 'were'} still open when this review started`);
      const of = line.made === 1 && parts.length === 1
        ? ` It ${parts[0].replace(/^1 (was|were) /, 'was ')}.`
        : parts.length === 1 ? ` All of them ${parts[0].replace(/^\d+ (was|were) /, 'were ')}.`
          : parts.length ? ` Of these, ${andList(parts)}.` : '';
      return `In “${line.label}”, ${who} made ${plural(line.made, 'commitment', 'commitments')} ${between(line.first, line.last)}.${of}`;
    }
    case 'commitment': {
      const clause = inOurVoice(line.words);
      const opener = line.wordForWord
        ? `On ${said(line.madeOn)}, in “${line.label}”, ${who} said, ${inQuotes(line.words)}`
        : `On ${said(line.madeOn)}, in “${line.label}”, ${who} committed to ${clause}.`;
      const again = line.saidAgain > 0 ? ` ${Who} said it again in ${line.saidAgain === 1 ? 'one later check-in' : `${line.saidAgain} later check-ins`}.` : '';
      const stood = line.status === 'DONE' ? (line.settledOn ? ` It was done on ${said(line.settledOn)}.` : ' It was done.')
        : line.status === 'NOT_DONE' ? (line.settledOn ? ` It was marked as not done on ${said(line.settledOn)}.` : ' It was marked as not done.')
          : line.status === 'DROPPED' ? ' It was dropped later.'
            : ' It was still open when this review started.';
      return `${opener}${again}${stood}`;
    }
    case 'blocker': {
      const on = line.onUserId && line.onUserId === r.userId ? 'you' : line.onFirst ?? line.onLabel;
      /* "waiting on Amina for a meeting with Amina" says Amina twice; the thing waited for already names them. */
      const namedInIt = !!on && new RegExp(`\\b${on.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(line.what);
      const waiting = on && !namedInIt ? `waiting on ${on} for ${line.what}` : `waiting for ${line.what}`;
      const cleared = line.clearedOn ? ` It cleared on ${said(line.clearedOn)}.` : ' It was still open when this review started.';
      /* No pronoun is guessed for the person: they are "you", or the work is. */
      return `On ${said(line.saidOn)}, in “${line.label}”, ${r.isThePerson ? 'you said you were' : `${r.personFirst} said the work was`} ${waiting}.${cleared}`;
    }
  }
}

/** The days a review's period runs over, in words: "between 3 April 2026 and 1 October 2026". */
export function thePeriodSaid(from: Date, until: Date): string {
  return `between ${said(day(from))} and ${said(day(until))}`;
}

export const A_LINE_WAS_CORRECTED = {
  /** The person's own correction, beside the line. */
  forThePerson: (on: Date) => `You marked this as wrong on ${said(day(on))}, and said what is true.`,
  forAnybodyElse: (first: string, on: Date) => `${first} marked this as wrong on ${said(day(on))}, and said what is true.`,
};
