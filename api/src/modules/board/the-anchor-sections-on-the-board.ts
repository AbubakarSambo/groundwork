import { GroundScenario } from '@prisma/client';
import { HOW_I_WILL_WORK_WITH_YOUR_TEAM } from '../entry/the-anchor-served-shapes';
import type { TheLens, TheIdeasFromYourTeam, TheWayGroundworkWillHelp, TheEndOfMonthRead, TheMonthBoard } from '../entry/the-anchor-served-shapes';
import type { AnOfferTheLeadReads } from '../detectors/the-anchor-recommendations';
import { sectionsFor, type BoardSection } from './board-families';
import type { TheMonthRecord } from './the-anchor-month-record';
import { theWeeklyInsightParagraph } from '../whatsapp/the-anchor-weekly-insight';

/**
 * THE ANCHOR'S SECTIONS, ON THE ORDINARY BOARD UNDER THE SWITCHBOARD'S NAMES (decision 114, 8 October).
 *
 * The anchor is a scenario like the others. Its board is the delivery board plus the sections docs/anchor-scenario.md names, chosen by the
 * switchboard (`SCENARIO_SECTIONS_ADDED`) and carried in the same board payload, each under its section's own name, with a heading and
 * plain sentences. The page draws them as it draws any section. Nothing here is a separate page, flow or read.
 *
 * WHO READS WHAT is decided by the caller and handed in; this only shapes. A section a reader may not read is left out of what they are
 * served, never filled and hidden: "What you're carrying", the four lenses, "People helping the team move", "Groundwork recommends" and the
 * weekly insight are for whoever leads the check-in (the screens' contract says "Lead only"), "How Groundwork will work with the team" and
 * "Ideas from the team" are for everybody in it. A section the record cannot fill is left out too, never guessed.
 */
export type TheAnchorSectionsReader = 'lead' | 'member';

export type AnchorBoardSections = {
  whatYouAreCarrying?: { heading: string; text: string };
  howGroundworkWillWork?: { heading: string; ways: TheWayGroundworkWillHelp[] };
  theFourLenses?: { heading: string; question: string; lenses: TheLens[] };
  ideasFromTheTeam?: TheIdeasFromYourTeam;
  peopleHelpingTheTeamMove?: { heading: string; people: { name: string; sentence: string }[] };
  recommendations?: { heading: string; offers: AnOfferTheLeadReads[] };
  weeklyInsight?: { heading: string; text: string };
  /* The month board's own parts, as sections of their own (decision 114): where the month is, what is moving, what is still in the way. The lead's. */
  whereTheMonthIs?: { heading: string; weekOfTheMonth: 1 | 2 | 3 | 4; text: string };
  whatIsMoving?: { heading: string; items: string[] };
  whatIsStillInTheWay?: { heading: string; items: string[] };
  whatTheTeamIsContributing?: { heading: string; items: string[] };
  wherePerspectivesDiffer?: { heading: string; items: string[] };
  whatGroundworkIsWorkingOnNext?: { heading: string; items: string[] };
  /** The end-of-month read, from the lead's own words down to what should happen next, the reveal and the ways to carry on. The lead's. */
  theEndOfTheMonth?: { heading: string; yourOwnWords: string; parts: { heading: string; items: string[] }[]; people: { name: string; sentence: string }[]; reveal: TheEndOfMonthRead['reveal']; revealSaid: TheEndOfMonthRead['revealSaid']; continueOptions: TheEndOfMonthRead['continueOptions'] };
};

export function theAnchorSections(input: {
  scenario: GroundScenario;
  reader: TheAnchorSectionsReader;
  /** The lead's own first words, hers alone. */
  carrying?: string | null;
  lenses?: TheLens[] | null;
  question?: string | null;
  ideas?: TheIdeasFromYourTeam | null;
  people?: { name: string; sentence: string }[] | null;
  offers?: AnOfferTheLeadReads[] | null;
  record?: TheMonthRecord | null;
  ended?: boolean;
  /** The month board and the end-of-month read, already built once from the record (opening the board never rebuilds them). */
  monthBoard?: TheMonthBoard | null;
  endOfMonth?: TheEndOfMonthRead | null;
}): AnchorBoardSections {
  const has = (s: BoardSection) => sectionsFor(input.scenario).includes(s);
  const out: AnchorBoardSections = {};
  if (has('howGroundworkWillWork')) out.howGroundworkWillWork = { heading: "How I'll work with your team", ways: HOW_I_WILL_WORK_WITH_YOUR_TEAM.map((w) => ({ ...w })) };
  if (has('ideasFromTheTeam') && input.ideas) out.ideasFromTheTeam = input.ideas;
  if (input.reader !== 'lead') return out;
  if (has('whatYouAreCarrying') && input.carrying?.trim()) out.whatYouAreCarrying = { heading: "What you're carrying", text: input.carrying.trim() };
  if (has('theFourLenses') && input.lenses?.length) out.theFourLenses = { heading: 'The four lenses', question: input.question ?? 'Are we moving together?', lenses: input.lenses };
  if (has('peopleHelpingTheTeamMove') && input.people?.length) out.peopleHelpingTheTeamMove = { heading: 'People helping the team move', people: input.people };
  if (has('recommendations') && input.offers?.length) out.recommendations = { heading: 'Groundwork recommends', offers: input.offers };
  if (has('whereTheMonthIs') && input.monthBoard) out.whereTheMonthIs = { heading: 'Where the month is', weekOfTheMonth: input.monthBoard.weekOfTheMonth, text: input.monthBoard.weekSaid };
  if (has('whatIsMoving') && input.monthBoard?.whatIsMoving?.length) out.whatIsMoving = { heading: "What's moving", items: input.monthBoard.whatIsMoving };
  if (has('whatIsStillInTheWay') && input.monthBoard?.whatIsStillGettingInTheWay?.length) out.whatIsStillInTheWay = { heading: "What's still getting in the way", items: input.monthBoard.whatIsStillGettingInTheWay };
  if (has('whatTheTeamIsContributing') && input.monthBoard?.whatTheTeamIsContributing?.length) out.whatTheTeamIsContributing = { heading: 'What the team is contributing', items: input.monthBoard.whatTheTeamIsContributing };
  if (has('wherePerspectivesDiffer') && input.monthBoard?.wherePerspectivesDiffer?.length) out.wherePerspectivesDiffer = { heading: 'Where perspectives differ', items: input.monthBoard.wherePerspectivesDiffer };
  if (has('whatGroundworkIsWorkingOnNext') && input.monthBoard?.whatGroundworkIsWorkingOnNext?.length) out.whatGroundworkIsWorkingOnNext = { heading: 'What Groundwork is working on next', items: input.monthBoard.whatGroundworkIsWorkingOnNext };
  if (has('theEndOfTheMonth') && input.endOfMonth) {
    const e = input.endOfMonth;
    out.theEndOfTheMonth = {
      heading: 'You wanted your team to understand...', yourOwnWords: e.yourOwnWords,
      parts: ([
        ['What we found', e.whatWeFound], ['What they now understand differently', e.whatTheyNowUnderstandDifferently], ['What they are doing differently', e.whatTheyAreDoingDifferently],
        ['What your team contributed', e.whatYourTeamContributed], ['What you changed as a lead', e.whatYouChangedAsALead], ["What's still stuck", e.whatIsStillStuck], ['What should happen next', e.whatShouldHappenNext],
      ] as [string, string[]][]).filter(([, items]) => items?.length).map(([heading, items]) => ({ heading, items })),
      people: e.peopleWhoHelpedMoveTheThinking ?? [], reveal: e.reveal, revealSaid: e.revealSaid, continueOptions: e.continueOptions,
    };
  }
  /* An ended check-in has no week to say anything about. */
  if (has('weeklyInsight') && input.record && !input.ended) {
    const text = theWeeklyInsightParagraph(input.record);
    if (text) out.weeklyInsight = { heading: 'This week', text };
  }
  return out;
}
