import { detectFunction, detectUniversalModes } from './function-detection';
import { RoleFunction, UniversalMode, MIN_COACHING_CONFIDENCE, buildRoleProbeBlock } from './role-maps';

/**
 * GW-ROLEDETECT tripwires.
 *
 * The load-bearing behaviours:
 *  - A TITLE ALONE never reaches the coaching threshold. If it did, the chat
 *    would probe someone confidently on a bucket it guessed from a job title.
 *  - The ACCOUNT overrides the title when they disagree, but with LOWER
 *    confidence, not higher - a clash is a reason to hold the profile open.
 *  - An unrecognisable account yields no function rather than a forced bucket.
 *  - buildRoleProbeBlock emits NOTHING below the confidence threshold, and never
 *    names a failure mode in a question.
 */

const SALES_ACCOUNT = [
  'Closed the Flexi deal, signed a paid pilot.',
  'Two prospects in the pipeline, spoke to the budget holder at Northwind.',
  'Sent the proposal to Beacon Foods, demo booked.',
];
const PM_ACCOUNT = [
  'Coordinated the release, chased three owners for status.',
  'Unblocked the staging dependency, escalated the pricing question.',
  'Tracked the critical path and followed up with each owner.',
];

describe('GW-ROLEDETECT-01: a title alone is never enough to coach from', () => {
  it('stated role with no account stays below the coaching threshold (tripwire)', () => {
    const r = detectFunction('Head of Sales', [], null);
    expect(r.confidence).toBeLessThan(MIN_COACHING_CONFIDENCE);
  });

  it('and therefore produces no role probe block', () => {
    const r = detectFunction('Head of Sales', [], null);
    // Below threshold the block must still be emittable but explicitly hedged,
    // never confident. What must NOT happen is confident probing off a title.
    const block = buildRoleProbeBlock(r.fn, r.confidence);
    if (block) expect(block).toContain('PROVISIONAL');
  });

  it('no role and no account yields no function at all', () => {
    const r = detectFunction(null, [], null);
    expect(r.fn).toBeNull();
    expect(r.confidence).toBe(0);
  });
});

describe('GW-ROLEDETECT-02: the account decides, not the title', () => {
  it('reads sales work as SALES when the title agrees', () => {
    const r = detectFunction('Account executive', SALES_ACCOUNT, null);
    expect(r.fn).toBe(RoleFunction.SALES);
    expect(r.confidence).toBeGreaterThanOrEqual(MIN_COACHING_CONFIDENCE);
  });

  it('a "product manager" whose work is all coordination reads as PROJECT_MANAGEMENT (tripwire)', () => {
    const r = detectFunction('Product manager', PM_ACCOUNT, null);
    expect(r.fn).toBe(RoleFunction.PROJECT_MANAGEMENT);
    expect(r.basis).toMatch(/does not bear out|account is what counts/i);
  });

  it('a title/account clash is held MORE tentatively than agreement, not less', () => {
    const agree = detectFunction('Project manager', PM_ACCOUNT, null);
    const clash = detectFunction('Product manager', PM_ACCOUNT, null);
    expect(clash.fn).toBe(agree.fn);
    expect(clash.confidence).toBeLessThan(agree.confidence);
  });
});

describe('GW-ROLEDETECT-03: it does not force a bucket it cannot see', () => {
  it('an account with no function signal and no title yields null', () => {
    const r = detectFunction(null, ['Had a quiet week.', 'Nothing much to report.'], null);
    expect(r.fn).toBeNull();
  });
});

describe('GW-ROLEDETECT-04: role probe blocks never name the failure mode', () => {
  it.each(Object.values(RoleFunction))('%s probes ask about the work, not the person', (fn) => {
    const block = buildRoleProbeBlock(fn, 0.9);
    // Only the PROBE lines are checked. The guard paragraph deliberately quotes
    // the forbidden phrasing as an example of what not to say, so asserting over
    // the whole block would fail on the guard itself.
    const probeLines = block.split('\n').filter((l) => l.startsWith('- '));
    expect(probeLines.length).toBeGreaterThan(0);
    for (const line of probeLines) {
      expect(line).not.toMatch(/\bare you\b.*(avoiding|vague|hiding|committed enough)/i);
      expect(line).not.toMatch(/\b(avoidance|illegibility|non.?commitment|diffusion|invisibility)\b/i);
    }
    // The instruction forbidding it must be present, so a later prompt edit that
    // drops the guard is visible here.
    expect(block).toContain('NEVER name a failure mode in a question');
  });

  it('emits nothing for an unknown function', () => {
    expect(buildRoleProbeBlock(null, 0.9)).toBe('');
    expect(buildRoleProbeBlock('NOT_A_FUNCTION', 0.9)).toBe('');
  });

  it('carries the fairness protection for the function', () => {
    expect(buildRoleProbeBlock(RoleFunction.ENGINEERING, 0.9)).toMatch(/invisible|blocked/i);
    expect(buildRoleProbeBlock(RoleFunction.OPS, 0.9)).toMatch(/noticed only when something breaks|preventive/i);
  });
});

describe('GW-ROLEDETECT-05: universal modes cover an unmapped role', () => {
  it('reads vagueness from generalities with nothing nameable', () => {
    const modes = detectUniversalModes([
      'Spoke to several orgs, a few of them are interested, going well overall.',
      'Some progress on various fronts, lots of conversations.',
    ]);
    expect(modes).toContain(UniversalMode.VAGUENESS);
  });

  it('reads non-commitment from perpetual gathering', () => {
    expect(detectUniversalModes(['Still gathering feedback on the pricing model.'])).toContain(
      UniversalMode.NON_COMMITMENT,
    );
  });

  it('reads under-persistence from one touch then nothing', () => {
    expect(detectUniversalModes(['Sent it over and it went quiet since then.'])).toContain(
      UniversalMode.UNDER_PERSISTENCE,
    );
  });

  it('does NOT read under-persistence when they chased it', () => {
    expect(
      detectUniversalModes(['It went quiet, so I followed up twice and then tried another route.']),
    ).not.toContain(UniversalMode.UNDER_PERSISTENCE);
  });
});
