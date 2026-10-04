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
