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
 * PIECES 12 AND 13/20. THE MONTH BOARD, "Are we moving together?" (section 24). Lead only.
 * ---------------------------------------------------------------------------------------------- */
export type TheLens = { key: 'understanding' | 'ownership' | 'contribution' | 'action'; heading: string; question: string; reading: string }
export type APersonHelpingThingsMove = { name: string; sentence: string }
export type TheMonthBoard = {
  question: 'Are we moving together?'
  weekOfTheMonth: 1 | 2 | 3 | 4
  lenses: TheLens[]
  whatIsMoving: string[]
  whatTheTeamIsContributing: string[]
  peopleHelpingThingsMove: APersonHelpingThingsMove[]
  wherePerspectivesDiffer: string[]
  whatIsStillGettingInTheWay: string[]
  whatGroundworkIsWorkingOnNext: string[]
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
  continueOptions: TheContinueOption[]
}
