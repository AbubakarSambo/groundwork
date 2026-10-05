/**
 * BRING A CHECK-IN'S RECORD UP TO TODAY'S RULES (screens request 117).
 *
 * Several faults the fifth review of "Sales team, Q3" found were fixed in the code before the review, but the rows
 * that check-in already held were written before the fixes, and nothing rewrites a stored row when a board is
 * opened (decision 7). This reads each check-in's stored record again under today's rules, the same functions the
 * engine now uses when it writes, and brings the rows up to date. It asks nothing new of anybody, calls no model,
 * and changes nobody's words: a person's turns and their record lines are only read.
 *
 * What it does, each from a rule the engine already follows when it writes:
 *   1. A wait on oneself is taken off (request 111 e: nobody waits on themselves, a740e362).
 *   2. A count read off a line that only said the aim goes back to where it was (requests 109 a and 111 b, 10e3fe89).
 *   3. The team's aim with no number keeps the figure in its own name (request 111 b and 117, part 2).
 *   4. The team's aim said again, by anybody, as a target of its own is taken off, and the day it gave is kept on
 *      the team's aim (requests 109 b and 111 b, a740e362).
 *   5. A person's own aim keeps the thing counted as its name and the day as its date (request 117, part 11).
 *   6. A deal added on the board with nobody's name on it, which somebody then said in their own words was theirs,
 *      gets that claim put to the lead, who answers it on her board (decision 76, item 3). Nobody's name is set.
 *   7. A stored report that speaks of meetings where nobody mentioned one has that line taken out (screens requests
 *      127, 129, 130, 131, 132, 134, 135, 136, and Hafsah's ask in 140). The line is already left out when a board
 *      is served, but the row still holds it, so anything else that reads the row still reads the line.
 *
 * What it cannot do, because only the model reads it: a number somebody reported (Neema's "I signed Karen Hardware
 * on 22 September" is not counted against her 4 shops in Karen), which wait a person meant (Neema's "waiting on the
 * warehouse"), and what the written report and the judgement say (findings, moves). Those are read again when the
 * next check-in comes in. A rule that took off every wait on a label the person never typed was tried for Neema's,
 * and over this Mac's test database it would have taken off 310 waits, most of them real, so it is not here.
 *
 * ON A DATABASE ON THIS MACHINE (localhost, 127.0.0.1 or [::1]):
 *
 *   DATABASE_URL=postgresql://localhost/gw_... npx ts-node -T journey/bring-a-check-in-up-to-date.ts --dry-run
 *   DATABASE_URL=postgresql://localhost/gw_... npx ts-node -T journey/bring-a-check-in-up-to-date.ts
 *
 * Add --check-in <id> to read one check-in only.
 *
 * ON A HOSTED DATABASE (decision 74, item 5), only whoever runs the release, as a release step, with the same guard
 * as the word-for-word script:
 *   1. With --hosted-database alone it is a dry run: it prints what would change, and writes nothing.
 *   2. With --hosted-database --write it prints the same, then asks for the database's host name to be typed back,
 *      and writes only when the typed name is exactly the host in DATABASE_URL. A different name, an empty answer,
 *      or no keyboard (a pipe or a scheduled job) writes nothing.
 *   Without --hosted-database it refuses any database not on this machine.
 *
 * The engine work never runs it on anything but a local gw_ database.
 */
import * as readline from 'readline';
import { whatThisRunMayDo, theTypedHostMatches } from './stamp-said-word-for-word';
import { aWaitOnOneself } from '../src/modules/board/a-thing-is-not-somebody';
import { theLineIsTheAim } from '../src/modules/board/what-the-record-says-a-number-is';
import { theAimsThatAreNew, theCountTheNameAimsAt } from '../src/modules/conversation/an-aim-said-twice-is-one-aim';
import { theDayKeptApart } from '../src/modules/board/an-aim-is-a-sentence-about-somebody';
import { theDayTheyMeant } from '../src/modules/grounds/when-a-handoff-is-due';
import { theClaimOn, withAClaim } from '../src/modules/board/a-claim-on-a-record-is-checked-first';
import { theDayInWords } from '../src/modules/board/the-day-in-words';
import { aMeetingIsOnRecord, THE_MEETINGS_LINE } from '../src/modules/reports/what-the-record-shows-over-time';

export type AChangeKind =
  | 'a wait on oneself'
  | 'a count that was the aim'
  | 'the number in the aim\'s name'
  | 'the aim said again'
  | 'the day kept apart'
  | 'a claim for the lead'
  | 'a meeting nobody mentioned';

export interface AChange {
  groundId: string;
  kind: AChangeKind;
  id: string;
  says: string;
  /** What is written, as plain data, so a test can read it and the write can do it. */
  write:
    | { table: 'groundDependency'; delete: true }
    | { table: 'groundObjective'; delete: true }
    | { table: 'groundObjective'; data: Record<string, unknown>; snapshotsBackTo?: number; atSession?: number | null }
    | { table: 'workItem'; data: Record<string, unknown> }
    | { table: 'report'; data: Record<string, unknown> };
}

export interface WhatWouldChange {
  checkIns: number;
  changes: AChange[];
  /** What today's rules would change, but this leaves for the lead, with why. Nothing here is written. */
  left: string[];
}

const nameOf = (p: any): string =>
  [p?.user?.firstName, p?.user?.lastName].filter(Boolean).join(' ').trim() || (p?.nameGiven ?? '').trim() || 'A colleague';
const squash = (t: string) => (t ?? '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const inMarks = (t: string) => `"${String(t ?? '').trim().replace(/[.!?]+$/, '')}"`;
const FIRST_PERSON = /^(?:i|i'm|i've|i'll|i am|i have|i will|we|we've|we're|we'll|my|our)\b/i;

/** Reads only. Works out, for every check-in (or the one asked for), what today's rules would change. */
export async function whatWouldChange(prisma: any, onlyCheckIn: string | null = null): Promise<WhatWouldChange> {
  const grounds = await prisma.ground.findMany({
    where: onlyCheckIn ? { id: onlyCheckIn } : {},
    select: {
      id: true, label: true, initiatorId: true,
      participants: { select: { id: true, userId: true, partyType: true, nameGiven: true, user: { select: { firstName: true, lastName: true } } } },
    },
  });
  const out: WhatWouldChange = { checkIns: grounds.length, changes: [], left: [] };
  for (const g of grounds) {
    const people = new Map<string, any>((g.participants ?? []).map((p: any) => [p.id, p]));
    const lead = (g.participants ?? []).find((p: any) => p.partyType === 'INITIATOR' || (!!g.initiatorId && p.userId === g.initiatorId));
    const label = (g.label ?? '').trim() || 'A check-in';
    const push = (c: Omit<AChange, 'groundId'>) => out.changes.push({ groundId: g.id, ...c });

    const [waits, objectives, items, lines, checkIns] = await Promise.all([
      prisma.groundDependency.findMany({
        where: { groundId: g.id },
        select: { id: true, fromParticipantId: true, onParticipantId: true, onLabel: true, what: true, sourceCheckInId: true },
      }),
      prisma.groundObjective.findMany({
        where: { groundId: g.id },
        select: { id: true, name: true, target: true, count: true, prevCount: true, ownerParticipantId: true, setByParticipantId: true, dueOn: true, suggestedCount: true, suggestedSaid: true, suggestedAtSession: true, createdAt: true, sortOrder: true },
        orderBy: [{ createdAt: 'asc' }, { sortOrder: 'asc' }],
      }),
      prisma.workItem.findMany({
        where: { groundId: g.id },
        select: { id: true, kind: true, name: true, ownerParticipantId: true, fields: true, sourceEntryId: true, addedByUserId: true },
      }),
      prisma.recordEntry.findMany({
        where: { participant: { groundId: g.id }, disputedAt: null },
        select: { id: true, participantId: true, checkInId: true, type: true, text: true, saidWordForWord: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.checkIn.findMany({ where: { groundId: g.id }, select: { id: true, sessionNumber: true } }),
    ]);

    /* 1: the waits. */
    for (const d of waits as any[]) {
      const who = nameOf(people.get(d.fromParticipantId));
      if (aWaitOnOneself(d)) {
        push({ kind: 'a wait on oneself', id: d.id, write: { table: 'groundDependency', delete: true },
          says: `${label}: ${who}'s own thing to do, ${inMarks(d.what)}, is stored as a wait on ${d.onLabel ? `"${d.onLabel}"` : 'themselves'}. It would be taken off, because nobody waits on themselves.` });
      }
    }

    /* 2: a count that was the aim said, landed from a line of the lead's. */
    /* In the order they were made, then their place on the board: the first of the team's is the aim. */
    const time = (d: any) => (d ? new Date(d).getTime() : 0);
    const objs = (objectives as any[]).map((o, at) => ({ ...o, at }))
      .sort((a, b) => time(a.createdAt) - time(b.createdAt) || (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.at - b.at)
      .map((o, order) => ({ ...o, order }));
    for (const o of objs) {
      const landed = o.suggestedCount == null && !!o.suggestedSaid && o.count > 0;
      if (!landed) continue;
      const line = (lines as any[]).find((l) => squash(l.text).includes(squash(o.suggestedSaid)) || squash(o.suggestedSaid).includes(squash(l.text)));
      if (!theLineIsTheAim(o.count, o, o.suggestedSaid, line?.type ?? null)) continue;
      const back = Math.min(o.prevCount ?? 0, o.count);
      push({ kind: 'a count that was the aim', id: o.id, write: { table: 'groundObjective', data: { count: back, suggestedSaid: null, suggestedAtSession: null }, snapshotsBackTo: back, atSession: o.suggestedAtSession ?? null },
        says: `${label}: the target ${inMarks(o.name)} is stored at ${o.count}, read from a line that only said the aim: ${inMarks(o.suggestedSaid)}. It would go back to ${back}.` });
      o.count = back;
    }

    /* 3: the team's aim with no number keeps the figure in its own name. */
    const team = objs.filter((o) => !o.ownerParticipantId);
    for (const o of team) {
      if (o.target != null) continue;
      const n = theCountTheNameAimsAt(o.name);
      if (n == null) continue;
      push({ kind: 'the number in the aim\'s name', id: o.id, write: { table: 'groundObjective', data: { target: n } },
        says: `${label}: the team's aim ${inMarks(o.name)} has no number, though its own name holds ${n}. It would hold ${n}.` });
      o.target = n;
    }

    /* 4: the team's aim said again as a target of its own. The first team aim, in the order they were made, is the aim. */
    const gone = new Set<string>();
    for (const o of objs) {
      if (gone.has(o.id)) continue;
      /* The lead's own aim, said again, belongs here too (request 121, part 2): "I want to get 12 shops onboarded" was stored as
         the lead's own, with no number, though its own name holds the team's 12. Somebody else's own aim with no number is theirs, and stays. */
      const mayReadFigureFromName = !o.ownerParticipantId || (!!lead && o.ownerParticipantId === lead.id);
      const figure = o.target ?? (mayReadFigureFromName ? theCountTheNameAimsAt(o.name) : null);
      const aims = team.filter((t) => t.id !== o.id && !gone.has(t.id) && t.order < o.order);
      const theTeams = aims.find((t) => !theAimsThatAreNew([{ name: o.name, target: figure }], [{ name: t.name, target: t.target }]).length);
      if (!theTeams) continue;
      /*
       * ONLY THE SAME FIGURE, AS THE RULE THE ENGINE WRITES BY (putOwnedTargetsOnTheRecord): the team's number said
       * again. Two names with no number, or two different numbers, are left as they are: read over this Mac's test
       * database, matching on words alone would have merged "new client engagements" into "revenue coming in".
       */
      if (figure == null || theTeams.target == null || figure !== theTeams.target) continue;
      /* A count the team's aim does not hold is not thrown away here: the lead removes that one herself. */
      if (o.count > 0 && o.count !== theTeams.count) {
        out.left.push(`${label}: the target ${inMarks(o.name)} is the team's aim ${inMarks(theTeams.name)} said again, but it holds a count of ${o.count} that the team's aim does not, so it is left for the lead to remove.`);
        continue;
      }
      gone.add(o.id);
      const by = /\bby\s+(.+?)[.!]?$/i.exec(o.name ?? '')?.[1] ?? null;
      const day = by && !theTeams.dueOn ? theDayTheyMeant(by, new Date(o.createdAt ?? Date.now())) : null;
      push({ kind: 'the aim said again', id: o.id, write: { table: 'groundObjective', delete: true },
        says: `${label}: the target ${inMarks(o.name)} is the team's aim ${inMarks(theTeams.name)} said again. It would be taken off${o.count ? `, with its count of ${o.count}` : ''}.` });
      if (day) {
        theTeams.dueOn = day;
        push({ kind: 'the aim said again', id: theTeams.id, write: { table: 'groundObjective', data: { dueOn: day } },
          says: `${label}: the team's aim ${inMarks(theTeams.name)} would keep the day it was said to be due by, ${theDayInWords(day, day)}.` });
      }
    }

    /* 5: a person's own aim keeps its day apart from its name. */
    for (const o of objs) {
      if (gone.has(o.id) || !o.ownerParticipantId || o.ownerParticipantId !== o.setByParticipantId || o.dueOn) continue;
      const kept = theDayKeptApart(o.name, (said) => theDayTheyMeant(said, new Date(o.createdAt ?? Date.now())));
      if (!kept.dueOn || kept.name === o.name) continue;
      push({ kind: 'the day kept apart', id: o.id, write: { table: 'groundObjective', data: { name: kept.name, dueOn: kept.dueOn } },
        says: `${label}: ${nameOf(people.get(o.ownerParticipantId))}'s own aim ${inMarks(o.name)} would keep ${inMarks(kept.name)} as its name and ${theDayInWords(kept.dueOn, kept.dueOn)} as its date.` });
    }

    /* 6: a deal added on the board with nobody's name, which somebody said in their own words was theirs. */
    for (const i of items as any[]) {
      if (i.ownerParticipantId || i.sourceEntryId || theClaimOn(i.fields)) continue;
      const key = squash(i.name);
      if (!key) continue;
      const line = (lines as any[]).find((l) => l.saidWordForWord && FIRST_PERSON.test(String(l.text ?? '').trim()) && ` ${squash(l.text)} `.includes(` ${key} `));
      if (!line || !people.has(line.participantId)) continue;
      const who = nameOf(people.get(line.participantId));
      const isLead = !!lead && lead.id === line.participantId;
      push({ kind: 'a claim for the lead', id: i.id, write: { table: 'workItem', data: { fields: withAClaim(i.fields, line.participantId, line.id, new Date(line.createdAt)) } },
        says: `${label}: ${who} said, ${inMarks(line.text)}. The ${i.name} ${i.kind} has nobody's name on it, so ${isLead ? who : (lead ? nameOf(lead) : 'whoever runs it')}, who runs it, would be asked on the board whether it is ${who}'s ${i.kind}. Nobody's name is set until then.` });
    }
    /*
     * 7: A STORED REPORT THAT SPEAKS OF MEETINGS NOBODY MENTIONED.
     *
     * The line is only written where a meeting is on the record, and it is already left out when a board is served
     * (withoutTheMeetingsLine). The stored row still holds it, though, so the screens read it back out of the row and
     * Hafsah asked for the row itself to be put right (request 140, item 1). The same reading decides it as the one the
     * engine writes by: aMeetingIsOnRecord over this check-in's record lines, nothing else.
     */
    /* Optional all the way down: a test double, or an older database, may hold no report at all. */
    const report = await Promise.resolve(prisma?.report?.findUnique?.({ where: { groundId: g.id }, select: { id: true, overTime: true } })).catch(() => null);
    const stored: any = report?.overTime ?? null;
    if (report && stored && typeof stored === 'object' && !aMeetingIsOnRecord(lines as any[])) {
      const held = (key: 'cannotTellYou' | 'toSettleFirst') => (Array.isArray(stored[key]) ? stored[key] : []).filter((l: unknown) => THE_MEETINGS_LINE.test(String(l)));
      const lost = [...held('cannotTellYou'), ...held('toSettleFirst')];
      if (lost.length) {
        const kept = {
          ...stored,
          cannotTellYou: (Array.isArray(stored.cannotTellYou) ? stored.cannotTellYou : []).filter((l: unknown) => !THE_MEETINGS_LINE.test(String(l))),
          toSettleFirst: (Array.isArray(stored.toSettleFirst) ? stored.toSettleFirst : []).filter((l: unknown) => !THE_MEETINGS_LINE.test(String(l))),
        };
        push({ kind: 'a meeting nobody mentioned', id: report.id, write: { table: 'report', data: { overTime: kept } },
          says: `${label}: the stored report says ${inMarks(String(lost[0]))}${lost.length > 1 ? ` (and ${lost.length - 1} more like it)` : ''}, though nobody in this check-in spoke of a meeting. ${lost.length === 1 ? 'It' : 'They'} would be taken out of the row, as ${lost.length === 1 ? 'it is' : 'they are'} already left out when a board is served.` });
      }
    }

    void checkIns;
  }
  return out;
}

/** Writes each change, in the order it was worked out. */
export async function writeTheChanges(prisma: any, plan: WhatWouldChange): Promise<void> {
  for (const c of plan.changes) {
    const w: any = c.write;
    if (w.delete) {
      await prisma[w.table].delete({ where: { id: c.id } }).catch((err: any) => {
        if (!/not found|No record/i.test(String(err?.message))) throw err;
      });
      continue;
    }
    await prisma[w.table].update({ where: { id: c.id }, data: w.data });
    if (w.table === 'groundObjective' && typeof w.snapshotsBackTo === 'number' && w.atSession != null) {
      await prisma.groundObjectiveSnapshot.updateMany({ where: { objectiveId: c.id, sessionNumber: { gte: w.atSession } }, data: { count: w.snapshotsBackTo } });
    }
  }
}

export function whatWouldChangeSays(plan: WhatWouldChange): string[] {
  const n = plan.changes.length;
  const head = `${plan.checkIns} ${plan.checkIns === 1 ? 'check-in was' : 'check-ins were'} read. ${n === 0 ? 'Nothing would change.' : `${n} ${n === 1 ? 'thing' : 'things'} would change.`}`;
  const left = plan.left ?? [];
  return [
    head,
    ...plan.changes.map((c) => c.says),
    ...(left.length ? [`${left.length} ${left.length === 1 ? 'thing is' : 'things are'} left as they are, for the lead.`, ...left] : []),
  ];
}

/** The whole run, with the database and the question handed in, so a test can run it with neither. */
export async function run(opts: {
  url: string;
  args: readonly string[];
  prismaFor: (url: string) => any;
  ask: (question: string) => Promise<string | null>;
  say: (line: string) => void;
}): Promise<{ wrote: boolean; refused: string | null }> {
  const may = whatThisRunMayDo(opts.url, opts.args);
  if (may.refused) {
    opts.say(may.why);
    return { wrote: false, refused: may.why };
  }
  const at = opts.args.indexOf('--check-in');
  const only = at >= 0 ? (opts.args[at + 1] ?? null) : null;
  const prisma = opts.prismaFor(opts.url);
  try {
    const plan = await whatWouldChange(prisma, only);
    for (const line of whatWouldChangeSays(plan)) opts.say(line);
    if (!may.writes) {
      opts.say('This was a dry run. Nothing was written.');
      return { wrote: false, refused: null };
    }
    if (may.mustTypeTheHostBack) {
      const typed = await opts.ask(`To write these changes to the database at ${may.host}, type its host name exactly: `);
      if (!theTypedHostMatches(typed, may.host)) {
        const why = 'The host name typed back did not match the database, so nothing was written.';
        opts.say(why);
        return { wrote: false, refused: why };
      }
    }
    await writeTheChanges(prisma, plan);
    opts.say('The changes were written.');
    return { wrote: true, refused: null };
  } finally {
    await prisma?.$disconnect?.();
  }
}

/** Asks on the keyboard. With no keyboard (a pipe or a scheduled job) the answer is nothing. */
function askOnTheKeyboard(question: string): Promise<string | null> {
  if (!process.stdin.isTTY) return Promise.resolve(null);
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (answer) => { rl.close(); resolve(answer); }));
}

if (require.main === module) {
  run({
    url: process.env.DATABASE_URL ?? '',
    args: process.argv.slice(2),
    prismaFor: (url) => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { PrismaClient } = require('@prisma/client');
      return new PrismaClient({ datasources: { db: { url } } });
    },
    ask: askOnTheKeyboard,
    say: (line) => console.log(line),
  })
    .then((r) => process.exit(r.refused ? 1 : 0))
    .catch((err) => {
      console.error(err?.message ?? err);
      process.exit(2);
    });
}
