/**
 * THE ANCHOR SCENARIO'S SERVED SHAPES, MIRRORED FOR THE CLIENT (plan pieces 9, 20, 33;
 * docs/anchor-scenario-plan.md section 5, rows 3, 6, 7, 8, 9, 13; docs/answers-from-engine.md,
 * "Request 147: the anchor's served shapes, ahead of the data").
 *
 * These types copy, field for field, `api/src/modules/entry/the-anchor-served-shapes.ts` on the
 * engine side (read only - never imported from `api/`, since the client builds alone on staging).
 * Nothing here is served yet except where a comment says so. A screen draws nothing for a field
 * that is `undefined` - it never invents a value, and it never draws for the switch
 * `anchorScenarioOn` being anything but `true`.
 */

/* ------------------------------------------------------------------------------------------------
 * PIECE 8/9. THE LEAD'S REVEAL, "Help my team understand" (section 11 and 12).
 * `carrying` and `seeingToday` are the lead's alone - `null` for anybody else, never filled and
 * hidden on screen. `whatTheTeamNeedsToUnderstand` is `null` for the team until `sharedWithTheTeam`.
 * ---------------------------------------------------------------------------------------------- */
export type TheWayGroundworkWillHelp = {
  key: 'understand' | 'connect' | 'encourage' | 'challenge' | 'act' | 'followThrough' | 'crossReference' | 'surfacePatterns'
  heading: string
  sentence: string
}

/** Section 12, word for word - fixed words, the same for every lead, used as a fallback only if the engine has not yet sent `howIWillWorkWithYourTeam` on a served reveal. */
export const HOW_I_WILL_WORK_WITH_YOUR_TEAM: readonly TheWayGroundworkWillHelp[] = [
  { key: 'understand', heading: 'Understand', sentence: 'Learn how each person currently sees their work and the wider outcome.' },
  { key: 'connect', heading: 'Connect', sentence: 'Help them connect their actual work to customers, colleagues, money, delivery and the wider objective.' },
  { key: 'encourage', heading: 'Encourage', sentence: 'Recognise good thinking, initiative, contribution and ownership.' },
  { key: 'challenge', heading: 'Challenge', sentence: 'Gently probe assumptions and "I did my part" thinking.' },
  { key: 'act', heading: 'Act', sentence: 'Help people identify what they themselves can do.' },
  { key: 'followThrough', heading: 'Follow through', sentence: 'Remember commitments and return to them.' },
  { key: 'crossReference', heading: 'Cross-reference', sentence: "Understand where different people's perspectives align or diverge." },
  { key: 'surfacePatterns', heading: 'Surface patterns', sentence: "Show the lead what's happening across the group without turning private check-ins into employee surveillance." },
]

export type TheLeadsReveal = {
  title: 'Help my team understand'
  subtitle: 'One-month Groundwork'
  /** The lead's alone. `null` for anybody else. */
  carrying: string | null
  /** `null` for the team until the lead has shared it (`sharedWithTheTeam`). */
  whatTheTeamNeedsToUnderstand: string | null
  sharedWithTheTeam: boolean
  whoYouAreTryingToMove: string
  /** The lead's alone. `null` for anybody else. */
  seeingToday: string | null
  whatMeaningfulChangeWouldLookLike: string[]
  whatGroundworkWillExplore: string[]
  howIWillWorkWithYourTeam: TheWayGroundworkWillHelp[]
}

/* ------------------------------------------------------------------------------------------------
 * PIECE 10/11. UP TO 20 PEOPLE, AND THE INVITATION (section 13 and 14; decision 96, items 1, 3 and
 * 8). `mayAdd` is 19, not 20: the limit is 20 people including the lead, so the lead can add 19
 * others. Served as `thePeopleStep` on `GET /entry/anchor-start`.
 * ---------------------------------------------------------------------------------------------- */
export type OnePersonTheLeadAdds = {
  /** Required unless `colleagueId` is given. */
  email?: string
  colleagueId?: string
  /** "What do they do / why are they part of this?" Optional. The lead's own note: never shown to the person. */
  context?: string
  note?: string
  /** "Name + email" (section 13): what the lead calls this person, asked first, beside their email. Optional. */
  displayName?: string
}
export type ThePeopleStepSends = { contributors: OnePersonTheLeadAdds[] }

export type ThePeopleStepRules = {
  limit: 20
  theLeadCounts: true
  mayAdd: 19
  heading: string
  intro: string
  contextLabel: string
  button: string
  /** Said when the lead tries to add a twentieth other person. */
  limitSentence: string
}

export type TheAnchorInvitation = {
  subject: string
  heading: string
  /** Plain sentences, in order. The fourth is one of two, by `leadHasSharedWhatTheyAreSeeing`. */
  lines: string[]
  leadHasSharedWhatTheyAreSeeing: boolean
  button: string
}

/* ------------------------------------------------------------------------------------------------
 * PIECES 12 AND 13/20. THE MONTH BOARD, "Are we moving together?" (section 24). Lead only.
 * ---------------------------------------------------------------------------------------------- */
export type TheLens = { key: 'understanding' | 'ownership' | 'contribution' | 'action'; heading: string; question: string; reading: string }
export type APersonHelpingThingsMove = { name: string; sentence: string }
export type TheMonthBoard = {
  question: 'Are we moving together?'
  weekOfTheMonth: 1 | 2 | 3 | 4
  /** Where the month is, as a sentence. An ended check-in says it has ended, never "Week 4 of the month". */
  weekSaid: string
  lenses: TheLens[]
  whatIsMoving: string[]
  whatTheTeamIsContributing: string[]
  peopleHelpingThingsMove: APersonHelpingThingsMove[]
  wherePerspectivesDiffer: string[]
  whatIsStillGettingInTheWay: string[]
  whatGroundworkIsWorkingOnNext: string[]
}

/* ------------------------------------------------------------------------------------------------
 * PIECE 30/31. THE "ACTIVE" LINE (section 26). Served as `BoardPresent.activeLine`, to whoever runs
 * the check-in only.
 * ---------------------------------------------------------------------------------------------- */
export type TheActiveLine = {
  /** People who have checked in within the cadence. */
  active: number
  /** People in the check-in, the lead included, never more than 20. */
  total: number
  /** People Groundwork has nudged and who are not yet active. */
  nudged: number
  /** The status line, e.g. "18/20 active · Groundwork has nudged the remaining 2." Drawn exactly as sent. */
  line: string
}

/* ------------------------------------------------------------------------------------------------
 * PIECE 32/33. THE END-OF-MONTH READ (sections 28 and 29). Built once from the record; opening it
 * never rebuilds it.
 * ---------------------------------------------------------------------------------------------- */
export type TheRevealCounts = {
  projectsThatCouldHaveTheirOwnGround: number
  sharedObjectivesWorthTracking: number
  workingRelationshipsNeedingAlignment: number
  activeCommitments: number
  teamGeneratedIdeas: number
  suitesRelevantToWorkAlreadyBeingDone: number
}
/** The reveal as sentences the engine serves: no "Ground", no bare "0 projects". */
export type TheRevealSaid = { heading: string; intro: string; lines: string[]; closing: string }
export type TheContinueOption = { key: 'keepThisGroundRunning' | 'startRecommendedGrounds' | 'turnOnRelevantSuites' | 'continueGroundworkForTheTeam'; label: string }
export type TheEndOfMonthRead = {
  /** "You wanted your team to understand..." followed by the lead's own words, quoted. */
  yourOwnWords: string
  whatWeFound: string[]
  whatTheyNowUnderstandDifferently: string[]
  whatTheyAreDoingDifferently: string[]
  whatYourTeamContributed: string[]
  peopleWhoHelpedMoveTheThinking: APersonHelpingThingsMove[]
  whatYouChangedAsALead: string[]
  whatIsStillStuck: string[]
  whatShouldHappenNext: string[]
  reveal: TheRevealCounts
  revealSaid: TheRevealSaid
  continueOptions: TheContinueOption[]
}

/* ------------------------------------------------------------------------------------------------
 * PIECE 19 AND 20. "IDEAS FROM YOUR TEAM" (section 18; plan section 5 row 7; decision 96, item 10).
 * Served on the board read as `BoardPresent.ideasFromYourTeam`, to everyone in that check-in, and
 * only after the person said yes to capturing the idea for the team. Before the yes nothing exists
 * for anybody to read.
 * ---------------------------------------------------------------------------------------------- */
export type AnIdeaFromTheTeam = {
  id: string
  /** The idea, in the person's own words. */
  title: string
  /** "Raised by Lucy." */
  raisedBy: string
  /** "Similar needs have appeared across three check-ins." Never names anybody. Null when it has appeared once. */
  similarNeedsSentence: string | null
}
export type TheIdeasFromYourTeam = {
  heading: 'Ideas from your team'
  ideas: AnIdeaFromTheTeam[]
  /** Said when there are none. */
  whenThereAreNone: string
}

/* ------------------------------------------------------------------------------------------------
 * PIECE 21. THE YES IN THE PERSON'S CHECK-IN (section 18; plan section 5 row 21; decision 96, item
 * 10). When the person says something that is a concrete idea, the reply carries this beside it.
 * Only the person's yes captures it; "Not now" leaves nothing behind. Served to that person alone,
 * in their own check-in.
 * ---------------------------------------------------------------------------------------------- */
export type TheIdeaOfferInTheCheckIn = {
  /** The idea, in the person's own words, so they can see exactly what would be captured. */
  idea: string
  /** "That sounds like a concrete idea. Want me to capture it for the team?" */
  question: string
  /** Who will see it if they say yes, in a sentence. */
  whoWillSeeIt: string
  yes: string
  no: string
}

/* ------------------------------------------------------------------------------------------------
 * ANCHOR PIECES 26 AND 27. A REQUEST OFFERED IN THE CHECK-IN (section 22; docs/anchor-scenario.md;
 * docs/answers-from-engine.md, "Anchor pieces 26 and 27, a request offered in the check-in, are
 * built"; engine's `ARequestOffer` / `ARequestToOpen`,
 * `api/src/modules/conversation/a-request-offered-in-the-check-in.ts`). Only for a check-in started
 * from the anchor link, only while the anchor switch is on. When a person asks for leave, or asks
 * to spend money, in their own words, the reply carries `requestOffer`: "Shall I treat this as a
 * leave request?" (or a spending request), with "Yes" and "No". Their yes is answered with the
 * spec's sentence and `openTheRequest`; a no, or carrying on, leaves nothing. Nothing is filed for
 * the person - a date or a sum is never guessed - so `openTheRequest.button`, when it is not null,
 * opens the suite's own request form rather than sending anything itself. A request is never also
 * offered as an idea, so only one of `ideaOffer` and `requestOffer` ever rides on the same reply.
 * ---------------------------------------------------------------------------------------------- */
export type TheRequestOfferInTheCheckIn = {
  kind: 'leave' | 'spending'
  /** "Shall I treat this as a leave request?" / "... a spending request?" */
  question: string
  yes: string
  no: string
}
export type TheRequestToOpen = {
  kind: 'leave' | 'spending'
  /** Whether that suite is switched on for this organisation - decides which sentence, and whether there is a button. */
  suiteIsOn: boolean
  /** The spec's sentence, said first. */
  says: string
  /** Null when the suite is off: there is nowhere for the button to open. */
  button: string | null
  /**
   * REQUEST 165 (Hafsah, 6 October): what was read from the person's own words, only where it was
   * read and never guessed - `{ startsOn?, endsOn? }` for leave, `{ amount?, what?, currency? }`
   * for spending. The button opens the suite's own request form (`/suite/leave/new` or
   * `/suite/spend/new`), carried in router state, and the form starts from it; with nothing here,
   * or the field absent, the form starts empty.
   */
  prefill?: { startsOn?: string; endsOn?: string; amount?: number; what?: string; currency?: string } | null
}
