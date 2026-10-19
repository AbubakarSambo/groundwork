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
export const CHECK_IN_TYPES = ['sales team', 'invoices or fee notes', 'loans', 'legal matter'] as const;
export type ACheckInType = (typeof CHECK_IN_TYPES)[number];

/** What a lead reads for each type. The collections two are the B8 picture's ("Fee notes and invoices", "Loan repayments"). */
export const CHECK_IN_TYPE_LABEL: Record<ACheckInType, string> = {
  'sales team': 'A sales team',
  'invoices or fee notes': COLLECTIONS_TYPE_LABEL['invoices or fee notes'],
  loans: COLLECTIONS_TYPE_LABEL.loans,
  'legal matter': 'A legal matter',
};

/** The organisation switch each row sits behind (Organization columns). */
export type ASwitch = 'release1SalesBoardOn' | 'release2CollectionsOn';
export type TheSwitches = Partial<Record<ASwitch, boolean>>;

/** The boards the table can pick. "today" is the product as it draws a check-in now. */
export type ABoard = 'today' | 'the sales board' | 'the collections board' | 'the loans board' | 'the matter board';

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
  scenario: GroundScenario;
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
    switch: 'release2CollectionsOn', release: 'Release 2, pull request 2', built: true,
  },
  {
    scenario: GroundScenario.COLLECTIONS, type: 'loans', board: 'the loans board',
    reports: { team: 'full', own: true, weekly: true, weeklyNumbers: ['collected this week', 'due', 'overdue', 'paid with proof'] },
    switch: 'release2CollectionsOn', release: 'Release 2, pull request 2', built: true,
  },
  {
    scenario: GroundScenario.PULSE_CHECK, type: 'legal matter', board: 'the matter board',
    reports: { team: 'full', own: true, weekly: true, special: ['each matter’s fees, in one line'] },
    switch: 'release2CollectionsOn', release: 'Release 2, pull request 3', built: true,
  },
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
};

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

/** The row for a scenario and a type, or nothing. */
export function theRowFor(scenario: string | null | undefined, type: string | null | undefined): ASwitchboardRow | null {
  if (!scenario || !type) return null;
  return THE_SWITCHBOARD.find((r) => r.scenario === scenario && r.type === type) ?? null;
}

/** THE ONE PLACE: scenario plus type, with the organisation's switches, picks the board and the reports. */
export function whatTheSwitchboardPicks(scenario: string | null | undefined, type: string | null | undefined, switches: TheSwitches): WhatTheSwitchboardPicks {
  const row = theRowFor(scenario, type);
  if (!row) return { board: 'today', reports: 'today', row: null, because: 'no row for this pair' };
  if (switches[row.switch] !== true) return { board: 'today', reports: 'today', row, because: 'its switch is off' };
  if (!row.built) return { board: 'today', reports: 'today', row, because: 'its board is not built yet' };
  return { board: row.board, reports: row.reports, row, because: 'its row' };
}

/** The organisation's switches, read once. A row that cannot be read is every switch off. */
export async function theSwitchesOf(prisma: any, organizationId: string | null | undefined): Promise<TheSwitches> {
  if (!organizationId) return {};
  try {
    const o = await prisma?.organization?.findUnique?.({ where: { id: organizationId }, select: { release1SalesBoardOn: true, release2CollectionsOn: true } });
    return { release1SalesBoardOn: o?.release1SalesBoardOn === true, release2CollectionsOn: o?.release2CollectionsOn === true };
  } catch {
    return {};
  }
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
  reports: 'today' | 'full' | 'short';
}

export async function whatTheSwitchboardServes(
  prisma: any,
  ground: { organizationId?: string | null } & Parameters<typeof theTypeOnRecord>[0],
): Promise<TheSwitchboardServed | null> {
  const switches = await theSwitchesOf(prisma, ground.organizationId ?? null);
  if (switches.release2CollectionsOn !== true) return null;
  const t = theTypeOnRecord(ground);
  const pick = whatTheSwitchboardPicks(ground.scenario, t.type, switches);
  return { type: t.type, typeConfirmed: t.confirmed, board: pick.board, reports: pick.reports === 'today' ? 'today' : pick.reports.team };
}
