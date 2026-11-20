import { GroundScenario } from '@prisma/client';
import { oneOfTheKinds } from './the-kind-of-work';
import { COLLECTIONS_TYPES, COLLECTIONS_TYPE_LABEL, theCollectionsTypeRead } from '../grounds/collect-whats-owed';

/**
 * THE SWITCHBOARD: SCENARIO PLUS TYPE PICKS THE BOARD AND THE REPORTS (release plan, Part 0, "How it fits together", and Part 2;
 * Release 2, "Switchboard foundation"). Internal: people never read this file's words, only what it picks.
 *
 * ONE PLACE. Every pair of a scenario and a type that has a board and reports of its own is one row of the table below. Every
 * pair NOT in the table, and every row whose switch is off for the organisation or whose board is not built yet, picks
 * "today": the board and the reports exactly as the product draws them now, by the code that draws them now. So adding a row
 * changes nothing for any check-in until its organisation's switch is on and its board is built.
 *
 * THE TYPE. The department or kind of work: "sales team", "invoices or fee notes", "loans", "legal matter".
 *  - Stored only when the lead confirms it: `Ground.checkInType`, written by PATCH /grounds/:id/check-in-type from "What it is"
 *    on People and setup, while the organisation's Release 2 switch is on.
 *  - Otherwise read from the check-in's own record each time it is read, never written: its kind of work (a sales team, a law
 *    firm matter, asset loans), which the lead may already have chosen.
 *  - For a scenario with types of its own (COLLECTIONS), what "What it is" offers the lead to confirm is read from her words and
 *    the organisation's record (collect-whats-owed.ts, theCollectionsTypeRead).
 * Existing check-ins therefore get their type from their own record, and no existing row is rewritten.
 *
 * WHICH RELEASE BUILDS EACH ROW. Release 1 built the sales team row (its board and reports are drawn by the code behind
 * `release1SalesBoardOn`, which this table names and does not replace). Release 2's rows are listed now so its next two pull
 * requests only draw them: the collections board and its reports (pull request 2, built: the-collections-board.ts and its reports),
 * the matter board (pull request 3, built: the-matter-board.ts).
 */

/** The switchboard's types. Each is the department or kind of work, in the release plan's words. */
export const CHECK_IN_TYPES = ['sales team', 'invoices or fee notes', 'loans', 'legal matter', 'support tickets', 'incidents', 'engineering tasks', 'trader programme', 'government programme', 'where next', 'founder check-in', 'quarter metrics', 'sales organisation', 'leadership team', 'funded project', 'client delivery'] as const;
export type ACheckInType = (typeof CHECK_IN_TYPES)[number];

/** What a lead reads for each type. The collections two are the B8 picture's ("Fee notes and invoices", "Loan repayments"). */
export const CHECK_IN_TYPE_LABEL: Record<ACheckInType, string> = {
  'sales team': 'A sales team',
  'invoices or fee notes': COLLECTIONS_TYPE_LABEL['invoices or fee notes'],
  loans: COLLECTIONS_TYPE_LABEL.loans,
  'legal matter': 'A legal matter',
  'support tickets': 'A support desk',
  incidents: 'Operations and its incidents',
  'engineering tasks': 'An engineering release',
  'trader programme': 'A trader training programme',
  'government programme': 'A government programme',
  'where next': 'Where to focus next',
  'founder check-in': 'A founder’s own check-in',
  'quarter metrics': 'A quarter’s numbers',
  'sales organisation': 'A sales organisation with several teams',
  'leadership team': 'A leadership team',
  'funded project': 'A funded project',
  'client delivery': 'Work delivered to a client',
};

/** The organisation switch each row sits behind (Organization columns). */
export type ASwitch = 'release1SalesBoardOn' | 'release2CollectionsOn' | 'release4TeamsOn' | 'release5ProjectsOn';
export type TheSwitches = Partial<Record<ASwitch, boolean>>;

/** The boards the table can pick. "today" is the product as it draws a check-in now. */
export type ABoard = 'today' | 'the sales board' | 'the collections board' | 'the loans board' | 'the matter board' | 'the tickets board' | 'the sales organisation board' | 'the programme board' | 'the numbers board' | 'the leadership board' | 'the project board';

/** The reports a row picks (release plan, Part 2, "Report shapes"). */
export interface TheReports {
  /** "full": In short, What moved, What each person said, Where people see it differently, What this report can't tell you, What I don't know yet. */
  team: 'full' | 'short';
  /** Every scenario also has each person's own report and the weekly report. */
  own: true;
  weekly: true;
  /** The weekly report's numbers, counted from the board's own rows, where the row names them. */
  weeklyNumbers?: readonly string[];
  /** Anything special the row's team report has. */
  special?: readonly string[];
}

export interface ASwitchboardRow {
  /**
   * The scenario this row's REPORTS are shaped for. It no longer decides the board: the board follows the type alone (board assessment,
   * 15 November: a board chosen by scenario and by kind of work both could disagree, and a scenario read wrongly hid the right board).
   */
  scenario: GroundScenario;
  /** Only for the two collections types, which belong to one scenario and exist nowhere else: the board is picked only in this scenario. */
  boardOnlyIn?: GroundScenario;
  type: ACheckInType;
  board: Exclude<ABoard, 'today'>;
  reports: TheReports;
  switch: ASwitch;
  /** Which release draws it. */
  release: string;
  /** False until that release's board is drawn: the row then picks "today". */
  built: boolean;
}

export const THE_SWITCHBOARD: readonly ASwitchboardRow[] = [
  {
    scenario: GroundScenario.OKR_ALIGNMENT, type: 'sales team', board: 'the sales board',
    reports: { team: 'full', own: true, weekly: true, special: ['Why the numbers don’t match', 'One question to answer'] },
    switch: 'release1SalesBoardOn', release: 'Release 1', built: true,
  },
  {
    scenario: GroundScenario.COLLECTIONS, type: 'invoices or fee notes', board: 'the collections board',
    reports: { team: 'full', own: true, weekly: true, weeklyNumbers: ['collected this week', 'due', 'overdue', 'paid with proof'] },
    switch: 'release2CollectionsOn', release: 'Release 2, pull request 2', built: true, boardOnlyIn: GroundScenario.COLLECTIONS,
  },
  {
    scenario: GroundScenario.COLLECTIONS, type: 'loans', board: 'the loans board',
    reports: { team: 'full', own: true, weekly: true, weeklyNumbers: ['collected this week', 'due', 'overdue', 'paid with proof'] },
    switch: 'release2CollectionsOn', release: 'Release 2, pull request 2', built: true, boardOnlyIn: GroundScenario.COLLECTIONS,
  },
  {
    scenario: GroundScenario.PULSE_CHECK, type: 'legal matter', board: 'the matter board',
    reports: { team: 'full', own: true, weekly: true, special: ['each matter’s fees, in one line'] },
    switch: 'release2CollectionsOn', release: 'Release 2, pull request 3', built: true,
  },
  /*
   * THE TICKETS FAMILY (Release 4, pilot of November 2026): support, operations and engineering are one board shape, tickets, incidents
   * or tasks moving through stages, drawn by the pictured tickets board. Each is "keep the team on track" (release plan, Part 2,
   * OKR_ALIGNMENT), behind the Release 4 switch, which is off for every organisation until staff switch it on. Their reports are
   * today's: this row picks only the board, so the report is the short team report.
   */
  ...(['support tickets', 'incidents', 'engineering tasks'] as const).map((type): ASwitchboardRow => ({
    scenario: GroundScenario.OKR_ALIGNMENT, type, board: 'the tickets board',
    reports: { team: 'short', own: true, weekly: true },
    switch: 'release4TeamsOn', release: 'Release 4', built: true,
  })),
  /*
   * THE PROGRAMME FAMILY (Release 4, pilot of November 2026): a trader training programme (check how the same role is going), a
   * government programme (keep a read on live work) and a where-next workshop (work out where to focus), each drawn by its own pictured
   * board from the figures people said. Behind the same Release 4 switch, off for every organisation until staff switch it on. Their
   * reports are today's: each row picks only the board.
   */
  ...([[GroundScenario.COHORT_CHECK, 'trader programme'], [GroundScenario.PULSE_CHECK, 'government programme'], [GroundScenario.DISCOVERY, 'where next']] as const).map(([scenario, type]): ASwitchboardRow => ({
    scenario, type, board: 'the programme board',
    reports: { team: 'short', own: true, weekly: true },
    switch: 'release4TeamsOn', release: 'Release 4', built: true,
  })),
  /*
   * THE NUMBER-TRACKING FAMILY (Release 4, pilot of November 2026): a founder's own check-in (keep a read on live work) and a quarter's
   * metrics for a product (set goals and keep the team on track), each drawn by its own pictured board from the figures people said
   * beside any a system sent. Behind the same Release 4 switch, off for every organisation until staff switch it on. Their reports are
   * today's: each row picks only the board.
   */
  ...([[GroundScenario.PULSE_CHECK, 'founder check-in'], [GroundScenario.OKR_ALIGNMENT, 'quarter metrics']] as const).map(([scenario, type]): ASwitchboardRow => ({
    scenario, type, board: 'the numbers board',
    reports: { team: 'short', own: true, weekly: true },
    switch: 'release4TeamsOn', release: 'Release 4', built: true,
  })),
  /*
   * THE REST OF THE KINDS THE PRODUCT DRAWS (15 November). A sales organisation is drawn as the engineering board is (salesorg.jpg is the
   * same shape, by team), a leadership team has its own priorities board, and a funded project or client delivery its plan board. They had
   * no row, so the table did not know they had a board. Each picks only the board; reports are today's. These mappings are judgements,
   * written out in docs/board-switchboard-judgements-15-nov.md for Hafsah to confirm.
   */
  {
    scenario: GroundScenario.OKR_ALIGNMENT, type: 'sales organisation', board: 'the sales organisation board',
    reports: { team: 'short', own: true, weekly: true }, switch: 'release4TeamsOn', release: 'Release 4', built: true,
  },
  {
    scenario: GroundScenario.BOARD_STRATEGY, type: 'leadership team', board: 'the leadership board',
    reports: { team: 'short', own: true, weekly: true }, switch: 'release4TeamsOn', release: 'Release 4', built: true,
  },
  ...(['funded project', 'client delivery'] as const).map((type): ASwitchboardRow => ({
    scenario: GroundScenario.WORKPLAN_BUDGET, type, board: 'the project board',
    reports: { team: 'short', own: true, weekly: true }, switch: 'release5ProjectsOn', release: 'Release 5', built: true,
  })),
];

/** The types a scenario offers the lead to choose from in "What it is", where it has types of its own. Others keep the kind of work. */
export const TYPES_A_SCENARIO_OFFERS: Partial<Record<GroundScenario, readonly ACheckInType[]>> = {
  [GroundScenario.COLLECTIONS]: COLLECTIONS_TYPES,
};

/** A type the switchboard knows, or nothing. Exact, ignoring capitals and spaces at the ends; never the nearest match. */
export function oneOfTheTypes(v: unknown): ACheckInType | null {
  if (typeof v !== 'string') return null;
  const t = v.trim().toLowerCase();
  return (CHECK_IN_TYPES as readonly string[]).find((x) => x === t) as ACheckInType | undefined ?? null;
}

/** A check-in's kind of work, as the switchboard's type. Read only; "sales org" has no row until Release 4 draws its board. */
const THE_TYPE_OF_A_KIND: Record<string, ACheckInType> = {
  'sales team': 'sales team',
  'a law firm matter': 'legal matter',
  'asset loans': 'loans',
  'support desk': 'support tickets',
  'distribution operations': 'incidents',
  'engineering release': 'engineering tasks',
  'trader training programme': 'trader programme',
  'a government programme': 'government programme',
  'MarketView where next': 'where next',
  "founder's own check-in": 'founder check-in',
  'MarketView Q4': 'quarter metrics',
  'sales org': 'sales organisation',
  leadership: 'leadership team',
  'a funded project': 'funded project',
  'client delivery': 'client delivery',
};

/**
 * THE KIND OF WORK A TYPE IS DRAWN AS: the inverse of the table above, so that the board a lead sees follows the type the switchboard
 * names, from one place, and the screen reads it. A type the lead confirmed beats the kind of work read from her words.
 */
export const THE_KIND_OF_A_TYPE: Partial<Record<ACheckInType, string>> = Object.fromEntries(Object.entries(THE_TYPE_OF_A_KIND).map(([k, t]) => [t, k]));

/**
 * A KIND OF WORK THE SWITCHBOARD NEEDS, WHERE ITS SWITCH IS ON (messages test, 19 October, finding 19). "a law firm matter" is how a
 * pulse check reads as a legal matter and is served the matter board, but the kinds offered to every organisation are the sales and
 * engineering ones, so Muchemi & Co.'s litigation daily was refused it and ran with no kind of work. A kind the switchboard maps to a
 * type with a row may be given wherever that row's switch is on for the organisation; everywhere else, only the kinds offered.
 */
export async function aKindTheSwitchboardNeeds(prisma: any, kindOfWork: unknown, organizationId: string | null | undefined): Promise<boolean> {
  const type = theTypeOfAKind(kindOfWork);
  if (!type || !organizationId) return false;
  const rows = THE_SWITCHBOARD.filter((r) => r.type === type);
  if (!rows.length) return false;
  const switches = await theSwitchesOf(prisma, organizationId);
  return rows.some((r) => switches[r.switch] === true);
}

/**
 * THE SITUATION A KIND OF WORK BELONGS TO, WHERE THE SITUATION READ IS UNSURE (board assessment, 15 November, fix 1 and 2). The kind
 * of work is read from the person's words by the model; when it names a kind the switchboard has a row for, that row's scenario is the
 * situation the check-in and its report are run as, so a person is not asked "which situation is this?" about work Groundwork has
 * already recognised. Never over a sure situation read, and never over a situation the person picked.
 */
export function theScenarioAKindImplies(kindOfWork: unknown): GroundScenario | null {
  const type = theTypeOfAKind(kindOfWork);
  return type ? THE_SWITCHBOARD.find((r) => r.type === type)?.scenario ?? null : null;
}

export function theTypeOfAKind(kindOfWork: unknown): ACheckInType | null {
  const k = oneOfTheKinds(kindOfWork);
  return k ? THE_TYPE_OF_A_KIND[k] ?? null : null;
}

export interface ACheckInsType {
  type: ACheckInType | null;
  /** True when the lead chose it: confirmed in "What it is", or the kind of work she set herself. */
  confirmed: boolean;
  from: 'the lead' | 'its kind of work' | null;
}

/**
 * THE TYPE OF A CHECK-IN, FROM ITS OWN RECORD, AT READ TIME. Nothing is written. A type the lead confirmed wins; then the kind of
 * work the check-in holds. For a scenario with types of its own, only one of those types counts.
 */
export function theTypeOnRecord(g: {
  scenario?: string | null;
  kindOfWork?: string | null;
  kindOfWorkSetBy?: string | null;
  checkInType?: string | null;
  checkInTypeConfirmedAt?: Date | string | null;
}): ACheckInsType {
  const offered = g.scenario ? TYPES_A_SCENARIO_OFFERS[g.scenario as GroundScenario] : undefined;
  const fits = (t: ACheckInType | null) => !!t && (!offered || offered.includes(t));
  const confirmed = oneOfTheTypes(g.checkInType);
  if (confirmed && g.checkInTypeConfirmedAt && fits(confirmed)) return { type: confirmed, confirmed: true, from: 'the lead' };
  const fromKind = theTypeOfAKind(g.kindOfWork);
  if (fits(fromKind)) return { type: fromKind, confirmed: g.kindOfWorkSetBy === 'lead', from: 'its kind of work' };
  return { type: null, confirmed: false, from: null };
}

/**
 * WHAT "WHAT IT IS" OFFERS THE LEAD TO CONFIRM: the type on record, or, for a scenario with types of its own where none is on
 * record, the one read from her words and the organisation's record. Never written by itself.
 */
export function theTypeToOffer(
  g: Parameters<typeof theTypeOnRecord>[0] & { brief?: string | null; label?: string | null },
  org: { billWord?: string | null; typesConfirmedHere?: readonly string[] },
): { type: ACheckInType | null; confirmed: boolean; readFrom: 'the lead' | 'its kind of work' | 'your words' | 'your organisation' | null } {
  const onRecord = theTypeOnRecord(g);
  if (onRecord.type) return { type: onRecord.type, confirmed: onRecord.confirmed, readFrom: onRecord.from };
  if (g.scenario === GroundScenario.COLLECTIONS) {
    const read = theCollectionsTypeRead({ words: [g.label, g.brief].filter(Boolean).join('. '), billWord: org.billWord, typesConfirmedHere: org.typesConfirmedHere });
    if (read) return { type: read.type, confirmed: false, readFrom: read.from };
  }
  return { type: null, confirmed: false, readFrom: null };
}

export interface WhatTheSwitchboardPicks {
  board: ABoard;
  reports: TheReports | 'today';
  /** The row this pair has, built or not, so a later release can draw it. Null where the pair has none. */
  row: ASwitchboardRow | null;
  /** Why it picked what it picked, for the tests and the logs. Never shown to anybody. */
  because: 'no row for this pair' | 'its switch is off' | 'its board is not built yet' | 'its row';
}

/** The row for a type, or nothing. The scenario matters only to the two collections types, which belong to their own scenario. */
export function theRowFor(scenario: string | null | undefined, type: string | null | undefined): ASwitchboardRow | null {
  if (!type) return null;
  return THE_SWITCHBOARD.find((r) => r.type === type && (!r.boardOnlyIn || r.boardOnlyIn === scenario)) ?? null;
}

/** THE ONE PLACE: scenario plus type, with the organisation's switches, picks the board and the reports. */
export function whatTheSwitchboardPicks(scenario: string | null | undefined, type: string | null | undefined, switches: TheSwitches): WhatTheSwitchboardPicks {
  const row = theRowFor(scenario, type);
  if (!row) return { board: 'today', reports: 'today', row: null, because: 'no row for this pair' };
  if (switches[row.switch] !== true) return { board: 'today', reports: 'today', row, because: 'its switch is off' };
  if (!row.built) return { board: 'today', reports: 'today', row, because: 'its board is not built yet' };
  /* The scenario now decides one thing here: whether this row's report shape applies. Any other scenario keeps today's reports. */
  return { board: row.board, reports: row.scenario === scenario ? row.reports : 'today', row, because: 'its row' };
}

/** The organisation's switches, read once. A row that cannot be read is every switch off. */
export async function theSwitchesOf(prisma: any, organizationId: string | null | undefined): Promise<TheSwitches> {
  /* Every board is on (Hafsah, 15 November 2026: everything has a board; reverses the October hide, decisions 88 and 91). Which board to draw no
     longer reads the organisation's switches. The Release 1 switch itself is untouched: it still governs sales messaging (conversation, reports,
     nudges, WhatsApp and email), so existing clients' messages do not change. */
  void prisma; void organizationId;
  return { release1SalesBoardOn: true, release2CollectionsOn: true, release4TeamsOn: true, release5ProjectsOn: true };
}

/**
 * WHAT THE BOARD AND THE TEAM REPORT ARE TOLD, WHERE RELEASE 2 IS ON. Nothing where it is off, so what they serve is exactly what
 * they served before. A plain read of the record: the type and whether the lead confirmed it, and the board and reports picked.
 * Nothing in it is about a person.
 */
export interface TheSwitchboardServed {
  type: ACheckInType | null;
  typeConfirmed: boolean;
  board: ABoard;
  /** The kind of work the screen draws, read from the type the switchboard names: the one owner of which board is drawn. Null where nothing is picked. */
  drawnAs: string | null;
  reports: 'today' | 'full' | 'short';
}

export async function whatTheSwitchboardServes(
  prisma: any,
  ground: { organizationId?: string | null } & Parameters<typeof theTypeOnRecord>[0],
): Promise<TheSwitchboardServed | null> {
  const switches = await theSwitchesOf(prisma, ground.organizationId ?? null);
  const t = theTypeOnRecord(ground);
  const pick = whatTheSwitchboardPicks(ground.scenario, t.type, switches);
  /* Nothing is served where Release 2 is off, as before, except a Release 4 or 5 board where that release is on and picks it. */
  if (switches.release2CollectionsOn !== true && !(pick.board !== 'today' && (pick.row?.switch === 'release4TeamsOn' || pick.row?.switch === 'release5ProjectsOn'))) return null;
  return { type: t.type, typeConfirmed: t.confirmed, board: pick.board, drawnAs: pick.board !== 'today' && t.type ? THE_KIND_OF_A_TYPE[t.type] ?? null : null, reports: pick.reports === 'today' ? 'today' : pick.reports.team };
}
