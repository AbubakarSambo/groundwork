import { CheckInStatus } from '@prisma/client';
import { CLOSED_BY_THE_CLOCK } from '../../common/closed-by-the-clock';
import { checksInOnlyWhenTheyChoose } from './the-lead-checks-in-when-they-choose';
import { leaveOfThePeopleOn, type Stretch } from '../suites/who-is-away';
import { nameToCall, SOMEONE } from '../engagement/a-name-to-call-them';
import { aNumberInWords } from '../engagement/a-number-in-words';
import { A_GROUND_NO_MESSAGE_IS_ABOUT } from './a-ground-that-has-ended';
import { theConfirmedWaits } from './a-wait-is-the-speakers-account';
import { whoHasNotJoinedYet } from './invited-not-joined-yet';
import { isNotLetInYet } from './who-an-admin-did-not-let-in';

/**
 * REPEATEDLY MISSING CHECK-INS (decision 136, change 8).
 *
 * A MISSED check-in is a session that opened for somebody and closed without their answer: the clock
 * closed it with nothing said, or the next session opened while it was still waiting. Never missed:
 *   - a session that is still open,
 *   - a set-up conversation, or a row marked optional (CheckIn.optional),
 *   - any session of the lead's, or of a managing-only row (the shared rule, decision 133): they check in
 *     when they choose, so nothing here ever reads their rows,
 *   - a session that fell, even in part, in their approved leave. Such a session is left out of the count
 *     altogether: it is neither missed nor answered.
 *
 * What follows from the count, Hafsah's thresholds:
 *   1. two missed in a row: the PERSON is told first, with what it does to the team;
 *   2. three of the last four missed: the lead is told, in the daily nudge and on the board, as facts;
 *   3. it goes on (four of the last five): Groundwork suggests a support plan, the lead decides;
 *   4. it still goes on (five of the last six): Groundwork suggests a formal process in the performance suite.
 * Each stage counts only while the latest closed session was missed: somebody who came back is not chased.
 * Only people who have JOINED and been let in are ever read (decision 8, night run 3): somebody invited who has
 * not come in yet, or is still waiting for an admin, has missed nothing and is told nothing, nor is their lead.
 * Never a score or a label on a person: each line says what happened and what it does.
 */

export interface ASessionOfTheirs {
  sessionNumber: number;
  status: CheckInStatus | string;
  isSetup?: boolean | null;
  optional?: boolean | null;
  closedReason?: string | null;
  /** Their first turn, if any (a clock close with a turn of theirs was not silent). */
  turns?: unknown[] | null;
  availableFrom?: Date | string | null;
  createdAt?: Date | string | null;
  completedAt?: Date | string | null;
  missedReason?: string | null;
}

export type Stage = 0 | 1 | 2 | 3 | 4;
export const TOLD_THE_PERSON: Stage = 1;
export const TOLD_THE_LEAD: Stage = 2;
export const A_SUPPORT_PLAN: Stage = 3;
export const A_FORMAL_PROCESS: Stage = 4;

export interface WhereTheyStand {
  /** Missed in a row, counting back from the latest closed session. */
  inARow: number;
  /** Of the last four closed sessions (or fewer, when there are fewer), how many were missed. */
  ofTheLastFour: number;
  lastFour: number;
  stage: Stage;
  /** The session the present run of misses began with: what "once per streak" is keyed on. */
  streakFrom: number | null;
  /** The reason they gave for the misses in this run, if they gave one. */
  reason: string | null;
}

const at = (d: Date | string | null | undefined): Date | null => (d ? new Date(d) : null);
const overlaps = (from: Date, to: Date, leave: Stretch[]) => leave.some((s) => s.from <= to && s.to >= from);

/** Answered, missed, or not closed yet. A decline is an answer (an-answer-includes-a-refusal.ts). */
function whatBecameOf(s: ASessionOfTheirs, aLaterOneOpened: boolean): 'answered' | 'missed' | 'open' {
  const said = Array.isArray(s.turns) && s.turns.length > 0;
  if (s.closedReason === CLOSED_BY_THE_CLOCK) return said ? 'answered' : 'missed';
  if (s.status === CheckInStatus.COMPLETED || s.status === CheckInStatus.DECLINED) return 'answered';
  return aLaterOneOpened ? 'missed' : 'open';
}

/**
 * Each closed session of theirs, oldest first, as missed (true) or answered (false). Optional rows, set-up
 * conversations, open sessions and sessions in approved leave are left out.
 */
export function theirClosedSessions(rows: ASessionOfTheirs[], leave: Stretch[] = [], now: Date = new Date()): { sessionNumber: number; missed: boolean; reason: string | null }[] {
  const sessions = rows.filter((r) => !r.isSetup).sort((a, b) => a.sessionNumber - b.sessionNumber);
  const out: { sessionNumber: number; missed: boolean; reason: string | null }[] = [];
  sessions.forEach((s, i) => {
    const next = sessions.slice(i + 1).find((n) => n.sessionNumber > s.sessionNumber);
    const opened = !!next && (!next.availableFrom || (at(next.availableFrom) as Date) <= now);
    const became = whatBecameOf(s, opened);
    if (became === 'open') return;
    if (s.optional && became === 'missed') return;
    const from = at(s.availableFrom) ?? at(s.createdAt) ?? now;
    const to = at(s.completedAt) ?? (next ? at(next.availableFrom) ?? at(next.createdAt) : null) ?? now;
    if (overlaps(from, to, leave)) return;
    out.push({ sessionNumber: s.sessionNumber, missed: became === 'missed', reason: s.missedReason?.trim() || null });
  });
  return out;
}

/** Where somebody stands, from their closed sessions. */
export function whereTheyStand(closed: { sessionNumber: number; missed: boolean; reason?: string | null }[]): WhereTheyStand {
  let inARow = 0;
  for (let i = closed.length - 1; i >= 0 && closed[i].missed; i--) inARow++;
  const missedOf = (n: number) => closed.slice(-n).filter((c) => c.missed).length;
  const latestMissed = inARow > 0;
  const stage: Stage = !latestMissed ? 0
    : missedOf(6) >= 5 ? A_FORMAL_PROCESS
    : missedOf(5) >= 4 ? A_SUPPORT_PLAN
    : missedOf(4) >= 3 ? TOLD_THE_LEAD
    : inARow >= 2 ? TOLD_THE_PERSON
    : 0;
  /* The run this is part of: from the first miss after the last answer that came before at least two misses in a row was broken. Keyed simply on the
     first session of the misses since the person last answered twice running, so one answer between misses does not restart the notices. */
  let from: number | null = null;
  if (stage > 0) {
    let i = closed.length - 1;
    while (i >= 0 && !(i >= 1 && !closed[i].missed && !closed[i - 1].missed)) i--;
    const start = closed.slice(i + 1).find((c) => c.missed);
    from = start ? start.sessionNumber : null;
  }
  const reasons = from == null ? [] : closed.filter((c) => c.sessionNumber >= (from as number) && c.missed && c.reason);
  return {
    inARow,
    ofTheLastFour: missedOf(4),
    lastFour: Math.min(4, closed.length),
    stage,
    streakFrom: from,
    reason: reasons.length ? (reasons[reasons.length - 1].reason as string) : null,
  };
}

export interface SomebodyWhoMissed {
  participantId: string;
  groundId: string;
  userId: string | null;
  name: string;
  stand: WhereTheyStand;
  /** The id of their latest missed check-in, where a reason is kept. */
  latestMissedCheckInId: string | null;
}

/**
 * Everybody on these check-ins who has missed enough to be told about, by stage. The lead and any
 * managing-only row are never read; people who have left are not either.
 */
export async function whoHasMissedCheckIns(prisma: any, groundIds: string[], now: Date = new Date()): Promise<SomebodyWhoMissed[]> {
  if (!groundIds.length || !prisma?.groundParticipant?.findMany) return [];
  const people: any[] = await prisma.groundParticipant.findMany({
    where: { groundId: { in: groundIds }, leftAt: null },
    select: {
      id: true, groundId: true, userId: true, partyType: true, managingOnly: true, nameGiven: true, cameThroughTheLink: true,
      user: { select: { firstName: true, lastName: true, awaitingOrgApproval: true } },
      checkIns: {
        select: {
          id: true, sessionNumber: true, status: true, isSetup: true, optional: true, closedReason: true, availableFrom: true,
          createdAt: true, completedAt: true, missedReason: true, turns: { where: { role: 'PERSON' as any }, take: 1, select: { id: true } },
        },
      },
    },
  }).catch(() => []);
  const notJoined = await whoHasNotJoinedYet(prisma, people);
  const theirs = people.filter((p) => !checksInOnlyWhenTheyChoose(p) && !notJoined.has(p.id) && !isNotLetInYet(p));
  if (!theirs.length) return [];
  const leave = await leaveOfThePeopleOn(prisma, [...new Set(theirs.map((p) => p.groundId as string))]).catch(() => new Map<string, Stretch[]>());
  const out: SomebodyWhoMissed[] = [];
  for (const p of theirs) {
    const stand = whereTheyStand(theirClosedSessions(p.checkIns ?? [], leave.get(p.id) ?? [], now));
    if (stand.stage === 0) continue;
    const latest = [...(p.checkIns ?? [])].filter((c: any) => !c.isSetup).sort((a: any, b: any) => b.sessionNumber - a.sessionNumber);
    const closed = theirClosedSessions(p.checkIns ?? [], leave.get(p.id) ?? [], now);
    const lastMissed = [...closed].reverse().find((c) => c.missed);
    out.push({
      participantId: p.id,
      groundId: p.groundId,
      userId: p.userId ?? null,
      name: nameToCall(p),
      stand,
      latestMissedCheckInId: lastMissed ? (latest.find((c: any) => c.sessionNumber === lastMissed.sessionNumber)?.id ?? null) : null,
    });
  }
  return out;
}

/**
 * THE CHECK-INS MISSED IN A ROW JUST BEFORE EACH PERSON'S LATEST ONE (night quality run 1, problem 5).
 *
 * Jared missed sessions 1 and 2 and answered session 3. Counted the usual way, from the latest closed
 * session, he had missed none by the time he answered, so his own session was never told and the lead's
 * board said "nothing here needs you this week". This counts back from the session before his latest:
 * the session numbers missed in a row there, oldest first. The lead and managing-only rows are never read.
 */
export function theMissesJustBefore(rows: ASessionOfTheirs[], leave: Stretch[] = [], now: Date = new Date()): number[] {
  const sessions = rows.filter((r) => !r.isSetup);
  if (!sessions.length) return [];
  const latest = Math.max(...sessions.map((s) => s.sessionNumber));
  const closed = theirClosedSessions(rows, leave, now).filter((c) => c.sessionNumber < latest);
  const run: number[] = [];
  for (let i = closed.length - 1; i >= 0 && closed[i].missed; i--) run.unshift(closed[i].sessionNumber);
  return run;
}

/** The same, for everybody on one check-in, by participant id. */
export async function whoMissedTheCheckInsJustBefore(prisma: any, groundId: string, now: Date = new Date()): Promise<Map<string, number[]>> {
  const out = new Map<string, number[]>();
  if (!prisma?.groundParticipant?.findMany) return out;
  const people: any[] = await prisma.groundParticipant.findMany({
    where: { groundId, leftAt: null },
    select: {
      id: true, groundId: true, userId: true, partyType: true, managingOnly: true, cameThroughTheLink: true,
      user: { select: { awaitingOrgApproval: true } },
      checkIns: {
        select: {
          id: true, sessionNumber: true, status: true, isSetup: true, optional: true, closedReason: true, availableFrom: true,
          createdAt: true, completedAt: true, missedReason: true, turns: { where: { role: 'PERSON' as any }, take: 1, select: { id: true } },
        },
      },
    },
  }).catch(() => []);
  const notJoined = await whoHasNotJoinedYet(prisma, people ?? []);
  const theirs = (people ?? []).filter((p) => !checksInOnlyWhenTheyChoose(p) && !notJoined.has(p.id) && !isNotLetInYet(p));
  if (!theirs.length) return out;
  const leave = await leaveOfThePeopleOn(prisma, [groundId]).catch(() => new Map<string, Stretch[]>());
  for (const p of theirs) {
    const run = theMissesJustBefore(p.checkIns ?? [], leave.get(p.id) ?? [], now);
    if (run.length) out.set(p.id, run);
  }
  return out;
}

/**
 * WHAT THE PERSON'S OWN SESSION IS HANDED when the two or more check-ins before this one closed without
 * their answer (decision 136's facts, decision 138 part 2's push). Facts, never a label: which sessions,
 * and that nothing was said in them. Then the same asks as for everybody: what was finished, and the numbers.
 */
export function whatTheSessionIsToldAboutMissing(name: string | null | undefined, missed: number[]): string {
  if (missed.length < 2) return '';
  const who = (name ?? '').trim() || 'The person you are talking to';
  const which = missed.length === 2 ? `sessions ${missed[0]} and ${missed[1]}` : `sessions ${missed.slice(0, -1).join(', ')} and ${missed[missed.length - 1]}`;
  return [
    'THE CHECK-INS BEFORE THIS ONE.',
    `${who} missed the last ${aNumberInWords(missed.length)} check-ins here (${which}). Each one closed with nothing said.`,
    'Say this once, early and plainly, as a fact: for example, "Your last two check-ins closed without an answer, so I have nothing from you since then." Never call it a pattern, never give it a label, and never guess why.',
    'Then ask what was finished since the last time they answered, or since the check-in began if they never have, and ask for the numbers, as you would ask anybody: how many, of what, and what shows it. "Fine" or "nothing" is not yet an answer to either; ask once more for one thing done and one number.',
  ].join('\n');
}

/* ---------------------------------------------------------------- the words ---------------------------------------------------------------- */

/* Her wording keeps the comma before the last "and" when there are three. */
const listed = (xs: string[]) => (xs.length < 2 ? xs.join('') : xs.length === 2 ? `${xs[0]} and ${xs[1]}` : `${xs.slice(0, -1).join(', ')}, and ${xs[xs.length - 1]}`);

/**
 * WHAT THE PERSON READS, first (Hafsah's wording). Only what is true for their check-in: people waiting on
 * them are mentioned only when somebody is (a confirmed wait, change 4). The lead is named where a name can be
 * said; otherwise "your manager".
 */
export function whatThePersonReads(stand: Pick<WhereTheyStand, 'inARow'>, o: { leadName?: string | null; somebodyWaitsOnThem: boolean }): string {
  const lead = o.leadName && o.leadName !== SOMEONE ? o.leadName.trim() : null;
  const theLead = lead ?? 'your manager';
  const what = ['Things you know about surface late'];
  if (o.somebodyWaitsOnThem) what.push('people waiting on you go unseen');
  what.push(`${theLead} has to chase instead of help`);
  const n = Math.max(2, stand.inARow);
  return [
    `You've missed your last ${aNumberInWords(n)} check-ins.`,
    /* Walk fault 6: two full sentences, never two parts joined with a colon. */
    'When you miss them, your team works without your view.',
    `${listed(what)}.`,
    `${lead ?? 'Your manager'} will see this.`,
    'About ten minutes now puts your view back in the picture.',
  ].join(' ');
}

/**
 * The lead's line: facts and what they do, never a label (Hafsah's wording, with the person's name and no guessed pronoun). The reason the person gave,
 * if they gave one, goes beside the fact it explains; the next step, a suggestion only, goes last.
 */
export function whatTheLeadReads(name: string, stand: Pick<WhereTheyStand, 'ofTheLastFour' | 'lastFour'> & { reason?: string | null; stage?: Stage }, label?: string | null): string {
  const where = label ? ` on "${label}"` : '';
  const reason = theirReasonBesideIt(name, stand.reason);
  const next = stand.stage ? theNextStepSuggested(name, stand.stage) : null;
  return [
    `${name} has missed ${stand.ofTheLastFour} of the last ${stand.lastFour} check-ins${where}.`,
    ...(reason ? [reason] : []),
    'When someone stops checking in, the team loses their view, problems surface late, and the effort to keep everyone in step falls on you and the rest of the team.',
    `Speak to ${name} this week.`,
    ...(next ? [next] : []),
  ].join(' ');
}

/** The reason, beside the lead's line, in the person's own words. */
export function theirReasonBesideIt(name: string, reason: string | null | undefined): string | null {
  const r = String(reason ?? '').replace(/\s+/g, ' ').trim();
  return r ? `${name} gave this reason: "${r}"` : null;
}

/** The next step, a suggestion only: the lead decides, and Groundwork does nothing by itself. */
export function theNextStepSuggested(name: string, stage: Stage): string | null {
  if (stage === A_SUPPORT_PLAN) return `${name} has kept missing check-ins since you were told. If talking has not helped, a support plan is the next step you could take. You decide, and Groundwork will not start one by itself.`;
  if (stage === A_FORMAL_PROCESS) return `${name} has still kept missing check-ins. If a support plan has not helped, a formal process in the performance suite is the next step you could take. You decide, and Groundwork will not start one by itself.`;
  return null;
}

/* ------------------------------------------------------------- the person, first ------------------------------------------------------------- */

const ENDED = [...A_GROUND_NO_MESSAGE_IS_ABOUT];

export interface WhatThePersonIsTold {
  groundId: string;
  organizationId: string;
  label: string;
  participantId: string;
  /** Their latest missed check-in, where the reason they give is kept. */
  latestMissedCheckInId: string | null;
  /** The reason they already gave in this run, if any. */
  reason: string | null;
  /** The session open for them now, if any, to check in on. */
  openCheckInId: string | null;
  stage: Stage;
  streakFrom: number | null;
  /** The lead's name where it can be said, otherwise null ("your manager"). */
  leadName: string | null;
  text: string;
}

/** The lead of a check-in, by the name a participant may be told, or null when there is no name to say. */
async function theLeadsName(prisma: any, groundId: string): Promise<string | null> {
  const lead = await prisma.groundParticipant?.findFirst?.({
    where: { groundId, partyType: 'INITIATOR' },
    select: { nameGiven: true, user: { select: { firstName: true, lastName: true } } },
  }).catch(() => null);
  const name = lead ? nameToCall(lead) : SOMEONE;
  return name && name !== SOMEONE ? name : null;
}

/** Whether somebody is waiting on them on this check-in, counting only waits that are confirmed (change 4). */
async function somebodyWaitsOn(prisma: any, participantId: string): Promise<boolean> {
  const waits: any[] = await prisma.groundDependency?.findMany?.({
    where: { onParticipantId: participantId, status: { not: 'CLEARED' } },
    select: { id: true, groundId: true, onParticipantId: true, what: true, status: true, triedSaid: true },
  }).catch(() => []) ?? [];
  if (!waits.length) return false;
  return (await theConfirmedWaits(prisma, waits)).size > 0;
}

/**
 * WHAT A PERSON IS TOLD ABOUT THEIR OWN MISSED CHECK-INS, on each check-in where they have missed two in a row or more. Only their own rows: nobody
 * else is ever told this, and the lead's own skipped sessions never reach here (whoHasMissedCheckIns leaves the lead out).
 */
export async function whatThePersonIsToldAboutMissing(prisma: any, userId: string, organizationId: string | null, now: Date = new Date()): Promise<WhatThePersonIsTold[]> {
  const mine: any[] = await prisma.groundParticipant?.findMany?.({
    where: { userId, leftAt: null, partyType: { not: 'INITIATOR' }, managingOnly: false, ground: { ...(organizationId ? { organizationId } : {}), status: { notIn: ENDED } } },
    select: { groundId: true },
  }).catch(() => []) ?? [];
  if (!mine.length) return [];
  const found = (await whoHasMissedCheckIns(prisma, [...new Set(mine.map((m) => m.groundId as string))], now)).filter((f) => f.userId === userId);
  const out: WhatThePersonIsTold[] = [];
  for (const f of found) {
    const g = await prisma.ground.findUnique({ where: { id: f.groundId }, select: { label: true, organizationId: true } }).catch(() => null);
    if (!g) continue;
    const open = await prisma.checkIn.findFirst({
      where: { participantId: f.participantId, isSetup: false, status: { in: ['NOT_STARTED', 'IN_PROGRESS'] }, OR: [{ availableFrom: null }, { availableFrom: { lte: now } }] },
      orderBy: { sessionNumber: 'desc' }, select: { id: true },
    }).catch(() => null);
    out.push({
      groundId: f.groundId,
      organizationId: g.organizationId,
      label: g.label,
      participantId: f.participantId,
      latestMissedCheckInId: f.latestMissedCheckInId,
      reason: f.stand.reason,
      openCheckInId: open?.id ?? null,
      stage: f.stand.stage,
      streakFrom: f.stand.streakFrom,
      leadName: await theLeadsName(prisma, f.groundId),
      text: '',
    });
    const t = out[out.length - 1];
    t.text = whatThePersonReads(f.stand, { leadName: t.leadName, somebodyWaitsOnThem: await somebodyWaitsOn(prisma, f.participantId) });
  }
  return out;
}

/**
 * THE REASON A PERSON GIVES, kept on their latest missed check-in. Only the person themselves can give it: the check-in must be theirs, and missed.
 * Returns false when it is not theirs or there is nothing missed to give a reason for.
 */
export async function keepTheirReason(prisma: any, userId: string, checkInId: string, reason: string, now: Date = new Date()): Promise<boolean> {
  const text = String(reason ?? '').replace(/\s+/g, ' ').trim().slice(0, 1000);
  if (!text) return false;
  const row = await prisma.checkIn.findUnique({ where: { id: checkInId }, select: { id: true, participant: { select: { userId: true, groundId: true } } } }).catch(() => null);
  if (!row || row.participant?.userId !== userId) return false;
  const told = await whatThePersonIsToldAboutMissing(prisma, userId, null, now);
  if (!told.some((t) => t.latestMissedCheckInId === checkInId)) return false;
  await prisma.checkIn.update({ where: { id: checkInId }, data: { missedReason: text, missedReasonAt: now } });
  return true;
}
