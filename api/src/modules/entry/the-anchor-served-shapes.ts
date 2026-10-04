/**
 * THE SHAPES THE ANCHOR SCENARIO SERVES (requests 144 and 147).
 *
 * Each type is the exact shape a screen may rely on. Where a piece is not built yet, the type is the
 * contract: whoever builds the piece serves exactly this, and the spec beside this file pins the keys.
 * Every sentence in the examples in docs/answers-from-engine.md is Hafsah's, from docs/anchor-scenario.md.
 */

/** Section 7. The seven things Groundwork learns about the lead's world, each in the lead's own words. Shape only: not served yet. */
export type TheSevenThingsTheLeadHasSaid = {
  responsibleFor?: string;
  tryingToMove?: string;
  howItContributes?: string;
  seeingToday?: string;
  whyItBothersYou?: string;
  whatTheyDontUnderstand?: string;
  whatTheyWouldDoDifferently?: string;
};
export const THE_SEVEN_THINGS_KEYS: (keyof TheSevenThingsTheLeadHasSaid)[] = [
  'responsibleFor', 'tryingToMove', 'howItContributes', 'seeingToday', 'whyItBothersYou', 'whatTheyDontUnderstand', 'whatTheyWouldDoDifferently',
];

/* ------------------------------------------------------------------------------------------------
 * PIECE 8. THE LEAD'S REVEAL (section 11 and 12). SHAPE ONLY: NOT SERVED YET.
 * "What you're carrying" and "What you're seeing today" stay the lead's alone, and "What you need the
 * team to understand" reaches the team only once the lead says so (decision 96, item 8). For anybody
 * who may not read a part, the field is `null`; it is never filled and hidden on the screen.
 * ---------------------------------------------------------------------------------------------- */
export type TheWayGroundworkWillHelp = { key: 'understand' | 'connect' | 'encourage' | 'challenge' | 'act' | 'followThrough' | 'crossReference' | 'surfacePatterns'; heading: string; sentence: string };

/** Section 12, word for word. Fixed words: the same for every lead. */
export const HOW_I_WILL_WORK_WITH_YOUR_TEAM: readonly TheWayGroundworkWillHelp[] = [
  { key: 'understand', heading: 'Understand', sentence: 'Learn how each person currently sees their work and the wider outcome.' },
  { key: 'connect', heading: 'Connect', sentence: 'Help them connect their actual work to customers, colleagues, money, delivery and the wider objective.' },
  { key: 'encourage', heading: 'Encourage', sentence: 'Recognise good thinking, initiative, contribution and ownership.' },
  { key: 'challenge', heading: 'Challenge', sentence: 'Gently probe assumptions and "I did my part" thinking.' },
  { key: 'act', heading: 'Act', sentence: 'Help people identify what they themselves can do.' },
  { key: 'followThrough', heading: 'Follow through', sentence: 'Remember commitments and return to them.' },
  { key: 'crossReference', heading: 'Cross-reference', sentence: "Understand where different people's perspectives align or diverge." },
  { key: 'surfacePatterns', heading: 'Surface patterns', sentence: "Show the lead what's happening across the group without turning private check-ins into employee surveillance." },
];

export type TheLeadsReveal = {
  title: 'Help my team understand';
  subtitle: 'One-month Groundwork';
  /** The lead's alone. `null` for anybody else. */
  carrying: string | null;
  /** `null` for the team until the lead has shared it (`sharedWithTheTeam`). */
  whatTheTeamNeedsToUnderstand: string | null;
  sharedWithTheTeam: boolean;
  whoYouAreTryingToMove: string;
  /** The lead's alone. `null` for anybody else. */
  seeingToday: string | null;
  /** Observable behaviours, in the lead's own words, one sentence each. */
  whatMeaningfulChangeWouldLookLike: string[];
  /** What Groundwork needs to understand from the other side, one sentence each. */
  whatGroundworkWillExplore: string[];
  howIWillWorkWithYourTeam: TheWayGroundworkWillHelp[];
};

/* ------------------------------------------------------------------------------------------------
 * PIECE 10. UP TO 20 PEOPLE, AND THE INVITATION (section 13 and 14; decision 96, items 1, 3 and 8).
 * PARTLY SERVED: the people step already sends and accepts `contributors` on commit (ContributorDto
 * in entry.controller.ts); the limit of 20 and the invitation's words are SHAPES ONLY.
 * ---------------------------------------------------------------------------------------------- */
export type OnePersonTheLeadAdds = {
  /** Required unless `colleagueId` is given. */
  email?: string;
  colleagueId?: string;
  /** "What do they do / why are they part of this?" Optional. The lead's own note: never shown to the person. */
  context?: string;
  note?: string;
};
export type ThePeopleStepSends = { contributors: OnePersonTheLeadAdds[] };

/** 20 includes the lead: the lead plus 19 (decision 96, item 3). */
export type ThePeopleStepRules = {
  limit: 20;
  theLeadCounts: true;
  mayAdd: 19;
  heading: string;
  intro: string;
  contextLabel: string;
  button: string;
  /** Said when the lead tries to add a twentieth other person. */
  limitSentence: string;
};

export type TheAnchorInvitation = {
  subject: string;
  heading: string;
  /** Plain sentences, in order. The fourth is one of two, by `leadHasSharedWhatTheyAreSeeing`. */
  lines: string[];
  leadHasSharedWhatTheyAreSeeing: boolean;
  button: string;
};

/* ------------------------------------------------------------------------------------------------
 * PIECES 12 AND 13. THE MONTH BOARD (section 24). SHAPE ONLY: NOT SERVED YET.
 * The four lenses are plain sentences, never scores (decisions 11 and 94). In weeks one and two,
 * patterns are not shown: "what's still getting in the way" uses blockers and differences from the
 * record; patterns appear from week three (decision 96, item 14).
 * ---------------------------------------------------------------------------------------------- */
export type TheLens = { key: 'understanding' | 'ownership' | 'contribution' | 'action'; heading: string; question: string; reading: string };
export type APersonHelpingThingsMove = { name: string; sentence: string };
export type TheMonthBoard = {
  question: 'Are we moving together?';
  weekOfTheMonth: 1 | 2 | 3 | 4;
  lenses: TheLens[];
  whatIsMoving: string[];
  whatTheTeamIsContributing: string[];
  peopleHelpingThingsMove: APersonHelpingThingsMove[];
  wherePerspectivesDiffer: string[];
  whatIsStillGettingInTheWay: string[];
  whatGroundworkIsWorkingOnNext: string[];
};

/* ------------------------------------------------------------------------------------------------
 * PIECE 30. THE "ACTIVE" LINE (section 26). SHAPE ONLY: NOT SERVED YET.
 * ---------------------------------------------------------------------------------------------- */
export type TheActiveLine = {
  /** People who have checked in within the cadence. */
  active: number;
  /** People in the check-in, the lead included, never more than 20. */
  total: number;
  /** People Groundwork has nudged and who are not yet active. */
  nudged: number;
  /** The status line for the board, in Hafsah's own words from the spec: "18/20 active · Groundwork has nudged the remaining 2." */
  line: string;
};

/* ------------------------------------------------------------------------------------------------
 * PIECE 32. THE END-OF-MONTH READ (sections 28 and 29). SHAPE ONLY: NOT SERVED YET.
 * Built once from the record; opening it never rebuilds it.
 * ---------------------------------------------------------------------------------------------- */
export type TheRevealCounts = {
  projectsThatCouldHaveTheirOwnGround: number;
  sharedObjectivesWorthTracking: number;
  workingRelationshipsNeedingAlignment: number;
  activeCommitments: number;
  teamGeneratedIdeas: number;
  suitesRelevantToWorkAlreadyBeingDone: number;
};
export type TheContinueOption = { key: 'keepThisGroundRunning' | 'startRecommendedGrounds' | 'turnOnRelevantSuites' | 'continueGroundworkForTheTeam'; label: string };
export type TheEndOfMonthRead = {
  /** "You wanted your team to understand..." followed by the lead's own words, quoted. */
  yourOwnWords: string;
  whatWeFound: string[];
  whatTheyNowUnderstandDifferently: string[];
  whatTheyAreDoingDifferently: string[];
  whatYourTeamContributed: string[];
  peopleWhoHelpedMoveTheThinking: APersonHelpingThingsMove[];
  whatYouChangedAsALead: string[];
  whatIsStillStuck: string[];
  whatShouldHappenNext: string[];
  reveal: TheRevealCounts;
  continueOptions: TheContinueOption[];
};

/* ------------------------------------------------------------------------------------------------
 * PIECE 19 AND 20. "IDEAS FROM YOUR TEAM" (section 18; plan section 5 row 7; decision 96, item 10). SHAPE ONLY.
 * Nothing is stored or served yet: ideas need their own record (piece 19). Served on the board read as
 * `BoardPresent.ideasFromYourTeam`, to everyone in that check-in, and only after the person said yes to
 * capturing the idea for the team. Before the yes nothing exists for anybody to read.
 * ---------------------------------------------------------------------------------------------- */
export type AnIdeaFromTheTeam = {
  id: string;
  /** The idea, in the person's own words. */
  title: string;
  /** "Raised by Lucy." */
  raisedBy: string;
  /** "Similar needs have appeared across three check-ins." Never names anybody. Null when it has appeared once. */
  similarNeedsSentence: string | null;
};
export type TheIdeasFromYourTeam = {
  heading: 'Ideas from your team';
  ideas: AnIdeaFromTheTeam[];
  /** Said when there are none. */
  whenThereAreNone: string;
};

/* ------------------------------------------------------------------------------------------------
 * PIECE 21. THE YES IN THE PERSON'S CHECK-IN (section 18; plan section 5 row 21; decision 96, item 10). SHAPE ONLY.
 * When the person says something that is a concrete idea, the reply carries this beside it. Only the person's
 * yes captures it; "Not now" leaves nothing behind. It is served to that person alone, in their own check-in.
 * ---------------------------------------------------------------------------------------------- */
export type TheIdeaOfferInTheCheckIn = {
  /** The idea, in the person's own words, so they can see exactly what would be captured. */
  idea: string;
  /** "That sounds like a concrete idea. Want me to capture it for the team?" */
  question: string;
  /** Who will see it if they say yes, in a sentence. */
  whoWillSeeIt: string;
  yes: string;
  no: string;
};

/** For the spec: the keys each shape holds, so a later builder cannot rename one quietly. */
export const THE_SHAPES_KEYS = {
  reveal: ['title', 'subtitle', 'carrying', 'whatTheTeamNeedsToUnderstand', 'sharedWithTheTeam', 'whoYouAreTryingToMove', 'seeingToday', 'whatMeaningfulChangeWouldLookLike', 'whatGroundworkWillExplore', 'howIWillWorkWithYourTeam'],
  peopleStepRules: ['limit', 'theLeadCounts', 'mayAdd', 'heading', 'intro', 'contextLabel', 'button', 'limitSentence'],
  invitation: ['subject', 'heading', 'lines', 'leadHasSharedWhatTheyAreSeeing', 'button'],
  monthBoard: ['question', 'weekOfTheMonth', 'lenses', 'whatIsMoving', 'whatTheTeamIsContributing', 'peopleHelpingThingsMove', 'wherePerspectivesDiffer', 'whatIsStillGettingInTheWay', 'whatGroundworkIsWorkingOnNext'],
  activeLine: ['active', 'total', 'nudged', 'line'],
  endOfMonth: ['yourOwnWords', 'whatWeFound', 'whatTheyNowUnderstandDifferently', 'whatTheyAreDoingDifferently', 'whatYourTeamContributed', 'peopleWhoHelpedMoveTheThinking', 'whatYouChangedAsALead', 'whatIsStillStuck', 'whatShouldHappenNext', 'reveal', 'continueOptions'],
  ideasFromYourTeam: ['heading', 'ideas', 'whenThereAreNone'],
  anIdea: ['id', 'title', 'raisedBy', 'similarNeedsSentence'],
  ideaOffer: ['idea', 'question', 'whoWillSeeIt', 'yes', 'no'],
  revealCounts: ['projectsThatCouldHaveTheirOwnGround', 'sharedObjectivesWorthTracking', 'workingRelationshipsNeedingAlignment', 'activeCommitments', 'teamGeneratedIdeas', 'suitesRelevantToWorkAlreadyBeingDone'],
} as const;
