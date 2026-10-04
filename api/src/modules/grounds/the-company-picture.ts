import { createHash } from 'crypto';

/**
 * THE COMPANY-WIDE PICTURE (request 17, D2 company.txt): how each priority is moving, where the
 * strategy is not reaching the work, what more than one team has named, and what leadership says
 * next to what the check-ins show.
 *
 * WRITTEN ONCE, WHEN THE RECORD CHANGES (decision 7). Nothing here runs when a page opens. The
 * builder (the-company-picture.service.ts) calls `buildPicture` when a check-in completes, a
 * handoff is raised, or the nightly look finds the record is not what the stored picture was built
 * from (`theInputKey`). The page reads the stored row and nothing else.
 *
 * WHAT THE MODEL IS GIVEN, AND WHAT IT IS NEVER GIVEN. Priorities with counts, and the open
 * handoffs with their team, the check-in as "check-in 3", and what each is about. No person, no
 * name, no exact words from a check-in. WHAT IT GIVES BACK is checked in code before anything is
 * stored: every number in a sentence is one the record gave, nobody is named, nothing is judged or
 * ranked, and nothing is copied word for word from the record. A sentence that fails is replaced by
 * a plain one written from the counts, so the picture is never empty for want of a model, and never
 * carries a sentence nobody checked.
 *
 * NEVER A RANKING, NEVER A LABEL ON A PERSON (decision 11). Teams and priorities come out in a fixed
 * order (alphabetical, or the order the organisation's own system gave), never by how much or how
 * little. A tag says how a PRIORITY is moving, from a short list fixed in code. A difference
 * between what is said and what is shown comes with the counts it stands on.
 *
 * WHO READS WHAT (decision 3). Every item keeps `restsOn`, the check-ins it was built from.
 * `theShareFor` gives a reader an item only when they may open every one of them, decided by the
 * rule in who-may-read-this-check-in.ts, which the list of check-ins already applies. Check-ins on
 * a performance plan, a promotion, a renewal or a probation are never read into the picture everybody reads. For a priority one
 * of them feeds, one more plain reading rests on them too, so only a reader who may open them is given it (decision 93, row 23).
 */

export const COMPANY_PICTURE_PROMPT_KEY = 'company_picture';

export const COMPANY_PICTURE_PROMPT = `You are writing part of the company page for an organisation's leaders: how each of its priorities is moving, what more than one team has raised, and what the check-ins show against what leadership says.

You are given PRIORITIES, each with an id, its number, its title, a fixed tag, and counts from the record: the check-ins that feed it, the check-ins finished in the last 30 days, the handoffs open in them, and the teams they belong to. You are also given the open HANDOFFS that people raised, each with an id, the team it was raised in, the check-in it was raised in (as "check-in 1"), the priorities that check-in feeds, and what it is about. This is the whole record. Use nothing else.

Give back three things.

1. readings: for each priority, "says": one or two plain sentences on how it is moving and why, in full words, using only the counts you were given. Keep to the priority's tag: the tag is fixed and you do not change it. Say what is happening and what would change it.

2. namedByTeams: groups of handoffs that are about the SAME thing and were raised in DIFFERENT teams. For each group give a short "title" that names the thing in plain words (for example "No way for customers to order in bulk"), the ids of the handoffs in it, and for each team a one-sentence "says" of how that team meets it. A group must have handoffs from at least two teams. Do not group handoffs that are only alike in being late. If nothing is named by two teams, return no groups.

3. showing: for each priority that has "shownCounts", one or two plain sentences of where the check-ins' time went against that priority, with the reason, using only the counts you were given.

4. meaningChanged: you are also given AIMS, the objectives and projects that hang under each priority, each with its id, the id of the aim above it, its title and what it measures. For each aim whose meaning is NOT the same as the aim directly above it (for example the aim above is about reaching more farmers, and this one is about making more visits), give its "aimId", and "from" and "to": a few plain words for what the aim above means and what this one means ("more farmers", "more visits"). Leave out every aim that only breaks the aim above into a smaller part of the same thing. If no meaning changed, return none. No numbers in "from" or "to".

Write every sentence in full, plain words that people with basic English understand. No fragments joined with colons, dots or arrows.

NEVER write a person's name, a person token, or an email address. NEVER copy words from a handoff: say it in your own words. NEVER use a number that is not in the record you were given. NEVER rank teams or people, and never say one is better, worse, faster, slower, first or last than another. NEVER put a label on a person. NEVER judge anybody: say what happened, why, and what would change it.`;

export const COMPANY_PICTURE_SCHEMA = {
  name: 'emit_company_picture',
  description: 'Emit how each priority is moving, what more than one team named, and what the check-ins show.',
  input_schema: {
    type: 'object',
    properties: {
      readings: {
        type: 'array',
        items: { type: 'object', properties: { priorityId: { type: 'string' }, says: { type: 'string' } }, required: ['priorityId', 'says'] },
      },
      namedByTeams: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            handoffIds: { type: 'array', items: { type: 'string' } },
            teams: {
              type: 'array',
              items: { type: 'object', properties: { team: { type: 'string' }, says: { type: 'string' } }, required: ['team', 'says'] },
            },
          },
          required: ['title', 'handoffIds', 'teams'],
        },
      },
      showing: {
        type: 'array',
        items: { type: 'object', properties: { priorityId: { type: 'string' }, says: { type: 'string' } }, required: ['priorityId', 'says'] },
      },
      meaningChanged: {
        type: 'array',
        items: { type: 'object', properties: { aimId: { type: 'string' }, from: { type: 'string' }, to: { type: 'string' } }, required: ['aimId', 'from', 'to'] },
      },
    },
    required: ['readings'],
  },
};

/* ------------------------------------------------------------------------------------------ */
/* What the builder reads from the record                                                      */
/* ------------------------------------------------------------------------------------------ */

export interface PriorityFacts {
  id: string;
  number: number;
  title: string;
  ownerExternalId: string | null;
  /**
   * Whether that owner is one of the people in the organisation. False when the organisation's own system
   * names an owner nobody here matches; left out means known (4 October 2026 review, item C1).
   */
  ownerKnown?: boolean;
  /** Their date has passed and their system does not say it is done. */
  overdue: boolean;
  /** Anything hanging under it, not counting check-ins. */
  hasChildren: boolean;
  feedingGroundIds: string[];
  /** Completed, real (not setup) check-ins in the last 30 days, in the check-ins that feed it. */
  finishedLast30: number;
  blocked: number;
  waiting: number;
  teams: string[];
}

export interface HandoffFact {
  id: string;
  groundId: string;
  team: string | null;
  about: string;
  status: 'BLOCKING' | 'WAITING';
  priorityNumbers: number[];
  /** Whether it says who or what it waits on: a person in the check-in, another check-in, or a named outside party. */
  waitsOnSomebody?: boolean;
}

export interface SubjectFact {
  id: string;
  externalId: string;
  type: string;
  title: string;
  ownerExternalId: string | null;
  /** As on a priority: false when the owner named is nobody in the organisation. */
  ownerKnown?: boolean;
  parentExternalId: string | null;
  overdue: boolean;
  /** What it measures, as the organisation's own system wrote it. Given to the model only, never served. */
  measure?: string | null;
}

export interface PictureInput {
  priorities: PriorityFacts[];
  /**
   * The facts of the priorities that a performance plan, promotion, renewal or probation feeds, counting those check-ins in
   * (decision 93, row 23). Used only for one extra plain reading each, resting on those check-ins, so that it reaches only a
   * reader who may open them. Left out where none feeds a priority.
   */
  withEvaluation?: PriorityFacts[];
  handoffs: HandoffFact[];
  /** Every live subject in the organisation, so an orphan can be found. */
  subjects: SubjectFact[];
  /** Real check-ins finished in the last 30 days in any check-in that feeds any priority. */
  finishedOnPriorities: number;
  /** Every check-in that feeds any priority. */
  groundsOnPriorities: string[];
  /** Every first name, last name and address in the organisation, so a sentence that names somebody is refused. */
  names: string[];
}

export type ForWhom = { kind: 'leadership' } | { kind: 'owner'; externalId: string };

/**
 * ONE LEVEL OF A PRIORITY, FROM THE TOP DOWN ("What each level understood"). The priority itself,
 * then each objective and project under it, as the organisation's own system holds them. Rests on
 * no check-in: it is the shape of the organisation's own aims. `changedHere` is said only where the
 * model found that the aim means something other than the aim above it, and its words passed the
 * checks.
 */
export interface StoredLevel { subjectId: string; parentSubjectId: string | null; depth: number; kind: 'Priority' | 'Objective' | 'Project'; title: string; changedHere: string | null }
export interface StoredReading { priorityId: string; number: number; tag: string; says: string; restsOn: string[]; levels?: StoredLevel[] }
export interface StoredNotReaching { id: string; observation: string; question: string; forWhom: ForWhom; restsOn: string[] }
export interface StoredNamedByTeams { id: string; title: string; touches: string; teams: { team: string; says: string; restsOn?: string[] }[]; restsOn: string[] }
export interface StoredSaidAndShown { id: string; area: string; youSaid: string; checkInsShow: string; restsOn: string[] }

export interface StoredPicture {
  readings: StoredReading[];
  notReaching: StoredNotReaching[];
  namedByTeams: StoredNamedByTeams[];
  saidAndShown: StoredSaidAndShown[];
}

export interface TheModelsPicture {
  readings?: { priorityId?: string; says?: string }[];
  namedByTeams?: { title?: string; handoffIds?: string[]; teams?: { team?: string; says?: string }[] }[];
  showing?: { priorityId?: string; says?: string }[];
  meaningChanged?: { aimId?: string; from?: string; to?: string }[];
}

/* ------------------------------------------------------------------------------------------ */
/* Plain helpers                                                                               */
/* ------------------------------------------------------------------------------------------ */

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const sentence = (t: string) => (/[.!?]$/.test(t.trim()) ? t.trim() : `${t.trim()}.`);
const hash = (s: string) => createHash('sha256').update(s).digest('hex').slice(0, 16);

/** "priority 1", "priorities 1 and 2", "priorities 1, 2 and 3", as the prototype says it (company.txt). */
function thePriorities(numbers: number[]): string {
  const p = [...new Set(numbers)].sort((a, b) => a - b).map(String);
  if (p.length === 1) return `priority ${p[0]}`;
  return `priorities ${p.slice(0, -1).join(', ')} and ${p[p.length - 1]}`;
}

/* ------------------------------------------------------------------------------------------ */
/* (a) How each priority is moving                                                             */
/* ------------------------------------------------------------------------------------------ */

/** The tags, fixed here. Each one is about the priority and never about anybody. */
export const TAGS = {
  nobodyOwnsIt: 'Nobody owns it yet',
  nothingMovesIt: 'Nothing is moving it yet',
  atRisk: 'At risk',
  quiet: 'Quiet for a month',
  notEnough: 'Moving, but not enough of it',
  moving: 'Moving',
} as const;

export function tagFor(f: PriorityFacts): string {
  if (!f.ownerExternalId) return TAGS.nobodyOwnsIt;
  if (f.feedingGroundIds.length === 0) return TAGS.nothingMovesIt;
  if (f.overdue || f.blocked > 0) return TAGS.atRisk;
  if (f.finishedLast30 === 0) return TAGS.quiet;
  if (f.waiting > 0 || f.finishedLast30 < 2) return TAGS.notEnough;
  return TAGS.moving;
}

/** What it says when no model sentence survives: written from the counts alone, in full. */
export function plainReading(f: PriorityFacts, tag: string): string {
  const feeding = f.feedingGroundIds.length;
  const parts: string[] = [];
  if (tag === TAGS.nobodyOwnsIt) {
    parts.push('Nobody owns this priority yet');
    parts.push(feeding === 0 ? 'and no check-in feeds it.' : `and ${plural(feeding, 'check-in feeds', 'check-ins feed')} it.`);
    return parts.join(' ');
  }
  if (feeding === 0) return 'No check-in feeds this priority, so nothing on the record shows it moving.';
  parts.push(`${plural(feeding, 'check-in feeds', 'check-ins feed')} this priority, and ${plural(f.finishedLast30, 'was', 'were')} finished in the last 30 days.`);
  if (f.blocked > 0) parts.push(`${plural(f.blocked, 'handoff is', 'handoffs are')} stopping work on it.`);
  else if (f.waiting > 0) parts.push(`${plural(f.waiting, 'handoff is', 'handoffs are')} waiting on other work.`);
  if (f.overdue) parts.push('Its date has passed and it is not marked as done.');
  return parts.join(' ');
}

/* ------------------------------------------------------------------------------------------ */
/* (b) Where the strategy is not reaching the work, written from the structure alone            */
/* ------------------------------------------------------------------------------------------ */

/**
 * A TITLE AS IT SITS INSIDE A SENTENCE (4 October 2026 review, item C2). The organisation's system gives
 * titles such as ": three customers live on the API" (a leading colon) and "Ten companies lined up for the
 * sprint — Companies attached to the September sprint" (a name and what it measures, joined by a dash).
 * The leading marks go, only the name before the dash is kept, a very long one is cut at a word, and
 * the result is put in quotation marks, so the sentence around it reads as a sentence and a name keeps
 * its capitals.
 */
export function tidyTitle(title: string): string {
  const t = (title ?? '').replace(/\s+/g, ' ').trim();
  const parts = t.split(/\s+[—–]\s+|\s+-\s+/).map((x) => x.replace(/^[\s:;,.\-–—]+|[\s:;,\-–—]+$/g, '')).filter(Boolean);
  const first = parts[0] ?? t.replace(/^[\s:;,.\-–—]+/, '');
  if (first.length <= 90) return first;
  const cut = first.slice(0, 90);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), 40))}…`;
}
export const quotedTitle = (title: string): string => `“${tidyTitle(title)}”`;

export type NotReachingKind = 'no-owner' | 'owner-not-known' | 'nothing-under' | 'orphan' | 'overdue';

/** The sentence and the question for one row, from its kind alone, so a stored row and a new one read the same. */
export function notReachingText(kind: NotReachingKind, f: { number?: number; title: string; nothingUnder?: boolean }): { observation: string; question: string } {
  const name = quotedTitle(f.title);
  const which = f.number != null ? `priority ${f.number}` : name;
  switch (kind) {
    case 'no-owner':
      return {
        observation: f.nothingUnder ? `Priority ${f.number} has no owner and nothing underneath it.` : `Priority ${f.number} has no owner.`,
        question: `Who owns priority ${f.number}, ${name}?`,
      };
    case 'owner-not-known':
      return {
        observation: `Priority ${f.number} names an owner who is not one of the people in your organisation${f.nothingUnder ? ', and nothing is underneath it and no check-in feeds it' : ''}.`,
        question: `Who should own priority ${f.number}, ${name}?`,
      };
    case 'nothing-under':
      return { observation: `Priority ${f.number} has an owner, but nothing is underneath it and no check-in feeds it.`, question: `Which team should take on priority ${f.number}, ${name}?` };
    case 'orphan':
      return { observation: `${name} sits under no current priority.`, question: `Which priority does ${name} serve?` };
    case 'overdue':
      return { observation: `${f.number != null ? which.charAt(0).toUpperCase() + which.slice(1) : name} is still open, and its date has passed.`, question: `Should ${which} get a new date, or be closed?` };
  }
}

const PASSED_TOO = ' Its date has passed, and it is not marked as done.';

export function notReachingFrom(input: PictureInput): StoredNotReaching[] {
  const out: StoredNotReaching[] = [];
  const at = (owner: string | null, known?: boolean): ForWhom => (owner && known !== false ? { kind: 'owner', externalId: owner } : { kind: 'leadership' });
  /* One row for each thing: a second finding about the same priority or aim is added to its row, never a row of its own. */
  const rowOf = new Map<string, StoredNotReaching>();
  const add = (subjectId: string, row: StoredNotReaching) => { out.push(row); rowOf.set(subjectId, row); };

  for (const p of input.priorities) {
    const nothingUnder = !p.hasChildren && p.feedingGroundIds.length === 0;
    const f = { number: p.number, title: p.title, nothingUnder };
    if (!p.ownerExternalId) {
      add(p.id, { id: `no-owner-${p.id}`, ...notReachingText('no-owner', f), forWhom: { kind: 'leadership' }, restsOn: [] });
    } else if (p.ownerKnown === false) {
      add(p.id, { id: `owner-not-known-${p.id}`, ...notReachingText('owner-not-known', f), forWhom: { kind: 'leadership' }, restsOn: [] });
    } else if (nothingUnder) {
      add(p.id, { id: `nothing-under-${p.id}`, ...notReachingText('nothing-under', f), forWhom: at(p.ownerExternalId), restsOn: [] });
    }
  }

  /* An objective or project that sits under no current priority: its parent is gone, or it has none. */
  const priorityIds = new Set(input.priorities.map((p) => p.id));
  const byExternal = new Map(input.subjects.map((s) => [s.externalId, s]));
  const rootOf = (s: SubjectFact): SubjectFact | null => {
    const seen = new Set<string>();
    let cur: SubjectFact = s;
    while (cur.parentExternalId && !seen.has(cur.externalId)) {
      seen.add(cur.externalId);
      const up = byExternal.get(cur.parentExternalId);
      if (!up) return null; // the parent is gone
      cur = up;
    }
    return cur;
  };
  for (const s of input.subjects) {
    if (priorityIds.has(s.id)) continue;
    /* A shop, a client or a decision is not part of the strategy; only an aim can miss a priority. */
    if (s.type !== 'OBJECTIVE' && s.type !== 'PROJECT') continue;
    const root = rootOf(s);
    if (root && priorityIds.has(root.id)) continue;
    add(s.id, { id: `orphan-${s.id}`, ...notReachingText('orphan', { title: s.title }), forWhom: at(s.ownerExternalId, s.ownerKnown), restsOn: [] });
  }

  /* Something still open whose date has passed. */
  for (const s of input.subjects) {
    if (!s.overdue || !(s.type === 'OBJECTIVE' || s.type === 'PROJECT')) continue;
    const already = rowOf.get(s.id);
    if (already) { already.observation = `${already.observation}${PASSED_TOO}`; continue; }
    const number = input.priorities.find((p) => p.id === s.id)?.number;
    add(s.id, { id: `overdue-${s.id}`, ...notReachingText('overdue', { number, title: s.title }), forWhom: at(s.ownerExternalId, s.ownerKnown), restsOn: [] });
  }
  return out.slice(0, 12);
}

/**
 * THE STORED ROWS, AS THEY SHOULD READ TODAY. A picture is written once, when the record changes, and
 * opening the page never writes it again, so rows written before these rules still hold the raw titles,
 * "has an owner" for an owner nobody here matches, and two rows for one priority. They are put right as
 * they are served, for every reader, from the same sentences a new row is written with.
 */
export function theRowsAsTheyShouldRead(
  rows: StoredNotReaching[],
  about: (subjectId: string) => { title: string; number?: number; ownerExternalId: string | null; ownerKnown: boolean } | null,
): StoredNotReaching[] {
  const READ = /^(no-owner|owner-not-known|nothing-under|orphan|overdue)-(.+)$/;
  const again = rows.map((r): StoredNotReaching => {
    const m = READ.exec(r.id);
    const thing = m ? about(m[2]) : null;
    if (!m || !thing) return { ...r };
    const kind = m[1] as NotReachingKind;
    const nothingUnder = /nothing (?:is )?underneath it/.test(r.observation);
    const unknownOwner = thing.number != null && !!thing.ownerExternalId && !thing.ownerKnown && (kind === 'nothing-under' || kind === 'owner-not-known');
    const now: NotReachingKind = unknownOwner ? 'owner-not-known' : kind;
    return {
      ...r,
      id: now === kind ? r.id : `${now}-${m[2]}`,
      ...notReachingText(now, { number: thing.number, title: thing.title, nothingUnder }),
      forWhom: now === 'owner-not-known' ? { kind: 'leadership' } : r.forWhom,
    };
  });
  /* One row for each thing: an overdue row for something that already has a row is folded into it. */
  const keeper = new Map<string, StoredNotReaching>();
  for (const r of again) {
    const m = READ.exec(r.id);
    if (m && m[1] !== 'overdue' && !keeper.has(m[2])) keeper.set(m[2], r);
  }
  const out: StoredNotReaching[] = [];
  for (const r of again) {
    const m = READ.exec(r.id);
    const into = m && m[1] === 'overdue' ? keeper.get(m[2]) : undefined;
    if (into) { if (!into.observation.endsWith(PASSED_TOO)) into.observation = `${into.observation}${PASSED_TOO}`; continue; }
    out.push(r);
  }
  return out;
}

/* ------------------------------------------------------------------------------------------ */
/* What each level understood, from the top down                                               */
/* ------------------------------------------------------------------------------------------ */

const KIND: Record<string, StoredLevel['kind']> = { OBJECTIVE: 'Objective', PROJECT: 'Project' };

/** Each priority, then every objective and project under it, depth first, in the order the organisation's system gave them. */
export function aimsUnderPriorities(input: PictureInput): (StoredLevel & { priorityId: string })[] {
  const out: (StoredLevel & { priorityId: string })[] = [];
  for (const p of input.priorities) {
    const top = input.subjects.find((x) => x.id === p.id);
    if (!top) continue;
    const seen = new Set<string>([top.externalId]);
    out.push({ priorityId: p.id, subjectId: top.id, parentSubjectId: null, depth: 0, kind: 'Priority', title: top.title, changedHere: null });
    const walk = (parent: SubjectFact, depth: number) => {
      for (const c of input.subjects) {
        if (c.parentExternalId !== parent.externalId || !KIND[c.type] || seen.has(c.externalId)) continue;
        if (out.filter((l) => l.priorityId === p.id).length >= 40) return;
        seen.add(c.externalId);
        out.push({ priorityId: p.id, subjectId: c.id, parentSubjectId: parent.id, depth, kind: KIND[c.type], title: c.title, changedHere: null });
        walk(c, depth + 1);
      }
    };
    walk(top, 1);
  }
  return out;
}

/** "The meaning changed here, from more farmers to more visits." Only where the model said so and its words pass the checks. */
function levelsFrom(input: PictureInput, model: TheModelsPicture | null | undefined): Map<string, StoredLevel[]> {
  const sources = input.handoffs.map((h) => h.about);
  const levels = aimsUnderPriorities(input);
  const byPriority = new Map<string, StoredLevel[]>();
  for (const l of levels) {
    const { priorityId, ...level } = l;
    const said = l.parentSubjectId ? model?.meaningChanged?.find((m) => m?.aimId === l.subjectId) : undefined;
    if (said) {
      const check = (t?: string) => aSentenceTheRecordSupports(t, { allowedNumbers: [], names: input.names, sources, min: 3, max: 60 })?.replace(/\.$/, '') ?? null;
      const from = check(said.from);
      const to = check(said.to);
      if (from && to && from.toLowerCase() !== to.toLowerCase()) level.changedHere = `The meaning changed here, from ${from} to ${to}.`;
    }
    byPriority.set(priorityId, [...(byPriority.get(priorityId) ?? []), level]);
  }
  return byPriority;
}

/* ------------------------------------------------------------------------------------------ */
/* The model's record, and what changes the picture                                            */
/* ------------------------------------------------------------------------------------------ */

export function theInputKey(input: PictureInput): string {
  const rows = [
    ...input.priorities.map((p) => ['P', p.id, p.number, p.title, p.ownerExternalId ?? '', p.ownerKnown === false ? 'unknown' : '', p.overdue, p.hasChildren, p.feedingGroundIds.slice().sort().join(','), p.finishedLast30, p.blocked, p.waiting, p.teams.slice().sort().join(',')].join('|')),
    ...input.handoffs.map((h) => ['H', h.id, h.groundId, h.team ?? '', h.about, h.status, h.priorityNumbers.join(','), h.waitsOnSomebody ?? ''].join('|')),
    ...input.subjects.map((s) => ['S', s.id, s.type, s.title, s.ownerExternalId ?? '', s.parentExternalId ?? '', s.overdue, s.measure ?? ''].join('|')),
    ...(input.withEvaluation ?? []).map((p) => ['E', p.id, p.feedingGroundIds.slice().sort().join(','), p.finishedLast30, p.blocked, p.waiting, p.teams.slice().sort().join(',')].join('|')),
    `F|${input.finishedOnPriorities}`,
  ].sort();
  return createHash('sha256').update(rows.join('\n')).digest('hex');
}

/** The record as the model reads it: check-ins as numbers, no person, no name. */
export function theRecordForTheModel(input: PictureInput): string {
  const groundNo = new Map<string, number>();
  const n = (id: string) => groundNo.get(id) ?? (groundNo.set(id, groundNo.size + 1), groundNo.get(id)!);
  return JSON.stringify({
    priorities: input.priorities.map((p) => {
      const tag = tagFor(p);
      return {
        id: p.id, number: p.number, title: p.title, tag,
        counts: { checkInsThatFeedIt: p.feedingGroundIds.length, finishedInTheLast30Days: p.finishedLast30, handoffsStoppingWork: p.blocked, handoffsWaiting: p.waiting, teams: p.teams },
        shownCounts: showCountsFor(p, input) ? { thisOne: p.finishedLast30, allCheckInsOnPrioritiesFinishedInTheLast30Days: input.finishedOnPriorities } : undefined,
      };
    }),
    handoffs: input.handoffs.map((h) => ({
      id: h.id, team: h.team, checkIn: `check-in ${n(h.groundId)}`, feedsPriorities: h.priorityNumbers, about: h.about, status: h.status,
    })),
    aims: aimsUnderPriorities(input).filter((l) => l.parentSubjectId).map((l) => {
      const s = input.subjects.find((x) => x.id === l.subjectId);
      return { id: l.subjectId, under: l.parentSubjectId, title: l.title, measures: s?.measure ?? null };
    }),
  }, null, 2);
}

function showCountsFor(p: PriorityFacts, input: PictureInput): boolean {
  return p.feedingGroundIds.length > 0 && input.finishedOnPriorities >= 3;
}

/* ------------------------------------------------------------------------------------------ */
/* The checks a sentence from the model must pass                                              */
/* ------------------------------------------------------------------------------------------ */

const JUDGING = /\b(slow|slowly|lazy|laziness|fault|blame|blamed|failed|failure|careless|negligent|incompetent|excuse|excuses|dropped the ball|unreliable|underperform\w*|low performer|high performer|flight risk|pip)\b/i;
const RANKING = /\b(best|worst|top team|bottom|ranked|ranking|leading team|lagging|outperform\w*|slowest|fastest|weakest|strongest|than any other|than the other teams?|better than|worse than|ahead of|behind the other)\b/i;
const NUMBER_WORDS: Record<string, number> = {
  two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
  thirteen: 13, fourteen: 14, fifteen: 15, twenty: 20, thirty: 30, forty: 40, fifty: 50, hundred: 100, dozen: 12,
};
const QUOTES = /["“”«»]/;

const words = (t: string) => (t.toLowerCase().match(/[a-z0-9']+/g) ?? []);

/** Six words in a row that the record also has in a row is a quotation, not a paraphrase. */
function copiesTheRecord(text: string, sources: string[], run = 6): boolean {
  const w = words(text);
  if (w.length < run) return false;
  const grams = new Set<string>();
  for (let i = 0; i + run <= w.length; i++) grams.add(w.slice(i, i + run).join(' '));
  return sources.some((s) => {
    const sw = words(s);
    for (let i = 0; i + run <= sw.length; i++) if (grams.has(sw.slice(i, i + run).join(' '))) return true;
    return false;
  });
}

const namesSomebody = (t: string, names: string[]) => {
  const s = t.toLowerCase();
  if (/\bperson \d+\b|\bparticipant [a-z]\b|@/.test(s)) return true;
  return names.some((n) => n.length >= 3 && new RegExp(`(^|[^a-z])${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z]|$)`).test(s));
};

/**
 * A SENTENCE FROM THE MODEL THAT THE RECORD SUPPORTS. Every number in it is one of `allowed`, it names
 * nobody, it judges and ranks nobody, it has no quotation marks, and it does not copy the record.
 */
export function aSentenceTheRecordSupports(
  text: string | null | undefined,
  o: { allowedNumbers: number[]; names: string[]; sources: string[]; max?: number; min?: number; needsANumber?: boolean },
): string | null {
  const t = (text ?? '').trim().replace(/\s+/g, ' ');
  if (t.length < (o.min ?? 12) || t.length > (o.max ?? 320)) return null;
  if (QUOTES.test(t) || JUDGING.test(t) || RANKING.test(t) || namesSomebody(t, o.names)) return null;
  if (/[:→]|->|\s—\s/.test(t)) return null; // pieces joined with colons or arrows
  const numbers = (t.match(/\d+/g) ?? []).map(Number);
  /* A number spelled out is still a number. "One" is left alone: it is too often "no one" or "one of the". */
  for (const [word, value] of Object.entries(NUMBER_WORDS)) if (new RegExp(`\\b${word}\\b`, 'i').test(t)) numbers.push(value);
  if (numbers.some((x) => !o.allowedNumbers.includes(x))) return null;
  if (o.needsANumber && numbers.length === 0) return null;
  if (copiesTheRecord(t, o.sources)) return null;
  return sentence(t);
}

/* ------------------------------------------------------------------------------------------ */
/* Putting it together                                                                         */
/* ------------------------------------------------------------------------------------------ */

function readingsFrom(input: PictureInput, model: TheModelsPicture | null | undefined): StoredReading[] {
  const sources = input.handoffs.map((h) => h.about);
  const levels = levelsFrom(input, model);
  const base = input.priorities.map((p) => {
    const tag = tagFor(p);
    const given = model?.readings?.find((r) => r?.priorityId === p.id)?.says;
    const allowed = [p.number, p.feedingGroundIds.length, p.finishedLast30, p.blocked, p.waiting, p.teams.length, 30, 1, 2, 3];
    const says = aSentenceTheRecordSupports(given, { allowedNumbers: allowed, names: input.names, sources, max: 300 }) ?? plainReading(p, tag);
    return { priorityId: p.id, number: p.number, tag, says, restsOn: [...p.feedingGroundIds].sort(), levels: levels.get(p.id) ?? [] };
  });
  /*
   * AFTER THE ONES EVERYBODY READS, for each priority a performance plan, promotion, renewal or probation feeds, one more reading
   * written from the counts alone (no model sentence ever reads those check-ins) and resting on them too. `theShareFor` keeps the
   * last reading a reader may open for each priority, so an admin with access to them is given this one, and anybody else the one
   * above (decision 93, row 23).
   */
  const extra = (input.withEvaluation ?? []).map((p) => {
    const tag = tagFor(p);
    return { priorityId: p.id, number: p.number, tag, says: plainReading(p, tag), restsOn: [...p.feedingGroundIds].sort(), levels: levels.get(p.id) ?? [] };
  });
  return [...base, ...extra];
}

function namedByTeamsFrom(input: PictureInput, model: TheModelsPicture | null | undefined): StoredNamedByTeams[] {
  const byId = new Map(input.handoffs.map((h) => [h.id, h]));
  const sources = input.handoffs.map((h) => h.about);
  const used = new Set<string>();
  const out: StoredNamedByTeams[] = [];
  for (const g of model?.namedByTeams ?? []) {
    const ids = [...new Set(g?.handoffIds ?? [])].filter((id) => byId.has(id) && !used.has(id));
    const hs = ids.map((id) => byId.get(id)!).filter((h) => !!h.team);
    const teams = [...new Set(hs.map((h) => h.team!.trim()))].sort((a, b) => a.localeCompare(b));
    if (teams.length < 2) continue;
    const title = aSentenceTheRecordSupports(g?.title, { allowedNumbers: [], names: input.names, sources, max: 100, min: 6 });
    if (!title) continue;
    ids.forEach((id) => used.add(id));
    const theirs = (team: string) => hs.filter((h) => h.team!.trim() === team);
    const perTeam = teams.map((team) => {
      const mine = theirs(team);
      const checkIns = new Set(mine.map((h) => h.groundId)).size;
      const says = aSentenceTheRecordSupports(
        (g.teams ?? []).find((t) => (t?.team ?? '').trim().toLowerCase() === team.toLowerCase())?.says,
        { allowedNumbers: [mine.length, checkIns], names: input.names, sources, max: 220 },
      ) ?? `${team} raised this in ${plural(checkIns, 'check-in', 'check-ins')}, with ${plural(mine.length, 'open handoff', 'open handoffs')}.`;
      return { team, says, restsOn: [...new Set(mine.map((h) => h.groundId))].sort() };
    });
    const priorityNumbers = [...new Set(hs.flatMap((h) => h.priorityNumbers))];
    /* "Nobody owns it." only when not one of these handoffs says who or what it waits on. */
    const nobody = hs.every((h) => h.waitsOnSomebody === false) ? ' Nobody owns it.' : '';
    out.push({
      id: hash(ids.slice().sort().join(',')),
      title: title.replace(/\.$/, ''),
      touches: (priorityNumbers.length ? `Touches ${thePriorities(priorityNumbers)}.` : 'It does not sit under any priority yet.') + nobody,
      teams: perTeam,
      restsOn: [...new Set(hs.map((h) => h.groundId))].sort(),
    });
  }
  return out.sort((a, b) => a.title.localeCompare(b.title));
}

function saidAndShownFrom(input: PictureInput, model: TheModelsPicture | null | undefined): StoredSaidAndShown[] {
  const sources = input.handoffs.map((h) => h.about);
  const total = input.finishedOnPriorities;
  return input.priorities.filter((p) => showCountsFor(p, input)).map((p) => {
    const k = p.finishedLast30;
    const plain = `${k === 0 ? 'None' : `${k}`} of the ${total} check-ins finished in the last 30 days that belong to a priority ${k === 1 ? 'was' : 'were'} about this one.`
      + (p.blocked + p.waiting > 0 ? ` ${plural(p.blocked + p.waiting, 'handoff is', 'handoffs are')} open in them.` : '');
    const given = aSentenceTheRecordSupports(model?.showing?.find((r) => r?.priorityId === p.id)?.says, {
      allowedNumbers: [k, total, p.blocked, p.waiting, p.blocked + p.waiting, p.number, p.feedingGroundIds.length, 30, 1, 2, 3],
      names: input.names, sources, max: 320, needsANumber: true,
    });
    return {
      id: `shown-${p.id}`,
      area: `Priority ${p.number}`,
      youSaid: tidyTitle(p.title),
      checkInsShow: given ?? plain,
      restsOn: [...new Set(input.groundsOnPriorities)].sort(),
    };
  });
}

export function buildPicture(input: PictureInput, model: TheModelsPicture | null | undefined): StoredPicture {
  return {
    readings: readingsFrom(input, model),
    notReaching: notReachingFrom(input),
    namedByTeams: namedByTeamsFrom(input, model),
    saidAndShown: saidAndShownFrom(input, model),
  };
}

/* ------------------------------------------------------------------------------------------ */
/* What each reader is given                                                                   */
/* ------------------------------------------------------------------------------------------ */

const restsOnlyOnWhatTheyMayOpen = (restsOn: string[], mayOpen: Set<string>) => restsOn.every((id) => mayOpen.has(id));

/**
 * THE READER'S SHARE. Only for a reader who may read the company-wide picture at all (an admin, a
 * lead, or anybody who runs a check-in: `mayReadThePicture`); everybody else is given none of it,
 * and the page decides that before it comes here.
 *
 * An item is given only when the reader may open every check-in it was built from. An item built
 * from none (the shape of the organisation's own priorities) is given as follows: how a priority is
 * moving, and what each level of it understood, to every reader of the picture; where the strategy
 * is not reaching the work to readers who may read every check-in, and otherwise only the questions
 * asked of the reader themselves; what leadership says against the check-ins only to readers who
 * may read every check-in, because those are questions for leadership.
 */
export function theShareFor(
  stored: StoredPicture,
  reader: { readsEverything: boolean; mayOpen: Set<string>; askedOfThem?: (n: StoredNotReaching) => boolean },
) {
  const { readsEverything, mayOpen } = reader;
  return {
    readings: new Map(stored.readings.filter((r) => restsOnlyOnWhatTheyMayOpen(r.restsOn, mayOpen)).map((r) => [r.priorityId, r])),
    levels: new Map(stored.readings.map((r) => [r.priorityId, r.levels ?? []])),
    notReaching: stored.notReaching.filter((n) => restsOnlyOnWhatTheyMayOpen(n.restsOn, mayOpen) && (readsEverything || !!reader.askedOfThem?.(n))),
    namedByTeams: stored.namedByTeams.filter((g) => restsOnlyOnWhatTheyMayOpen(g.restsOn, mayOpen)),
    saidAndShown: stored.saidAndShown.filter((s) => readsEverything && restsOnlyOnWhatTheyMayOpen(s.restsOn, mayOpen)),
  };
}
