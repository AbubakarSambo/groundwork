import { readFileSync } from 'fs';
import { join } from 'path';
import { GroundMode, GroundScenario } from '@prisma/client';
import {
  BoardFamily,
  BOARD_FORBIDDEN,
  BOARD_WHITELIST,
  boardRendersFor,
  defaultModeFor,
  familyFor,
  FAMILY_SECTIONS,
  pickBoardSafeReportFields,
  SCENARIO_FAMILY,
  sectionsFor,
} from './board-families';

/**
 * GW-BOARD-MODE tripwires. These are the two guards the design says must bite,
 * plus the whitelist that keeps report-only content off a shared surface.
 *
 * 1. A PRIVATE ground can NEVER render a board. If it could, someone who checked
 *    in believing their account was private would have it exposed.
 * 2. EVERY CHECK-IN RENDERS A BOARD. This used to be the opposite - first "sensing never renders one",
 *    then "a private one never does" - and both were the same mistake: mode and family deciding whether
 *    the board EXISTS. Every situation in this product has one shape, establish then agree then track,
 *    and the board is where the tracking happens. A check-in with an objective and no board has been
 *    given a target it can never be read against.
 * 3. Only whitelisted report fields cross to the board. Arc signals, the trust
 *    analysis and anything lead-only never do. THIS is what protects candour, and it always was: raw
 *    accounts never cross, concernFlags is stripped for participants, and leadership-gap text may carry
 *    no quote and no party label. Denying the board denied the tracking too, which cost more.
 *
 * If any of these regress, the failure is not cosmetic - it is the product
 * breaking the promise it made to the person who checked in.
 */

const ALL_SCENARIOS = Object.values(GroundScenario);

describe('GW-BOARD-MODE-01: every check-in renders a board, whatever its mode', () => {
  /**
   * REVERSED, ON HAFSAH'S INSTRUCTION: "all grounds have a board."
   *
   * This asserted the opposite for every scenario - PRIVATE meant no board at all. That made mode the
   * thing that decided whether a board existed, and mode gated nothing else: all three of its uses were
   * this one board. So a check-in opened private got an objective it could never be tracked against,
   * which is the defect that left the sensing five unable to track anything.
   *
   * The privacy promise is kept by the whitelist below, not by withholding the surface.
   */
  it.each(ALL_SCENARIOS)('%s renders a board whatever it was opened as', (scenario) => {
    expect(boardRendersFor(scenario)).toBe(true);
    expect(sectionsFor(scenario).length).toBeGreaterThan(0);
  });

  it('and mode CANNOT make a difference, because it is no longer an input', () => {
    /**
     * This used to call `boardRendersFor(scenario, PRIVATE)` and `(scenario, SHARED)` and assert the
     * two agreed. They always did - the parameter was read by nothing - so the test was checking that
     * a value which could not be used was not used.
     *
     * The parameter is gone now, so the old assertion cannot even be written, which is the stronger
     * statement. What is left to protect is the SIGNATURE: the moment `mode` reappears as an argument
     * here, a reader is entitled to believe it decides something, and the next mode-dependent rule
     * gets written into a function that ignores it.
     */
    /** Comments stripped first, per the C-10 ratchet: this file's own prose names these signatures. */
    const src = readFileSync(join(__dirname, 'board-families.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    expect(src).toMatch(/export function boardRendersFor\(scenario: GroundScenario\): boolean/);
    expect(src).toMatch(/export function sectionsFor\(scenario: GroundScenario\): BoardSection\[\]/);
    expect(src).toMatch(/export function boardHasSection\(scenario: GroundScenario, section: BoardSection\)/);
  });
});

describe('GW-BOARD-MODE-02: a cohort still OPENS private, and reads differently', () => {
  /**
   * THIS GUARD REPLACES THE ONE IT INHERITED, AND THE SWAP IS THE POINT.
   *
   * It used to say "sensing-family scenarios never render a board, even shared", because laying
   * those accounts out for everyone "undoes the candour that made them worth having". The rule is
   * now Hafsah's: a shared board everywhere unless it is a cohort.
   *
   * The exception moved because the populations are different. A sensing ground is a team that
   * works together and already talks. A cohort is many people measured against one bar who mostly
   * have never met - so a shared surface publishes one person's probation to a room of strangers.
   * That is the case worth protecting, and it is the only one.
   */
  const cohort = ALL_SCENARIOS.filter((sc) => familyFor(sc) === BoardFamily.COHORT);

  it('the cohort family is not empty (otherwise this test proves nothing)', () => {
    expect(cohort.length).toBeGreaterThan(0);
    expect(cohort).toContain(GroundScenario.COHORT_CHECK);
  });

  it.each(cohort)('%s is never SHARED by default, so no cohort board is shared by accident', (scenario) => {
    /**
     * The rule lives in the DEFAULT MODE, not in the section list. Emptying the sections was my
     * first attempt and it deleted a carefully built surface, including the caveat that tells a
     * lead when there is no second account to read somebody against.
     */
    /**
     * THE SECOND HALF IS GONE, NOT WEAKENED. It asserted that a cohort's board did not render because
     * the mode was private, and mode no longer decides that - every check-in has a board.
     *
     * What survives is the part that was always the real rule: a cohort OPENS private. Its people do not
     * work together, so who reads it is a genuine question even now that a board exists. And the section
     * list stays distinct - no dependencies, because a cohort is not one interlocking piece of work.
     */
    expect(defaultModeFor(scenario)).toBe(GroundMode.PRIVATE);
    expect(sectionsFor(scenario)).not.toContain('dependencies');
  });

  it.each(cohort)('%s defaults to PRIVATE mode at creation', (scenario) => {
    expect(defaultModeFor(scenario)).toBe(GroundMode.PRIVATE);
  });

  it('and every OTHER family does render a shared board', () => {
    /**
     * The other half of the rule, which the old guard had no reason to state.
     *
     * SNAPSHOT IS THE SECOND EXCEPTION, alongside COHORT. It has one session, so every section a
     * board can show - the phase spine, the check-in grid, the patterns, the contribution
     * comparison - would render a column of one and read as broken rather than as "once". And it is
     * PRIVATE for the reason that makes a one-off read worth taking at all: somebody giving a
     * five-minute answer they know will be laid out for the whole team writes a different answer,
     * and there is no later session in which a franker one could arrive.
     *
     * This is skipped by FAMILY rather than by scenario name on purpose, so the exception is a
     * property of "has no sections" and not a list somebody has to remember to extend.
     */
    for (const scenario of ALL_SCENARIOS) {
      const family = familyFor(scenario);
      if (family === BoardFamily.COHORT || family === BoardFamily.SNAPSHOT) continue;
      expect(defaultModeFor(scenario)).toBe(GroundMode.SHARED);
      expect(boardRendersFor(scenario)).toBe(true);
      expect(sectionsFor(scenario).length).toBeGreaterThan(0);
    }
  });

  it('a sensing board is still not delivery-shaped', () => {
    /**
     * The surviving half of the old argument, now correctly scoped.
     *
     * It used to forbid `objectives`, `dependencies` and `whoOwnsWhat` here on the grounds that
     * "nobody stated them". That is true of the FIRST session and false of every one after it: the
     * team agrees what it is trying to achieve and who owns which part, and then those sections are
     * exactly what the run is read against. Forbidding them is what made these five situations
     * unable to track anything.
     *
     * `phaseSpine` and `poll` remain forbidden, and those are the real structural inventions: a
     * shock has no planned stages, and a recovery is not a standing rhythm to be booked.
     */
    const s = FAMILY_SECTIONS[BoardFamily.SENSING];
    expect(s.length).toBeGreaterThan(0);
    for (const invented of ['phaseSpine', 'poll']) {
      expect(s).not.toContain(invented);
    }
    expect(s).toContain('divergence');
    expect(s).toContain('checkInGrid');
  });
});

describe('GW-BOARD-MODE-03: every scenario is mapped, so a new one cannot silently get a full board', () => {
  it.each(ALL_SCENARIOS)('%s has an explicit family', (scenario) => {
    expect(SCENARIO_FAMILY[scenario]).toBeDefined();
    expect(Object.values(BoardFamily)).toContain(SCENARIO_FAMILY[scenario]);
  });
});

describe('GW-BOARD-MODE-04: family shapes match the design', () => {
  it('delivery gets the full board including dependencies', () => {
    const s = FAMILY_SECTIONS[BoardFamily.DELIVERY];
    expect(s).toContain('dependencies');
    expect(s).toContain('coverage');
    expect(s).toContain('poll');
  });

  it('cohort keeps its shape: wide, but no dependencies and no poll', () => {
    const s = FAMILY_SECTIONS[BoardFamily.COHORT];
    expect(s).toContain('checkInGrid');
    expect(s).toContain('contribution');
    expect(s).not.toContain('dependencies');
    expect(s).not.toContain('poll');
  });

  it('a recurring check-in gets a real board, but invents no structure it does not have', () => {
    /**
     * Added because a bite-check found nothing held this. Giving RECURRING a phase spine and a
     * starting state passed the whole suite, which means the reasoning for the set lived only in a
     * comment - and a comment is not a guard.
     *
     * A standing cadence starts wherever the team already is, so it has no phases and no defined
     * starting state, and coverage attribution belongs to one interlocking piece of work rather
     * than a repeating check-in.
     */
    const s = FAMILY_SECTIONS[BoardFamily.RECURRING];
    for (const invented of ['phaseSpine', 'startingState', 'coverage']) {
      expect(s).not.toContain(invented);
    }
    /** And it must carry the four that prompted the split. */
    for (const earned of ['objectives', 'whoOwnsWhat', 'dependencies', 'poll']) {
      expect(s).toContain(earned);
    }
    /**
     * WAS A LENGTH COMPARISON AGAINST SENSING, WHICH STOPPED MEANING ANYTHING. It asserted recurring
     * held more sections than sensing, encoding "recurring is the richer board". Once sensing gained
     * the sections it needed to hold an objective the two came out the same size, and the test failed
     * having found nothing wrong.
     *
     * Size was never the difference. This is: a standing rhythm has to be scheduled and starts
     * wherever the team already is, so it takes `poll` and refuses `startingState`. A drift or a
     * shock has one disputed present to establish and no rhythm to book, so it takes `startingState`
     * and refuses `poll`.
     */
    const sensing = FAMILY_SECTIONS[BoardFamily.SENSING];
    expect(s).toContain('poll');
    expect(sensing).not.toContain('poll');
    expect(sensing).toContain('startingState');
    expect(s).not.toContain('startingState');
    expect(s.length).toBeLessThan(FAMILY_SECTIONS[BoardFamily.DELIVERY].length);
  });

  it('a recurring check-in is the family PULSE_CHECK belongs to', () => {
    expect(familyFor(GroundScenario.PULSE_CHECK)).toBe(BoardFamily.RECURRING);
    /** The sensing five stay sensing. Only the recurring one moved. */
    for (const sc of [GroundScenario.DRIFT, GroundScenario.ACUTE_SHOCK, GroundScenario.CRISIS_ALIGNMENT,
                      GroundScenario.OPEN_READ, GroundScenario.REALIGN_TEAM]) {
      expect(familyFor(sc)).toBe(BoardFamily.SENSING);
    }
  });

  it('evaluation collapses to objectives, check-ins and divergence only', () => {
    expect(FAMILY_SECTIONS[BoardFamily.EVALUATION].sort()).toEqual(
      ['checkInGrid', 'divergence', 'objectives'].sort(),
    );
  });

  it('onboarding is light and forward-looking - no coverage read on a new person', () => {
    const s = FAMILY_SECTIONS[BoardFamily.ONBOARDING];
    expect(s).toContain('objectives');
    // Still no coverage. "Your work is landing with other people" is a
    // meaningless thing to say about someone in their first month, and a
    // damaging one.
    expect(s).not.toContain('coverage');
  });

  it('BUT onboarding DOES show what people are waiting on', () => {
    // This reverses the original shape, on evidence. A person settling into a
    // role is more dependent on other people than they will ever be again - the
    // sign-off, the access, the decision their manager owes them. A live
    // new-hire ground recorded two real handoffs and the board had nowhere to
    // put them, so the manager's own slippage was the one thing invisible on a
    // page about the new person.
    expect(FAMILY_SECTIONS[BoardFamily.ONBOARDING]).toContain('dependencies');
  });

  it('sensing can hold an objective and track it, and still invents no phases', () => {
    /**
     * THE OLD SET COULD NOT TRACK ANYTHING. It was quickRead, checkInGrid, divergence, contribution,
     * patterns - five sections that all read what people SAID, and not one that could hold what the
     * group decided to do about it. On a ground opened because a client had just left, the team could
     * agree "get them back by Friday, Ade owns the call" and the board had nowhere to put the target,
     * nobody to attach to it, and no way to show whether Friday came and went.
     *
     * Every situation in this product has the same shape: work out where things stand, agree what
     * needs to happen, then track whether it is happening. A drift, a crisis and a shock are not
     * exceptions - they are the cases where the first part takes longest, because the accounts
     * disagree. What follows is the same as everywhere else.
     *
     * WHAT STAYS OUT, which is the half of the original argument that was right: no `phaseSpine`,
     * because these situations have no planned stages; no `coverage`, which reads work against a
     * scope defined in advance; no `poll`, which schedules a standing rhythm.
     */
    const s = FAMILY_SECTIONS[BoardFamily.SENSING];
    for (const earned of ['startingState', 'objectives', 'whoOwnsWhat', 'dependencies', 'decisions']) {
      expect(s).toContain(earned);
    }
    for (const invented of ['phaseSpine', 'coverage', 'poll']) {
      expect(s).not.toContain(invented);
    }
  });

  it('NEW_HIRE is onboarding, not evaluation - ramping in is a different situation from deciding if someone works out', () => {
    expect(familyFor(GroundScenario.NEW_HIRE)).toBe(BoardFamily.ONBOARDING);
    expect(familyFor(GroundScenario.PIP)).toBe(BoardFamily.EVALUATION);
  });
});

describe('GW-BOARD-MODE-05: the whitelist keeps report-only content off the board', () => {
  it('forbidden fields are never in the whitelist', () => {
    for (const forbidden of BOARD_FORBIDDEN) {
      expect(BOARD_WHITELIST as readonly string[]).not.toContain(forbidden);
    }
  });

  it('pickBoardSafeReportFields drops everything not whitelisted (tripwire)', () => {
    const report: Record<string, any> = {
      sharedPicture: 'the picture',
      agreements: ['a'],
      divergences: ['d'],
      centralQuestion: 'q',
      engagement: { coverage: 'good' },
      // None of these may ever cross to a surface the whole team reads.
      arcSignals: { p1: { tier: 'CONCENTRATED_FINISH' } },
      arcAdvisories: [{ participantId: 'p1' }],
      finalSynthesis: { secret: true },
      inferences: [{ id: 'i1', text: 'inferred' }],
    };
    const safe = pickBoardSafeReportFields(report);
    expect(safe.sharedPicture).toBe('the picture');
    expect(safe.divergences).toEqual(['d']);
    for (const forbidden of BOARD_FORBIDDEN) {
      expect(safe).not.toHaveProperty(forbidden);
    }
  });
});
