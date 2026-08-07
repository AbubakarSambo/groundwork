import { buildContribution, buildCoverage } from './reads';
import { CoverageKind } from './coverage';
import { COHORT_PROBATION, COHORT_TRUTH } from './__fixtures__/cohort-probation';
import { findWaitingBehind } from '../reports/deferrals';

/**
 * A COHORT WHERE NOBODY WORKS TOGETHER, AND THE PERIOD DECIDES SOMEONE'S JOB.
 *
 * The fairness reads on the board are all built on colleagues describing each
 * other. This fixture removes that: four clinic managers, four separate clinics,
 * four different towns, one shared trainer. None of them can credit or cover for
 * any other, because none of them ever sees another's work.
 *
 * That turned out to break the protection for the quiet contributor in the worst
 * possible way. The guard works by noticing that OTHERS keep crediting someone
 * whose own account has gone modest - so it reads the absence of credit as
 * evidence. Where crediting is impossible, absence of credit means nothing, and
 * the guard fails open on everybody.
 *
 * Run against this fixture before the fix, the board said of the manager who
 * finished all fourteen modules and was signed off unsupervised:
 *
 *   "6 check-ins in a row added nothing specific to the record, and nothing is
 *    blocking them. The work has not stopped existing, so it is worth asking
 *    where it is going."
 *
 * It said the same of the trainer, whose job is training rather than clinic
 * output. On a ground that decides whether people keep their jobs, that is the
 * most damaging sentence this product could produce.
 *
 * These tests exist so it cannot come back.
 */

const name = (id: string) => COHORT_TRUTH.find((t) => t.key === id)?.name ?? id;
const coverage = () => buildCoverage(COHORT_PROBATION, name).reads;
const contribution = () => buildContribution(COHORT_PROBATION, name);
const find = <T extends { name: string | null }>(rows: T[], key: string) => rows.find((r) => r.name === name(key))!;

describe('the fixture describes the situation it claims to', () => {
  it('has nobody crediting anybody, because nobody can see anyone else work', () => {
    expect(COHORT_PROBATION.mentions.some((m) => m.kind === 'CREDIT')).toBe(false);
    expect(COHORT_PROBATION.mentions.some((m) => m.kind === 'COVERAGE')).toBe(false);
  });

  it('has the only honest cross-person link: managers naming the shared trainer', () => {
    const blocked = COHORT_PROBATION.mentions.filter((m) => m.kind === 'BLOCKED_BY');
    expect(blocked.length).toBeGreaterThan(0);
    expect(new Set(blocked.map((m) => m.aboutParticipantId))).toEqual(new Set(['hafsah']));
  });

  it('runs long enough for every three-period rule to be reachable', () => {
    expect(new Set(COHORT_PROBATION.checkIns.map((c) => c.sessionNumber)).size).toBe(12);
  });
});

describe('nobody is accused of losing work that had nowhere to go', () => {
  it.each(COHORT_TRUTH.filter((t) => t.mustNotBeFlagged).map((t) => t.key))(
    'never reads %s as their work landing elsewhere',
    (key) => {
      const r = find(coverage(), key);
      const truth = COHORT_TRUTH.find((t) => t.key === key)!;
      if (r.kind === CoverageKind.LEAKING) {
        throw new Error(
          `The board reads ${truth.name} as ${r.kind} on a probation ground, which is false.\n` +
            `TRUTH: ${truth.truth}\n` +
            `BOARD SAID: ${r.what}`,
        );
      }
    },
  );

  it('says nothing about work moving, because there is nowhere for it to move to', () => {
    // Every one of the four works alone. A coverage read here could only ever be
    // invented, so the honest output is that nothing was found.
    for (const r of coverage()) expect(r.kind).toBe(CoverageKind.STABLE);
  });

  it('does not let a quiet stretch make the read about it more certain', () => {
    // It used to: the quiet run was counted as evidence, so the less someone
    // said, the more confident the board became about what their silence meant.
    const quiet = find(coverage(), 'kavon');
    const busy = find(coverage(), 'adam');
    expect(quiet.confidence).toBeLessThanOrEqual(busy.confidence!);
  });
});

describe('the person the concern is actually correct about still surfaces', () => {
  it('says plainly that nothing in twelve sessions could be checked', () => {
    const r = find(contribution(), 'kavon');
    expect(r.reason).toMatch(/Nothing named so far could be checked/);
  });

  it('shows it even though the confidence is low, because it reports an absence rather than a verdict', () => {
    // Withholding this produced silence about the one person a lead had to make a
    // decision about - the opposite of what the floor is for.
    const r = find(contribution(), 'kavon');
    expect(r.confidence).toBeLessThan(0.45);
    expect(r.shown).toBe(true);
  });

  it('never turns it into a claim about the person', () => {
    const r = find(contribution(), 'kavon');
    expect(r.position).toBeNull();
    expect(r.reason).not.toMatch(/\b(under-?performing|weak|lazy|not (good|right) enough|failing)\b/i);
  });
});

describe('the quiet, competent one is not misrepresented either', () => {
  it('does not state a negative shape about him at low confidence', () => {
    // He did the work and described it as "fine" for twelve weeks. "Nothing
    // checkable from session 1 to 6" is true of the record and false about him,
    // and with nobody able to corroborate, there is no way to tell them apart -
    // so it is withheld rather than shown.
    const r = find(contribution(), 'abubakar');
    expect(r.reason).toMatch(/Nothing checkable/);
    expect(r.shown).toBe(false);
  });

  it('tells the lead why no second account exists, rather than leaving them to assume one agreed', () => {
    for (const key of ['adam', 'abubakar', 'nate', 'kavon']) {
      expect(find(contribution(), key).reason).toMatch(/no second account to check any of this against/);
    }
  });
});

describe('the two who delivered read as having delivered', () => {
  it.each(['adam', 'nate'])('shows a specific, confident read for %s', (key) => {
    const r = find(contribution(), key);
    expect(r.shown).toBe(true);
    expect(r.reason).toMatch(/specific enough to check later/);
  });

  it('does not read the one blocked by a regulator as the one who stopped', () => {
    const r = find(contribution(), 'nate');
    expect(r.reason).not.toMatch(/Nothing checkable/);
  });
});

describe('the shared bottleneck is still visible', () => {
  it('counts the trainer as what other people were waiting on', () => {
    const found = findWaitingBehind(COHORT_PROBATION.mentions as any, name);
    expect(found.map((f) => f.label)).toEqual([name('hafsah')]);
    expect(found[0].people).toBe(2);
    expect(found[0].sessions.length).toBeGreaterThanOrEqual(3);
  });
});
