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
 * a performance plan, a promotion or a renewal are never read into the picture at all.
 */

export const COMPANY_PICTURE_PROMPT_KEY = 'company_picture';

export const COMPANY_PICTURE_PROMPT = `You are writing part of the company page for an organisation's leaders: how each of its priorities is moving, what more than one team has raised, and what the check-ins show against what leadership says.

You are given PRIORITIES, each with an id, its number, its title, a fixed tag, and counts from the record: the check-ins that feed it, the check-ins finished in the last 30 days, the handoffs open in them, and the teams they belong to. You are also given the open HANDOFFS that people raised, each with an id, the team it was raised in, the check-in it was raised in (as "check-in 1"), the priorities that check-in feeds, and what it is about. This is the whole record. Use nothing else.

Give back three things.

1. readings: for each priority, "says": one or two plain sentences on how it is moving and why, in full words, using only the counts you were given. Keep to the priority's tag: the tag is fixed and you do not change it. Say what is happening and what would change it.

2. namedByTeams: groups of handoffs that are about the SAME thing and were raised in DIFFERENT teams. For each group give a short "title" that names the thing in plain words (for example "No way for customers to order in bulk"), the ids of the handoffs in it, and for each team a one-sentence "says" of how that team meets it. A group must have handoffs from at least two teams. Do not group handoffs that are only alike in being late. If nothing is named by two teams, return no groups.

3. showing: for each priority that has "shownCounts", one or two plain sentences of where the check-ins' time went against that priority, with the reason, using only the counts you were given.

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
}

export interface SubjectFact {
  id: string;
  externalId: string;
  type: string;
  title: string;
  ownerExternalId: string | null;
  parentExternalId: string | null;
  overdue: boolean;
}

export interface PictureInput {
  priorities: PriorityFacts[];
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

export interface StoredReading { priorityId: string; number: number; tag: string; says: string; restsOn: string[] }
export interface StoredNotReaching { id: string; observation: string; question: string; forWhom: ForWhom; restsOn: string[] }
export interface StoredNamedByTeams { id: string; title: string; touches: string; teams: { team: string; says: string }[]; restsOn: string[] }
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
}

/* ------------------------------------------------------------------------------------------ */
/* Plain helpers                                                                               */
/* ------------------------------------------------------------------------------------------ */

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const sentence = (t: string) => (/[.!?]$/.test(t.trim()) ? t.trim() : `${t.trim()}.`);
const hash = (s: string) => createHash('sha256').update(s).digest('hex').slice(0, 16);

/** "priority 1", "priority 1 and priority 2", "priority 1, priority 2 and priority 3". */
function thePriorities(numbers: number[]): string {
  const p = [...new Set(numbers)].sort((a, b) => a - b).map((n) => `priority ${n}`);
  if (p.length <= 1) return p.join('');
  return `${p.slice(0, -1).join(', ')} and ${p[p.length - 1]}`;
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

export function notReachingFrom(input: PictureInput): StoredNotReaching[] {
  const out: StoredNotReaching[] = [];
  const at = (owner: string | null): ForWhom => (owner ? { kind: 'owner', externalId: owner } : { kind: 'leadership' });

  for (const p of input.priorities) {
    const nothingUnder = !p.hasChildren && p.feedingGroundIds.length === 0;
    if (!p.ownerExternalId) {
      out.push({
        id: `no-owner-${p.id}`,
        observation: nothingUnder ? `Priority ${p.number} has no owner and nothing underneath it.` : `Priority ${p.number} has no owner.`,
        question: `Who owns priority ${p.number}, ${p.title}?`,
        forWhom: { kind: 'leadership' },
        restsOn: [],
      });
    } else if (nothingUnder) {
      out.push({
        id: `nothing-under-${p.id}`,
        observation: `Priority ${p.number} has an owner, but nothing is underneath it and no check-in feeds it.`,
        question: `Which team should take on priority ${p.number}, ${p.title}?`,
        forWhom: at(p.ownerExternalId),
        restsOn: [],
      });
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
    const root = rootOf(s);
    if (root && priorityIds.has(root.id)) continue;
    out.push({
      id: `orphan-${s.id}`,
      observation: `${s.title} sits under no current priority.`,
      question: `Which priority does ${s.title} serve?`,
      forWhom: at(s.ownerExternalId),
      restsOn: [],
    });
  }

  /* Something still open whose date has passed. */
  for (const s of input.subjects) {
    if (!s.overdue || !(s.type === 'OBJECTIVE' || s.type === 'PROJECT')) continue;
    out.push({
      id: `overdue-${s.id}`,
      observation: `${s.title} is still open, and its date has passed.`,
      question: `Should ${s.title} get a new date, or be closed?`,
      forWhom: at(s.ownerExternalId),
      restsOn: [],
    });
  }
  return out.slice(0, 12);
}

/* ------------------------------------------------------------------------------------------ */
/* The model's record, and what changes the picture                                            */
/* ------------------------------------------------------------------------------------------ */

export function theInputKey(input: PictureInput): string {
  const rows = [
    ...input.priorities.map((p) => ['P', p.id, p.number, p.title, p.ownerExternalId ?? '', p.overdue, p.hasChildren, p.feedingGroundIds.slice().sort().join(','), p.finishedLast30, p.blocked, p.waiting, p.teams.slice().sort().join(',')].join('|')),
    ...input.handoffs.map((h) => ['H', h.id, h.groundId, h.team ?? '', h.about, h.status, h.priorityNumbers.join(',')].join('|')),
    ...input.subjects.map((s) => ['S', s.id, s.type, s.title, s.ownerExternalId ?? '', s.parentExternalId ?? '', s.overdue].join('|')),
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
const QUOTES = /["“”«»]/;

const words = (t: string) => (t.toLowerCase().match(/[a-z0-9']+/g) ?? []);

/** Seven words in a row that the record also has in a row is a quotation, not a paraphrase. */
function copiesTheRecord(text: string, sources: string[], run = 7): boolean {
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
  return input.priorities.map((p) => {
    const tag = tagFor(p);
    const given = model?.readings?.find((r) => r?.priorityId === p.id)?.says;
    const allowed = [p.number, p.feedingGroundIds.length, p.finishedLast30, p.blocked, p.waiting, p.teams.length, 30, 1, 2, 3];
    const says = aSentenceTheRecordSupports(given, { allowedNumbers: allowed, names: input.names, sources, max: 300 }) ?? plainReading(p, tag);
    return { priorityId: p.id, number: p.number, tag, says, restsOn: [...p.feedingGroundIds].sort() };
  });
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
      return { team, says };
    });
    const priorityNumbers = [...new Set(hs.flatMap((h) => h.priorityNumbers))];
    out.push({
      id: hash(ids.slice().sort().join(',')),
      title: title.replace(/\.$/, ''),
      touches: priorityNumbers.length ? `Touches ${thePriorities(priorityNumbers)}.` : 'It does not sit under any priority yet.',
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
      youSaid: p.title,
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
 * THE READER'S SHARE. An item is given only when the reader may open every check-in it was built
 * from. An item built from none (the shape of the organisation's own priorities) is given as follows:
 * how a priority is moving to everybody, who reads the priorities already; where the strategy is not
 * reaching the work, and what leadership says against the check-ins, to readers who may read every
 * check-in, because they are questions for leadership.
 */
export function theShareFor(
  stored: StoredPicture,
  reader: { readsEverything: boolean; mayOpen: Set<string> },
) {
  const { readsEverything, mayOpen } = reader;
  return {
    readings: new Map(stored.readings.filter((r) => restsOnlyOnWhatTheyMayOpen(r.restsOn, mayOpen)).map((r) => [r.priorityId, r])),
    notReaching: stored.notReaching.filter((n) => readsEverything && restsOnlyOnWhatTheyMayOpen(n.restsOn, mayOpen)),
    namedByTeams: stored.namedByTeams.filter((g) => restsOnlyOnWhatTheyMayOpen(g.restsOn, mayOpen)),
    saidAndShown: stored.saidAndShown.filter((s) => readsEverything && restsOnlyOnWhatTheyMayOpen(s.restsOn, mayOpen)),
  };
}
