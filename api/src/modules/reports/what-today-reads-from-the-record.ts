import { theFirstNameOfAParticipant } from '../reports/a-title-is-not-a-first-name';
import { theSameThing } from '../board/a-thing-is-not-somebody';
import { plainWordsByPerson, atTheStart, labelsForParties, namesVisibleTo, withNames, eachSideGetsSomebody } from './party-labels';
import { targetsFor } from '../board/whose-number-is-whose-business';
import { withoutWhatTheLeadHasNotToldThemAbout, theyRunThisCheckIn } from '../board/an-untold-goal-is-not-a-board-objective';
import { notToldYet, theLeadIsNudgedToTell, aWeekHasPassedSinceNotTold } from '../grounds/a-goal-not-told-stays-with-the-lead';
import { areaOfGoalOrFallback } from '../grounds/the-area-of-a-goal-is-worded-once';
import { aCountThatMovedSaid } from './a-count-that-moved-is-one-sentence';
import { whatMovedInTheRound } from './what-this-session-holds';
import { yourOwnWhereYouAreTheSubject, anAimTheHolderSet } from '../board/an-aim-is-a-sentence-about-somebody';
import { asADirection } from '../board/an-aim-or-a-limit';
import { PATTERN_ROW_SELECT, servedPatterns, patternTalkNudge } from '../patterns/who-reads-a-pattern';
import { anArticleSaidMidSentence } from '../board/a-holder-in-their-own-words';

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
 * AND WHERE PEOPLE SAID DIFFERENT THINGS. Each open difference on the stored report is one item: what
 * would settle it, who said different things, and what happens to the work while it holds. Read from
 * the report's stored `divergences` as they are, with names put in through `withNames`, the same
 * wrapper every reader's report goes through. Nothing is asked of a model.
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
      createdByUserId: true,
      whoSeesTargets: true,
      peersVisibleToEachOther: true,
      cadence: true,
      participants: {
        select: {
          id: true, email: true, userId: true, partyType: true, createdAt: true, roleAsDescribed: true,
          nameGiven: true, organisationGiven: true, managingOnly: true,
          user: { select: { firstName: true, lastName: true } },
        },
      },
      dependencies: { orderBy: { createdAt: 'asc' } },
      objectives: { select: { id: true, name: true, target: true, count: true, prevCount: true, ownerParticipantId: true, setByParticipantId: true, direction: true, sortOrder: true, isADecisionAboutAPerson: true } },
      /* Decision 56, item 1 - a goal the lead has not told its person about, so Today can nudge them. */
      personObjectives: { select: { id: true, participantId: true, text: true, authoredBy: true, awareness: true } },
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
  const firstNames = participants.map((p) => (theFirstNameOfAParticipant(p) ?? '')).filter(Boolean);
  const nameOf = (pid: string | null | undefined): string => {
    const p = participants.find((x) => x.id === pid);
    if (!p) return aColleague(pid);
    const first = theFirstNameOfAParticipant(p) ?? '';
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
export async function sinceLastFrom(prisma: any, groundId: string, l: Loaded, reader: Reader): Promise<SinceLast | null> {
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
  /* And none that is a goal the lead has not told its person about (decisions 48 and 56), as on the board. */
  const objectives = withoutWhatTheLeadHasNotToldThemAbout(targetsFor(
    (ground.objectives ?? []) as any[],
    me?.id ?? null,
    ground.whoSeesTargets === 'EVERYBODY' ? 'everybody' : 'their own',
    { isLead: runsIt },
  ).shown as any[], (ground.personObjectives ?? []) as any[], participants as any[], theyRunThisCheckIn(reader.userId, ground) || (!!reader.isAdmin && !me)).kept as any[];
  /*
   * WHAT MOVED IS READ ONE WAY, FOR EVERY SURFACE (review of 1 October 2026, re-d, sales, session 2).
   * This read `count` against `prevCount`, and the Movement tile on the same page read the snapshots:
   * one said 31 million naira moved, the other "No target moved this session.". Both now read
   * whatMovedInTheRound, for the same round and the same targets this reader may read.
   */
  const moves = await whatMovedInTheRound(prisma, groundId, latest, objectives);
  const moved = objectives
    .filter((o) => moves.has(o.id) && moves.get(o.id)!.from !== moves.get(o.id)!.to)
    .map((o) => ({ ...o, prevCount: moves.get(o.id)!.from, count: moves.get(o.id)!.to }))
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  /* Each count that moved, in plain sentences with numbers a person can read. See a-count-that-moved-is-one-sentence. */
  const labels = labelsForParties(participants as any);
  const visible = namesVisibleTo(me?.id ?? null, participants as any, ground.peersVisibleToEachOther ?? undefined);
  /* The first name, as every other line here says it ("Miriam"), for each person this reader may name. */
  for (const [pid, label] of labels) if (visible.has(label)) visible.set(label, nameOf(pid));
  const readerLabel = me ? labels.get(me.id) ?? null : null;
  const othersNames = participants.filter((p) => p.id !== me?.id)
    .flatMap((p) => [p.user?.firstName, p.user?.lastName, p.nameGiven].filter(Boolean) as string[]);
  const theLeadsRow = participants.find((p) => p.userId === ground.initiatorId)?.id ?? null;
  for (const o of moved) {
    const setBy = o.setByParticipantId ?? o.ownerParticipantId ?? theLeadsRow;
    const said = aCountThatMovedSaid(
      { name: String(o.name ?? ''), target: typeof o.target === 'number' ? o.target : null, count: o.count, prevCount: o.prevCount, direction: asADirection(o.direction) },
      {
        whose: !o.ownerParticipantId ? 'team' : o.ownerParticipantId === me?.id ? 'you' : { name: nameOf(o.ownerParticipantId) },
        /* The number aimed for only to the person who runs the check-in; a hidden target stays hidden. */
        againstTheAim: runsIt,
        about: {
          speaker: setBy ? labels.get(setBy) ?? null : null,
          holder: o.ownerParticipantId ? labels.get(o.ownerParticipantId) ?? null : null,
          setByTheHolder: anAimTheHolderSet(o, theLeadsRow),
        },
        aimAsTheReaderReadsIt: (inLabels) => yourOwnWhereYouAreTheSubject(withNames(inLabels, visible, labels.values(), { viewerLabel: readerLabel }), othersNames),
      },
    );
    if (said) lines.push(said);
  }

  /* What stopped being in the way, and what started to. A participant, only their own. */
  const rows = ((ground.dependencies ?? []) as any[])
    .filter((d) => readsTheWhole || d.fromParticipantId === me?.id)
    .filter((d) => d.fromParticipantId !== ground.initiatorId && (d.what ?? '').trim());
  const forWhat = (what: string) => (QUESTION_WORD.test(inASentence(what)) ? `for a decision on ${inASentence(what)}` : `for ${inASentence(what)}`);
  const onWhom = (d: any) =>
    d.onParticipantId && d.onParticipantId === me?.id ? ' on you'
      : d.onParticipantId ? ` on ${nameOf(d.onParticipantId)}`
        : (d.onLabel ?? '').trim() ? ` on ${anArticleSaidMidSentence((d.onLabel ?? '').trim())}` : '';
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
      /* A thing the same as what is waited for is not said twice (request 107 b). */
      const onWho = d.onParticipantId ? nameOf(d.onParticipantId) : (theSameThing(d.onLabel, d.what) ? '' : anArticleSaidMidSentence((d.onLabel ?? '').trim()));
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

  /* Where people said different things, one item per open difference on the stored report. */
  out.push(...(await whereWhatPeopleSaidDiffers(prisma, groundId, participants, lead)).map((x) => ({ ...x, order: 1 })));

  /*
   * DECISION 57, ITEM 3. "AFTER A PATTERN REACHES THE LEAD, THEY ARE NUDGED ONCE TO HAVE THE
   * CONVERSATION." A pattern about somebody else reaches the lead through the same rule as anywhere
   * else it is served (servedPatterns / patternRowsThisReaderMayRead), so this is exactly the set the
   * lead may already read on the board or the ground page - nothing new is exposed here. The nudge
   * goes away the moment `talkedAboutAt` is set, which is why it is left out below rather than left
   * on the list with a "done" flag.
   */
  if (lead) {
    const patternRows = (((await prisma.patternDetection?.findMany?.({
      where: { groundId, participantId: { not: lead.id } },
      select: PATTERN_ROW_SELECT,
    })?.catch?.(() => [])) ?? []) as any[]);
    const served = servedPatterns(patternRows, { participantId: lead.id, runsIt: true }, {
      leadName: nameOf(lead.id),
      leadParticipantId: lead.id,
      firstNameOf: (pid: string) => nameOf(pid),
      isDaily: ground.cadence === 'DAILY',
    });
    for (const p of served) {
      const row = patternRows.find((r) => r.id === p.id);
      if (row?.talkedAboutAt) continue; // the nudge goes away once marked
      out.push({ ...patternTalkNudge(p, nameOf(p.participantId)), order: 0 });
    }
  }

  /*
   * DECISION 56, ITEM 1. A goal the lead wrote and has not told its person about yet, flagged here as
   * needing their attention: "Tell Tobi about the goal you set for the scheduling and the stock
   * counts. You have not told Tobi yet." - the person's name throughout, never a pronoun, and the
   * worded area (the-area-of-a-goal-is-worded-once.ts), never the raw sentence with its number.
   * Ordered with the other things only the lead can settle - first, since telling somebody a goal
   * exists is rarely something to leave for later.
   */
  const untold = ((ground.personObjectives ?? []) as any[]).filter(notToldYet);
  for (const o of untold) {
    const name = nameOf(o.participantId);
    const area = await areaOfGoalOrFallback(prisma, o.text ?? '');
    const nudge = theLeadIsNudgedToTell(name, area);
    /*
     * A WEEK ON, THE REMINDER IS STRONGER, ONCE, IN FULL SENTENCES. Item 4: once a week has passed
     * not told, the person has already been told plainly on their own board that a goal exists, with
     * no number - so the lead reads that this has now happened, and is reminded once to have the
     * actual conversation.
     */
    const why = aWeekHasPassedSinceNotTold(o)
      ? `${nudge.why} It has been a week, so ${name} has now been told that a goal exists, without any number. Talk it through with ${name} yourself.`
      : nudge.why;
    out.push({ id: `not-told-${o.id}`, decide: nudge.decide, why, order: 0 });
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
 * THE OPEN DIFFERENCES, FOR THE LEAD. Built from the stored report's `divergences`: the report is
 * rewritten when something new comes in, so what is on it now is what is still open. Names go in
 * through `withNames`, as the lead's own report has them, and the lead's own side is "you".
 */
export async function whereWhatPeopleSaidDiffers(prisma: any, groundId: string, participants: any[], lead: any | null): Promise<ForTheLead[]> {
  const report = await prisma.report?.findUnique?.({ where: { groundId }, select: { divergences: true } })?.catch?.(() => null);
  const divs = (Array.isArray(report?.divergences) ? report.divergences : []) as any[];
  if (!divs.length) return [];
  /*
   * NO DIFFERENCE UNTIL TWO PEOPLE WHO CHECK IN HAVE ANSWERED (B-098), as the board says: "Groundwork needs to hear from at least two people before it
   * can show where they differ." Today said "Settle the difference between what you and Halima Yusuf said" when only Halima had answered, and the
   * board beside it had nothing to show. A lead who only manages, and her set-up conversation, are not two people answering.
   */
  const answered = await prisma.checkIn?.findMany?.({ where: { groundId, isSetup: false, status: 'COMPLETED' }, select: { participantId: true } })?.catch?.(() => null);
  if (Array.isArray(answered)) {
    const checkIn = new Set((participants as any[]).filter((p) => !p.managingOnly).map((p) => p.id));
    if (new Set(answered.map((a: any) => a.participantId).filter((id: string) => checkIn.has(id))).size < 2) return [];
  }
  const labels = labelsForParties(participants as any);
  const visible = namesVisibleTo(lead?.id ?? null, participants as any);
  const leadLabel = lead ? labels.get(lead.id) ?? null : null;
  const named = (t: unknown) => withNames(String(t ?? '').trim(), visible, labels.values(), { viewerLabel: leadLabel });
  const out: ForTheLead[] = [];
  divs.slice(0, 4).forEach((d, i) => {
    const sides = eachSideGetsSomebody((Array.isArray(d?.positions) ? d.positions : Array.isArray(d?.perspectives) ? d.perspectives : []) as any[], visible.keys());
    const who = [...new Set(sides.map((side) => {
      const l = String(side?.participantLabel ?? '').trim();
      if (leadLabel && l.toLowerCase() === leadLabel.toLowerCase()) return 'you';
      return visible.get(l) ?? '';
    }))];
    const knowsWho = sides.length >= 2 && who.length >= 2 && who.every(Boolean);
    const whoSaid = knowsWho ? atTheStart(andList(who)) : 'People in this check-in';
    const topic = named(d?.topic);
    const settledBy = named(d?.settledBy);
    const atStake = named(d?.atStake);
    out.push({
      id: `difference-${i + 1}`,
      decide: settledBy
        ? sentence(settledBy)
        : knowsWho ? `Settle the difference between what ${andList(who)} said.` : 'Settle the difference between what people said.',
      why: `${topic ? `${sentence(topic)} ` : ''}${whoSaid} said different things about this, so nobody can assume it is agreed.`,
      ...(atStake ? { changes: sentence(atStake) } : {}),
    });
  });
  return out;
}

/**
 * BOTH, FOR ONE READER OF THE LATEST REPORT. The fields are left out, not sent empty, where there is
 * nothing to say or the reader may not read them.
 */
export async function whatTodayReads(prisma: any, groundId: string, reader: Reader): Promise<{ sinceLast?: SinceLast; forTheLead?: ForTheLead[] }> {
  const l = await load(prisma, groundId);
  if (!l) return {};
  const sinceLast = await sinceLastFrom(prisma, groundId, l, reader);
  const forTheLead = await forTheLeadFrom(prisma, groundId, l, reader);
  return {
    ...(sinceLast ? { sinceLast } : {}),
    ...(forTheLead && forTheLead.length ? { forTheLead } : {}),
  };
}
