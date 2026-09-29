import { plainWordsByPerson, atTheStart } from './party-labels';
import { targetsFor } from '../board/whose-number-is-whose-business';

/** A phrase put inside a sentence, as the board does it (board.service's inASentence, kept here so
 *  the report does not import the board's service). */
const inASentence = (phrase: string): string => {
  const t = (phrase ?? '').trim().replace(/[.!?]+$/, '');
  return /^(The|A|An|Whether|What|How|Who|When|Where|Which|Why|If|This|That|Our|Their|His|Her|Its)\b/.test(t) ? t.charAt(0).toLowerCase() + t.slice(1) : t;
};

/**
 * WHAT TODAY READS FROM THE LATEST REPORT THAT ONLY THE ENGINE CAN WRITE (week 16, screens request 3,
 * parts a and b).
 *
 * (a) `sinceLast`: what moved since the round before, in plain sentences. Every reader of the report
 *     gets it, each only about what they may already see: the lead, and an admin who reads the
 *     report, read the whole check-in; a participant reads the check-in's shared counts and their own
 *     work, never a colleague's.
 * (b) `forTheLead`: what only the person who runs the check-in can settle. Somebody waiting on them,
 *     something somebody cannot move past until it is decided, and what they wrote down themselves as
 *     still to decide. Only the person who runs the check-in: a participant and an admin who only
 *     reads get no field at all.
 *
 * BUILT FROM THE STORED ROWS WHEN THE REPORT IS OPENED: counts, handoffs and notes, as the record
 * has them. No model is asked and nothing is written, so opening a report never rebuilds anything
 * (decision 7). Nothing here reads a rating, and nothing is a label on a person: each sentence says
 * what happened.
 *
 * THE BOARD'S BLOCKERS, THE SAME WAY. Everything waiting on the lead that the board shows as a
 * blocker is here too, so Today never says nothing needs the lead while their board shows
 * something waiting on them.
 */

export interface SinceLast {
  says: string;
  also?: string;
}

export interface ForTheLead {
  id: string;
  decide: string;
  why: string;
  changes?: string;
}

export interface Reader {
  userId: string;
  /** An admin of the organisation who is not in this check-in. Reads the report; runs nothing. */
  isAdmin: boolean;
}

const norm = (t: string) =>
  (t ?? '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\b(the|a|an|my|our|his|her|their|this|that|some|more|any|for|to)\b/g, ' ').replace(/\s+/g, ' ').trim();

const sentence = (t: string) => {
  const s = (t ?? '').trim();
  if (!s) return s;
  const up = s.charAt(0).toUpperCase() + s.slice(1);
  return /[.!?]$/.test(up) ? up : `${up}.`;
};

/** "Brian", "Brian and Miriam", "Brian, Miriam and Aisha". */
export const andList = (names: string[]) =>
  names.length <= 1 ? (names[0] ?? '') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;

const QUESTION_WORD = /^(whether|how|what|which|who|when|where|if)\b/i;

/**
 * The rows both parts read, loaded once. Nothing is written.
 */
async function load(prisma: any, groundId: string) {
  const ground = await prisma.ground?.findUnique?.({
    where: { id: groundId },
    select: {
      initiatorId: true,
      whoSeesTargets: true,
      participants: {
        select: {
          id: true, email: true, userId: true, partyType: true, createdAt: true, roleAsDescribed: true,
          nameGiven: true, organisationGiven: true, managingOnly: true,
          user: { select: { firstName: true, lastName: true } },
        },
      },
      dependencies: { orderBy: { createdAt: 'asc' } },
      objectives: { select: { id: true, name: true, target: true, count: true, prevCount: true, ownerParticipantId: true, sortOrder: true } },
    },
  })?.catch?.(() => null);
  if (!ground) return null;
  const checkIns = ((await prisma.checkIn?.findMany?.({
    where: { groundId },
    select: { id: true, participantId: true, sessionNumber: true, status: true, completedAt: true, isSetup: true },
    orderBy: { sessionNumber: 'asc' },
  })?.catch?.(() => [])) ?? []) as any[];
  const participants = (ground.participants ?? []) as any[];
  const noName = plainWordsByPerson(participants as any);
  const aColleague = (pid: string | null | undefined) => atTheStart((pid ? noName.get(pid) : null) ?? 'a colleague');
  const fullName = (p: any) => [p?.user?.firstName, p?.user?.lastName].filter(Boolean).join(' ').trim() || (p?.nameGiven ?? '').trim();
  /* The first name, as the prototype says it ("Brian and Miriam both raised it"), unless two people share it. */
  const firstNames = participants.map((p) => (p.user?.firstName ?? '').trim()).filter(Boolean);
  const nameOf = (pid: string | null | undefined): string => {
    const p = participants.find((x) => x.id === pid);
    if (!p) return aColleague(pid);
    const first = (p.user?.firstName ?? '').trim();
    if (first && firstNames.filter((f) => f === first).length === 1) return first;
    return fullName(p) || aColleague(pid);
  };
  return { ground, participants, checkIns, nameOf };
}

type Loaded = NonNullable<Awaited<ReturnType<typeof load>>>;

/** The rows that are one thing waited on: the newest row of each, by who waits, on whom, for what. */
function oneRowPerThing(rows: any[]): any[] {
  const byKey = new Map<string, any>();
  for (const d of rows) {
    const key = `${d.fromParticipantId}::${d.onParticipantId ?? (d.onLabel ?? '').toLowerCase()}::${norm(d.what)}`;
    byKey.set(key, d);
  }
  return [...byKey.values()];
}

/**
 * (a) WHAT MOVED SINCE THE ROUND BEFORE. Nothing until there has been a round before: a first report
 * has nothing to compare with.
 */
export function sinceLastFrom(l: Loaded, reader: Reader): SinceLast | null {
  const { ground, participants, checkIns, nameOf } = l;
  const runsIt = ground.initiatorId === reader.userId;
  const me = participants.find((p) => p.userId === reader.userId) ?? null;
  const readsTheWhole = runsIt || (reader.isAdmin && !me);
  if (!readsTheWhole && !me) return null;
  const done = checkIns.filter((c) => c.status === 'COMPLETED' && c.isSetup !== true && c.completedAt);
  if (!done.length) return null;
  const latest = Math.max(...done.map((c) => c.sessionNumber));
  const before = done.filter((c) => c.sessionNumber < latest);
  if (!before.length) return null;
  const cutoff = Math.max(...before.map((c) => new Date(c.completedAt).getTime()));
  const after = (d: any) => !!d && new Date(d).getTime() > cutoff;

  const lines: string[] = [];
  /* The counts. A participant reads the check-in's shared counts and their own, never a colleague's. */
  /* Whose number is whose goes through the one rule, as on the board: the lead reads every share;
     anybody else, an admin who only reads included, the team's counts and their own. */
  const objectives = (targetsFor(
    (ground.objectives ?? []) as any[],
    me?.id ?? null,
    ground.whoSeesTargets === 'EVERYBODY' ? 'everybody' : 'their own',
    { isLead: runsIt },
  ).shown as any[])
    .filter((o) => typeof o.count === 'number' && typeof o.prevCount === 'number' && o.count !== o.prevCount)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  for (const o of objectives) {
    const name = String(o.name ?? '').trim().replace(/[.!?]+$/, '');
    if (!name) continue;
    const whose = o.ownerParticipantId
      ? (o.ownerParticipantId === me?.id ? 'Your count' : `${nameOf(o.ownerParticipantId)}’s count`)
      : 'The count';
    /* The number aimed for only to the person who runs the check-in; a hidden target stays hidden. */
    const of = runsIt && typeof o.target === 'number' ? `, of the ${o.target} aimed for` : '';
    lines.push(`${whose} for ${inASentence(name)} went from ${o.prevCount} to ${o.count}${of}.`);
  }

  /* What stopped being in the way, and what started to. A participant, only their own. */
  const rows = ((ground.dependencies ?? []) as any[])
    .filter((d) => readsTheWhole || d.fromParticipantId === me?.id)
    .filter((d) => d.fromParticipantId !== ground.initiatorId && (d.what ?? '').trim());
  const forWhat = (what: string) => (QUESTION_WORD.test(inASentence(what)) ? `for a decision on ${inASentence(what)}` : `for ${inASentence(what)}`);
  const onWhom = (d: any) =>
    d.onParticipantId && d.onParticipantId === me?.id ? ' on you'
      : d.onParticipantId ? ` on ${nameOf(d.onParticipantId)}`
        : (d.onLabel ?? '').trim() ? ` on ${(d.onLabel ?? '').trim()}` : '';
  /* One sentence per thing, with everybody it is about: "Brian and Miriam are now waiting on you for …". */
  const said = (list: any[], now: 'no longer' | 'now') => {
    const groups = new Map<string, any[]>();
    for (const d of oneRowPerThing(list)) {
      const key = `${d.onParticipantId ?? (d.onLabel ?? '').toLowerCase()}::${norm(d.what)}`;
      groups.set(key, [...(groups.get(key) ?? []), d]);
    }
    for (const g of groups.values()) {
      const pids = [...new Set(g.map((d) => d.fromParticipantId))];
      const who = pids.length === 1 && pids[0] === me?.id ? 'You are'
        : `${andList(pids.map((pid) => (pid === me?.id ? 'you' : nameOf(pid))))} ${pids.length === 1 ? 'is' : 'are'}`;
      lines.push(`${who} ${now} waiting${onWhom(g[0])} ${forWhat(g[0].what)}.`);
    }
  };
  said(rows.filter((x) => x.status === 'CLEARED' && after(x.clearedAt)), 'no longer');
  const earlier = rows.filter((x) => !after(x.createdAt));
  said(rows.filter((x) => x.status !== 'CLEARED' && after(x.createdAt))
    .filter((d) => !earlier.some((x) => x.fromParticipantId === d.fromParticipantId && norm(x.what) === norm(d.what))), 'now');
  if (!lines.length) return null;
  const says = lines.slice(0, 2).join(' ');
  const also = lines.slice(2, 4).join(' ');
  return also ? { says, also } : { says };
}

/**
 * (b) WHAT ONLY THE PERSON WHO RUNS THE CHECK-IN CAN SETTLE. Null for anybody else.
 */
export async function forTheLeadFrom(prisma: any, groundId: string, l: Loaded, reader: Reader): Promise<ForTheLead[] | null> {
  const { ground, participants, nameOf } = l;
  if (ground.initiatorId !== reader.userId) return null;
  const lead = participants.find((p) => p.userId === reader.userId) ?? null;
  const open = ((ground.dependencies ?? []) as any[])
    .filter((d) => d.status !== 'CLEARED' && (d.what ?? '').trim() && d.fromParticipantId !== lead?.id);
  /* Newest row of each thing wins: a handoff somebody stopped calling blocking is not blocking. */
  const current = oneRowPerThing(open);
  const onTheLead = (d: any) => !!lead && d.onParticipantId === lead.id;
  const isADecision = (d: any) => d.blockerKind === 'DECISION';
  /* A decision waiting on a colleague is theirs to make; one waiting on nobody here is the lead's. */
  const mine = current.filter((d) => onTheLead(d) || d.status === 'BLOCKING' || (isADecision(d) && !d.onParticipantId));

  /* One item per thing, with everybody who is waiting for it. */
  const groups = new Map<string, any[]>();
  for (const d of mine) {
    const key = `${d.onParticipantId ?? (d.onLabel ?? '').toLowerCase()}::${norm(d.what)}`;
    groups.set(key, [...(groups.get(key) ?? []), d]);
  }
  const out: (ForTheLead & { order: number })[] = [];
  for (const rows of groups.values()) {
    const d = rows[0];
    const what = inASentence(d.what);
    const waiting = [...new Set(rows.map((r) => r.fromParticipantId))].map((pid) => nameOf(pid));
    const are = waiting.length === 1 ? 'is' : 'are both';
    const are3 = waiting.length > 2 ? 'are all' : are;
    let decide: string;
    let why: string;
    if (onTheLead(d)) {
      decide = isADecision(d) || QUESTION_WORD.test(what) ? `Decide ${QUESTION_WORD.test(what) ? what : `on ${what}`}.` : sentence(`Sort out ${what}`);
      why = `${andList(waiting)} ${are3} waiting on you for it.`;
    } else {
      decide = QUESTION_WORD.test(what) ? `Decide ${what}.` : `Decide what to do about ${what}.`;
      const onWho = d.onParticipantId ? nameOf(d.onParticipantId) : (d.onLabel ?? '').trim();
      why = `${andList(waiting)} cannot move until it is settled${onWho ? `, and it is waiting on ${onWho}` : ''}.`;
    }
    const then = rows.map((r) => (r.then ?? '').trim()).find(Boolean);
    out.push({
      id: `handoff-${d.id}`,
      decide,
      why,
      ...(then ? { changes: `Once it is settled, ${inASentence(then).replace(/[.!?]+$/, '')}.` } : {}),
      order: onTheLead(d) ? 0 : 1,
    });
  }

  /* What the lead wrote down as still to decide. Their own note, read back only to them. */
  const notes = ((await prisma.groundContextItem?.findMany?.({
    where: { groundId, kind: 'DECISION', closedAt: null },
    select: { id: true, text: true },
    orderBy: { createdAt: 'asc' },
    take: 8,
  })?.catch?.(() => [])) ?? []) as { id: string; text: string }[];
  for (const n of notes) {
    const text = (n.text ?? '').trim();
    if (!text) continue;
    out.push({ id: `note-${n.id}`, decide: sentence(text), why: 'You wrote this down as still to decide.', order: 2 });
  }
  return out.sort((a, b) => a.order - b.order).slice(0, 8).map(({ order: _o, ...rest }) => rest);
}

/**
 * BOTH, FOR ONE READER OF THE LATEST REPORT. The fields are left out, not sent empty, where there is
 * nothing to say or the reader may not read them.
 */
export async function whatTodayReads(prisma: any, groundId: string, reader: Reader): Promise<{ sinceLast?: SinceLast; forTheLead?: ForTheLead[] }> {
  const l = await load(prisma, groundId);
  if (!l) return {};
  const sinceLast = sinceLastFrom(l, reader);
  const forTheLead = await forTheLeadFrom(prisma, groundId, l, reader);
  return {
    ...(sinceLast ? { sinceLast } : {}),
    ...(forTheLead && forTheLead.length ? { forTheLead } : {}),
  };
}
