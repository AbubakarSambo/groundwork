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
 * 2. A SENSING-family scenario (pulse, drift, crisis, realign, acute shock) never
 *    renders a board even in shared mode. Laying those accounts out for everyone
 *    to read undoes the candour that made them worth having.
 * 3. Only whitelisted report fields cross to the board. Arc signals, the trust
 *    analysis and anything lead-only never do.
 *
 * If any of these regress, the failure is not cosmetic - it is the product
 * breaking the promise it made to the person who checked in.
 */

const ALL_SCENARIOS = Object.values(GroundScenario);

describe('GW-BOARD-MODE-01: a private ground never renders a board', () => {
  it.each(ALL_SCENARIOS)('%s in PRIVATE mode renders no board', (scenario) => {
    expect(boardRendersFor(scenario, GroundMode.PRIVATE)).toBe(false);
    expect(sectionsFor(scenario, GroundMode.PRIVATE)).toEqual([]);
  });
});

describe('GW-BOARD-MODE-02: sensing-family scenarios never render a board, even shared', () => {
  const sensing = ALL_SCENARIOS.filter((s) => familyFor(s) === BoardFamily.SENSING);

  it('the sensing family is not empty (otherwise this test proves nothing)', () => {
    expect(sensing.length).toBeGreaterThan(0);
    // These specific ones are the ones the design names explicitly.
    expect(sensing).toEqual(
      expect.arrayContaining([
        GroundScenario.PULSE_CHECK,
        GroundScenario.REALIGN_TEAM,
        GroundScenario.CRISIS_ALIGNMENT,
      ]),
    );
  });

  it.each(sensing)('%s renders no board even in SHARED mode', (scenario) => {
    expect(boardRendersFor(scenario, GroundMode.SHARED)).toBe(false);
  });

  it.each(sensing)('%s defaults to PRIVATE mode at creation', (scenario) => {
    expect(defaultModeFor(scenario)).toBe(GroundMode.PRIVATE);
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

  it('cohort is wide but drops dependencies (not one interlocking unit)', () => {
    const s = FAMILY_SECTIONS[BoardFamily.COHORT];
    expect(s).toContain('checkInGrid');
    expect(s).not.toContain('dependencies');
    expect(s).not.toContain('poll');
  });

  it('evaluation collapses to objectives, check-ins and divergence only', () => {
    expect(FAMILY_SECTIONS[BoardFamily.EVALUATION].sort()).toEqual(
      ['checkInGrid', 'divergence', 'objectives'].sort(),
    );
  });

  it('onboarding is light and forward-looking, no coverage read on a new person', () => {
    const s = FAMILY_SECTIONS[BoardFamily.ONBOARDING];
    expect(s).toContain('objectives');
    expect(s).not.toContain('coverage');
    expect(s).not.toContain('dependencies');
  });

  it('sensing has no sections at all', () => {
    expect(FAMILY_SECTIONS[BoardFamily.SENSING]).toEqual([]);
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
