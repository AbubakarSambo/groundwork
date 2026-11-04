import { aDayPeopleRead } from './one-count-for-the-sessions';
import { someOfThemHave } from '../reports/some-of-them-has-or-have';
import { WHAT_A_NUMBER_IS_NOT } from '../public-api/a-number-does-not-argue';
import type { KindOfWork } from './the-kind-of-work';
import { peopleSaidDifferentThingsAbout } from '../reports/what-people-said-differently-about';

/**
 * FIVE KINDS OF WORK GET THEIR OWN BOARD SHAPE (request 105; the prototype's examples in
 * docs/prototype/screens/G1-example-check-ins/gov.txt, loans.txt, matter.txt, mvnext.txt and mvq4.txt).
 *
 * Six kinds (eng, founder, ops, programme, salesorg, support) use the switchboard's sections, which is
 * what their own examples show. These five do not, and each is served here as extra fields on the board
 * for that kind, with the prototype's headings:
 *  - a government programme: "What each level understood", "The counties", "What the visit log shows".
 *  - asset loans: "Where the cohort stands", "Support given, and whether it helped".
 *  - a law firm matter: "Where the matter stands", "What you need to decide", "What changed this week,
 *    and what it changed".
 *  - MarketView where next: "By who they are", "Where they disagree".
 *  - MarketView Q4: "What the systems show", "Where what people said and the systems differ".
 *
 * BUILT FROM THE BOARD THIS READER IS ALREADY SERVED, after every wall has run (who owns what, the records,
 * the decisions, where people differ, the blockers, the targets), so a field here can never show a reader
 * anything they could not already read row by row. The numbers from another system and the lines a
 * document disagrees with are read by the caller, under the same walls, and handed in.
 *
 * NEVER INVENTED. Where the record holds nothing for a section, it says so in a sentence (`state:
 * "not-known"` with `why`, or `"none-yet"` with `says`), and the screen draws that, never a made-up row.
 * Groundwork keeps no level for a person, no group (processor, distributor), no support given and no
 * handover page for a check-in; each of those is said plainly.
 *
 * Built on read from rows already stored, with no model asked anything, so opening the board changes
 * nothing (decision 7). No sentence rates or labels anybody.
 */

export interface APerson {
  id: string;
  /** The name this reader may read, or "A colleague". */
  name: string;
  managingOnly: boolean;
  isLead: boolean;
  /** Whether they have finished at least one check-in. */
  answered: boolean;
  /** Who they are, in the lead's own words (roleAsDescribed), served to the lead alone; null for anybody else. */
  describedAs?: string | null;
}

export interface AMetric {
  key: string;
  says: string;
  value: number;
  unit: string | null;
  asOf: Date | string;
  sourceSystem: string;
}

export interface WhatTheKindsBoardIsBuiltFrom {
  kind: KindOfWork | null;
  /** The board as this reader is served it, after every wall. */
  board: Record<string, any>;
  people: APerson[];
  /** Whether the reader runs the check-in, and so may be told who is in each group. */
  readerRunsIt: boolean;
  /** Whether the reader is the person running it, who is "you" in the lead's own sentences. */
  readerIsTheLead: boolean;
  /** Numbers from another system about what this check-in is about. */
  metrics: AMetric[];
  /** Lines a document on this check-in says differently, by the line's id, where the reader may read both. */
  documentSaysOf: Map<string, string>;
  now?: Date;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const listed = (ns: string[]) => (ns.length <= 1 ? ns.join('') : `${ns.slice(0, -1).join(', ')} and ${ns[ns.length - 1]}`);
const atTheStart = (t: string) => (t ? t.charAt(0).toUpperCase() + t.slice(1) : t);
const asADay = (iso: string | null | undefined, now: Date) => {
  if (!iso) return null;
  const d = new Date(`${String(iso).slice(0, 10)}T12:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : aDayPeopleRead(d, now);
};
const sectionOf = (board: any, name: string) => ((board.workRecords ?? []) as any[]).find((s) => s.section === name);
const rowsOf = (board: any, name: string, kind?: string) => ((sectionOf(board, name)?.rows ?? []) as any[]).filter((r) => !kind || r.kind === kind);

/* ------------------------------------------------------------------------------------------------
 * NUMBERS FROM ANOTHER SYSTEM (gov's visit log, mvq4's systems)
 * ---------------------------------------------------------------------------------------------- */

export const NO_NUMBERS_FROM_ANOTHER_SYSTEM =
  'No numbers from another system are attached to this check-in yet, so the board cannot say what they show. They appear here once they are brought in from the system that keeps them.';

/** One number, said as a sentence, never judged: "MarketView shows 162 for weekly active users, as of 1 October." */
export function aNumberSaid(m: AMetric, now = new Date()): string {
  const unit = m.unit?.trim() ? ` ${m.unit.trim()}` : '';
  const value = Number.isInteger(m.value) ? m.value.toLocaleString('en-GB') : String(m.value);
  const what = String(m.says ?? '').trim().replace(/[.!?]+$/, '');
  const day = aDayPeopleRead(new Date(m.asOf), now);
  return `${m.sourceSystem} shows ${value}${unit} for ${what.charAt(0).toLowerCase()}${what.slice(1)}, as of ${day}.`;
}

function whatTheSystemsShow(metrics: AMetric[], heading: string, now: Date) {
  if (!metrics.length) return { heading, state: 'not-known' as const, why: NO_NUMBERS_FROM_ANOTHER_SYSTEM };
  return {
    heading,
    state: 'filled' as const,
    numbers: metrics.map((m) => ({ key: m.key, source: m.sourceSystem, value: m.value, unit: m.unit ?? null, measuredAt: new Date(m.asOf).toISOString().slice(0, 10), says: aNumberSaid(m, now) })),
    whatANumberIsNot: WHAT_A_NUMBER_IS_NOT,
  };
}

/* ------------------------------------------------------------------------------------------------
 * A GOVERNMENT PROGRAMME
 * ---------------------------------------------------------------------------------------------- */

export const NO_LEVEL_ON_RECORD =
  'Nobody’s level is on record, so each person’s words are in the order they joined.';

function whatEachLevelUnderstood(i: WhatTheKindsBoardIsBuiltFrom) {
  const heading = 'What each level understood';
  const lead = i.people.find((p) => p.isLead);
  const aims = ((i.board.objectives ?? []) as any[]).filter((o) => !o.ownerParticipantId && typeof o.name === 'string' && o.name.trim()).map((o) => String(o.name).trim());
  const levels: { participantId: string | null; who: string; said: string[] }[] = [];
  if (aims.length) levels.push({ participantId: lead?.id ?? null, who: i.readerIsTheLead ? 'You' : (lead?.name ?? 'The person running this check-in'), said: aims });
  /*
   * ONE LEVEL A PERSON, AND "YOU" FOR THE READER (item 21, the government programme board). Stephen read his aims under
   * "You" and then his own words again under "Stephen Nwachukwu", one person twice and named to himself. The lead's own
   * words now follow the aims they set, and the reader's row is "You".
   */
  const readerId = i.people.find((p) => p.name === 'You')?.id ?? (i.readerIsTheLead ? lead?.id ?? null : null);
  for (const row of (i.board.whoOwnsWhat ?? []) as any[]) {
    const said = ((row.items ?? []) as any[]).filter((it) => it.type === 'SUCCESS_DEFINITION' || it.type === 'INTENT').map((it) => String(it.text));
    if (!said.length) continue;
    const same = row.participantId ? levels.find((l) => l.participantId === row.participantId) : undefined;
    if (same) { same.said.push(...said); continue; }
    levels.push({ participantId: row.participantId ?? null, who: row.participantId && row.participantId === readerId ? 'You' : (row.name ?? 'A colleague'), said });
  }
  if (!levels.length) return { heading, state: 'none-yet' as const, says: 'Nobody has said yet what the aim means to them.', note: NO_LEVEL_ON_RECORD };
  return { heading, state: 'filled' as const, levels, note: NO_LEVEL_ON_RECORD };
}

function theCounties(i: WhatTheKindsBoardIsBuiltFrom) {
  const counties = rowsOf(i.board, 'Deal grid', 'county');
  const projects = rowsOf(i.board, 'Deal grid', 'project');
  /* gov-board.jpg: "The three counties", how many there are said in words, up to ten. */
  const IN_WORDS = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
  const heading = counties.length >= 2 && counties.length <= 10 ? `The ${IN_WORDS[counties.length]} counties` : 'The counties';
  if (!counties.length) return { heading, state: 'none-yet' as const, says: 'No county is on record yet.' };
  const under = (county: string) => projects.filter((p) => Object.values(p.fields ?? {}).some((v) => String(v).trim().toLowerCase() === county.trim().toLowerCase()));
  return {
    heading,
    state: 'filled' as const,
    counties: counties.map((c) => {
      const theirs = under(c.name);
      return {
        id: c.id,
        name: c.name,
        said: c.said ?? null,
        saidBy: c.saidBy ?? null,
        projects: theirs.map((p) => p.name),
        says: theirs.length
          ? `The ${theirs.length === 1 ? 'project on record for' : 'projects on record for'} ${c.name} ${theirs.length === 1 ? 'is' : 'are'} ${listed(theirs.map((p) => String(p.name).trim()))}.`
          : `${c.name} has no project on record yet.`,
      };
    }),
  };
}

/* ------------------------------------------------------------------------------------------------
 * ASSET LOANS
 * ---------------------------------------------------------------------------------------------- */

export const NO_LOAN_RECORDS = 'No loan record says who is repaying or who is behind yet.';
export const NO_SUPPORT_ON_RECORD =
  'Nothing on record says what support each person was given, or whether it helped, so this cannot be shown yet.';

function whereTheCohortStands(i: WhatTheKindsBoardIsBuiltFrom) {
  const heading = 'Where the cohort stands';
  const cohort = i.people.filter((p) => !p.managingOnly && !p.isLead);
  const loans = rowsOf(i.board, 'Deal grid', 'loan');
  const at = (stages: string[]) => loans.filter((l) => stages.includes(String(l.stage ?? '').toLowerCase()));
  const whoOf = (ids: (string | null)[]) => (i.readerRunsIt ? ids.map((id) => cohort.find((p) => p.id === id)?.name).filter((n): n is string => !!n) : null);
  const groups: any[] = [];
  if (loans.length) {
    const repaying = at(['repaying', 'repaid']);
    const behind = at(['late']);
    groups.push({
      group: 'repaying', count: repaying.length,
      says: repaying.length ? `The loan records show ${plural(repaying.length, 'loan', 'loans')} being repaid.` : 'The loan records show no loan being repaid yet.',
      who: whoOf(repaying.map((l) => l.ownerParticipantId ?? null)),
    });
    groups.push({
      group: 'behind', count: behind.length,
      says: behind.length ? `The loan records show ${plural(behind.length, 'loan', 'loans')} behind on repayment.` : 'The loan records show no loan behind on repayment.',
      who: whoOf(behind.map((l) => l.ownerParticipantId ?? null)),
    });
  } else {
    groups.push({ group: 'repaying', state: 'not-known', why: NO_LOAN_RECORDS });
  }
  const blockedIds = [...new Set(((i.board.blockers ?? []) as any[]).filter((b) => b.state === 'blocking').map((b) => b.fromParticipantId as string))]
    .filter((id) => cohort.some((p) => p.id === id));
  groups.push({
    group: 'blocked', count: blockedIds.length,
    says: blockedIds.length
      ? `${plural(blockedIds.length, 'person is', 'people are')} waiting on something that stops them, and it has not been cleared.`
      : 'Nobody has said they are stopped by something.',
    who: whoOf(blockedIds),
  });
  const silent = cohort.filter((p) => !p.answered);
  groups.push({
    group: 'not heard from', count: silent.length,
    says: silent.length ? `${plural(silent.length, 'person has', 'people have')} not checked in yet.` : 'Everybody in the cohort has checked in.',
    who: whoOf(silent.map((p) => p.id)),
  });
  return {
    heading,
    says: `${plural(cohort.length, 'person is', 'people are')} in this cohort.`,
    groups,
    ...(i.readerRunsIt ? {} : { whyNoNames: 'Who is in each group is read only by whoever runs this check-in.' }),
  };
}

/* ------------------------------------------------------------------------------------------------
 * A LAW FIRM MATTER
 * ---------------------------------------------------------------------------------------------- */

/*
 * WHAT NEEDS DECIDING, FROM THE BOARD'S OWN LIST, OR FROM WHAT IS STILL OPEN BETWEEN PEOPLE (item 21, the law firm
 * matter). A contract review's board has no list of decisions, so Adaeze read "Nothing is waiting for a decision yet."
 * over a board whose own difference was still open. Where there is no list, each difference still open is one.
 */
function whatNeedsDeciding(i: WhatTheKindsBoardIsBuiltFrom): { question: string; why: string | null; owner: string | null }[] {
  if (Array.isArray(i.board.decisions)) return (i.board.decisions as any[]).map((d) => ({ question: d.question, why: d.why ?? null, owner: d.owner ?? null }));
  const open = ((i.board.divergence?.stillOpen ?? []) as unknown[]).filter((t): t is string => typeof t === 'string' && !!t.trim());
  const lead = i.people.find((p) => p.isLead);
  return open.map((t) => ({
    question: peopleSaidDifferentThingsAbout(t),
    why: 'What people said about this does not match.',
    owner: i.readerIsTheLead ? 'You' : (lead?.name ?? null),
  }));
}

function whereTheMatterStands(i: WhatTheKindsBoardIsBuiltFrom, now: Date) {
  const heading = 'Where the matter stands';
  const says: string[] = [];
  const deadlines = rowsOf(i.board, 'Timeline', 'deadline').filter((d) => d.due).sort((a, b) => String(a.due).localeCompare(String(b.due)));
  for (const d of deadlines) says.push(`${atTheStart(String(d.name).trim())} is due on ${asADay(d.due, now)}.`);
  const open = ((i.board.blockers ?? []) as any[]).length;
  says.push(open ? `${plural(open, 'thing is', 'things are')} in the way and not cleared yet.` : 'Nothing is in the way that has not been cleared.');
  const toDecide = whatNeedsDeciding(i).length;
  if (toDecide) says.push(`${plural(toDecide, 'thing is', 'things are')} waiting for a decision.`);
  if (!deadlines.length) says.unshift('No deadline is on record yet.');
  /* `state`, like every other section of this board (request 134 item 7): filled once a deadline, a wait or a decision is on record. */
  return { heading, state: (deadlines.length || open || toDecide ? 'filled' : 'none-yet') as 'filled' | 'none-yet', says };
}

function whatYouNeedToDecide(i: WhatTheKindsBoardIsBuiltFrom) {
  const heading = i.readerIsTheLead ? 'What you need to decide' : 'What needs deciding';
  const items = whatNeedsDeciding(i);
  if (!items.length) return { heading, state: 'none-yet' as const, says: 'Nothing is waiting for a decision yet.' };
  return { heading, state: 'filled' as const, items };
}

export const WHAT_IT_CHANGED_IS_NOT_ON_RECORD =
  'Nothing on record links each change to what it changed, so this shows what was said in the newest session and how each line is known.';

function whatChangedThisWeek(i: WhatTheKindsBoardIsBuiltFrom) {
  const heading = 'What changed this week, and what it changed';
  const rows = ((i.board.whoOwnsWhat ?? []) as any[]).flatMap((r) => ((r.items ?? []) as any[]).map((it) => ({ ...it, participantId: r.participantId, who: r.name })));
  const newest = rows.reduce((m, it) => Math.max(m, typeof it.sessionNumber === 'number' ? it.sessionNumber : 0), 0);
  const lines = rows.filter((it) => newest > 0 && it.sessionNumber === newest && it.type !== 'SUCCESS_DEFINITION');
  /* "Nothing has been said" only where nobody has answered (item 21): Adaeze read it after both people had, on a board
     that does not list each person's lines. */
  if (!lines.length && !Array.isArray(i.board.whoOwnsWhat) && i.people.some((p) => p.answered)) {
    return { heading, state: 'not-known' as const, why: 'This board does not list what each person said, so what changed this week is not shown here. It is in the report.' };
  }
  if (!lines.length) return { heading, state: 'none-yet' as const, says: 'Nothing has been said about the matter yet.' };
  return {
    heading,
    state: 'filled' as const,
    sessionNumber: newest,
    says: `In session ${newest}, ${plural(lines.length, 'thing was', 'things were')} said about the matter.`,
    lines: lines.map((it) => ({ id: it.id, participantId: it.participantId ?? null, text: it.text, mark: it.mark, markSays: it.markSays })),
    cannotTell: WHAT_IT_CHANGED_IS_NOT_ON_RECORD,
  };
}

/* ------------------------------------------------------------------------------------------------
 * MARKETVIEW, WHERE NEXT
 * ---------------------------------------------------------------------------------------------- */

export const NO_GROUP_ON_RECORD =
  'Nobody’s group is on record, so the answers can’t be shown by group yet.';

function byWhoTheyAre(i: WhatTheKindsBoardIsBuiltFrom) {
  /* A lead who checks in too is one of the people asked (item 21, the where-next board): Omar read "3 of 3 people have
     answered." under a summary saying all four had. A lead who only runs it is not counted. */
  const asked = i.people.filter((p) => !p.managingOnly && (!p.isLead || p.answered));
  const answered = asked.filter((p) => p.answered).length;
  /*
   * BY WHO THEY ARE, IN THE LEAD'S OWN WORDS (mvnext-board.jpg, screen match 16 October). Where the lead has said who
   * each person is (roleAsDescribed, which only the lead is served), the people asked are grouped by those words,
   * with how many in each answered. Nothing is inferred: a person the lead has not described leaves the groups
   * not known, as before.
   */
  /* Only where the words tell people apart: one description for everybody ("the team") is no grouping. */
  if (asked.length && asked.every((p) => (p.describedAs ?? '').trim()) && new Set(asked.map((p) => String(p.describedAs).trim().toLowerCase())).size > 1) {
    const groups = new Map<string, APerson[]>();
    for (const p of asked) { const g = String(p.describedAs).trim(); groups.set(g, [...(groups.get(g) ?? []), p]); }
    return {
      heading: 'By who they are',
      state: 'filled' as const,
      note: 'What each group said it needs',
      says: someOfThemHave(answered, asked.length, 'answered.'),
      groups: [...groups.entries()].map(([group, ps]) => {
        const a = ps.filter((p) => p.answered).length;
        return { group, count: ps.length, answered: a, says: `${ps.length} ${ps.length === 1 ? 'person' : 'people'}, ${a} answered.` };
      }),
    };
  }
  return {
    heading: 'By who they are',
    state: 'not-known' as const,
    why: NO_GROUP_ON_RECORD,
    says: someOfThemHave(answered, asked.length, 'answered.'),
  };
}

function whereTheyDisagree(i: WhatTheKindsBoardIsBuiltFrom) {
  const heading = 'Where they disagree';
  const items = (i.board.divergence?.items ?? []) as any[];
  if (!items.length) return { heading, state: 'none-yet' as const, says: 'Nobody has said anything that differs from what somebody else said yet.' };
  return { heading, state: 'filled' as const, items };
}

/* ------------------------------------------------------------------------------------------------
 * MARKETVIEW Q4
 * ---------------------------------------------------------------------------------------------- */

function whereWhatWasSaidAndADocumentDiffer(i: WhatTheKindsBoardIsBuiltFrom) {
  const heading = 'Where what people said and the systems differ';
  const rows: any[] = [];
  for (const r of (i.board.whoOwnsWhat ?? []) as any[]) {
    for (const it of (r.items ?? []) as any[]) {
      const other = i.documentSaysOf.get(it.id);
      if (!other) continue;
      rows.push({
        id: it.id,
        participantId: r.participantId ?? null,
        said: it.text,
        documentSays: `A document on this check-in says it differently. It says, "${other.trim().replace(/"/g, "'")}"`,
      });
    }
  }
  if (!rows.length) return { heading, state: 'none-yet' as const, says: 'Nothing anybody said differs from a document or a number on record yet.' };
  return { heading, state: 'filled' as const, rows, whatANumberIsNot: WHAT_A_NUMBER_IS_NOT };
}

/** The fields this kind of work's board carries, or nothing for the six kinds that use the switchboard. */
export function theBoardForThisKind(i: WhatTheKindsBoardIsBuiltFrom): Record<string, any> {
  const now = i.now ?? new Date();
  switch (i.kind) {
    case 'a government programme':
      return {
        whatEachLevelUnderstood: whatEachLevelUnderstood(i),
        theCounties: theCounties(i),
        whatTheVisitLogShows: whatTheSystemsShow(i.metrics, 'What the visit log shows', now),
      };
    case 'asset loans':
      return {
        whereTheCohortStands: whereTheCohortStands(i),
        supportGiven: { heading: 'Support given, and whether it helped', state: 'not-known', why: NO_SUPPORT_ON_RECORD },
      };
    case 'a law firm matter':
      return {
        whereTheMatterStands: whereTheMatterStands(i, now),
        whatYouNeedToDecide: whatYouNeedToDecide(i),
        whatChangedThisWeek: whatChangedThisWeek(i),
      };
    case 'MarketView where next':
      return { byWhoTheyAre: byWhoTheyAre(i), whereTheyDisagree: whereTheyDisagree(i) };
    case 'MarketView Q4':
      return {
        whatTheSystemsShow: whatTheSystemsShow(i.metrics, 'What the systems show', now),
        whereWhatWasSaidAndTheSystemsDiffer: whereWhatWasSaidAndADocumentDiffer(i),
      };
    default:
      return {};
  }
}

/** Every field this file may put on a board, for the list a participant's board is cut to. */
export const THE_KINDS_OWN_FIELDS = [
  'whatEachLevelUnderstood', 'theCounties', 'whatTheVisitLogShows', 'whereTheCohortStands', 'supportGiven',
  'whereTheMatterStands', 'whatYouNeedToDecide', 'whatChangedThisWeek', 'byWhoTheyAre', 'whereTheyDisagree',
  'whatTheSystemsShow', 'whereWhatWasSaidAndTheSystemsDiffer',
] as const;
