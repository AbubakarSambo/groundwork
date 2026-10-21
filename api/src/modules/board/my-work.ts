import { aWaitSomebodyElseChases } from './a-wait-somebody-else-chases';
import { notABlockerTheyRaised } from './not-a-blocker-they-raised';
import { theDaysAnOpenDailySessionWasMissed } from './the-persons-record';
import { whatTheyTriedFirst } from './what-they-tried-first';
import { saidWhatTheyTried } from '../grounds/a-wait-is-the-speakers-account';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { theRelease1bTabsAreOn } from '../grounds/release-1b-tabs';
import { theReferencesTemplateFor } from '../grounds/the-references-template';
import { theDayTheyMeant } from '../grounds/when-a-handoff-is-due';
import { whenItWasFor } from '../grounds/a-day-said-is-read-on-the-day-it-was-said';
import { asAnAction } from '../grounds/a-promise-as-an-action';
import { dedupeDependencies } from './reads';
import { targetsFor } from './whose-number-is-whose-business';
import { theUnitsOf } from './a-sales-aim-is-counted-from-the-deals';
import { peersAreNamedOn, theReaderBySignIn } from '../reports/peers-are-named';
import { isASalesKind, oneOfTheKinds, RECORDS_FOR_EACH_KIND, type AServedRecord } from './the-kind-of-work';
import { plainNameOf } from '../patterns/plain-pattern-names';
import { THE_SEVEN_BEHAVIOURS, WHERE_THE_WORDS_COME_FROM, theBehaviour, type ABehaviourKey } from '../patterns/the-seven-behaviours';
import { thePersonJudgementsAreOn, NOT_SHOWN_IN_THIS_ORGANISATION } from '../organisation/person-judgements';
import { theDirectMorningIsOn } from '../organisation/the-direct-morning-switch';
import { readThePersonsRecord, readTheirOtherRecords } from './the-persons-record-store';
import { theRecordInWords, acrossTheirCheckIns, type TheRecordInWords } from './the-persons-record-in-words';
import { thePraiseFromYourLead } from './the-praise-from-your-lead';
import { onePromiseOneState } from '../grounds/your-board';
import { thePromisesAsTheRecordKeepsThem } from '../grounds/a-promise-said-done-is-read-the-same-everywhere';

/**
 * MY WORK, AS EACH READER IS SERVED IT (Release 1B, pull request 3 of 3; Hafsah's references-and-my-work.md of 17 October 2026,
 * "2. My work", and her brief of 18 October: "My work is rebuilt with the seven behaviours" and "One template for every scenario
 * on each of the three tabs. Only the words and data change, taken from the scenario's template"). The wording is the B7
 * pictures' (docs/prototype/screens/B7-my-work/*.txt), except where a picture joins two pieces with a colon or a dot.
 *
 * ONE PAGE FOR EACH PERSON IN EACH CHECK-IN, IN THIS ORDER, FOR EVERY SCENARIO: their name and three numbers, their focus this
 * week, To do, What you achieved, How you're performing (the seven behaviours, always in the library's order), Coaching, Your
 * check-ins and Your reports, and their items. Only the words and the data change, from the kind of work's template (what an
 * item is called, and what its last stage is).
 *
 * WHO READS WHOSE, DECIDED HERE AND NOWHERE ELSE (the privacy rules are kept in the payload, never on the screen):
 *  - a person in the check-in reads their own page and nobody else's. Asking for anybody else's is refused here, before any of
 *    that person's record is read, so a team member never receives another person's behaviours, coaching or work.
 *  - the lead (the person who runs it) reads any person's page, as a manager would in a normal staff assessment (CLAUDE.md):
 *    what happened, with numbers, and the library's lines. Never a score or a label on the person; each verdict is about one
 *    behaviour and says what happened and what would change it. She never reads the person's own reports (private, always):
 *    that section is not in her payload, only the sentence saying they are the person's own.
 *  - anybody else (an admin who does not run it, somebody outside it) is refused.
 * Only this check-in is read. Nothing here adds up a person's load across check-ins.
 *
 * THE LEAD'S NOTE FOR ONE PERSON. The spec puts "the lead's note for this person (from People)" under Coaching on the person's
 * own page, and References and resources says People is never shown to the person. A privacy rule changes only on Hafsah's word,
 * so the note reaches the lead's view of the page alone, and `THE_LEADS_NOTE_SHOWS_ON_THEIR_OWN_MY_WORK` (off) holds it back
 * from the person until she says yes (docs/release-questions.md).
 *
 * NOTHING INVENTED. Every number is counted from the record: the board's own rows as this reader is served them, the person's
 * commitments, the handoffs, the credit colleagues gave them in their own check-ins, their check-ins, and their patterns as the
 * pattern rules serve them. Where the record is thin a behaviour reads "Not enough yet", never a guess.
 *
 * THIS ONLY READS. Opening it writes nothing of its own. With Release 1B's switch off it serves `{ on: false }`, and My work reads
 * exactly as it did.
 */

/** Off until Hafsah says yes: the lead's People note for a person reaches that person's own My work. */
export const THE_LEADS_NOTE_SHOWS_ON_THEIR_OWN_MY_WORK = false;

export type AVerdict = 'Strength' | 'Needs work' | 'Not enough yet';

export interface ABehaviourRead {
  key: ABehaviourKey;
  name: string;
  verdict: AVerdict;
  /** What happened, with numbers. */
  happened: string;
  /** What it means, from the library. Null for Not enough yet. */
  means: string | null;
  /** How to improve, from the library, for Needs work only. */
  toImprove: string | null;
  /** What it is based on. Null for Not enough yet. */
  basedOn: string | null;
}

export interface ACoachingLine { text: string; from: string }

export interface MyWorkServed {
  on: true;
  /**
   * False where the organisation's switch keeps judgements of a person off (organisation/person-judgements.ts): no behaviours, no focus,
   * no coaching about the person, no strengths, and no on-time or specific counts are in the payload. Absent everywhere else.
   */
  judgements?: false;
  /** 'self': the person reads their own page. 'lead': the lead reads one person's page. */
  view: 'self' | 'lead';
  checkInName: string;
  person: { participantId: string; name: string; firstName: string };
  /** The people whose page the lead may open, herself included where she takes part. The lead's payload only. */
  people?: { participantId: string; name: string }[];
  heading: string;
  topLine: string;
  numbers: { value: string; label: string }[];
  focus: { line: string; why: string } | null;
  focusEmpty: string;
  toDo: {
    othersNeed: { id: string; text: string; when: string }[];
    own: { id: string; text: string; when: string | null; done: boolean; late: boolean; whose: string | null }[];
    emptySays: string;
  };
  achieved: { items: { text: string; proof: string }[]; note: string; emptySays: string };
  performing: { note: string; behaviours: ABehaviourRead[]; libraryNote: string };
  coaching: { better: ACoachingLine[]; keep: string[]; betterEmpty: string; keepEmpty: string };
  checkIns: { due: number; done: number; onTime: number; specific: number; heading: string; emptySays: string | null };
  reports: { heading: string; items: { checkInId: string; when: string; line: string }[]; emptySays: string; private?: string } ;
  items: {
    heading: string;
    note: string;
    itemWord: string;
    rows: { id: string; name: string; stage: string | null; next: string; nextBooked: boolean; proof: string; proven: boolean }[];
    emptySays: string;
  };
  /**
   * THE PERSON'S RECORD AND THE COACHING GROUNDWORK GAVE THEM (Groundwork does the managing, part 1), as last built from the record
   * (the-persons-record-store.ts), in plain words with its evidence. Only where the direct morning and judgements of a person are both
   * on; absent everywhere else, so the page reads as before. `acrossYourCheckIns` is in the person's own payload alone.
   */
  record?: TheRecordInWords & { acrossYourCheckIns?: { heading: string; lines: string[] } };
}

export type MyWork = { on: false } | MyWorkServed;

/* ------------------------------------------------------------------------------------------------ the record, plain */

export interface ACheckInRow {
  id: string;
  sessionNumber: number;
  status: string;
  availableFrom?: Date | string | null;
  createdAt?: Date | string | null;
  completedAt?: Date | string | null;
  specificityLevel?: string | null;
  specificityDimensions?: unknown;
}

export interface ACommitmentRow {
  id: string;
  text: string;
  whenSaid?: string | null;
  status?: string | null;
  explicit?: boolean | null;
  settledAt?: Date | string | null;
  createdAt?: Date | string | null;
}

export interface AHandoffRow {
  id: string;
  fromParticipantId: string;
  onParticipantId: string | null;
  what: string;
  status: string;
  triedSaid?: string | null;
  dueSaid?: string | null;
  createdAt: Date | string;
  /** Who is waiting, as this reader may name them, or null. */
  fromName?: string | null;
}

export interface TheRecordForOnePerson {
  /** False where the organisation keeps judgements of a person off. Absent or true: as before. */
  judgements?: boolean;
  reader: 'self' | 'lead';
  person: { participantId: string; name: string; firstName: string };
  leadFirst: string;
  /**
   * True where the person whose page it is runs the check-in and reads it as their own (Grace on "Grace’s work"). She is "you"
   * on it: "Grace sees this page too" and "Grace’s coaching for the team" were said to Grace about Grace (night run, 20 October).
   */
  readerRunsIt?: boolean;
  kindOfWork: string | null;
  /** The board's rows this reader is served, owned by this person. */
  items: (AServedRecord & { evidence?: { readAs: string; countsAsProof: boolean }[] })[];
  commitments: ACommitmentRow[];
  /** Open handoffs where somebody waits on this person. */
  waitsOnThem: AHandoffRow[];
  /** Every handoff this person raised. */
  raised: AHandoffRow[];
  /**
   * What colleagues in this check-in chase or promise themselves: their own waits and promises, read only to tell which of this
   * person's waits are somebody else's to chase (a-wait-somebody-else-chases). Never shown.
   */
  othersChase?: string[];
  /** Colleagues who credited this person in their own check-ins, one entry per check-in, named where this reader may. */
  credits: { fromName: string | null; checkInId: string | null }[];
  checkIns: ACheckInRow[];
  /** The person's own first line in each finished check-in. Read for the person alone. */
  ownLines: { checkInId: string; text: string }[];
  /** The person's patterns as the pattern rules serve them to this reader. */
  patterns: { heading: string; kind: string; oneStep?: string | null; yours?: boolean }[];
  teamCoaching: string[];
  /** The lead's "help them with" line for this person: only where this reader may read it. */
  helpWith: string | null;
  target: { count: number; target: number } | null;
  now: Date;
  timeZone: string;
  /** The check-in opens a session each working day, on these days (cadence DAILY). */
  daily?: { workingDays?: number[] | null } | null;
  /** Their own words in their check-ins, to date what they said they tried (what-they-tried-first.ts). */
  theirTurns?: { content: string; at: Date | string }[];
  /** Everybody's names in this check-in, to tell a wait on people here. */
  namesHere?: string[][];
  /** The person whose page it is runs the check-in. */
  personRunsIt?: boolean;
}

const DAY = 86_400_000;
const firstOf = (name: string | null | undefined) => (name ?? '').trim().split(/\s+/)[0] || '';
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const pluralOf = (word: string) => (/[^aeiou]y$/.test(word) ? `${word.slice(0, -1)}ies` : `${word}s`);
const cap = (s: string) => (s ? `${s.charAt(0).toUpperCase()}${s.slice(1)}` : s);
const stop = (s: string) => (/[.!?”]$/.test(s.trim()) ? s.trim() : `${s.trim()}.`);

function aDay(d: Date | string, timeZone: string): string {
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', timeZone }).format(new Date(d));
}
function aDayWithItsName(d: Date | string, timeZone: string, now: Date): string {
  const sameDay = aDay(d, timeZone) === aDay(now, timeZone);
  if (sameDay) return 'Today';
  return new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone }).format(new Date(d));
}

/** What the kind of work calls an item, and what its last stage says about a finished one. */
export function theWordsForTheWork(kindOfWork: string | null) {
  const template = theReferencesTemplateFor(kindOfWork);
  const kind = oneOfTheKinds(kindOfWork);
  const sales = !!kind && isASalesKind(kind);
  const stages = template.stages;
  const lastStage = stages.length ? stages[stages.length - 1] : null;
  /* "sold" for a sales team; otherwise the last stage itself ("deployed", "repaid", "completed"), or "done". */
  const doneWord = sales ? 'sold' : (lastStage ? lastStage.toLowerCase() : 'done');
  const keepsItems = !!kind && RECORDS_FOR_EACH_KIND[kind].some((s) => s.itemKinds.length > 0);
  return { itemWord: template.itemWord, itemsWord: pluralOf(template.itemWord), sales, lastStage, doneWord, keepsItems };
}

const isFinished = (r: AServedRecord, lastStage: string | null) =>
  !r.lost && (r.group === 'won' || (!!lastStage && String(r.stage ?? '').toLowerCase() === lastStage.toLowerCase()));

function theProofOf(r: TheRecordForOnePerson['items'][number]): { proven: boolean; says: string } {
  /* A deposit only is sold, and not paid with proof: "Deposit paid, KES 15,000 of KES 30,000." (final real-model check, item 10). */
  /* Backed, by a payment: but never said as paid (the page's numbers say it apart). */
  const deposit = (r as any).deposit as { says?: string } | undefined;
  if (deposit?.says && !r.signedOrder) return { proven: true, says: deposit.says.replace(/\.$/, '') };
  const proof = (r.evidence ?? []).find((e) => e.countsAsProof);
  if (proof) return { proven: true, says: proof.readAs };
  if (r.signedOrder) return { proven: true, says: 'A signed order' };
  if (r.paymentRecord) return { proven: true, says: 'A payment record' };
  if (r.mark === 'proven' || r.mark === 'confirmed') return { proven: true, says: r.mark === 'confirmed' ? 'Confirmed by a colleague' : 'Proof added' };
  const any = (r.evidence ?? [])[0];
  if (any) return { proven: false, says: any.readAs };
  return { proven: false, says: 'None yet' };
}

/* What the record says when a customer cannot buy now (the person's record reads it the same way). */
const CANNOT_BUY_NOW = /\b(?:no budget|can['’]?t afford|cannot afford|not affordable|until (?:january|february|march|april|may|june|july|august|september|october|november|december|next (?:year|month|quarter))|next year|said no|not interested)\b/i;

/** Whether a next step names a day. */
function hasADay(r: AServedRecord, now: Date): boolean {
  if (r.due) return true;
  const words = String(r.nextStep ?? r.next ?? '').trim();
  return !!words && !!theDayTheyMeant(words, now);
}

/** A check-in that was due by now, which the person was asked to answer. */
function wasDue(c: ACheckInRow, now: Date): boolean {
  if (c.status === 'COMPLETED') return true;
  const opened = c.availableFrom ?? c.createdAt ?? null;
  /* Open for more than a day and not done: it was due, and it was missed. One opened today is not counted yet. */
  return !!opened && new Date(opened).getTime() + DAY <= now.getTime();
}

/** Done within a day of opening. */
function wasOnTime(c: ACheckInRow): boolean {
  if (c.status !== 'COMPLETED' || !c.completedAt) return false;
  const opened = c.availableFrom ?? c.createdAt ?? null;
  if (!opened) return true;
  return new Date(c.completedAt).getTime() - new Date(opened).getTime() <= DAY;
}

const NOT_ENOUGH = 'Not enough check-ins show this yet.';

/* ------------------------------------------------------------------------------------------------ the page, pure */

export function myWorkFrom(r: TheRecordForOnePerson, checkInName: string): Omit<MyWorkServed, 'people'> {
  const self = r.reader === 'self';
  const first = r.person.firstName || 'This person';
  const leadFirst = r.leadFirst || 'the person who runs it';
  /* The lead on her own page: nobody else to name, and her own coaching is "your" coaching. */
  const herOwn = self && r.readerRunsIt === true;
  const alsoSees = herOwn ? '' : ` ${leadFirst} sees this page too.`;
  const theLeads = herOwn ? 'Your' : `${leadFirst}’s`;
  /** "you"/"your" to the person, the person's name to the lead. */
  const You = self ? 'You' : first;
  const your = self ? 'your' : `${first}’s`;
  const Your = self ? 'Your' : `${first}’s`;
  const words = theWordsForTheWork(r.kindOfWork);

  /* ------------------------------------------------------------------ what the record holds, counted once */
  const items = r.items.filter((i) => !i.lost);
  const finished = items.filter((i) => isFinished(i, words.lastStage));
  const open = items.filter((i) => !isFinished(i, words.lastStage));
  const proven = finished.filter((i) => theProofOf(i).proven);
  const promises = r.commitments.filter((c) => c.explicit !== false);
  const settled = promises.filter((c) => c.status === 'DONE' || c.status === 'NOT_DONE');
  const kept = settled.filter((c) => c.status === 'DONE');
  /* A daily session left open counts once for each working day it stayed open, as the person's record counts it (final check, item 5). */
  const due = r.checkIns.filter((c) => wasDue(c, r.now)).sort((a, b) => a.sessionNumber - b.sessionNumber)
    .flatMap((c) => [c, ...theDaysAnOpenDailySessionWasMissed(c as any, r.now, r.timeZone, r.daily).map(() => c)]);
  const done = due.filter((c) => c.status === 'COMPLETED');
  const onTime = done.filter(wasOnTime);
  /*
   * SPECIFIC BY THE BOARD'S OWN RULE (engine test, Drop Access). Kevin gave the M-Pesa code QJK4TL2MX9, "Jane wants 6 units, so I sent
   * a quote for 30k", names, days and amounts, and his My work said "0 of 6 were specific", while the board read the same rounds as
   * checkable. A check-in is specific where its own read says so, or where at least one thing in it could be checked: the board's
   * first test of whether a round can be checked (aRoundCanBeChecked).
   */
  const specific = done.filter((c) => c.specificityLevel === 'specific' || (c.specificityDimensions as any)?.checkable === 'specific');
  /* Not a blocker of theirs to have tried on: a wait a colleague here is chasing or has promised (a-wait-somebody-else-chases). */
  /* Nor a customer's own budget or approval, asking for a view, or waiting for a check-in (final check, item 2). */
  const raised = dedupeDependencies(r.raised.filter((d) => d.onParticipantId !== r.person.participantId && !aWaitSomebodyElseChases(String((d as any).what ?? ''), r.othersChase ?? []) && !notABlockerTheyRaised(d as any, { sales: words.sales, namesHere: r.namesHere, theLeadOnHerTeam: r.personRunsIt })) as any[]) as AHandoffRow[];
  /* What they said they tried first: Peter's "I haven't done anything about that yet" was counted as something tried (Drop Access, second night run);
     and something tried after it was raised was not tried first, read as their record reads it (what-they-tried-first.ts, final check items 6 and 18). */
  const tried = raised.filter((d) => whatTheyTriedFirst(d as any, r.raised as any, r.theirTurns ?? [], r.timeZone).first);
  const cleared = raised.filter((d) => d.status === 'CLEARED');
  const creditors = [...new Set(r.credits.map((c) => c.fromName ?? 'A colleague'))];
  const creditCheckIns = new Set(r.credits.map((c, i) => c.checkInId ?? `credit-${i}`)).size;
  const attention = r.patterns.filter((p) => p.kind === 'attention');
  const RIGHT_THINGS = new Set(['K4', 'K5', 'B6'].map((c) => plainNameOf(c)?.name).filter(Boolean) as string[]);
  const offPlan = attention.filter((p) => RIGHT_THINGS.has(p.heading));
  const MAKES_OTHERS_FASTER = plainNameOf('M2')?.name;
  const quietButChased = open.filter((i) => {
    if (!i.notAnsweringSince) return false;
    const quietDays = (r.now.getTime() - new Date(i.notAnsweringSince).getTime()) / DAY;
    const since = (i.contactHistory ?? []).filter((c) => String(c.on) > String(i.notAnsweringSince)).length;
    return quietDays >= 14 && since >= 2;
  });

  /* ------------------------------------------------------------------ the seven behaviours, in the library's order */
  const read = (key: ABehaviourKey, verdict: AVerdict, happened: string, basedOn: string | null): ABehaviourRead => {
    const b = theBehaviour(key);
    if (verdict === 'Not enough yet') return { key, name: b.name, verdict, happened: NOT_ENOUGH, means: null, toImprove: null, basedOn: null };
    return { key, name: b.name, verdict, happened, means: verdict === 'Strength' ? b.strength : b.needsWork, toImprove: verdict === 'Needs work' ? b.toImprove : null, basedOn };
  };
  const behaviours: ABehaviourRead[] = THE_SEVEN_BEHAVIOURS.map((b): ABehaviourRead => {
    switch (b.key) {
      case 'keeping-promises': {
        if (settled.length < 3) return read(b.key, 'Not enough yet', '', null);
        const strong = kept.length / settled.length >= 0.75;
        return read(b.key, strong ? 'Strength' : 'Needs work', `${You} kept ${kept.length} of ${settled.length} promises.`, `${Your} check-ins`);
      }
      case 'planning-ahead': {
        /* A deal the record says cannot buy now ("no budget this year", "until January") has nothing to book yet: not counted here. */
        /* Off a sales team, a record the check-in holds neither a day nor a step for ("have them back", "what is due in court", read from a sentence)
           says nothing about planning: only the ones with a day or a step are read (rebuild of the final check: Aisha and Brian on the litigation daily). */
        const toPlan = open.filter((i) => !CANNOT_BUY_NOW.test(String(((i as any).fields ?? {})['Budget stated'] ?? '')))
          .filter((i) => words.sales || !!i.due || !!String(i.nextStep ?? i.next ?? '').trim());
        if (!words.keepsItems || toPlan.length < 2) return read(b.key, 'Not enough yet', '', null);
        const without = toPlan.filter((i) => !hasADay(i, r.now)).length;
        const strong = without === 0 || (without === 1 && toPlan.length >= 5);
        const happened = without === 0
          ? `Every open ${words.itemWord} ${self ? 'you have' : `${first} has`} has a next step and a day.`
          : `${without} of ${your} ${toPlan.length} open ${words.itemsWord} ${without === 1 ? 'has' : 'have'} no next step with a day.`;
        return read(b.key, strong ? 'Strength' : 'Needs work', happened, `${Your} ${words.itemsWord} today`);
      }
      case 'handling-blockers': {
        if (raised.length < 2) return read(b.key, 'Not enough yet', '', null);
        const strong = tried.length / raised.length >= 0.5;
        const days = raised.map((d) => new Date(d.createdAt).getTime()).sort((a, b2) => a - b2);
        const from = aDay(new Date(days[0]), r.timeZone);
        const to = aDay(new Date(days[days.length - 1]), r.timeZone);
        const sameMonth = from.split(' ')[1] === to.split(' ')[1];
        const span = from === to ? `raised on ${from}` : `raised between ${sameMonth ? from.split(' ')[0] : from} and ${to}`;
        const happened = `${You} raised ${plural(raised.length, 'blocker')} and said what ${self ? 'you' : first} had tried first on ${tried.length} of them.${cleared.length ? ` ${cleared.length} of them ${cleared.length === 1 ? 'is' : 'are'} cleared now.` : ''}`;
        return read(b.key, strong ? 'Strength' : 'Needs work', happened, `${plural(raised.length, 'blocker')} ${span}`);
      }
      case 'working-on-the-right-things': {
        if (quietButChased.length) {
          const names = quietButChased.map((i) => i.name);
          const one = quietButChased[0];
          const happened = quietButChased.length === 1
            ? `${one.name} has not answered since ${aDay(one.notAnsweringSince!, r.timeZone)}, and ${self ? 'you are' : `${first} is`} still following it up.`
            : `${quietButChased.length} of ${your} open ${words.itemsWord} have not answered for two weeks or more, and ${self ? 'you are' : `${first} is`} still following them up. They are ${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}.`;
          return read(b.key, 'Needs work', happened, `${Your} check-ins about ${quietButChased.length === 1 ? one.name : `these ${words.itemsWord}`}`);
        }
        if (offPlan.length) return read(b.key, 'Needs work', stop(offPlan[0].heading), `${Your} last ${plural(done.length, 'check-in')}`);
        return read(b.key, 'Not enough yet', '', null);
      }
      case 'backing-claims-with-proof': {
        if (!words.keepsItems || finished.length < 2) return read(b.key, 'Not enough yet', '', null);
        const strong = proven.length / finished.length >= 0.75;
        const what = words.sales ? 'sales' : `${words.doneWord} ${words.itemsWord}`;
        const happened = proven.length === finished.length
          ? `Every one of ${your} ${finished.length} ${what} has proof.`
          : `${proven.length} of ${your} ${finished.length} ${what} have proof.`;
        return read(b.key, strong ? 'Strength' : 'Needs work', happened, `${Your} ${words.itemsWord}`);
      }
      case 'helping-your-team': {
        if (creditors.length) {
          const who = creditors.length === 1 ? creditors[0] : `${creditors.slice(0, -1).join(', ')} and ${creditors[creditors.length - 1]}`;
          return read(b.key, 'Strength', `${who} mentioned ${your} help in ${plural(creditCheckIns, 'check-in')}.`, creditors.length === 1 && creditors[0] !== 'A colleague' ? `${creditors[0]}’s check-ins` : 'Their check-ins');
        }
        const faster = r.patterns.find((p) => p.kind === 'good' && p.heading === MAKES_OTHERS_FASTER);
        if (faster) return read(b.key, 'Strength', stop(faster.heading), `${Your} check-ins`);
        return read(b.key, 'Not enough yet', '', null);
      }
      case 'check-in-quality': {
        if (due.length < 3) return read(b.key, 'Not enough yet', '', null);
        /* Needs work by the same bar their record is coached on: at least two that fell short, missed, late or vague (final check, item 3).
           One missed check-in in four is not "Needs work" here while their record does not coach on it. */
        const fellShort = due.length - done.filter((c) => wasOnTime(c) && (c.specificityLevel === 'specific' || (c.specificityDimensions as any)?.checkable === 'specific')).length;
        const strong = fellShort < 2 || (done.length / due.length >= 0.8 && onTime.length / due.length >= 0.7 && (done.length ? specific.length / done.length : 0) >= 0.7);
        const timing = onTime.length === done.length ? ' on time' : `, ${onTime.length} of them on time`;
        const happened = `${You} did ${done.length} of ${plural(due.length, 'check-in')}${timing}. ${specific.length} of ${done.length} ${specific.length === 1 ? 'was' : 'were'} specific.`;
        return read(b.key, strong ? 'Strength' : 'Needs work', happened, plural(due.length, 'check-in'));
      }
    }
  });

  /* ------------------------------------------------------------------ the top: three numbers, and the focus */
  const numbers: { value: string; label: string }[] = [];
  /*
   * THE NUMBERS AGREE WITH EACH OTHER, AND NONE SAYS MORE THAN THE TARGET HOLDS (night run 2, 20 October). Kevin's page read "3, sold, 2 with
   * proof" beside "49 of 30, your target": the first counted his deals and the second his units, and "49 of 30" read as 49 out of 30. Where
   * the target counts units and his sold deals' units are exactly the target's count, the first number counts the same units (49 sold,
   * 46 with proof, as his share says it); a target passed says by how much, beside the target itself.
   */
  const unitsIn = (xs: typeof items): number | null => {
    let n = 0;
    for (const i of xs) { const u = theUnitsOf((i as any).fields ?? null); if (u === null) return null; n += u; }
    return n;
  };
  const soldUnits = words.sales && r.target ? unitsIn(finished) : null;
  const inUnits = soldUnits !== null && soldUnits > 0 && soldUnits === r.target?.count && soldUnits !== finished.length;
  /* Sold on a deposit is said apart from paid, never as "with proof" of payment (final real-model check, item 10: "46 with proof"). */
  const onADeposit = proven.filter((i) => !!(i as any).deposit && !i.signedOrder);
  const paidInFull = proven.filter((i) => !onADeposit.includes(i));
  if (words.keepsItems && items.length) {
    numbers.push(inUnits
      ? { value: String(soldUnits), label: onADeposit.length ? `${words.doneWord}, ${unitsIn(paidInFull) ?? 0} paid with proof, ${unitsIn(onADeposit) ?? 0} on a deposit` : `${words.doneWord}, ${unitsIn(proven) ?? 0} with proof` }
      : { value: String(finished.length), label: onADeposit.length ? `${words.doneWord}, ${paidInFull.length} paid with proof, ${onADeposit.length} on a deposit` : `${words.doneWord}, ${proven.length} with proof` });
  }
  if (r.target) {
    numbers.push(r.target.count > r.target.target
      ? { value: `${r.target.count - r.target.target} over`, label: `${your} target of ${r.target.target}` }
      : { value: `${r.target.count} of ${r.target.target}`, label: `${your} target` });
  }
  if (settled.length) numbers.push({ value: `${kept.length} of ${settled.length}`, label: 'promises kept' });
  if (numbers.length < 3 && due.length) numbers.push({ value: `${done.length} of ${due.length}`, label: 'check-ins' });

  const needsWork = behaviours.find((b) => b.verdict === 'Needs work');
  const focus = needsWork ? { line: needsWork.toImprove!, why: needsWork.happened } : null;

  /* ------------------------------------------------------------------ to do */
  const othersNeed = r.waitsOnThem
    .filter((d) => d.status !== 'CLEARED' && d.fromParticipantId !== r.person.participantId)
    .map((d) => {
      const who = d.fromName || 'A colleague';
      const by = String(d.dueSaid ?? '').trim().replace(/^by\s+/i, '');
      return {
        id: d.id,
        /* "Wanjiru is waiting on you to see the payment for FN-004 in the bank", never "for to see" (Muchemi & Co, second night run). */
        text: `${who} ${who === 'You' ? 'are' : 'is'} waiting on ${self ? 'you' : first} ${/^to\b/i.test(String(d.what).trim()) ? '' : 'for '}${String(d.what).trim().replace(/[.\s]+$/, '')}.`,
        when: by ? `By ${by}` : `Since ${aDay(d.createdAt, r.timeZone)}`,
      };
    });
  const recentlyDone = (c: ACommitmentRow) => c.status === 'DONE' && !!c.settledAt && r.now.getTime() - new Date(c.settledAt).getTime() <= 14 * DAY;
  const own = r.commitments
    .filter((c) => c.status === 'UNKNOWN' || !c.status || recentlyDone(c))
    .map((c) => {
      const isDone = c.status === 'DONE';
      const when = isDone ? `Done on ${aDay(c.settledAt!, r.timeZone)}.` : whenItWasFor(c.whenSaid, c.createdAt ?? null, r.now);
      const late = !isDone && !!when && /^It was due on /.test(when);
      return {
        id: c.id,
        text: asAnAction(c.text),
        when: when ? (isDone || late ? when : cap(when)) : null,
        done: isDone,
        late,
        whose: c.explicit === false ? (self && !herOwn ? `${leadFirst} asked for this.` : 'You asked for this.') : null,
      };
    })
    .sort((a, b) => Number(a.done) - Number(b.done) || Number(b.late) - Number(a.late));

  /* ------------------------------------------------------------------ what you achieved */
  const achieved: { text: string; proof: string }[] = [
    ...finished.map((i) => ({
      text: `${i.name} was ${words.sales ? 'won' : words.doneWord}${i.value ? `, for ${i.value}` : ''}.`,
      proof: theProofOf(i).proven ? theProofOf(i).says : 'Said in a check-in',
    })),
    ...(creditors.length ? [{
      text: `${creditors.length === 1 ? creditors[0] : 'Colleagues'} mentioned ${your} help in ${plural(creditCheckIns, 'check-in')}.`,
      proof: creditors.length === 1 && creditors[0] !== 'A colleague' ? `${creditors[0]}’s check-ins` : 'Their check-ins',
    }] : []),
    ...(settled.length ? [{ text: `${You} kept ${kept.length} of ${settled.length} promises.`, proof: `${Your} check-ins` }] : []),
  ];

  /* ------------------------------------------------------------------ coaching */
  const better: ACoachingLine[] = [
    ...r.teamCoaching.map((t) => ({ text: stop(t), from: self ? `${theLeads} coaching for the team` : 'Your coaching for the team' })),
    ...(r.helpWith ? [{ text: stop(r.helpWith), from: self ? (herOwn ? 'Your own note' : `${leadFirst}’s note for you`) : `Your note for ${first}` }] : []),
    ...attention.map((p) => ({ text: !self && p.oneStep ? p.oneStep : stop(p.heading), from: self ? 'From your pattern' : `From ${first}’s pattern` })),
  ];
  const keep = behaviours.filter((b) => b.verdict === 'Strength').map((b) => theBehaviour(b.key).keepDoing);

  /* ------------------------------------------------------------------ your reports: the person's own, for the person alone */
  const lineOf = new Map(r.ownLines.map((l) => [l.checkInId, l.text]));
  const reports: MyWorkServed['reports'] = self
    ? {
        heading: 'Your reports',
        items: [...done].reverse().slice(0, 3).map((c) => ({
          checkInId: c.id,
          when: aDayWithItsName(c.completedAt ?? c.availableFrom ?? r.now, r.timeZone, r.now),
          line: lineOf.get(c.id) ? `“${String(lineOf.get(c.id)).trim().replace(/^[“"]|[”"]$/g, '')}”` : `Session ${c.sessionNumber}.`,
        })),
        emptySays: 'Your own report for each check-in will show here once you finish one.',
      }
    : {
        heading: `${first}’s reports`,
        items: [],
        emptySays: '',
        private: `${first}’s own reports are ${first}’s alone, so they are not shown here.`,
      };

  /* ------------------------------------------------------------------ their items */
  const rows = [...open, ...finished].map((i) => {
    const step = String(i.nextStep ?? i.next ?? '').trim();
    const proof = theProofOf(i);
    return {
      id: i.id,
      name: i.name,
      stage: i.stage ?? null,
      next: step ? cap(step.replace(/[.\s]+$/, '')) : 'Nothing booked',
      nextBooked: !!step,
      proof: proof.says,
      proven: proof.proven,
    };
  });

  /* JUDGEMENTS OF A PERSON OFF FOR THIS ORGANISATION: none of them is built, and the page says so plainly. */
  if (r.judgements === false) {
    return {
      on: true,
      judgements: false,
      view: r.reader,
      checkInName,
      person: r.person,
      heading: `${first}’s work`,
      topLine: self
        ? `What you need to do and what you’ve done.${alsoSees}`
        : `What ${first} needs to do and what ${first} has done. ${first} sees this page too.`,
      numbers: numbers.slice(0, 3),
      focus: null,
      focusEmpty: NOT_SHOWN_IN_THIS_ORGANISATION,
      toDo: {
        othersNeed,
        own,
        emptySays: self ? 'Nothing to do yet. What you say you will do in a check-in shows here.' : `${first} has nothing to do yet. What ${first} says in a check-in shows here.`,
      },
      achieved: {
        items: achieved,
        note: 'In this check-in',
        emptySays: self ? 'Nothing yet. What you finish, with its proof, shows here.' : `Nothing yet. What ${first} finishes, with its proof, shows here.`,
      },
      performing: { note: NOT_SHOWN_IN_THIS_ORGANISATION, behaviours: [], libraryNote: '' },
      coaching: {
        /* Only the lead's coaching for the whole team, which is about nobody in particular. */
        better: r.teamCoaching.map((t) => ({ text: stop(t), from: self ? `${theLeads} coaching for the team` : 'Your coaching for the team' })),
        keep: [],
        betterEmpty: NOT_SHOWN_IN_THIS_ORGANISATION,
        keepEmpty: NOT_SHOWN_IN_THIS_ORGANISATION,
      },
      checkIns: {
        heading: `${Your} check-ins`,
        due: due.length,
        done: done.length,
        onTime: 0,
        specific: 0,
        emptySays: due.length ? null : (self ? 'No check-in has been due yet.' : `No check-in has been due for ${first} yet.`),
      },
      reports,
      items: {
        heading: `${Your} ${words.itemsWord}`,
        note: `${open.length} open`,
        itemWord: words.itemWord,
        rows,
        emptySays: words.keepsItems
          ? (self ? `You have no ${words.itemsWord} on the board yet.` : `${first} has no ${words.itemsWord} on the board yet.`)
          : 'This check-in keeps no items on its board.',
      },
    };
  }
  return {
    on: true,
    view: r.reader,
    checkInName,
    person: r.person,
    heading: `${first}’s work`,
    topLine: self
      ? `What you need to do, what you’ve done, and how to get better.${alsoSees}`
      : `What ${first} needs to do, what ${first} has done, and how ${first} can get better. ${first} sees this page too.`,
    numbers: numbers.slice(0, 3),
    focus,
    focusEmpty: self
      ? 'Nothing needs work yet. Your focus will show here once your check-ins show something to work on.'
      : `Nothing needs work yet. ${first}’s focus will show here once the check-ins show something to work on.`,
    toDo: {
      othersNeed,
      own,
      emptySays: self ? 'Nothing to do yet. What you say you will do in a check-in shows here.' : `${first} has nothing to do yet. What ${first} says in a check-in shows here.`,
    },
    achieved: {
      items: achieved,
      note: 'In this check-in',
      emptySays: self ? 'Nothing yet. What you finish, with its proof, shows here.' : `Nothing yet. What ${first} finishes, with its proof, shows here.`,
    },
    performing: {
      note: done.length
        ? `The same seven behaviours in every check-in, read from ${your} last ${plural(done.length, 'check-in')}.`
        : 'The same seven behaviours in every check-in. Each one shows once the check-ins give enough to read.',
      behaviours,
      libraryNote: WHERE_THE_WORDS_COME_FROM,
    },
    coaching: {
      better,
      keep,
      betterEmpty: self
        ? `Nothing yet. Lines show here from ${herOwn ? 'your' : `${leadFirst}’s`} coaching for the team and from what keeps coming up in your check-ins.`
        : `Nothing yet. Lines show here from your coaching for the team and from what keeps coming up in ${first}’s check-ins.`,
      keepEmpty: self ? 'Your strengths will show here once your check-ins show them.' : `${first}’s strengths will show here once the check-ins show them.`,
    },
    checkIns: {
      heading: `${Your} check-ins`,
      due: due.length,
      done: done.length,
      onTime: onTime.length,
      specific: specific.length,
      emptySays: due.length ? null : (self ? 'No check-in has been due yet.' : `No check-in has been due for ${first} yet.`),
    },
    reports,
    items: {
      heading: `${Your} ${words.itemsWord}`,
      note: `${open.length} open`,
      itemWord: words.itemWord,
      rows,
      emptySays: words.keepsItems
        ? (self ? `You have no ${words.itemsWord} on the board yet.` : `${first} has no ${words.itemsWord} on the board yet.`)
        : 'This check-in keeps no items on its board.',
    },
  };
}

/* ------------------------------------------------------------------------------------------------ the read */

export interface ABoardReader {
  get: (groundId: string, userId: string) => Promise<any>;
}

const GROUND_SELECT = {
  id: true, label: true, organizationId: true, initiatorId: true, scenario: true, kindOfWork: true, peersVisibleToEachOther: true,
  initiator: { select: { firstName: true, lastName: true } },
  organization: { select: { timeZone: true } },
  cadence: true, workingDays: true,
  participants: {
    select: {
      id: true, userId: true, email: true, nameGiven: true, partyType: true, managingOnly: true, createdAt: true,
      user: { select: { firstName: true, lastName: true } },
    },
  },
};

const fullName = (p: any) => [p?.user?.firstName, p?.user?.lastName].filter(Boolean).join(' ').trim() || String(p?.nameGiven ?? '').trim() || String(p?.email ?? '').trim();

export async function readMyWork(
  prisma: any,
  board: ABoardReader | null,
  input: { groundId: string; userId: string; personId?: string | null },
  now: Date = new Date(),
): Promise<MyWork> {
  const ground = await prisma.ground.findFirst({ where: { id: input.groundId }, select: GROUND_SELECT });
  if (!ground) throw new NotFoundException('That check-in could not be found, so go back to your check-ins and open it from the list.');
  if (!(await theRelease1bTabsAreOn(prisma, ground.organizationId))) return { on: false };

  const isLead = ground.initiatorId === input.userId;
  const participants: any[] = ground.participants ?? [];
  const mine = participants.find((p) => p.userId === input.userId) ?? null;
  if (!isLead && !mine) throw new ForbiddenException('My work is for each person in this check-in and the person who runs it.');

  /* Whose page: a person only ever their own; the lead anybody's who takes part. Refused before anything about them is read. */
  const checksIn = (p: any) => !p.managingOnly;
  const people = participants.filter((p) => checksIn(p) && (p.userId !== ground.initiatorId || p.id === mine?.id));
  let person: any;
  if (!isLead) {
    if (input.personId && input.personId !== mine.id) throw new ForbiddenException('You can open your own My work, and nobody else’s.');
    person = mine;
  } else {
    person = input.personId ? participants.find((p) => p.id === input.personId) : (mine && checksIn(mine) ? mine : people.find((p) => p.userId !== input.userId));
    if (input.personId && !person) throw new NotFoundException('That person is not in this check-in.');
  }
  const leadFirst = firstOf([ground.initiator?.firstName, ground.initiator?.lastName].filter(Boolean).join(' '));
  const peopleList = isLead ? people.map((p) => ({ participantId: p.id, name: p.id === mine?.id ? 'You' : (fullName(p) || 'Somebody invited by email') })) : undefined;
  if (!person) {
    /* The lead with nobody yet who checks in. */
    return {
      on: true, view: 'lead', person: { participantId: '', name: '', firstName: '' }, people: peopleList,
      ...emptyFor(ground.label),
    } as any;
  }

  const reader: 'self' | 'lead' = person.id === mine?.id ? 'self' : 'lead';
  const timeZone = ground.organization?.timeZone || 'Africa/Lagos';
  const name = fullName(person) || 'Somebody invited by email';
  const pid = person.id as string;
  const mayNamePeers = isLead || peersAreNamedOn(ground, theReaderBySignIn(ground, input.userId));
  const nameOf = (id: string | null | undefined) => {
    if (!id) return null;
    if (id === mine?.id) return 'You';
    const p = participants.find((x) => x.id === id);
    return p && mayNamePeers ? firstOf(fullName(p)) || null : null;
  };

  /* The board, as this reader is served it: the same rows, stages, next steps and proof, and the patterns under the pattern rules. */
  let served: any = null;
  try { served = board ? await board.get(ground.id, input.userId) : null; } catch { served = null; }
  const boardRows = ((served?.workRecords ?? []) as any[]).flatMap((s: any) => (Array.isArray(s?.rows) ? s.rows : []));
  const items = boardRows.filter((row: any) => row?.ownerParticipantId === pid);
  const patterns = ((served?.patterns ?? []) as any[]).filter((p: any) => p?.participantId === pid);

  const [commitmentRows, deps, mentions, checkIns, lines, objectives, ownToDos] = await Promise.all([
    prisma.groundCommitment?.findMany?.({ where: { groundId: ground.id, participantId: pid }, orderBy: { createdAt: 'asc' } }).catch(() => []) ?? [],
    prisma.groundDependency?.findMany?.({ where: { groundId: ground.id, OR: [{ fromParticipantId: pid }, { onParticipantId: pid }] }, orderBy: { createdAt: 'asc' } }).catch(() => []) ?? [],
    prisma.workMention?.findMany?.({ where: { groundId: ground.id, aboutParticipantId: pid, kind: 'CREDIT' }, select: { sourceParticipantId: true, checkInId: true } }).catch(() => []) ?? [],
    prisma.checkIn?.findMany?.({
      where: { participantId: pid, groundId: ground.id, isSetup: false, isSelfCorrection: false, isClarification: false, isPostSignOff: false, optional: false },
      select: { id: true, sessionNumber: true, status: true, availableFrom: true, createdAt: true, completedAt: true, specificityLevel: true, specificityDimensions: true },
      orderBy: { sessionNumber: 'asc' },
    }).catch(() => []) ?? [],
    prisma.groundContextItem?.findMany?.({
      where: { groundId: ground.id, closedAt: null, OR: [{ kind: 'COACHING', audience: 'EVERYONE', aboutParticipantId: null }, { kind: 'HELP_WITH', aboutParticipantId: pid }] },
      select: { kind: true, text: true, audience: true, aboutParticipantId: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    }).catch(() => []) ?? [],
    prisma.groundObjective?.findMany?.({ where: { groundId: ground.id, ownerParticipantId: pid }, select: { name: true, target: true, count: true, ownerParticipantId: true, isADecisionAboutAPerson: true }, orderBy: { sortOrder: 'asc' } }).catch(() => []) ?? [],
    /* What they wrote down themselves as a promise or a to-do in this check-in: the second place a promise lives (onePromiseOneState). */
    prisma.personObjective?.findMany?.({
      where: { groundId: ground.id, participantId: pid, authoredBy: 'self', kind: { in: ['COMMITMENT', 'TODO'] } },
      select: { id: true, groundId: true, participantId: true, text: true, kind: true, status: true, statusChangedAt: true, authoredBy: true, dueSaid: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    }).catch(() => []) ?? [],
  ]);

  /*
   * ONE PROMISE, ONE STATE (browser test, 21 October, Kevin). My work read the commitments alone, so a promise Kevin had kept read Late
   * here and Kept on his own page. It now reads the promises the way the You board does: what the record says is done is done, and a
   * commitment and his own to-do for the same promise are one promise, kept where either is kept.
   */
  const asKept = await thePromisesAsTheRecordKeepsThem(prisma, (commitmentRows as any[]) ?? [], (ownToDos as any[]) ?? []);
  const commitments: ACommitmentRow[] = onePromiseOneState(asKept.commitments, asKept.objectives, () => ground.label ?? '', now)
    .sort((a, b) => a.t - b.t)
    .map((p) => ({
      id: p.id, text: p.raw, whenSaid: p.whenSaid, status: p.status, settledAt: p.settledAt, createdAt: p.createdAt,
      ...(p.explicit !== undefined ? { explicit: p.explicit } : {}),
    }));

  /* Colleagues' own waits and promises here, to tell which waits are theirs to chase. Never served. */
  const [othersDeps, othersCommitments] = await Promise.all([
    prisma.groundDependency?.findMany?.({ where: { groundId: ground.id, fromParticipantId: { not: pid } }, select: { what: true } }).catch(() => []) ?? [],
    prisma.groundCommitment?.findMany?.({ where: { groundId: ground.id, participantId: { not: pid } }, select: { text: true } }).catch(() => []) ?? [],
  ]);

  /* Their own first line in each finished check-in, for the person alone: a person's own report is private, always. */
  const done = (checkIns as any[]).filter((c) => c.status === 'COMPLETED');
  const ownLines = reader === 'self' && done.length
    ? ((await prisma.recordEntry?.findMany?.({
        where: { participantId: pid, checkInId: { in: done.map((c) => c.id) }, disputedAt: null },
        select: { checkInId: true, text: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      }).catch(() => [])) ?? []).reduce((acc: { checkInId: string; text: string }[], l: any) => {
        if (l.checkInId && !acc.some((x) => x.checkInId === l.checkInId) && String(l.text ?? '').trim()) acc.push({ checkInId: l.checkInId, text: String(l.text).trim() });
        return acc;
      }, [])
    : [];

  const helpWith = (reader === 'lead' || THE_LEADS_NOTE_SHOWS_ON_THEIR_OWN_MY_WORK)
    ? [...(lines as any[])].reverse().find((l) => l.kind === 'HELP_WITH' && l.aboutParticipantId === pid && String(l.text ?? '').trim())?.text ?? null
    : null;
  /* The person's own target, through the one rule for whose number is whose: the lead reads every one, a person their own. */
  const mayRead = targetsFor(objectives as any[], mine?.id ?? null, 'their own', { isLead }).shown as any[];
  const target = mayRead.find((o) => o.ownerParticipantId === pid && !o.isADecisionAboutAPerson && typeof o.target === 'number' && o.target > 0) ?? null;

  /* Judgements of a person off for this organisation: no pattern, note or coaching about the person is read into the page. */
  const judgements = await thePersonJudgementsAreOn(prisma, ground.organizationId);
  const record: TheRecordForOnePerson = {
    ...(judgements ? {} : { judgements: false }),
    reader,
    person: { participantId: pid, name, firstName: firstOf(name) },
    leadFirst,
    ...(reader === 'self' && isLead ? { readerRunsIt: true } : {}),
    kindOfWork: ground.kindOfWork ?? null,
    items,
    commitments,
    waitsOnThem: (deps as any[]).filter((d) => d.onParticipantId === pid).map((d) => ({ ...d, fromName: nameOf(d.fromParticipantId) })),
    raised: (deps as any[]).filter((d) => d.fromParticipantId === pid),
    othersChase: [
      ...((othersDeps as any[]) ?? []).map((d) => String(d.what ?? '')),
      ...((othersCommitments as any[]) ?? []).map((c) => String(c.text ?? '')),
    ].filter((t) => t.trim()),
    credits: (mentions as any[]).filter((m) => m.sourceParticipantId !== pid).map((m) => ({ fromName: nameOf(m.sourceParticipantId), checkInId: m.checkInId ?? null })),
    checkIns: checkIns as any[],
    ownLines,
    patterns: judgements ? patterns.map((p: any) => ({ heading: String(p.heading ?? ''), kind: String(p.kind ?? ''), oneStep: p.oneStep ?? null, yours: p.yours })) : [],
    teamCoaching: (lines as any[]).filter((l) => l.kind === 'COACHING').map((l) => String(l.text ?? '').trim()).filter(Boolean),
    helpWith: judgements ? helpWith : null,
    target: target ? { count: target.count ?? 0, target: target.target } : null,
    now,
    timeZone,
    daily: String((ground as any).cadence ?? '').toUpperCase() === 'DAILY' ? { workingDays: (ground as any).workingDays ?? null } : null,
    theirTurns: ((await (prisma.conversationTurn?.findMany?.({ where: { checkIn: { groundId: ground.id, participantId: pid }, role: 'PERSON' }, select: { content: true, createdAt: true }, orderBy: { createdAt: 'asc' } })?.catch?.(() => []) ?? [])) as any[] ?? [])
      .map((x: any) => ({ content: String(x.content ?? ''), at: x.createdAt })),
    namesHere: participants.map((p: any) => [p.user?.firstName ?? '', p.user?.lastName ?? ''].filter(Boolean)),
    personRunsIt: !!person.userId && person.userId === ground.initiatorId,
  };
  const built = myWorkFrom(record, ground.label || 'This check-in');
  /*
   * THE BOARD IS WITHHELD UNTIL THEY CHECK IN, AND THEIR ITEMS ARE READ FROM IT (browser test, 21 October 2026). Kevin, with session 7
   * open and not answered, read "You have no deals on the board yet." beside the five deals the board holds for him. Until he checks in,
   * the page says so in the same words the board uses, instead of saying something untrue.
   */
  const page: typeof built = served?.withheldUntilYouCheckIn && (built as any).items && !((built as any).items.rows ?? []).length
    ? { ...(built as any), items: { ...(built as any).items, note: '', emptySays: `${reader === 'self' ? 'Your' : `${firstOf(name)}’s`} ${(built as any).items.heading?.replace(/^(Your|\S+’s) /, '') || 'items'} show here again once ${reader === 'self' ? 'you have' : `${firstOf(name)} has`} checked in for this session.` } } as any
    : built;
  /* The person's record, read from where it is kept and never rebuilt here: the person's own, or, for the lead, the person's in this check-in. */
  const theirRecord = judgements && page.on === true && !(page as any).judgements && await theDirectMorningIsOn(prisma, ground.organizationId)
    ? await theRecordOnTheirPage(prisma, { groundId: ground.id, organizationId: ground.organizationId, label: ground.label || 'this check-in', pid, firstName: firstOf(name), self: reader === 'self', userId: person.userId ?? null, leadFirst, timeZone })
    : null;
  return { ...page, ...(theirRecord ? { record: theirRecord } : {}), ...(peopleList ? { people: peopleList } : {}) };
}

/** The record part of the page, for the person or the lead. Across their other check-ins only for the person themself. */
async function theRecordOnTheirPage(prisma: any, o: { groundId: string; organizationId: string | null; label: string; pid: string; firstName: string; self: boolean; userId: string | null; leadFirst?: string; timeZone?: string }): Promise<MyWorkServed['record'] | null> {
  const stored = await readThePersonsRecord(prisma, o.pid);
  if (!stored) return null;
  const words = theRecordInWords(stored.record, stored.coaching, { self: o.self, firstName: o.firstName }, o.label);
  if (!o.self) return words;
  /* What the lead praised them for, from her board (Groundwork does the managing, part 2): theirs to read, in their own record. */
  const praise = await thePraiseFromYourLead(prisma, o.pid, o.leadFirst ?? '', o.timeZone || 'Africa/Nairobi');
  const others = await readTheirOtherRecords(prisma, o.userId, o.organizationId, o.groundId);
  const lines = acrossTheirCheckIns(others.map((x) => ({ label: x.label, record: x.stored.record })));
  return { ...words, ...(praise ? { fromYourLead: praise } : {}), ...(lines.length ? { acrossYourCheckIns: { heading: 'In your other check-ins', lines } } : {}) };
}

/** The page with nobody on it yet: the lead runs a check-in nobody checks in to yet. */
function emptyFor(label: string | null) {
  return {
    heading: 'My work',
    topLine: 'Each person’s work shows here once somebody is added to this check-in.',
    numbers: [], focus: null, focusEmpty: '',
    toDo: { othersNeed: [], own: [], emptySays: '' },
    achieved: { items: [], note: '', emptySays: '' },
    performing: { note: '', behaviours: [], libraryNote: WHERE_THE_WORDS_COME_FROM },
    coaching: { better: [], keep: [], betterEmpty: '', keepEmpty: '' },
    checkIns: { heading: '', due: 0, done: 0, onTime: 0, specific: 0, emptySays: null },
    reports: { heading: '', items: [], emptySays: '' },
    items: { heading: '', note: '', itemWord: '', rows: [], emptySays: '' },
    checkInName: label || 'This check-in',
  };
}

/**
 * MY WORK, SAID DIRECTLY (the direct morning, Hafsah, 20 October 2026; organisation/the-direct-morning-switch.ts). Where the switch
 * is on, the page carries no note about who else sees it and no note about where its words come from. The page is the same page:
 * who may read it is decided before this, the same either way.
 */
export function myWorkSaidDirectly<T>(served: T): T {
  const s: any = served;
  if (!s || typeof s !== 'object' || s.on !== true) return served;
  return {
    ...s,
    ...(typeof s.topLine === 'string' ? { topLine: s.topLine.replace(/ [^.]+ sees this page too\.$/, '') } : {}),
    ...(s.performing && typeof s.performing === 'object' ? { performing: { ...s.performing, libraryNote: '' } } : {}),
  } as T;
}
