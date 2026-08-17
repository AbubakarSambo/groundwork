import { GroundScenario, GroundMode } from '@prisma/client';

/**
 * Scenario families: what shape of board (if any) a ground gets.
 *
 * The board is a delivery-shaped rendering of the delivery-relevant parts of
 * the report. It is NOT a replacement for the report - on a shared ground both
 * exist: the board (team-facing, operational) and each person's own report
 * (private substance). Some report content never crosses to the board at all
 * (see BOARD_WHITELIST below).
 *
 * Which family a scenario belongs to decides how much board shows, and whether
 * a board renders at all. Getting this wrong is the way the product poisons
 * itself: a full transparent board over a pulse check, where people were
 * candid about tension, betrays the candour that made the answers honest, and
 * nobody is honest again.
 */
export enum BoardFamily {
  /** Small group, interlocking work. The board at its fullest, shared. */
  DELIVERY = 'DELIVERY',
  /** Many people, one shared bar. Wide but simpler: no who-is-blocked-on-whom. */
  COHORT = 'COHORT',
  /** Ramping someone in. Light board, mostly private, forward-looking. */
  ONBOARDING = 'ONBOARDING',
  /** Deciding if someone is working out. Minimal board, private report. */
  EVALUATION = 'EVALUATION',
  /** Pulse / misalignment / crisis. NO board, ever. Report only. */
  SENSING = 'SENSING',
}

/**
 * Every scenario maps to exactly one family. Exhaustive by construction: a new
 * GroundScenario will fail to compile until it is placed here, so a new
 * scenario can never silently default into rendering a full board.
 *
 * NEW_HIRE sits in ONBOARDING, not EVALUATION. Ramping someone in and deciding
 * whether they are working out are different situations with different board
 * shapes, even though both involve a new hire. Which one a given ground is
 * doing is left to the lead's framing at creation; PIP is the unambiguous
 * evaluation case.
 */
export const SCENARIO_FAMILY: Record<GroundScenario, BoardFamily> = {
  // Delivery: interlocking work, handoffs matter, transparency helps.
  NEW_PROJECT: BoardFamily.DELIVERY,
  NEW_COFOUNDER: BoardFamily.DELIVERY,
  OKR_ALIGNMENT: BoardFamily.DELIVERY,
  WORKPLAN_BUDGET: BoardFamily.DELIVERY,
  BOARD_STRATEGY: BoardFamily.DELIVERY,

  // Cohort: many people against one frame.
  COHORT_CHECK: BoardFamily.COHORT,

  // Onboarding / coaching: forward-looking, sets the ramp.
  NEW_HIRE: BoardFamily.ONBOARDING,
  NEW_MANAGER: BoardFamily.ONBOARDING,
  NEW_ADVISOR: BoardFamily.ONBOARDING,

  // Evaluation: the output stays close.
  PIP: BoardFamily.EVALUATION,
  CONTRACT_RENEWAL: BoardFamily.EVALUATION,
  RECOGNITION: BoardFamily.EVALUATION,

  // Sensing the mood: transparency would poison these.
  PULSE_CHECK: BoardFamily.SENSING,
  REALIGN_TEAM: BoardFamily.SENSING,
  /**
   * SENSING, deliberately. OPEN_READ exists because nobody could say what the situation is, so the
   * one honest thing to do is gather each account privately and compare. That is exactly what the
   * sensing family does; a delivery-shaped board would invent structure nobody described.
   */
  OPEN_READ: BoardFamily.SENSING,
  CRISIS_ALIGNMENT: BoardFamily.SENSING,
  DRIFT: BoardFamily.SENSING,
  ACUTE_SHOCK: BoardFamily.SENSING,
};

/** Every board section that can exist. A family opts in per section. */
export type BoardSection =
  | 'phaseSpine'
  | 'quickRead'
  | 'objectives'
  | 'startingState'
  | 'divergence'
  | 'whoOwnsWhat'
  | 'dependencies'
  | 'checkInGrid'
  | 'contribution'
  | 'coverage'
  | 'patterns'
  | 'decisions'
  | 'poll';

/**
 * Which sections each family renders. SENSING is deliberately empty: not "a
 * board with nothing in it" but no board at all (see boardRendersFor).
 *
 * COHORT drops dependencies: a cohort is many people measured against a shared
 * bar, not one interlocking unit, so who-is-blocked-on-whom does not apply.
 * EVALUATION collapses to the objectives (the PIP terms or the 30/60/90), the
 * check-in columns, and the divergence read - no team roll-up, no poll.
 */
export const FAMILY_SECTIONS: Record<BoardFamily, BoardSection[]> = {
  [BoardFamily.DELIVERY]: [
    'phaseSpine', 'quickRead', 'objectives', 'startingState', 'divergence',
    'whoOwnsWhat', 'dependencies', 'checkInGrid', 'contribution', 'coverage',
    'patterns', 'decisions', 'poll',
  ],
  [BoardFamily.COHORT]: [
    'phaseSpine', 'quickRead', 'objectives', 'divergence',
    'checkInGrid', 'contribution', 'patterns',
  ],
  [BoardFamily.ONBOARDING]: [
    // WAITING-ON BELONGS HERE. Someone settling into a role is more dependent on
    // other people than they will ever be again - the sign-off, the access, the
    // decision their manager owes them. A live run recorded two real handoffs on
    // a new-hire ground and the board had nowhere to put them, so the manager's
    // own slippage was the one thing invisible on a page about the new person.
    'phaseSpine', 'objectives', 'dependencies', 'checkInGrid', 'divergence', 'contribution',
  ],
  [BoardFamily.EVALUATION]: [
    'objectives', 'checkInGrid', 'divergence',
  ],
  [BoardFamily.SENSING]: [],
};

export function familyFor(scenario: GroundScenario): BoardFamily {
  return SCENARIO_FAMILY[scenario];
}

/**
 * The hard gate. A board renders only when the ground is SHARED mode AND the
 * scenario's family has sections. Both conditions, not either: a private
 * ground never renders a board regardless of scenario, and a SENSING scenario
 * never renders one regardless of mode.
 */
export function boardRendersFor(scenario: GroundScenario, mode: GroundMode): boolean {
  if (mode !== GroundMode.SHARED) return false;
  return FAMILY_SECTIONS[familyFor(scenario)].length > 0;
}

export function sectionsFor(scenario: GroundScenario, mode: GroundMode): BoardSection[] {
  if (!boardRendersFor(scenario, mode)) return [];
  return FAMILY_SECTIONS[familyFor(scenario)];
}

export function boardHasSection(
  scenario: GroundScenario,
  mode: GroundMode,
  section: BoardSection,
): boolean {
  return sectionsFor(scenario, mode).includes(section);
}

/**
 * Scenarios that must default to PRIVATE at creation. The SENSING family's
 * whole value is that nobody sees who said what, so shared mode is not a
 * sensible default there even though a lead could in principle choose it.
 */
export function defaultModeFor(scenario: GroundScenario): GroundMode {
  return familyFor(scenario) === BoardFamily.SENSING ? GroundMode.PRIVATE : GroundMode.SHARED;
}

/**
 * WHITELIST, not blacklist. The board may surface ONLY these report fields.
 * Anything else in the report - the trust analysis, arc signals, collusion
 * risk, anything lead-only - never crosses to a surface the whole team reads,
 * regardless of family. Adding a field to the report does not put it on the
 * board; someone has to add it here deliberately.
 *
 * This is the generalisation of the existing arc-signals lead-only gate: the
 * report is the deeper thing, the board is a rendering of the delivery-relevant
 * subset, and the subset is explicit.
 */
export const BOARD_WHITELIST = [
  'sharedPicture',
  'agreements',
  'divergences',
  'centralQuestion',
  'engagement',
  // A gap between two accounts, produced by the synthesis under a rule that
  // forbids quoting either side or naming who said what. Board-safe by
  // construction, which is why it may cross where the raw accounts may not.
  'leadershipGaps',
] as const;

/** Report fields that must NEVER reach the board, asserted by the guard test. */
export const BOARD_FORBIDDEN = [
  'arcSignals',
  'arcAdvisories',
  'finalSynthesis',
  'inferences',
] as const;

export function pickBoardSafeReportFields<T extends Record<string, any>>(report: T): Partial<T> {
  const out: Partial<T> = {};
  for (const key of BOARD_WHITELIST) {
    if (key in report) (out as any)[key] = report[key];
  }
  return out;
}
