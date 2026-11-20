import { theBillsPlural, type ACollectionsType } from '../grounds/collect-whats-owed';
import { theStagesKept } from '../board/a-deals-stages-are-kept';
import { F, FOLLOWS_UP_ID, LOAN_OWED, aDay } from '../board/the-collections-record';
import {
  buildTheCollectionsBoard, theGroupOf, theDueDay, thePaidDay, theOpenPromise, anAmount, money, aDayInWords, theDayOf,
  type ABillOnTheBoard, type ACollectionsPerson, type AGroup,
} from '../board/the-collections-board';
import type { AFigure, AThingToDo, WhatChanged } from './the-weekly-report';

/**
 * THE COLLECTIONS REPORTS, READ FROM THE BILLS (release plan, Part 2, "Report shapes", full; Release 2: "Reports: full. Weekly
 * numbers: collected this week, due, overdue, paid with proof"; Release 2, pull request 2 of 3).
 *
 *  - THE TEAM'S REPORT, for one session, to whoever runs the check-in: In short, What moved, What each person said, Where people
 *    see it differently, What this report can't tell you, What I don't know yet.
 *  - EACH PERSON'S OWN REPORT, for one session, about the bills they follow up (or their own loan) only, said to them as "you".
 *  - THE WEEKLY REPORT'S PARTS: the week in numbers counted from the bills (collected this week, due, overdue, paid with proof),
 *    what this week shows, what changed, what people said and what the proof shows, and for you to do next week. The week's facts
 *    are kept by participant id, never by name, when the week is built; names are put in only as it is served, for that reader.
 *
 * Pure, like the board it reads the same rows as (the-collections-board): the caller walls the rows to the reader first. Nothing
 * here calls a model or writes anything.
 */

const NUMBER_WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const small = (n: number) => (n <= 10 ? NUMBER_WORDS[n] : String(n));
const Cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const stop = (s: string) => String(s ?? '').trim().replace(/[.\s]+$/, '');
const field = (r: { fields?: Record<string, unknown> | null }, k: string) => String((r.fields ?? {})[k] ?? '').trim();

export interface ALineSaid { participantId: string | null; checkInId: string | null; text: string; createdAt: Date | string; documented?: boolean }

export interface TheCollectionsReportInput {
  type: ACollectionsType;
  billWord: string;
  rows: ABillOnTheBoard[];
  people: ACollectionsPerson[];
  lastCheckIn: Record<string, Date | string | null>;
  now: Date;
  zone: string;
  reader: { runsIt: boolean; participantId: string | null };
  stallRuleSet: boolean;
  /** The session the report is about: its check-ins, and the lines said in them. */
  session: { number: number; checkIns: { participantId: string; completedAt: Date | string | null }[]; lines: ALineSaid[]; due: number };
}

/** The name of a bill in a sentence: "FN-004 for Kasarani Foods", "the fee note for Kasarani Foods that is not numbered yet", "Musa's loan". */
function aBillCalled(r: ABillOnTheBoard, bill: string, nameOf: (pid: string | null) => string): string {
  if (r.kind === LOAN_OWED) { const n = nameOf(r.ownerParticipantId); return n === 'you' ? 'your loan' : `${n}’s loan`; }
  const n = field(r, F.number);
  const client = field(r, F.client) || r.name;
  return n ? `${n} for ${client}` : `the ${bill} for ${client} that is not numbered yet`;
}

/** Each stage a bill was put at in a window, with the one before it. A stage kept as where it stood ("asOf") is not a move. */
export function theMovesIn(rows: ABillOnTheBoard[], from: Date, to: Date): { r: ABillOnTheBoard; from: string | null; to: string; on: string }[] {
  const out: { r: ABillOnTheBoard; from: string | null; to: string; on: string }[] = [];
  for (const r of rows) {
    const kept = theStagesKept(r.fields);
    kept.forEach((s, i) => {
      const at = new Date(s.on).getTime();
      if (s.asOf || at < from.getTime() || at > to.getTime()) return;
      out.push({ r, from: i > 0 ? kept[i - 1].stage : null, to: s.stage, on: s.on });
    });
  }
  return out.sort((a, b) => a.on.localeCompare(b.on));
}

function aMoveSaid(m: { r: ABillOnTheBoard; from: string | null; to: string; on: string }, bill: string, zone: string, nameOf: (pid: string | null) => string): string {
  const called = Cap(aBillCalled(m.r, bill, nameOf));
  const day = aDayInWords(new Date(m.on), zone, true);
  if (m.to === 'Paid') {
    return m.r.proof.length
      ? `${called} was paid on ${day}, and a payment record shows it.`
      : `${called} was paid on ${day}, as ${nameOf(m.r.ownerParticipantId)} said. No slip or message shows it yet.`;
  }
  if (m.to === 'Promised') {
    const by = aDay(field(m.r, F.promisedBy));
    const loan = m.r.kind === LOAN_OWED;
    const who = nameOf(m.r.ownerParticipantId);
    return `${loan ? Cap(who) : 'The client'} promised on ${day} to pay ${loan ? (who === 'you' ? 'your loan' : 'the loan') : aBillCalled(m.r, bill, nameOf)}${by ? ` by ${aDayInWords(by, zone, true)}` : ''}.`;
  }
  return `${called} ${aStageInWords(m.to)} on ${day}.`;
}

/** What it means for a bill to reach a stage, as a verb, so no stage name is read as a label. */
export function aStageInWords(stage: string): string {
  switch (stage) {
    case 'Not yet raised': return 'came onto the record as not raised yet';
    case 'Invoiced': return 'was raised';
    case 'Disbursed': return 'was paid out';
    case 'Due': return 'fell due';
    case 'Reminded': return 'had a written reminder';
    case 'Chased': return 'was followed up with a call to the client';
    case 'Promised': return 'had a promise to pay';
    case 'Paid': return 'was paid';
    default: return 'moved on';
  }
}

/** What nobody has said yet about the open bills, one sentence each, at most five. */
function whatIsNotKnownYet(rows: ABillOnTheBoard[], groups: Map<string, AGroup>, bill: string, nameOf: (pid: string | null) => string): string[] {
  const out: string[] = [];
  for (const r of rows) {
    if (groups.get(r.id) === 'paid') continue;
    const called = aBillCalled(r, bill, nameOf);
    if (!anAmount(field(r, F.amount))) out.push(`Nobody has said how much ${called} is for.`);
    if (!theDueDay(r) && !field(r, F.dueWhen)) out.push(`Nobody has said when ${called} falls due.`);
    if (!field(r, F.nextStep) && groups.get(r.id) !== 'on-event' && groups.get(r.id) !== 'not-raised') out.push(`No next step is booked for ${called}.`);
  }
  return out.slice(0, 5);
}

export interface TheCollectionsTeamReport {
  title: string;
  inShort: string[];
  whatMoved: string[];
  eachPerson: { who: string; says: string; mark: 'proven' | 'said' }[];
  seeItDifferently: string[];
  cantTell: string[];
  dontKnowYet: string[];
}

export interface TheCollectionsOwnReport {
  title: string;
  inShort: string[];
  whatMoved: string[];
  forYouToDo: string[];
  dontKnowYet: string[];
}

function theWindow(input: TheCollectionsReportInput): { from: Date; to: Date; day: string | null } {
  const done = input.session.checkIns.map((c) => (c.completedAt ? new Date(c.completedAt) : null)).filter((d): d is Date => !!d).sort((a, b) => a.getTime() - b.getTime());
  if (!done.length) return { from: new Date(0), to: new Date(0), day: null };
  const last = done[done.length - 1];
  const day = theDayOf(last, input.zone);
  /* From six days before the first check-in of the session to the end of the day the last one came in: one session's week. */
  return { from: new Date(done[0].getTime() - 6 * 86_400_000), to: new Date(`${day}T23:59:59.999Z`), day };
}

/** The team's report for one session, to whoever runs the check-in. */
export function theCollectionsTeamReport(input: TheCollectionsReportInput): TheCollectionsTeamReport {
  const { billWord: bill, zone } = input;
  const bills = theBillsPlural(bill);
  const nameOf = (pid: string | null) => (pid && input.reader.participantId === pid ? 'you' : input.people.find((p) => p.id === pid)?.firstName || 'a colleague');
  const board = buildTheCollectionsBoard({ ...input, reader: { ...input.reader, runsIt: true } });
  const groups = new Map(input.rows.map((r) => [r.id, theGroupOf(r, input)]));
  const w = theWindow(input);
  const inThisSession = new Set(input.session.checkIns.filter((c) => c.completedAt).map((c) => c.participantId));
  const due = Math.max(input.session.due, inThisSession.size);
  const inShort = [
    board.answer,
    due ? `${Cap(small(inThisSession.size))} of the ${small(due)} people due checked in.` : '',
    board.needsYou.rows[0] ? `${stop(board.needsYou.rows[0].title)}.` : '',
  ].filter(Boolean);
  const moves = theMovesIn(input.rows, w.from, w.to).map((m) => aMoveSaid(m, bill, zone, nameOf));
  const eachPerson = [...inThisSession].map((pid) => {
    const theirs = input.session.lines.filter((l) => l.participantId === pid).map((l) => stop(l.text)).filter(Boolean);
    const who = input.people.find((p) => p.id === pid)?.firstName || 'A colleague';
    return {
      who: pid === input.reader.participantId ? 'You' : who,
      says: theirs.length ? `${theirs.join('. ')}.` : `${pid === input.reader.participantId ? 'You' : who} checked in and named no ${bill}.`,
      mark: input.session.lines.some((l) => l.participantId === pid && l.documented) ? 'proven' as const : 'said' as const,
    };
  });
  const seeItDifferently = input.rows.filter((r) => field(r, F.disputed)).map((r) =>
    `${field(r, F.client) || r.name} disputes ${aBillCalled(r, bill, nameOf).replace(/ for .*$/, '')}. ${Cap(nameOf(r.ownerParticipantId))} said, “${stop(field(r, F.disputed))}.”`);
  const paidSaid = input.rows.filter((r) => groups.get(r.id) === 'paid' && !r.proof.length);
  const cantTell = [
    input.type === 'loans'
      ? 'Nothing is connected to the repayment system yet, so a repayment counts as proven only where a borrower added a record, a slip or an M-Pesa message.'
      : 'Nothing is connected to your accounting system or your bank yet, so a payment counts as proven only where somebody added a slip, an M-Pesa message or the accounting system’s record.',
    ...paidSaid.map((r) => `Whether ${aBillCalled(r, bill, nameOf)} is paid. ${Cap(nameOf(r.ownerParticipantId))} said it is, and nothing filed on it shows it.`),
  ];
  return {
    title: `The team’s report on the ${input.type === 'loans' ? 'loans' : bills}${w.day ? `, ${aDayInWords(w.day, zone, true)}` : ''}`,
    inShort,
    whatMoved: moves.length ? moves : [`No ${input.type === 'loans' ? 'loan' : bill} moved in this check-in.`],
    eachPerson,
    seeItDifferently: seeItDifferently.length ? seeItDifferently : [`Nobody sees a ${input.type === 'loans' ? 'loan' : bill} differently on the record.`],
    cantTell,
    dontKnowYet: whatIsNotKnownYet(input.rows, groups, bill, nameOf),
  };
}

/** Each person's own report for one session, about their own bills only. */
export function theCollectionsOwnReport(input: TheCollectionsReportInput): TheCollectionsOwnReport {
  const { billWord: bill, zone } = input;
  const bills = theBillsPlural(bill);
  const me = input.reader.participantId;
  const nameOf = (pid: string | null) => (pid && pid === me ? 'you' : input.people.find((p) => p.id === pid)?.firstName || 'a colleague');
  const board = buildTheCollectionsBoard({ ...input, reader: { runsIt: false, participantId: me } });
  const groups = new Map(input.rows.map((r) => [r.id, theGroupOf(r, input)]));
  const w = theWindow(input);
  const today = theDayOf(input.now, zone);
  const moves = theMovesIn(input.rows, w.from, w.to).map((m) => aMoveSaid(m, bill, zone, nameOf));
  const forYouToDo: string[] = [];
  for (const r of input.rows) {
    const g = groups.get(r.id);
    if (g === 'paid') { if (!r.proof.length) forYouToDo.push(`Add the slip or the message that shows ${aBillCalled(r, bill, nameOf)} is paid.`); continue; }
    const step = field(r, F.nextStep);
    const by = aDay(field(r, F.nextStepBy));
    if (step) forYouToDo.push(`${Cap(stop(step))}${by ? `, by ${aDayInWords(by, zone, true)}` : ''}, for ${aBillCalled(r, bill, nameOf)}.`);
    else if (g !== 'on-event' && g !== 'not-raised') forYouToDo.push(`Book the next step for ${aBillCalled(r, bill, nameOf)}, with a day.`);
    const promise = theOpenPromise(r, today);
    if (promise?.missed && r.kind !== LOAN_OWED) forYouToDo.push(`Ask the client about ${aBillCalled(r, bill, nameOf)}. They promised to pay by ${aDayInWords(promise.by, zone)}.`);
  }
  return {
    title: `Your report on your ${input.type === 'loans' ? 'loan' : bills}${w.day ? `, ${aDayInWords(w.day, zone, true)}` : ''}`,
    inShort: [board.answer],
    whatMoved: moves.length ? moves : [`Nothing moved on your ${input.type === 'loans' ? 'loan' : bills} in this check-in.`],
    forYouToDo: forYouToDo.slice(0, 5),
    dontKnowYet: whatIsNotKnownYet(input.rows, groups, bill, nameOf),
  };
}

/* ---------------------------------------------------------------- the weekly report */

/** One bill as the week keeps it: ids and the client's name only, never a person's name. */
export interface ABillInTheWeek {
  id: string;
  kind: string;
  ownerParticipantId: string | null;
  followsUpParticipantId: string | null;
  number: string | null;
  client: string | null;
  amount: number | null;
  currency: string;
  group: AGroup;
  dueDay: string | null;
  paidDay: string | null;
  proven: boolean;
  promiseMissedOn: string | null;
  nextStep: string | null;
  nextStepBy: string | null;
  moves: { from: string | null; to: string; on: string }[];
}

export interface TheCollectionsWeek { type: ACollectionsType; billWord: string; weekStart: string; weekEnd: string; asOf: string; bills: ABillInTheWeek[] }

/** The week's facts, kept when the week is built (never on opening). */
export function theCollectionsWeek(input: Omit<TheCollectionsReportInput, 'session' | 'reader'>, start: Date, at: Date): TheCollectionsWeek {
  const weekStart = theDayOf(start, input.zone);
  const weekEnd = new Date(new Date(`${weekStart}T12:00:00Z`).getTime() + 6 * 86_400_000).toISOString().slice(0, 10);
  const asOf = theDayOf(at, input.zone);
  const ctx = { ...input, now: at, reader: { runsIt: true, participantId: null } };
  return {
    type: input.type, billWord: input.billWord, weekStart, weekEnd, asOf,
    bills: input.rows.map((r) => {
      const amt = anAmount(field(r, F.amount));
      const promise = theOpenPromise(r, asOf);
      return {
        id: r.id, kind: r.kind, ownerParticipantId: r.ownerParticipantId,
        followsUpParticipantId: String((r.fields ?? {})[FOLLOWS_UP_ID] ?? '') || null,
        number: field(r, F.number) || null,
        client: r.kind === LOAN_OWED ? null : field(r, F.client) || r.name,
        amount: amt?.value ?? null, currency: amt?.currency ?? 'KES',
        group: theGroupOf(r, ctx as any),
        dueDay: theDueDay(r), paidDay: thePaidDay(r, input.zone), proven: r.proof.length > 0,
        promiseMissedOn: promise?.missed ? promise.by : null,
        nextStep: field(r, F.nextStep) || null, nextStepBy: aDay(field(r, F.nextStepBy)),
        moves: theMovesIn([r], start, at).map((m) => ({ from: m.from, to: m.to, on: m.on })),
      };
    }),
  };
}

export interface TheCollectionsWeekServed {
  inNumbers: AFigure[];
  whatThisWeekShows: string[];
  whatChanged: WhatChanged;
  saidAndProof: string;
  forNextWeek: AThingToDo[];
}

/**
 * THE WEEK, AS ONE READER READS IT. `whose` walls it first: whoever runs the check-in reads every bill; a person, the ones they
 * follow up or owe. `nameOf` gives the name this reader may read for a participant ("you" for themselves).
 */
export function theCollectionsWeekServed(week: TheCollectionsWeek, reader: { runsIt: boolean; participantId: string | null }, nameOf: (pid: string | null) => string, zone: string): TheCollectionsWeekServed {
  const loans = week.type === 'loans';
  const bill = loans ? 'loan' : week.billWord;
  const bills = loans ? 'loans' : theBillsPlural(week.billWord);
  const mine = reader.runsIt ? week.bills : week.bills.filter((b) => !!reader.participantId && (b.ownerParticipantId === reader.participantId || b.followsUpParticipantId === reader.participantId));
  const cur = mine.find((b) => b.amount !== null)?.currency ?? 'KES';
  const total = (xs: ABillInTheWeek[]) => xs.reduce((a, b) => a + (b.amount ?? 0), 0);
  const inWeek = (d: string | null) => !!d && d >= week.weekStart && d <= week.weekEnd;
  const called = (b: ABillInTheWeek) => (b.kind === LOAN_OWED ? (b.ownerParticipantId === reader.participantId ? 'your loan' : `${nameOf(b.ownerParticipantId)}’s loan`) : b.number ? `${b.number} for ${b.client}` : `the ${bill} for ${b.client} that is not numbered yet`);
  const nOf = (n: number) => `${small(n)} ${n === 1 ? bill : bills}`;

  const paidThisWeek = mine.filter((b) => b.group === 'paid' && inWeek(b.paidDay));
  const provenThisWeek = paidThisWeek.filter((b) => b.proven);
  const dueThisWeek = mine.filter((b) => b.group !== 'paid' && b.group !== 'not-raised' && inWeek(b.dueDay));
  const overdue = mine.filter((b) => b.group !== 'paid' && ((!!b.dueDay && b.dueDay < week.asOf) || !!b.promiseMissedOn));
  const paid = mine.filter((b) => b.group === 'paid');
  const paidProven = paid.filter((b) => b.proven);

  const collected = total(paidThisWeek);
  const inNumbers: AFigure[] = [
    {
      figure: money(collected, cur), of: 'collected this week',
      says: !paidThisWeek.length ? 'Nothing was collected this week.'
        : provenThisWeek.length === paidThisWeek.length ? `${money(collected, cur)} was collected this week, all of it with proof.`
        : `${money(collected, cur)} was collected this week. ${money(total(provenThisWeek), cur)} of it has proof, and ${money(collected - total(provenThisWeek), cur)} is on somebody’s word only.`,
    },
    {
      figure: money(total(dueThisWeek), cur), of: 'due this week',
      says: dueThisWeek.length ? `${money(total(dueThisWeek), cur)} falls due this week, on ${nOf(dueThisWeek.length)}.` : `Nothing falls due this week.`,
    },
    {
      figure: money(total(overdue), cur), of: 'overdue',
      says: overdue.length ? `${money(total(overdue), cur)} is overdue, on ${nOf(overdue.length)}.` : 'Nothing is overdue.',
    },
    {
      figure: `${paidProven.length} of ${paid.length}`, of: 'paid with proof',
      says: !paid.length ? `No ${bill} is paid yet.`
        : paidProven.length === paid.length ? (paid.length === 1 ? `The one ${bill} paid has proof.` : `All ${small(paid.length)} ${bills} paid have proof.`)
        : !paidProven.length ? (paid.length === 1 ? `The one ${bill} paid has no proof yet.` : `None of the ${small(paid.length)} ${bills} paid has proof yet.`)
        : `${Cap(small(paidProven.length))} of the ${small(paid.length)} ${bills} paid ${paidProven.length === 1 ? 'has' : 'have'} proof.`,
    },
  ];

  /* What this week shows: each person's bills, in a few sentences each, a person reading only their own. */
  const whose = (b: ABillInTheWeek) => b.followsUpParticipantId ?? b.ownerParticipantId;
  const people = [...new Set(mine.map(whose).filter(Boolean) as string[])];
  const whatThisWeekShows = people.map((pid) => {
    const theirs = mine.filter((b) => whose(b) === pid);
    const who = nameOf(pid);
    const you = who === 'you';
    const head = loans ? `${Cap(you ? 'your loan' : `${who}’s loan`)}` : `${Cap(who)} ${you ? 'follow' : 'follows'} up ${nOf(theirs.length)}.`;
    const said: string[] = loans ? [] : [head];
    for (const b of theirs) {
      if (b.group === 'paid' && inWeek(b.paidDay)) said.push(`${Cap(called(b))} was paid this week${b.proven ? ', with proof' : ', on somebody’s word only'}.`);
      else if (b.promiseMissedOn) said.push(`${Cap(called(b))} is past the date ${loans ? (you ? 'you' : 'they') : 'the client'} promised, ${aDayInWords(b.promiseMissedOn, zone)}.`);
      else if (b.group === 'blocked') said.push(`${Cap(called(b))} is disputed.`);
      else if (b.group === 'not-heard') said.push(loans ? `${Cap(called(b))} has had no check-in and no repayment for three weeks.` : `Nobody has heard from the client on ${called(b)}.`);
      else if (b.group === 'behind-in-touch') said.push(`${Cap(called(b))} is behind, and ${loans ? (you ? 'you are' : `${who} is`) : 'the client is'} in touch.`);
    }
    return said.length > (loans ? 0 : 1) ? said.join(' ') : loans ? `${Cap(called(theirs[0]))} is on time.` : `${head} Nothing on them needs following up this week.`;
  });

  const moved = mine.flatMap((b) => b.moves.map((m) => `${Cap(called(b))} ${m.to === 'Paid' ? (b.proven ? 'was paid, with proof,' : 'was paid, on somebody’s word only,') : b.kind === LOAN_OWED && m.to === 'Chased' ? 'was followed up with a call' : aStageInWords(m.to)} on ${aDayInWords(new Date(m.on), zone, true)}.`));
  const dropped = mine.filter((b) => b.promiseMissedOn && inWeek(b.promiseMissedOn)).map((b) => `${Cap(called(b))} was not paid by ${aDayInWords(b.promiseMissedOn!, zone, true)}, the date ${loans ? 'promised' : 'the client promised'}.`);
  const whatChanged: WhatChanged = {
    moved: moved.length ? moved : [`No ${bill} moved this week.`],
    dropped: dropped.length ? dropped : ['No promise to pay was missed this week.'],
    result: [inNumbers[0].says],
  };

  const paidSaid = paid.filter((b) => !b.proven);
  const saidAndProof = !paid.length
    ? `No ${bill} was said to be paid yet.`
    : paidSaid.length
      ? `${Cap(nOf(paid.length))} ${paid.length === 1 ? 'was' : 'were'} said to be paid. ${paidProven.length ? `${Cap(small(paidProven.length))} ${paidProven.length === 1 ? 'has' : 'have'} a slip or a message behind ${paidProven.length === 1 ? 'it' : 'them'}, and ${small(paidSaid.length)} ${paidSaid.length === 1 ? 'has' : 'have'} none yet.` : 'None has a slip or a message behind it yet.'}`
      : `${Cap(nOf(paid.length))} ${paid.length === 1 ? 'was' : 'were'} said to be paid, and a slip or a message is behind ${paid.length === 1 ? 'it' : 'each one'}.`;

  const forNextWeek: AThingToDo[] = [];
  for (const b of mine) {
    if (b.promiseMissedOn) forNextWeek.push({ do: reader.runsIt ? `Decide what happens next on ${called(b)}.` : `Ask about ${called(b)} again.`, why: `${loans ? (b.ownerParticipantId === reader.participantId ? 'You' : Cap(nameOf(b.ownerParticipantId))) : 'The client'} promised to pay by ${aDayInWords(b.promiseMissedOn, zone)}, and nothing has come in.`, comesFrom: `This comes from the ${bill}.` });
    else if (b.group === 'not-heard') forNextWeek.push({ do: loans ? `Reach ${nameOf(b.ownerParticipantId)} about the loan.` : `Reach the client on ${called(b)}.`, why: loans ? 'No check-in and no repayment for three weeks.' : 'Nobody has heard from them since it fell due.', comesFrom: `This comes from the ${bill}.` });
    else if (b.group === 'paid' && !b.proven) forNextWeek.push({ do: `Get the slip or the message for ${called(b)}.`, why: 'It is paid on somebody’s word only.', comesFrom: `This comes from the ${bill}.` });
    else if (!reader.runsIt && b.group !== 'paid' && b.nextStep && b.nextStepBy) forNextWeek.push({ do: `${Cap(stop(b.nextStep))}.`, why: `You said you would, by ${aDayInWords(b.nextStepBy, zone, true)}.`, comesFrom: 'This comes from your check-in.' });
  }
  return { inNumbers, whatThisWeekShows, whatChanged, saidAndProof, forNextWeek: forNextWeek.slice(0, 5) };
}
