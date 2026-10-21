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
  /**
   * ONE LINE, ONE LINK, ONE REPORT - AND ONE SMALL BOARD. Hafsah, 22 Sep 2026, after running a team
   * update live: "the update check-in looks nothing like what we had here." It had sat in RECURRING,
   * so its board carried targets to add, a standard of success nobody had set, who owns what by
   * record type, dependencies read out of a sentence about MarketView, and a contribution read. An
   * update produces the question, who answered, what each person said, and where those differ.
   * That is the board. Nothing here invites the lead to set anything up.
   */
  UPDATE = 'UPDATE',
  /** Many people, one shared bar. Wide but simpler: no who-is-blocked-on-whom. */
  COHORT = 'COHORT',
  /**
   * One session, so no board. Every section a board can show reads across time.
   *
   * Its own family rather than an empty entry on an existing one, because `hasBoard` is derived
   * from whether a family has sections - so "no board" has to be a property of the family, not a
   * special case bolted onto a family that does have them.
   */
  SNAPSHOT = 'SNAPSHOT',
  /** Ramping someone in. Light board, mostly private, forward-looking. */
  ONBOARDING = 'ONBOARDING',
  /** Deciding if someone is working out. Minimal board, private report. */
  EVALUATION = 'EVALUATION',
  /**
   * A team checking in on the same work, over and over, with a target they set.
   *
   * Split out of SENSING. `recurring` and `already_underway` both route to PULSE_CHECK, so this
   * is the commonest thing anybody opens - and as a sensing scenario it got the thinnest board in
   * the product. It is not a mood read: a real one arrives with a number, named people and stated
   * evidence, which is most of what a board is for.
   *
   * Deliberately NOT the delivery thirteen. A recurring check-in has no phase spine and no
   * starting state - it starts wherever the team already is - and coverage attribution belongs to
   * one interlocking piece of work rather than a standing cadence.
   */
  RECURRING = 'RECURRING',
  /** Pulse / misalignment / crisis. NO board, ever. Report only. */
  SENSING = 'SENSING',
  /**
   * TWO SIDES OF AN AGREEMENT. Its own family, split out of SENSING.
   *
   * Both contract cards were filed under SENSING with a reason written next to them: delivery was
   * the tempting family - two sides, interlocking obligations, real handoffs - and was rejected
   * because a delivery board shows each side who is blocked on whom, and between two COMPANIES
   * that is a list of grievances rendered as a screen.
   *
   * SENSING was then expanded, correctly, so that a drift or a crisis could hold what the group
   * decided to do about it - and it gained whoOwnsWhat, dependencies and CONTRIBUTION. The two
   * contract scenarios were swept along with it. Peers are visible outside evaluation and cohort,
   * so each side of a contract would have been shown a contribution read on the other side's
   * people: the exact thing the original decision existed to prevent, arriving because the family
   * changed underneath the scenarios filed in it.
   *
   * A scenario sharing a family with another one it merely resembles is a standing hazard. This
   * family exists so the next reasonable change to SENSING cannot reach across a company boundary.
   */
  AGREEMENT = 'AGREEMENT',
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
  /* The anchor read as a project before it had a situation of its own, so its board is the same. */
  HELP_TEAM_UNDERSTAND: BoardFamily.DELIVERY,
  /* Delivery, not onboarding. A handover is two people with interlocking work and a real handoff
     between them - which is the delivery shape exactly. The successor being new is incidental. */
  ROLE_HANDOVER: BoardFamily.DELIVERY,
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

  /**
   * PULSE_CHECK IS NOT SENSING ANY MORE.
   *
   * The alternative considered was routing `recurring` to OKR_ALIGNMENT, which would have given it
   * the full delivery board. Rejected after reading the packs: OKR_ALIGNMENT asks for "your top two
   * or three objectives for this period" and "how this connects to the company direction", and its
   * end states are OKRs aligned / gaps identified. A fortnightly team check-in would have been
   * interrogated as a planning session and resolved as an OKR review. The scenario drives the
   * questions and the outcome; the FAMILY drives only the board, so the board is what changed.
   */
  PULSE_CHECK: BoardFamily.RECURRING,
  /* Same board as the other recurring read: what each person said, period after period. */
  TEAM_UPDATES: BoardFamily.UPDATE,
  /**
   * COLLECT WHAT'S OWED IS A RECURRING READ OF NAMED BILLS (release plan, Release 2). The family decides only the board's
   * sections; the switchboard (the-switchboard.ts) picks the collections board for it where Release 2 is on and that board is
   * built (Release 2, pull request 2). Until then it is drawn as the other recurring read is.
   */
  COLLECTIONS: BoardFamily.RECURRING,

  // Sensing the mood: transparency would poison these.
  /**
   * SENSING FOR BOTH CONTRACT CARDS, and it is not the obvious choice.
   *
   * Delivery was the tempting one — two sides, interlocking obligations, real handoffs. Rejected
   * because a delivery board shows each side who is blocked on whom, and between two COMPANIES that
   * is a list of grievances rendered as a screen. What makes these two situations work is each side
   * answering independently and a report that says what the accounts have in common; a shared board
   * of who owes what would be read by somebody's lawyer.
   */
  CONTRACT_REVIEW: BoardFamily.AGREEMENT,
  IMPLEMENTATION_TRACKING: BoardFamily.AGREEMENT,
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

  /**
   * A SNAPSHOT RENDERS NO BOARD, AND THAT IS NOT AN OVERSIGHT.
   *
   * Every section a board can show reads across time: the phase spine, the check-in grid, the
   * patterns, the contribution comparison. A snapshot has one session, so each of those would
   * render a column of one - a grid that looks broken rather than a grid that says "once".
   *
   * SENSING was the obvious file-it-here answer and is wrong for the same reason: its reduced set
   * still includes `patterns`, which is explicitly a read across sessions.
   *
   * It gets SENSING's MODE, though. `defaultModeFor` is a separate decision, and a one-off honest
   * read is exactly the kind of thing that stops being honest once people know it will be laid out
   * for everyone. See the mode note there.
   */
  SNAPSHOT: BoardFamily.SNAPSHOT,
  /* One session, no target, nothing to track over time - the same board shape a snapshot gets. */
  DISCOVERY: BoardFamily.SNAPSHOT,
};

/** Every board section that can exist. A family opts in per section. */
export type BoardSection =
  | 'phaseSpine'
  | 'quickRead'
  | 'objectives'
  /**
   * THE AIMS, THE PLACES AND THE THINGS, ADDED UP ACROSS EVERYBODY. See what-the-room-is-about.ts.
   *
   * `objectives` is the targets a lead SET. This is what each person said they were trying to do,
   * which on a board of forty people who set no targets between them is the whole picture and was
   * showing nowhere. Families with `whoOwnsWhat` take it: a board that already says who holds what
   * is a board where what they are each after is the next question.
   */
  | 'whatTheRoomIsAbout'
  | 'startingState'
  | 'changeSinceLast'
  | 'divergence'
  | 'whoOwnsWhat'
  | 'dependencies'
  | 'checkInGrid'
  | 'contribution'
  | 'coverage'
  /**
   * SOMETHING SITS ABOVE THIS. Rendered only when the record says so - see is-this-a-cascade.ts.
   * A family opting in means "a cascade may be shown here", never "show a tree".
   */
  | 'cascade'
  /** Somebody named as doing work here who has no account. Rendered only when the guard keeps one. */
  | 'hiddenContributors'
  | 'patterns'
  | 'decisions'
  | 'poll'
  /* The anchor scenario's own sections (decision 114; docs/anchor-scenario.md sections 11, 12, 18, 19, 23, 24). Named by the switchboard for
     that scenario alone, and drawn by the ordinary board page. See SCENARIO_SECTIONS_ADDED. */
  | 'whatYouAreCarrying'
  | 'howGroundworkWillWork'
  | 'theFourLenses'
  | 'ideasFromTheTeam'
  | 'peopleHelpingTheTeamMove'
  | 'recommendations'
  | 'weeklyInsight'
  | 'whereTheMonthIs'
  | 'whatIsMoving'
  | 'whatIsStillInTheWay'
  | 'whatTheTeamIsContributing'
  | 'wherePerspectivesDiffer'
  | 'whatGroundworkIsWorkingOnNext'
  | 'theEndOfTheMonth';

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
    'whatTheRoomIsAbout', 'whoOwnsWhat', 'dependencies', 'checkInGrid', 'contribution', 'coverage',
    'cascade', 'hiddenContributors', 'patterns', 'decisions', 'poll',
  ],
  /**
   * COHORT KEEPS ITS SECTIONS, and its board is simply not SHARED by default.
   *
   * Emptying this was my first reading of "a shared board unless it is cohort" and it was too
   * strong: it deleted a surface that had been designed with care - dependencies dropped because
   * a cohort is not one interlocking unit, and the contribution read carrying the caveat that
   * tells a lead plainly when there is no second account to check somebody against.
   *
   * `defaultModeFor` is where the rule belongs. A cohort defaults to PRIVATE, so it renders no
   * shared board; a lead who deliberately opens one as SHARED still gets the right sections.
   */
  [BoardFamily.COHORT]: [
    'phaseSpine', 'quickRead', 'objectives', 'divergence',
    'checkInGrid', 'contribution', 'cascade', 'hiddenContributors', 'patterns',
  ],
  [BoardFamily.ONBOARDING]: [
    /*
     * `quickRead` BELONGS HERE TOO, AND ITS ABSENCE HAD NO REASON WRITTEN DOWN.
     *
     * Reported as "the board is sparse", on a new-hire check-in. Delivery, cohort, retention and
     * snapshot all carry the four reads - open differences, movement on targets, what is blocked,
     * how much is document-backed - and they are the four the product's own front page shows when
     * it shows a report. Onboarding was the family that did not, with a comment explaining why
     * waiting-on was ADDED and nothing at all about this.
     *
     * They are reads about the WORK, not about the person: whether two accounts differ, whether a
     * number moved, whether somebody is blocked, whether anything is written down. Evaluation
     * still does not get them, and that one IS deliberate - a "how are they doing at a glance"
     * strip on a board about whether somebody keeps their job is a scoreboard on a person.
     */
    'quickRead',
    // WAITING-ON BELONGS HERE. Someone settling into a role is more dependent on
    // other people than they will ever be again - the sign-off, the access, the
    // decision their manager owes them. A live run recorded two real handoffs on
    // a new-hire ground and the board had nowhere to put them, so the manager's
    // own slippage was the one thing invisible on a page about the new person.
    'phaseSpine', 'objectives', 'startingState', 'changeSinceLast', 'dependencies', 'checkInGrid', 'divergence', 'contribution',
    /* What keeps coming up, on the pattern's own timing (decision 86, item 1): the person first, then the lead (request 123). */
    'patterns',
  ],
  [BoardFamily.EVALUATION]: [
    'objectives', 'checkInGrid', 'divergence',
  ],
  /**
   * SENSING NOW RENDERS A BOARD, reversing a deliberate decision, on Hafsah's instruction.
   *
   * The old rule was "sensing scenarios never render a board, even shared", and the reason
   * given was that "laying those accounts out for everyone to read undoes the candour that
   * made them worth having". That argument is real, and it is why this set is REDUCED rather
   * than the delivery thirteen: no phase spine, no objectives, no dependencies, no who-owns-what.
   * The original note was right that a delivery-shaped board "would invent structure nobody
   * described" - so this shows only what people actually said and where it differs.
   *
   * What changed the balance is that `recurring` and `already_underway` both route to
   * PULSE_CHECK, so the commonest thing anybody opens from /start landed in the one family
   * with no board at all. A manager running a fortnightly team check-in was the exact person
   * the board was built for and the only one who could not see it.
   */
  /**
   * THE REDUCED SET WAS THE MISTAKE, NOT THE MODE.
   *
   * This family held five sections: quickRead, checkInGrid, divergence, contribution, patterns. Every
   * one of them reads what people SAID. Not one of them can hold what the group decided to do about
   * it. So on a ground where a client had just left, the team could agree "get them back by Friday,
   * Ade owns the call" and the board had nowhere to put the target, nobody to attach to it, and no
   * way to show whether Friday came and went.
   *
   * The old reasoning was that a delivery-shaped board "would invent structure nobody described",
   * and that is right about PHASES - a shock has no phase one and phase two. It was wrong about the
   * rest. Every situation in this product works the same way: establish where things actually stand,
   * agree what needs to happen, then track whether it is happening. A drift, a crisis and a shock are
   * not exceptions to that - they are the cases where establishing where things stand takes the
   * longest, because the accounts disagree. What follows is the same.
   *
   * WHAT IS DELIBERATELY STILL OUT. `phaseSpine`, because these situations have no planned stages.
   * `coverage`, which reads work against a scope that was scoped in advance. `poll`, which schedules
   * a standing rhythm - a 14-day daily recovery is not a standing rhythm.
   */
  /**
   * WHAT AN AGREEMENT HOLDS, AND WHAT IT MUST NEVER HOLD.
   *
   * The terms and what has been reported against them, where the two sides read a clause
   * differently, who owes what by when, and how much of it is document-backed. That is the whole
   * job of both contract cards.
   *
   * NO contribution and NO coverage, ever. Those read how work is distributed BETWEEN PEOPLE, and
   * the people here work for two different companies. There is no shared role structure to read
   * them against, nobody has standing to be measured against anybody on the other side, and a
   * fairness read across a company boundary is a document somebody's lawyer reads.
   *
   * NO phase spine either: an agreement has versions and amendments, not phases.
   */
  [BoardFamily.AGREEMENT]: [
    'quickRead', 'objectives', 'startingState', 'divergence',
    'whatTheRoomIsAbout', 'whoOwnsWhat', 'dependencies', 'checkInGrid', 'decisions',
  ],
  [BoardFamily.SENSING]: [
    'quickRead',
    // Where things actually stand. First of the three, and the one these situations spend most of
    // their first session on, because it is the part people do not agree about.
    'startingState',
    // What needs to happen now. The section whose absence made this family unable to track anything.
    'objectives',
    'divergence',
    // Who owns each part of it, and who is waiting on whom to move. A recovery stalls on a person
    // far more often than on a plan.
    'whatTheRoomIsAbout', 'whoOwnsWhat',
    'dependencies',
    'checkInGrid', 'contribution', 'patterns',
    // What got decided along the way, so a call made on day three is on the record on day ten.
    'decisions',
  ],
  /**
   * Everything a standing cadence actually produces, and nothing it does not.
   *
   * `objectives` because a recurring check-in is where a team states its target - the live example
   * that prompted this set a quarterly number in its first session. `whoOwnsWhat` because "who
   * owns each stage" was the exact gap that same session's report flagged and had nowhere to show.
   * `dependencies` because waiting-on-somebody is what recurring work is made of. `poll` because a
   * cadence has to be scheduled.
   */
  /**
   * ONE ROUND, SO A SMALL BOARD - BUT A BOARD.
   *
   * This was deliberately empty, on the argument that a section reading across sessions would render a
   * column of one and look broken. Empty now means "no board at all", which is no longer a thing any
   * check-in may have.
   *
   * So it takes the three sections that are true of a single round and nothing else. `quickRead`
   * summarises what came back. `divergence` is exactly what independent accounts of one moment produce.
   * `checkInGrid` shows who answered, which on a one-off read is the whole question a lead has.
   *
   * WHAT IS STILL OUT, and for the same reason as everywhere else: `patterns` needs three periods,
   * `contribution` reads a run, and `objectives` cannot show a target this situation does not have.
   */
  [BoardFamily.SNAPSHOT]: ['quickRead', 'divergence', 'checkInGrid'],
  /* See the enum note. `whoOwnsWhat` is the per-person lines, headed "What each person said" on the
     page for this family; `patterns` because a standing update is the one place three periods do
     accrue. No objectives, no dependencies, no contribution, no poll: the cadence is the lead's line. */
  /*
   * TARGETS ON AN UPDATE BOARD, because a lead who has just handed the team six numbers reads this
   * page next. Left off when this family was written, 22 September 2026, and found the same evening:
   * thirteen targets on the Context page, and the board said "No target set".
   */
  [BoardFamily.UPDATE]: ['quickRead', 'objectives', 'checkInGrid', 'whoOwnsWhat', 'divergence', 'decisions', 'patterns'],
  [BoardFamily.RECURRING]: [
    'quickRead', 'objectives', 'whatTheRoomIsAbout', 'whoOwnsWhat', 'dependencies', 'checkInGrid',
    'divergence', 'contribution', 'cascade', 'hiddenContributors', 'patterns', 'decisions', 'poll',
  ],
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
/**
 * EVERY CHECK-IN HAS A BOARD. Hafsah, on being shown that mode denied one.
 *
 * This used to refuse outright when the ground was not SHARED, which made mode the thing that decided
 * whether a board existed. That is the wrong axis: every situation in this product has the same shape -
 * establish where things stand, agree what needs to happen, then track whether it is happening - and the
 * board is where the third part happens. A ground with an objective and no board has been given a target
 * it can never be read against, which is exactly the defect that left the sensing five unable to track
 * anything.
 *
 * `mode` IS NOW UNUSED AS A GATE, and that is worth stating plainly rather than leaving to be
 * discovered: it gated three things and all three were this board. The column stays - it is a stored
 * value and nothing should break it - and `defaultModeFor` still records what a ground was opened as.
 * It no longer decides what anybody can see.
 *
 * WHAT PROTECTS CANDOUR IS NOT MODE, and never really was. Raw accounts never cross to the board: only
 * six synthesised fields do (BOARD_WHITELIST), `concernFlags` is stripped for participants entirely, and
 * leadership-gap text may carry no quote and no party label. Those are the protections. Denying the
 * board denied the tracking as well, which cost more than it protected.
 *
 * THE PARAMETER IS NOW GONE TOO, and that is the second half of the same fix.
 *
 * It was kept "so every caller and test keeps compiling", which was true and cost more than it saved:
 * `mode` was threaded through this function, `sectionsFor` and `boardHasSection`, and read by none of
 * them, while eight call sites passed `ground.mode` in as though it mattered. One caller had already
 * started omitting it, which is what a meaningless argument looks like on its way to being a bug -
 * the next person to add a mode-dependent rule would have written it here and it would have done
 * nothing at all.
 *
 * A signature is a claim about what the answer depends on. This one depends on the scenario.
 */
export function boardRendersFor(scenario: GroundScenario): boolean {
  /**
   * DEFENSIVE ON PURPOSE, and this is not paranoia - removing the mode gate above found it.
   *
   * `if (mode !== SHARED) return false` used to run first, so for every non-shared check-in this lookup
   * never happened. Take the gate away and an unrecognised scenario - a value from a mock, a row written
   * before an enum member existed, anything not in SCENARIO_FAMILY - throws instead of answering. Three
   * privacy tests failed on exactly that, which is a bad way to find out.
   *
   * No sections means no board, which is the right answer for a situation the product cannot lay out.
   */
  const sections = FAMILY_SECTIONS[familyFor(scenario)];
  return !!sections && sections.length > 0;
}

/**
 * A ONE-ROUND READ DOES NOT WEAR A RECURRING BOARD.
 *
 * Read live, 22 September 2026, on a check-in set up to ask twenty-four organisations one question:
 * the board carried "who owns what" per person, a success standard nobody had set, an empty "what
 * we are aiming for" inviting the lead to add targets, and a patterns section that needs three
 * periods. Every one of those reads across rounds, and there is one round.
 *
 * The family says what a SITUATION holds. This says what a single round can actually show, which is
 * the same three things the snapshot family holds: what came back, where independent accounts of one
 * moment differ, and who answered. A run that later gets more rounds gets its own sections back,
 * because this is read from the planned count rather than stored anywhere.
 */
export const WHAT_ONE_ROUND_CAN_SHOW: BoardSection[] = ['quickRead', 'divergence', 'checkInGrid'];

export function sectionsForARunOf(scenario: GroundScenario, roundsPlanned: number | null): BoardSection[] {
  const all = sectionsFor(scenario);
  if (roundsPlanned !== 1) return all;
  return all.filter((s) => (WHAT_ONE_ROUND_CAN_SHOW as string[]).includes(s));
}

/**
 * THE SWITCHBOARD'S ROWS THAT BELONG TO ONE SCENARIO, ON TOP OF ITS FAMILY'S (decision 114). The anchor is a scenario like the others: it keeps the
 * delivery family's board and adds the sections docs/anchor-scenario.md names, and the ordinary board payload carries them under these names. A
 * scenario with no row here has exactly its family's sections.
 */
export const SCENARIO_SECTIONS_ADDED: Partial<Record<GroundScenario, BoardSection[]>> = {
  HELP_TEAM_UNDERSTAND: ['whatYouAreCarrying', 'howGroundworkWillWork', 'theFourLenses', 'ideasFromTheTeam', 'peopleHelpingTheTeamMove', 'recommendations', 'weeklyInsight', 'whereTheMonthIs', 'whatIsMoving', 'whatIsStillInTheWay', 'whatTheTeamIsContributing', 'wherePerspectivesDiffer', 'whatGroundworkIsWorkingOnNext', 'theEndOfTheMonth'],
};

export function sectionsFor(scenario: GroundScenario): BoardSection[] {
  if (!boardRendersFor(scenario)) return [];
  return [...(FAMILY_SECTIONS[familyFor(scenario)] ?? []), ...(SCENARIO_SECTIONS_ADDED[scenario] ?? [])];
}

export function boardHasSection(scenario: GroundScenario, section: BoardSection): boolean {
  return sectionsFor(scenario).includes(section);
}

/**
 * WHICH SITUATIONS OPEN PRIVATE, AND WHY SENSING IS NOT ONE OF THEM ANY MORE.
 *
 * This comment used to say the opposite of the code beneath it: "scenarios that must default to PRIVATE
 * at creation - the SENSING family's whole value is that nobody sees who said what". The function has
 * returned SHARED for everything but COHORT for some time, so the stated rule and the behaviour
 * disagreed, and nothing reconciled them.
 *
 * THE CODE IS THE RIGHT HALF, and the reason is structural rather than a preference. A PRIVATE ground
 * renders no board at all - `boardRendersFor` requires SHARED - and the board is where an objective and
 * the work against it are tracked. Every situation in this product has the same shape: establish where
 * things stand, agree what needs to happen, then track whether it is happening. Defaulting a drift or a
 * shock to private would give it an objective it could never read against, which is the failure that
 * made those five situations unable to track anything in the first place.
 *
 * THE CANDOUR ARGUMENT IS REAL AND IS ANSWERED ELSEWHERE. Laying out who said what would undo the
 * honesty that made the accounts worth having - which is why the board never shows raw accounts. Only
 * six synthesised fields cross (BOARD_WHITELIST), `concernFlags` is stripped for participants entirely,
 * and the leadership-gap text may carry no quote and no party label at all. Those are the protections;
 * mode is not one of them.
 *
 * COHORT STAYS PRIVATE for a different reason, unchanged: its people do not work together, so laying
 * their accounts side by side compares strangers rather than colleagues.
 *
 * SNAPSHOT STAYS PRIVATE because it has one round and no board to render - see its note below.
 */
export function defaultModeFor(scenario: GroundScenario): GroundMode {
  /**
   * One rule, stated once: shared unless it is a cohort.
   *
   * Mode is fixed at creation - nothing in the codebase updates it - so changing this default
   * cannot expose anybody who has already checked in. Every existing sensing ground stays
   * PRIVATE and stays boardless, which is what its participants were promised.
   */
  const family = familyFor(scenario);
  /**
   * A SNAPSHOT IS PRIVATE, on the same reasoning that made COHORT private.
   *
   * It has one round and no board, so SHARED would buy nothing structural - and it would cost the
   * only thing the read has going for it. A person giving a five-minute answer they know will be
   * laid out for the whole team writes a different answer, and there is no second session in which
   * a more honest one could arrive.
   */
  if (family === BoardFamily.SNAPSHOT) return GroundMode.PRIVATE;
  return family === BoardFamily.COHORT ? GroundMode.PRIVATE : GroundMode.SHARED;
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
  /* How each agreement is known (week 6b), beside the agreements themselves. A mark, never a rating. */
  'agreementMarks',
  'divergences',
  'centralQuestion',
  'engagement',
  // A gap between two accounts, produced by the synthesis under a rule that
  // forbids quoting either side or naming who said what. Board-safe by
  // construction, which is why it may cross where the raw accounts may not.
  'leadershipGaps',
  /**
   * SOMEBODY CARRYING WORK WHO HAS NO ACCOUNT HERE.
   *
   * The one read that names a person OUTSIDE the check-in, which is why it crosses under its own
   * guard rather than on the whitelist alone - see somebody-carrying-work-with-no-account.ts. Rows
   * that quote anybody, name a party, or were worked out rather than referenced are dropped before
   * this field is sent, on the same footing as a leadership gap containing a quotation.
   *
   * It belongs on the board rather than a report because it reads a run: who has been carrying
   * work quietly is not visible in one sitting. And it belongs on a SHARED surface because the
   * point of it is that the team is depending on somebody who cannot correct a record they are not
   * in - which is not a thing to tell only the lead.
   */
  'hiddenContributors',
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
