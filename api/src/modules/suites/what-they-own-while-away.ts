import { KINDS_THAT_ARE_NOT_WORK } from '../board/the-kind-of-work';
import type { PrismaService } from '../prisma/prisma.service';
import { WHAT_AN_ADMIN_NEEDS_TO_BE_GIVEN_ACCESS, whatTheyMayRead, type CheckInInView } from '../grounds/who-may-read-this-check-in';
import { theirRosterEntries, theirRosterEntry } from './a-roster-entry-and-its-sign-in';
import { saidAsADay } from './who-is-away';
import { whose } from './a-request-in-words';
import { isThisTheUntoldGoal, theyRunThisCheckIn } from '../board/an-untold-goal-is-not-a-board-objective';
import { notToldYet } from '../grounds/a-goal-not-told-stays-with-the-lead';

/**
 * WHAT THE PERSON OWNS THAT FALLS IN THE DAYS THEY ASK FOR (decision 85, item 1; build step 7 of
 * docs/suites-against-the-workflow-model.md).
 *
 * The manager reads "Sarah owns the Project X milestone, due on Thursday 15 October" beside a request
 * for leave. It is read from the record, never from anything anybody said in Ask Groundwork:
 *
 *   - the person's open commitments with a date inside the leave (`Commitment`: what they said they
 *     would do in a check-in, or what their organisation's system sent; a commitment kept from Ask
 *     Groundwork never has a date, so it is never here);
 *   - targets that are theirs on a check-in, with a date to meet inside the leave (`GroundObjective`
 *     with `ownerParticipantId` and `dueOn`), never one the lead marked as a decision about a person;
 *   - work-plan items they own on a check-in, due inside the leave (`WorkItem`);
 *   - objectives and projects their organisation's own system says they own, due inside the leave
 *     (`Subject`, OBJECTIVE or PROJECT).
 *
 * WHO READS WHICH. Anything that comes from a check-in is served only to a reader who may read that
 * check-in's board, by the one rule every read calls (grounds/who-may-read-this-check-in.ts): the lead
 * who runs it, an admin with reach over it, a lead of the same department. Somebody who only takes
 * part in it reads their own record there, not a colleague's, so they are not served it here either.
 * Nothing new is opened to anybody. A commitment or objective that came from the organisation's own
 * system, with no check-in behind it, is served to whoever reads the request.
 *
 * `hidden` counts what this reader may not read, so the sentence "Groundwork found nothing" is never
 * said when something is there. The count itself is never served.
 */

export type Day = string;

export interface Owned {
  kind: 'commitment' | 'target' | 'work' | 'objective';
  /** The words as kept: the commitment, the target's name, the item's name, the objective's title. */
  what: string;
  dueOn: Day;
  /** The check-in it is on, by its name, when it is on one. */
  checkIn: string | null;
}

export interface Reader { userId: string; organizationId: string; role: string | null }

const DAY = 86_400_000;
const dayOf = (d: Date): Day => new Date(d).toISOString().slice(0, 10);
const ENDED = new Set(['RESOLVED', 'STALLED']);
const DONE_WORDS = /\b(done|complete|completed|closed|cancel+ed|finished)\b/i;

/** Read a table that a test built by hand may not have. */
async function rowsOf<T>(table: any, args: unknown): Promise<T[]> {
  if (!table?.findMany) return [];
  try { return ((await table.findMany(args)) ?? []) as T[]; } catch { return []; }
}

export async function whatTheyOwnWhileAway(
  prisma: PrismaService,
  reader: Reader,
  requesterUserId: string,
  startsOn: Date,
  endsOn: Date,
): Promise<{ owned: Owned[]; hidden: number }> {
  const p = prisma as any;
  const org = reader.organizationId;
  const from = new Date(Date.UTC(startsOn.getUTCFullYear(), startsOn.getUTCMonth(), startsOn.getUTCDate()));
  const until = new Date(Date.UTC(endsOn.getUTCFullYear(), endsOn.getUTCMonth(), endsOn.getUTCDate()) + DAY);
  const inside = { gte: from, lt: until };

  const me = await theirRosterEntry(prisma, org, requesterUserId, { externalId: true }).catch(() => null);
  const externalId = (me?.externalId as string | undefined) ?? null;

  const [commitments, subjects, participants] = await Promise.all([
    externalId
      ? rowsOf<{ text: string; dueAt: Date; sourceGroundId: string | null; sourcePersonObjectiveId: string | null }>(p.commitment, {
        where: { organizationId: org, personExternalId: externalId, state: { in: ['OPEN', 'SLIPPED'] }, dueAt: inside },
        select: { text: true, dueAt: true, sourceGroundId: true, sourcePersonObjectiveId: true },
        orderBy: { dueAt: 'asc' },
      })
      : [],
    externalId
      ? rowsOf<{ title: string; dueDate: Date; status: string | null }>(p.subject, {
        where: { organizationId: org, ownerExternalId: externalId, type: { in: ['OBJECTIVE', 'PROJECT'] }, sourceDeletedAt: null, dueDate: inside },
        select: { title: true, dueDate: true, status: true },
        orderBy: { dueDate: 'asc' },
      })
      : [],
    rowsOf<{ id: string; groundId: string }>(p.groundParticipant, {
      where: { userId: requesterUserId, ground: { organizationId: org } },
      select: { id: true, groundId: true },
    }),
  ]);
  const participantIds = participants.map((x) => x.id);
  const [targets, work] = participantIds.length
    ? await Promise.all([
      rowsOf<{ name: string; dueOn: Date; groundId: string }>(p.groundObjective, {
        where: { ownerParticipantId: { in: participantIds }, isADecisionAboutAPerson: false, dueOn: inside },
        select: { name: true, dueOn: true, groundId: true },
      }),
      rowsOf<{ name: string; dueAt: Date; groundId: string }>(p.workItem, {
        where: { ownerParticipantId: { in: participantIds }, dueAt: inside, kind: { notIn: KINDS_THAT_ARE_NOT_WORK } },
        select: { name: true, dueAt: true, groundId: true },
      }),
    ])
    : [[], []];

  /* Each check-in behind any of these, read once, and whether this reader may read its board. */
  const groundIds = [...new Set([...commitments.map((c) => c.sourceGroundId), ...targets.map((t) => t.groundId), ...work.map((w) => w.groundId)].filter((x): x is string => !!x))];
  const mayRead = await theCheckInsThisReaderMayRead(prisma, reader, groundIds);
  /* The goals the lead has not told the person about, as they stand now: only whoever runs that check-in reads them (decisions 48 and 56). */
  const notTold = (participantIds.length && groundIds.length
    ? await rowsOf<any>(p.personObjective, {
      where: { groundId: { in: groundIds }, participantId: { in: participantIds }, awareness: 'NOT_TOLD' },
      select: { id: true, groundId: true, participantId: true, text: true, awareness: true, authoredBy: true, createdAt: true },
    })
    : []).filter(notToldYet);
  const notToldIds = new Set(notTold.map((g: any) => g.id as string));

  const owned: Owned[] = [];
  let hidden = 0;
  const keep = (groundId: string | null, item: Owned, aGoalNotTold = false) => {
    if (!groundId) { owned.push(item); return; }
    const g = mayRead.get(groundId);
    if (!g) { hidden++; return; }
    /* A goal not told stays with whoever runs that check-in; to anybody else it is not here, and not counted as left out. */
    if (aGoalNotTold && !g.runs) return;
    if (g.ended) return;
    owned.push({ ...item, checkIn: g.label });
  };
  for (const c of commitments) keep(c.sourceGroundId, { kind: 'commitment', what: c.text.trim(), dueOn: dayOf(c.dueAt), checkIn: null }, !!c.sourcePersonObjectiveId && notToldIds.has(c.sourcePersonObjectiveId));
  for (const t of targets) keep(t.groundId, { kind: 'target', what: t.name.trim(), dueOn: dayOf(t.dueOn), checkIn: null }, notTold.some((g: any) => g.groundId === t.groundId && isThisTheUntoldGoal({ name: t.name }, g)));
  for (const w of work) keep(w.groundId, { kind: 'work', what: w.name.trim(), dueOn: dayOf(w.dueAt), checkIn: null });
  for (const s of subjects) {
    if (s.status && DONE_WORDS.test(s.status)) continue;
    owned.push({ kind: 'objective', what: s.title.trim(), dueOn: dayOf(s.dueDate), checkIn: null });
  }
  owned.sort((a, b) => (a.dueOn < b.dueOn ? -1 : a.dueOn > b.dueOn ? 1 : 0));
  /* The same thing kept twice (a target and the commitment mirrored from it) is said once. */
  const seen = new Set<string>();
  return { owned: owned.filter((o) => { const k = `${o.what.toLowerCase()}|${o.dueOn}`; if (seen.has(k)) return false; seen.add(k); return true; }), hidden };
}

/** The check-ins this reader may read the board of ('lead' or 'shared'), with their names and whether they have ended. */
async function theCheckInsThisReaderMayRead(prisma: PrismaService, reader: Reader, groundIds: string[]): Promise<Map<string, { label: string; ended: boolean; runs: boolean }>> {
  const out = new Map<string, { label: string; ended: boolean; runs: boolean }>();
  if (!groundIds.length) return out;
  const grounds = await rowsOf<any>((prisma as any).ground, {
    where: { id: { in: groundIds }, organizationId: reader.organizationId },
    select: { id: true, label: true, organizationId: true, initiatorId: true, ...WHAT_AN_ADMIN_NEEDS_TO_BE_GIVEN_ACCESS },
  });
  if (!grounds.length) return out;
  const ids = [...new Set([reader.userId, ...grounds.map((g) => g.initiatorId).filter(Boolean)])];
  const entries = await theirRosterEntries(prisma, reader.organizationId, ids, { department: true }).catch(() => new Map());
  const department = (userId: string | null | undefined) => ((userId && (entries.get(userId) as any)?.department) as string | undefined)?.trim() || null;
  const viewer = { userId: reader.userId, role: reader.role, organizationId: reader.organizationId, department: department(reader.userId) };
  for (const g of grounds) {
    const view: CheckInInView = {
      organizationId: g.organizationId, scenario: g.scenario, initiatorId: g.initiatorId, createdByUserId: g.createdByUserId,
      participants: g.participants, status: g.status, approvedById: g.approvedById, leadDepartment: department(g.initiatorId),
    };
    const level = whatTheyMayRead(reader.userId, viewer, view);
    if (level === 'lead' || level === 'shared') out.set(g.id, { label: (g.label ?? '').trim(), ended: ENDED.has(g.status), runs: theyRunThisCheckIn({ userId: reader.userId, role: reader.role, organizationId: reader.organizationId }, g) });
  }
  return out;
}

const quoted = (x: string) => `“${x.replace(/[.\s]+$/, '')}”`;

/**
 * What the person owns in those days, one full sentence each, with their first name:
 *   "Aisha committed to “Send the Atlas price list”, due on Thursday 1 October."
 *   "Aisha's target “Sign 12 shops” on Sales, Q3 is due on Friday 2 October."
 *   "Aisha owns “Project X milestone” on Sales, Q3, due on Thursday 1 October."
 *   "Aisha owns “Open the Kisumu depot”, due on Friday 2 October."
 * And when nothing was found and nothing was left out: "Groundwork found nothing Aisha owns that is
 * due on those days."
 */
export function ownedInWords(firstName: string, found: { owned: Owned[]; hidden: number }): string[] {
  const name = firstName.trim() || 'This person';
  if (!found.owned.length) return found.hidden ? [] : [`Groundwork found nothing ${name} owns that is due on those days.`];
  return found.owned.map((o) => {
    const on = o.checkIn ? ` on ${o.checkIn}` : '';
    const due = saidAsADay(o.dueOn);
    switch (o.kind) {
      case 'commitment': return `${name} committed to ${quoted(o.what)}, due on ${due}.`;
      case 'target': return `${whose(name)} target ${quoted(o.what)}${on} is due on ${due}.`;
      default: return `${name} owns ${quoted(o.what)}${on}, due on ${due}.`;
    }
  });
}
