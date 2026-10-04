import { THE_SHAPES_KEYS, THE_SEVEN_THINGS_KEYS, HOW_I_WILL_WORK_WITH_YOUR_TEAM } from './the-anchor-served-shapes';
import type { TheLeadsReveal, ThePeopleStepRules, TheAnchorInvitation, TheMonthBoard, TheActiveLine, TheEndOfMonthRead, TheRevealCounts } from './the-anchor-served-shapes';

/**
 * Request 147. A later builder must serve exactly these shapes. Each example below is typed, so a
 * renamed or missing key fails the compile, and the keys list pins the names for the screens.
 */
const keysOf = (o: object) => Object.keys(o).sort();
const sorted = (a: readonly string[]) => [...a].sort();

const reveal: TheLeadsReveal = { title: 'Help my team understand', subtitle: 'One-month Groundwork', carrying: 'x', whatTheTeamNeedsToUnderstand: null, sharedWithTheTeam: false, whoYouAreTryingToMove: 'x', seeingToday: 'x', whatMeaningfulChangeWouldLookLike: [], whatGroundworkWillExplore: [], howIWillWorkWithYourTeam: [...HOW_I_WILL_WORK_WITH_YOUR_TEAM] };
const rules: ThePeopleStepRules = { limit: 20, theLeadCounts: true, mayAdd: 19, heading: '', intro: '', contextLabel: '', button: '', limitSentence: '' };
const invitation: TheAnchorInvitation = { subject: '', heading: '', lines: [], leadHasSharedWhatTheyAreSeeing: false, button: '' };
const board: TheMonthBoard = { question: 'Are we moving together?', weekOfTheMonth: 1, lenses: [], whatIsMoving: [], whatTheTeamIsContributing: [], peopleHelpingThingsMove: [], wherePerspectivesDiffer: [], whatIsStillGettingInTheWay: [], whatGroundworkIsWorkingOnNext: [] };
const active: TheActiveLine = { active: 18, total: 20, nudged: 2, line: '' };
const counts: TheRevealCounts = { projectsThatCouldHaveTheirOwnGround: 3, sharedObjectivesWorthTracking: 2, workingRelationshipsNeedingAlignment: 4, activeCommitments: 17, teamGeneratedIdeas: 7, suitesRelevantToWorkAlreadyBeingDone: 3 };
const end: TheEndOfMonthRead = { yourOwnWords: '', whatWeFound: [], whatTheyNowUnderstandDifferently: [], whatTheyAreDoingDifferently: [], whatYourTeamContributed: [], peopleWhoHelpedMoveTheThinking: [], whatYouChangedAsALead: [], whatIsStillStuck: [], whatShouldHappenNext: [], reveal: counts, continueOptions: [] };

describe('the shapes the anchor scenario serves', () => {
  it('pins the keys of each shape', () => {
    expect(keysOf(reveal)).toEqual(sorted(THE_SHAPES_KEYS.reveal));
    expect(keysOf(rules)).toEqual(sorted(THE_SHAPES_KEYS.peopleStepRules));
    expect(keysOf(invitation)).toEqual(sorted(THE_SHAPES_KEYS.invitation));
    expect(keysOf(board)).toEqual(sorted(THE_SHAPES_KEYS.monthBoard));
    expect(keysOf(active)).toEqual(sorted(THE_SHAPES_KEYS.activeLine));
    expect(keysOf(end)).toEqual(sorted(THE_SHAPES_KEYS.endOfMonth));
    expect(keysOf(counts)).toEqual(sorted(THE_SHAPES_KEYS.revealCounts));
  });

  it('holds the seven things the lead says, under the corrected name', () => {
    expect(THE_SEVEN_THINGS_KEYS).toEqual(['responsibleFor', 'tryingToMove', 'howItContributes', 'seeingToday', 'whyItBothersYou', 'whatTheyDontUnderstand', 'whatTheyWouldDoDifferently']);
  });

  it('holds the eight ways Groundwork will help, in the scenario\'s words and order', () => {
    expect(HOW_I_WILL_WORK_WITH_YOUR_TEAM.map((w) => w.heading)).toEqual(['Understand', 'Connect', 'Encourage', 'Challenge', 'Act', 'Follow through', 'Cross-reference', 'Surface patterns']);
    expect(HOW_I_WILL_WORK_WITH_YOUR_TEAM[7].sentence).toBe("Show the lead what's happening across the group without turning private check-ins into employee surveillance.");
  });
});
