import { GroundScenario } from '@prisma/client';
import { HOW_I_WILL_WORK_WITH_YOUR_TEAM } from '../entry/the-anchor-served-shapes';
import type { TheLens, TheIdeasFromYourTeam, TheWayGroundworkWillHelp } from '../entry/the-anchor-served-shapes';
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
  /* An ended check-in has no week to say anything about. */
  if (has('weeklyInsight') && input.record && !input.ended) {
    const text = theWeeklyInsightParagraph(input.record);
    if (text) out.weeklyInsight = { heading: 'This week', text };
  }
  return out;
}
