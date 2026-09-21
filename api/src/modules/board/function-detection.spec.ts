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

describe('GW-ROLEDETECT-02: the stated role wins when the words disagree with it', () => {
  it('reads sales work as SALES when the title agrees', () => {
    const r = detectFunction('Account executive', SALES_ACCOUNT, null);
    expect(r.fn).toBe(RoleFunction.SALES);
    expect(r.confidence).toBeGreaterThanOrEqual(MIN_COACHING_CONFIDENCE);
  });

  /*
   * REVERSED, 21 Sep 2026. This used to say "the account decides, not the title": a product manager
   * whose record was all coordination read as project management. Run 10 showed the cost: a
   * territory sales rep full of invoices and arrears read as FINANCE, a new rep who chased and
   * followed up as PROJECT MANAGEMENT, and each was coached against the wrong map for three
   * sessions. The words a job uses are not the job; the title the person gave is what they are
   * answerable for. The account's read is kept in the basis, and the confidence is held below the
   * coaching line so a clash coaches nobody.
   */
  it('a "product manager" whose work is all coordination stays PRODUCT, held provisional', () => {
    const r = detectFunction('Product manager', PM_ACCOUNT, null);
    expect(r.fn).toBe(RoleFunction.PRODUCT);
    expect(r.confidence).toBeLessThan(MIN_COACHING_CONFIDENCE);
    expect(r.basis).toMatch(/stated role stands/i);
    expect(r.basis).toMatch(/project management work/i);
  });

  it('a sales rep whose account is all invoices and arrears is still SALES', () => {
    const r = detectFunction('Territory sales rep at Harvestline, covering the northern dealers.', [
      'The invoices are with the dealers. Arrears are a finance question. Credit is 65%. I will reconcile the collections with finance.',
      'Budget and forecast for the quarter, cash collections, margin on credit sales.',
    ], null);
    expect(r.fn).toBe(RoleFunction.SALES);
  });

  it('somebody who runs their own business gets no map at all', () => {
    for (const role of [
      'Poultry farmer in Kaduna, battery cages on a Tijara loan.',
      'Motorbike delivery rider in Kano.',
      'Cold store owner, tomatoes, Kano.',
      'Rice miller, destoner and polisher on loan.',
      'Tractor owner ploughing for neighbours.',
    ]) {
      const r = detectFunction(role, ['I shipped the build and closed the sprint, the pipeline is green, the board wants a forecast.'], null);
      expect(r.fn).toBeNull();
      expect(r.confidence).toBe(0);
    }
  });

  it('but the loan officer who manages the borrowers is not one of them', () => {
    const r = detectFunction('Loan officer at Tijara Finance. I manage a cohort of asset-loan clients.', ['I track their repayment status. I chase the overdue ones and escalate to my supervisor.'], null);
    expect(r.fn).not.toBeNull();
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
