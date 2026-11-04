/**
 * THE CHECK FOR THE EXISTING CLIENTS, TO RUN ON A COPY OF THEIR DATA BEFORE RELEASE (decision 88).
 *
 * It answers three questions about every check-in that already exists, and it only ever READS:
 *
 *   1. Are the board, the report and the check-in page served without error to the check-in's lead,
 *      to one of its participants and to an admin of the organisation?
 *   2. Is anybody served something private that belongs to somebody else? That is: the lead's private
 *      notes, another person's own report, anybody's questions to Ask Groundwork, and another
 *      person's load across check-ins (which other check-ins they are in).
 *   3. Do the next session dates and the reminders match the schedule?
 *
 * It also says, for the check-ins already stalled, which of the new nightly jobs would now treat them
 * as live (see the findings in docs/existing-users.md).
 *
 * HOW IT STAYS READ ONLY.
 *   - It runs only against the database given with --database <address>. It never reads DATABASE_URL,
 *     so it cannot run on the wrong database by accident.
 *   - It refuses --write.
 *   - Before it reads anything it makes the connection read only at the database itself, proves that
 *     with a trial write that must be refused, and refuses every write the services try, naming it.
 *     A board, report or page that tries to write while it is being opened is reported as a fault,
 *     because opening one must never build anything (decision 7).
 *   - The model, the mailer and WhatsApp are replaced by stand-ins that refuse to be called, so
 *     nothing is generated, emailed or messaged.
 *
 * ON A DATABASE ON THIS MACHINE (localhost, 127.0.0.1 or [::1]):
 *
 *   npx ts-node -T journey/existing-clients-check.ts --database postgresql://localhost/gw_pw9_1786222102 --limit 40
 *
 * ON A HOSTED COPY OF THE LIVE DATA (staging), only whoever runs the release, with the same guard as
 * the word-for-word script: add --hosted-database. It then asks for the database's host name to be
 * typed back, and reads nothing unless the typed name is exactly the host in the address. Anything
 * else (a different name, no answer, no keyboard) reads nothing.
 *
 * Options: --limit <n> (the oldest n check-ins), --ground <id> (one check-in).
 *
 * The engine work only ever runs this on the local test database gw_pw9_1786222102.
 */
import * as readline from 'readline';
import { A_GROUND_THE_JOBS_LEAVE_ALONE } from '../src/modules/grounds/a-ground-that-has-ended';
import { hostOf, isOnThisMachine, theTypedHostMatches } from './stamp-said-word-for-word';
import { whatToDoToday } from '../src/modules/conversation/chasing-belongs-to-the-lead';

/* ------------------------------------------------------------------------------------------------ */
/* What this run may do, from the address and the flags alone.                                       */
/* ------------------------------------------------------------------------------------------------ */

export type WhatMayHappen =
  | { refused: true; why: string }
  | { refused: false; url: string; host: string; hosted: boolean; mustTypeTheHostBack: boolean; limit: number | null; ground: string | null };

export function valueOf(args: readonly string[], flag: string): string | null {
  const i = args.indexOf(flag);
  return i >= 0 && i + 1 < args.length && !args[i + 1].startsWith('--') ? args[i + 1] : null;
}

export function whatThisCheckMayDo(args: readonly string[]): WhatMayHappen {
  if (args.includes('--write') || args.includes('--hosted-write')) {
    return { refused: true, why: 'This check only reads. It has no way to write, so --write was refused and nothing was read.' };
  }
  const url = valueOf(args, '--database');
  if (!url) {
    return { refused: true, why: 'Give the database with --database <address>. This check never reads DATABASE_URL, so it cannot run on the wrong database by accident. Nothing was read.' };
  }
  const host = hostOf(url);
  if (!host) return { refused: true, why: 'The address given with --database is not a Postgres address, so nothing was read.' };
  const limitRaw = valueOf(args, '--limit');
  const limit = limitRaw === null ? null : Number.parseInt(limitRaw, 10);
  if (limitRaw !== null && (!Number.isFinite(limit as number) || (limit as number) < 1)) {
    return { refused: true, why: '--limit needs a whole number of one or more. Nothing was read.' };
  }
  const ground = valueOf(args, '--ground');
  if (isOnThisMachine(url)) return { refused: false, url, host, hosted: false, mustTypeTheHostBack: false, limit, ground };
  if (!args.includes('--hosted-database')) {
    return { refused: true, why: `The address points to ${host}, which is not on this machine. This check reads a hosted database only when whoever runs the release adds --hosted-database. Nothing was read.` };
  }
  return { refused: false, url, host, hosted: true, mustTypeTheHostBack: true, limit, ground };
}

import { ATriedToWrite, installTheGuard, makeTheDatabaseReadOnly, withOneConnection, outcomeOf } from './the-read-only-guard';
import type { Outcome } from './the-read-only-guard';
export { ATriedToWrite, installTheGuard, makeTheDatabaseReadOnly, withOneConnection, outcomeOf };
export type { Outcome };

/* ------------------------------------------------------------------------------------------------ */
/* Private material, and the search for it in what was served.                                       */
/* ------------------------------------------------------------------------------------------------ */

const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const LONG_ENOUGH = 40;

export type PrivateKind = "the lead's private notes" | "another person's own report" | 'a question to Ask Groundwork' | "another person's load across check-ins";

export interface APrivateThing {
  kind: PrivateKind;
  /** Who it belongs to; they may read it. Null: nobody may read it in a board, report or page. */
  ownerUserId: string | null;
  /** The normalised text to look for. Never printed. */
  needle: string;
}

/** Whole sentences (at least 40 characters once cleaned) from one piece of private text. */
export function sentencesWorthLookingFor(text: string | null | undefined): string[] {
  if (!text) return [];
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map(norm)
    .filter((s) => s.length >= LONG_ENOUGH);
}

export function theThingsKeptPrivate(input: {
  leadNotes: { text: string }[];
  ownReports: { userId: string | null; text: string | null }[];
  askQuestions: { text: string }[];
  /** For each person in the check-in: the labels of the OTHER check-ins they are in. */
  otherCheckIns: { userId: string; labels: string[] }[];
}): APrivateThing[] {
  const out: APrivateThing[] = [];
  for (const n of input.leadNotes) for (const s of sentencesWorthLookingFor(n.text)) out.push({ kind: "the lead's private notes", ownerUserId: null, needle: s });
  for (const r of input.ownReports) for (const s of sentencesWorthLookingFor(r.text)) out.push({ kind: "another person's own report", ownerUserId: r.userId, needle: s });
  for (const q of input.askQuestions) { const s = norm(q.text); if (s.length >= LONG_ENOUGH) out.push({ kind: 'a question to Ask Groundwork', ownerUserId: null, needle: s }); }
  for (const p of input.otherCheckIns) for (const label of p.labels) { const s = norm(label); if (s.length >= 12) out.push({ kind: "another person's load across check-ins", ownerUserId: p.userId, needle: s }); }
  return out;
}

/** What in the private pile appears in what was served to this reader. The owner may read their own. */
export function whatLeaked(servedText: string, readerUserId: string, pile: APrivateThing[], readerIsTheLead: boolean): PrivateKind[] {
  const hay = ` ${norm(servedText)} `;
  const found = new Set<PrivateKind>();
  for (const t of pile) {
    if (t.ownerUserId && t.ownerUserId === readerUserId) continue;
    if (t.kind === "the lead's private notes" && readerIsTheLead) continue;
    if (hay.includes(` ${t.needle} `) || hay.includes(t.needle)) found.add(t.kind);
  }
  return [...found];
}

/* ------------------------------------------------------------------------------------------------ */
/* The schedule.                                                                                     */
/* ------------------------------------------------------------------------------------------------ */

export interface AGroundToSchedule {
  id: string;
  label: string;
  status: string;
  cadence: string;
  timelineDays: number;
  runsUntilEnded: boolean | null;
  endsAt: Date | null;
  chaseAfterDays: number[];
  chasingStopped: boolean;
  tellTheLead: boolean;
  participants: { id: string; userId: string | null; managingOnly: boolean; lastNudgedAt: Date | null }[];
  checkIns: {
    id: string; participantId: string; sessionNumber: number; status: string; availableFrom: Date | null;
    completedAt: Date | null; createdAt: Date; isFinal: boolean | null; leadToldAt: Date | null;
  }[];
}

const STEP_DAYS: Record<string, number> = { DAILY: 1, WEEKLY: 7, FORTNIGHTLY: 14, MONTHLY: 31 };
const LIVE = (status: string) => !['RESOLVED', 'CLOSED', 'PAUSED', 'STALLED'].includes(status);
const day = (d: Date) => d.toISOString().slice(0, 10);

export interface TheSchedule {
  problems: string[];
  nextOpens: Date | null;
  openNow: number;
  nudgesToday: number;
  leadToldToday: number;
}

/**
 * What the schedule says for one check-in, and where the stored dates do not follow from it.
 * A session is expected to open between the day the person finished the one before it and one
 * cadence step after that (plus a week, for a fixed weekday and for days nobody works).
 */
export function theScheduleOf(g: AGroundToSchedule, now: Date): TheSchedule {
  const out: TheSchedule = { problems: [], nextOpens: null, openNow: 0, nudgesToday: 0, leadToldToday: 0 };
  if (!LIVE(g.status)) return out;
  const step = STEP_DAYS[g.cadence];
  const byPerson = new Map<string, AGroundToSchedule['checkIns']>();
  for (const c of g.checkIns) byPerson.set(c.participantId, [...(byPerson.get(c.participantId) ?? []), c]);

  for (const p of g.participants) {
    if (p.managingOnly) continue;
    const mine = (byPerson.get(p.id) ?? []).sort((a, b) => a.sessionNumber - b.sessionNumber);
    const latest = mine[mine.length - 1];
    if (!latest) continue;
    const who = `${g.label}, ${p.userId ? `person ${p.userId.slice(0, 8)}` : `invited person ${p.id.slice(0, 8)}`}`;

    if (latest.status === 'COMPLETED' && !latest.isFinal && step && !g.runsUntilEnded) {
      const planned = Math.max(1, Math.floor(g.timelineDays / step));
      const endsBefore = g.endsAt && g.endsAt <= now;
      if (latest.sessionNumber < planned && !endsBefore) {
        out.problems.push(`${who}: finished session ${latest.sessionNumber} on ${latest.completedAt ? day(latest.completedAt) : 'an unknown day'} and has no next session, though ${planned} are planned.`);
      }
    }

    if (latest.status === 'NOT_STARTED') {
      if (latest.availableFrom && (!out.nextOpens || latest.availableFrom < out.nextOpens) && latest.availableFrom > now) out.nextOpens = latest.availableFrom;
      const previous = mine.filter((c) => c.sessionNumber === latest.sessionNumber - 1 && c.completedAt)[0];
      if (previous?.completedAt && latest.availableFrom && step) {
        const earliest = previous.completedAt.getTime() - 86_400_000;
        const latestOk = previous.completedAt.getTime() + (step + 8) * 86_400_000;
        if (latest.availableFrom.getTime() < earliest || latest.availableFrom.getTime() > latestOk) {
          out.problems.push(`${who}: session ${latest.sessionNumber} opens on ${day(latest.availableFrom)}, which does not follow from finishing session ${previous.sessionNumber} on ${day(previous.completedAt)} on a ${g.cadence.toLowerCase()} schedule.`);
        }
      }
      const open = !latest.availableFrom || latest.availableFrom <= now;
      if (open) {
        out.openNow += 1;
        const decided = whatToDoToday({
          policy: { days: g.chaseAfterDays, stopped: g.chasingStopped, tellTheLead: g.tellTheLead },
          daysOpen: Math.floor((now.getTime() - latest.createdAt.getTime()) / 86_400_000),
          hoursSinceLastNudge: p.lastNudgedAt ? (now.getTime() - p.lastNudgedAt.getTime()) / 3_600_000 : null,
          leadAlreadyTold: latest.leadToldAt !== null,
        });
        if (decided.do === 'nudge them') out.nudgesToday += 1;
        if (decided.do === 'tell the lead') out.leadToldToday += 1;
      }
    }
  }
  return out;
}

/* ------------------------------------------------------------------------------------------------ */
/* The run.                                                                                          */
/* ------------------------------------------------------------------------------------------------ */

export interface Reader { role: 'lead' | 'participant' | 'admin'; userId: string; organizationId: string }
export type Read = 'board' | 'report' | 'check-in page';

/** What the services serve. Handed in, so a test can run the whole check with stand-ins. */
export interface Serves {
  board(groundId: string, r: Reader): Promise<unknown>;
  report(groundId: string, r: Reader): Promise<unknown>;
  page(groundId: string, r: Reader): Promise<unknown>;
}

export interface TheCheckInsData {
  grounds: (AGroundToSchedule & {
    organizationId: string; initiatorId: string;
    participants: (AGroundToSchedule['participants'][number] & { soloArtifact: string | null })[];
  })[];
  /** Readers for one check-in: its lead, up to two participants, and an admin who is not a party. */
  readersOf(g: { id: string; organizationId: string; initiatorId: string }): Promise<Reader[]>;
  privatePileFor(g: { id: string; organizationId: string; label: string }): Promise<APrivateThing[]>;
  /** For stalled check-ins: how many things each new nightly job would now pick up. */
  whatTheNewJobsWouldPickUpOnStalled(): Promise<Record<string, number>>;
}

export interface TheResult {
  checkIns: number;
  reads: Record<Outcome, number>;
  byReader: Record<Reader['role'], Record<Outcome, number>>;
  faults: string[];
  leaks: string[];
  scheduleProblems: string[];
  nextSessionsDated: number;
  openNow: number;
  nudgesToday: number;
  leadToldToday: number;
  stalled: Record<string, number>;
  writesRefused: string[];
  /** Why readers were refused on purpose, and how often. */
  refusals: Record<string, number>;
}

const none = (): Record<Outcome, number> => ({ served: 0, refused: 0, failed: 0, wrote: 0 });

export async function checkEverything(data: TheCheckInsData, serves: Serves, now: Date, say: (line: string) => void, writesRefused: string[] = []): Promise<TheResult> {
  const result: TheResult = {
    checkIns: data.grounds.length, reads: none(), byReader: { lead: none(), participant: none(), admin: none() },
    faults: [], leaks: [], scheduleProblems: [], nextSessionsDated: 0, openNow: 0, nudgesToday: 0, leadToldToday: 0,
    stalled: {}, writesRefused, refusals: {},
  };
  let done = 0;
  for (const g of data.grounds) {
    done += 1;
    if (done % 25 === 0) say(`${done} of ${data.grounds.length} check-ins read so far.`);
    const schedule = theScheduleOf(g, now);
    result.scheduleProblems.push(...schedule.problems);
    if (schedule.nextOpens) result.nextSessionsDated += 1;
    result.openNow += schedule.openNow;
    result.nudgesToday += schedule.nudgesToday;
    result.leadToldToday += schedule.leadToldToday;

    const readers = await data.readersOf(g);
    const pile = await data.privatePileFor(g);
    for (const r of readers) {
      const reads: [Read, () => Promise<unknown>][] = [
        ['board', () => serves.board(g.id, r)],
        ['report', () => serves.report(g.id, r)],
        ['check-in page', () => serves.page(g.id, r)],
      ];
      for (const [name, serve] of reads) {
        try {
          const served = await serve();
          result.reads.served += 1;
          result.byReader[r.role].served += 1;
          const leaked = whatLeaked(JSON.stringify(served ?? null), r.userId, pile, r.role === 'lead');
          for (const kind of leaked) result.leaks.push(`"${g.label}": the ${name} served to a ${r.role} (person ${r.userId.slice(0, 8)}) holds something from ${kind}.`);
        } catch (err) {
          const { outcome, why } = outcomeOf(err);
          result.reads[outcome] += 1;
          result.byReader[r.role][outcome] += 1;
          if (outcome === 'refused') { const k = `${r.role}, ${name}: ${why}`; result.refusals[k] = (result.refusals[k] ?? 0) + 1; }
          if (outcome === 'failed') result.faults.push(`"${g.label}": the ${name} could not be served to a ${r.role} (person ${r.userId.slice(0, 8)}): ${why}`);
          if (outcome === 'wrote') result.faults.push(`"${g.label}": the ${name} tried to write while being opened for a ${r.role}: ${why}`);
        }
      }
    }
  }
  result.stalled = await data.whatTheNewJobsWouldPickUpOnStalled();
  return result;
}

const n = (x: number, one: string, many: string) => `${x} ${x === 1 ? one : many}`;

export function theSummary(r: TheResult, where: string): string[] {
  const total = r.reads.served + r.reads.refused + r.reads.failed + r.reads.wrote;
  const lines = [
    `Read ${n(r.checkIns, 'check-in', 'check-ins')} on ${where}. Nothing was written, emailed or generated.`,
    `The board, the report and the check-in page were read ${total} times. ${r.reads.served} were served, ${r.reads.refused} were refused on purpose to a reader who may not open them, ${r.reads.failed} failed, and ${r.reads.wrote} tried to write.`,
    `By reader: leads were served ${r.byReader.lead.served} of ${r.byReader.lead.served + r.byReader.lead.refused + r.byReader.lead.failed + r.byReader.lead.wrote}, participants ${r.byReader.participant.served} of ${r.byReader.participant.served + r.byReader.participant.refused + r.byReader.participant.failed + r.byReader.participant.wrote}, and admins ${r.byReader.admin.served} of ${r.byReader.admin.served + r.byReader.admin.refused + r.byReader.admin.failed + r.byReader.admin.wrote}.`,
    r.leaks.length === 0
      ? "Nobody was served the lead's private notes, another person's own report, a question to Ask Groundwork, or another person's load across check-ins."
      : `${n(r.leaks.length, 'private thing was', 'private things were')} found in what a reader was served. They are listed below.`,
    r.scheduleProblems.length === 0
      ? `${n(r.nextSessionsDated, 'check-in has', 'check-ins have')} a next session with a date, and every date follows from the schedule.`
      : `${n(r.scheduleProblems.length, 'next session does not', 'next sessions do not')} follow from the schedule. They are listed below.`,
    `Right now ${n(r.openNow, 'person has', 'people have')} a session open, ${n(r.nudgesToday, 'person would be', 'people would be')} reminded on the next morning run, and ${n(r.leadToldToday, 'lead would be', 'leads would be')} told who has not started. These use the same rule as the live main line.`,
  ];
  const stalled = Object.entries(r.stalled).filter(([, v]) => v > 0);
  if (stalled.length) {
    lines.push(`Stalled check-ins that the new nightly jobs would now pick up as if they were live: ${stalled.map(([k, v]) => `${v} for ${k}`).join(', ')}. This is finding 1 in docs/existing-users.md, and it should never print now.`);
  } else {
    lines.push('No stalled check-in is picked up by the nightly jobs, as on the live main line.');
  }
  for (const [why, c] of Object.entries(r.refusals).sort((a, b) => b[1] - a[1]).slice(0, 8)) lines.push(`Refused on purpose ${c} ${c === 1 ? 'time' : 'times'}, to a ${why}`);
  if (r.writesRefused.length) lines.push(`${n(r.writesRefused.length, 'write was', 'writes were')} refused: ${[...new Set(r.writesRefused)].join(', ')}.`);
  for (const f of r.faults) lines.push(`FAULT: ${f}`);
  for (const l of r.leaks) lines.push(`LEAK: ${l}`);
  for (const p of r.scheduleProblems.slice(0, 50)) lines.push(`SCHEDULE: ${p}`);
  if (r.scheduleProblems.length > 50) lines.push(`SCHEDULE: and ${r.scheduleProblems.length - 50} more.`);
  const bad = r.faults.length + r.leaks.length + r.scheduleProblems.length;
  lines.push(bad === 0 ? 'Nothing needs attention.' : `${n(bad, 'thing needs', 'things need')} attention.`);
  return lines;
}

/* ------------------------------------------------------------------------------------------------ */
/* The real data and the real services (not used by the specs).                                      */
/* ------------------------------------------------------------------------------------------------ */

export function dataFrom(prisma: any, opts: { limit: number | null; ground: string | null }): () => Promise<TheCheckInsData> {
  return async () => {
    const grounds: any[] = await prisma.ground.findMany({
      where: opts.ground ? { id: opts.ground } : {},
      orderBy: { createdAt: 'asc' },
      ...(opts.limit ? { take: opts.limit } : {}),
      select: {
        id: true, label: true, status: true, organizationId: true, initiatorId: true, cadence: true, timelineDays: true, runsUntilEnded: true,
        endsAt: true, chaseAfterDays: true, chasingStopped: true, tellTheLead: true,
        participants: { select: { id: true, userId: true, managingOnly: true, lastNudgedAt: true, soloArtifact: true } },
        checkIns: { select: { id: true, participantId: true, sessionNumber: true, status: true, availableFrom: true, completedAt: true, createdAt: true, isFinal: true, leadToldAt: true } },
      },
    });
    const userIds = [...new Set(grounds.flatMap((g) => g.participants.map((p: any) => p.userId).filter(Boolean)))] as string[];
    const users: any[] = await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, organizationId: true, deletedAt: true } });
    const userById = new Map(users.map((u) => [u.id, u]));

    return {
      grounds,
      async readersOf(g) {
        const full = grounds.find((x) => x.id === g.id)!;
        const live = (id: string | null) => !!id && userById.has(id) && !userById.get(id).deletedAt;
        const readers: Reader[] = [];
        const lead = await prisma.user.findUnique({ where: { id: g.initiatorId }, select: { id: true, organizationId: true, deletedAt: true } });
        if (lead && !lead.deletedAt) readers.push({ role: 'lead', userId: lead.id, organizationId: g.organizationId });
        for (const p of full.participants.filter((p: any) => p.userId && p.userId !== g.initiatorId && live(p.userId)).slice(0, 2)) {
          readers.push({ role: 'participant', userId: p.userId, organizationId: g.organizationId });
        }
        const partyIds = full.participants.map((p: any) => p.userId).filter(Boolean) as string[];
        const admin = await prisma.user.findFirst({
          where: { organizationId: g.organizationId, role: 'ADMIN', isActive: true, deletedAt: null, id: { notIn: [...partyIds, g.initiatorId] } },
          select: { id: true },
        });
        if (admin) readers.push({ role: 'admin', userId: admin.id, organizationId: g.organizationId });
        return readers;
      },
      async privatePileFor(g) {
        const full = grounds.find((x) => x.id === g.id)!;
        const notes: any[] = await prisma.leadContextNote.findMany({ where: { groundId: g.id, audience: 'LEAD_ONLY' }, select: { text: true } });
        const partyUsers = full.participants.map((p: any) => p.userId).filter(Boolean) as string[];
        const asked: any[] = await prisma.assistantTurn.findMany({ where: { organizationId: g.organizationId, role: 'person' }, select: { content: true }, take: 500, orderBy: { createdAt: 'desc' } });
        const here = new Set<string>(partyUsers);
        const others: any[] = partyUsers.length
          ? await prisma.groundParticipant.findMany({
              where: { userId: { in: partyUsers }, groundId: { not: g.id } },
              select: { userId: true, ground: { select: { label: true, participants: { select: { userId: true } } } } },
            })
          : [];
        const labelsBy = new Map<string, string[]>();
        for (const o of others) {
          if (o.ground.label === g.label) continue;
          const readersInIt = new Set<string>(o.ground.participants.map((p: any) => p.userId).filter(Boolean));
          // Only a load that somebody else here is NOT also in is private from them.
          if ([...here].every((u) => u === o.userId || !readersInIt.has(u))) labelsBy.set(o.userId, [...(labelsBy.get(o.userId) ?? []), o.ground.label]);
        }
        return theThingsKeptPrivate({
          leadNotes: notes,
          ownReports: full.participants.map((p: any) => ({ userId: p.userId, text: p.soloArtifact })),
          askQuestions: asked.map((a) => ({ text: a.content })),
          otherCheckIns: [...labelsBy].map(([userId, labels]) => ({ userId, labels })),
        });
      },
      async whatTheNewJobsWouldPickUpOnStalled() {
        const now = new Date();
        /* The jobs read the same list as the check: once STALLED is in it, no job picks a stalled check-in up. */
        if ((A_GROUND_THE_JOBS_LEAVE_ALONE as string[]).includes('STALLED')) return {} as Record<string, number>;
        const stalled = { ground: { status: 'STALLED' as const } };
        return {
          'the "your check-in is open" email': await prisma.checkIn.count({ where: { sessionNumber: { gt: 1 }, status: 'NOT_STARTED', sessionReadyNotifiedAt: null, availableFrom: { lte: now }, participant: { userId: { not: null }, ...stalled } } }),
          'the "opened" announcement': await prisma.checkIn.count({ where: { status: 'NOT_STARTED', openedAnnouncedAt: null, OR: [{ availableFrom: null }, { availableFrom: { lte: now } }], participant: { userId: { not: null }, ...stalled } } }),
          'the reminder that a shared report is waiting': await prisma.groundParticipant.count({ where: { userId: { not: null }, partyType: 'PARTICIPANT', ground: { status: 'STALLED', report: { releasedAt: { not: null } } }, reportActivations: { none: { status: 'ACTIVATED' } }, checkIns: { some: { status: 'COMPLETED' } } } }),
          'the morning WhatsApp reminder': await prisma.checkIn.count({ where: { status: 'NOT_STARTED', OR: [{ availableFrom: null }, { availableFrom: { lte: now } }], participant: { userId: { not: null }, ...stalled } } }),
        };
      },
    };
  };
}

async function realServes(onRefused: (what: string) => void): Promise<{ serves: Serves; close: () => Promise<void> }> {
  process.env.EMAIL_SENDS_FOR_REAL = 'false';
  process.env.NODE_ENV = 'test';
  const { Test } = await import('@nestjs/testing');
  const { AppModule } = await import('../src/app.module');
  const { PrismaService } = await import('../src/modules/prisma/prisma.service');
  const { AnthropicService } = await import('../src/modules/conversation/anthropic.service');
  const { EmailService } = await import('../src/modules/email/email.service');
  const { WhatsAppService } = await import('../src/modules/whatsapp/whatsapp.service');
  const { BoardService } = await import('../src/modules/board/board.service');
  const { ReportsService } = await import('../src/modules/reports/reports.service');
  const { GroundsService } = await import('../src/modules/grounds/grounds.service');
  const refuses = (what: string) => new Proxy({}, { get: (_t, name: string) => (name === 'then' ? undefined : () => { throw new ATriedToWrite(`${what}.${name} (the check calls neither the model, the mailer nor WhatsApp)`); }) });
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(AnthropicService).useValue(refuses('the model'))
    .overrideProvider(EmailService).useValue(refuses('email'))
    .overrideProvider(WhatsAppService).useValue(refuses('WhatsApp'))
    .compile();
  // The services read through their own client. It gets the same two guards before its first query.
  const live: any = moduleRef.get(PrismaService, { strict: false });
  installTheGuard(live, onRefused);
  await makeTheDatabaseReadOnly(live);
  const board = moduleRef.get(BoardService, { strict: false });
  const reports = moduleRef.get(ReportsService, { strict: false });
  const grounds = moduleRef.get(GroundsService, { strict: false });
  return {
    serves: {
      board: (id, r) => board.get(id, r.userId, 'text'),
      report: (id, r) => reports.get(id, r.userId, r.organizationId),
      page: (id, r) => grounds.get(id, r.organizationId, r.userId),
    },
    close: () => moduleRef.close(),
  };
}

function askOnTheKeyboard(question: string): Promise<string | null> {
  if (!process.stdin.isTTY) return Promise.resolve(null);
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (answer) => { rl.close(); resolve(answer); }));
}

export async function run(opts: {
  args: readonly string[];
  ask: (question: string) => Promise<string | null>;
  say: (line: string) => void;
}): Promise<{ read: boolean; refused: string | null; result?: TheResult }> {
  const may = whatThisCheckMayDo(opts.args);
  if (may.refused) {
    opts.say(may.why);
    return { read: false, refused: may.why };
  }
  if (may.mustTypeTheHostBack) {
    const typed = await opts.ask(`To read the database at ${may.host}, type its host name exactly: `);
    if (!theTypedHostMatches(typed, may.host)) {
      const why = 'The host name typed back did not match the database, so nothing was read.';
      opts.say(why);
      return { read: false, refused: why };
    }
  }
  // The address given on the command line is the only one this process may use.
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = withOneConnection(may.url);
  const { PrismaClient } = await import('@prisma/client');
  const prisma: any = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } }, log: [] });
  const refusedWrites: string[] = [];
  try {
    installTheGuard(prisma, (what) => refusedWrites.push(what));
    await makeTheDatabaseReadOnly(prisma, true);
    opts.say(`Connected to ${may.host} for reading only. A trial write was refused, as it must be.`);
    const real = await realServes((what) => refusedWrites.push(what));
    try {
      const load = dataFrom(prisma, { limit: may.limit, ground: may.ground });
      const data = await load();
      const result = await checkEverything(data, real.serves, new Date(), opts.say, refusedWrites);
      for (const line of theSummary(result, may.host)) opts.say(line);
      return { read: true, refused: null, result };
    } finally {
      await real.close().catch(() => undefined);
    }
  } finally {
    await prisma.$disconnect().catch(() => undefined);
  }
}

if (require.main === module) {
  run({ args: process.argv.slice(2), ask: askOnTheKeyboard, say: (line) => console.log(line) })
    .then((r) => process.exit(r.refused ? 1 : r.result && (r.result.faults.length || r.result.leaks.length || r.result.scheduleProblems.length) ? 3 : 0))
    .catch((err) => {
      console.error(err?.message ?? err);
      process.exit(2);
    });
}
