/**
 * The workplan, and the one category that has a time limit.
 */
import {
  whatIsRunningOn,
  whereTheCompanyIs,
  canWeTellWhenThisIsDone,
  whyThisIsNotOperabilityWork,
  type APhase,
} from './the-phases-overlap-so-a-phase-is-not-a-period';
import { WHAT_WORK_CAN_SERVE, needsSomebodyToAgree } from './what-a-piece-of-work-serves';
import { METRICS_BY_KEY } from './a-number-you-can-open';

const phase = (over: Partial<APhase>): APhase => ({
  key: 'k',
  ordinal: 1,
  name: 'Prove',
  intent: 'i',
  startsOn: new Date('2026-09-01'),
  endsOn: new Date('2026-10-31'),
  exitCondition: 'Ten companies onboarded.',
  exitMetric: 'targets.companies_onboarded',
  exitTarget: 10,
  permitsOperability: false,
  ...over,
});

const prove = phase({ key: 'prove', name: 'Prove', ordinal: 1 });
const team = phase({
  key: 'team',
  name: 'Team',
  ordinal: 2,
  endsOn: new Date('2026-11-30'),
  exitMetric: null,
  exitTarget: null,
  exitCondition: 'The team can run the company without everything going through the CEO.',
  permitsOperability: true,
});
const sell = phase({
  key: 'sell',
  name: 'Sell',
  ordinal: 3,
  startsOn: new Date('2026-10-01'),
  endsOn: new Date('2026-12-31'),
});

describe('phases overlap, which is why they are not periods', () => {
  it('reports every phase running on a day, not one', () => {
    const running = whatIsRunningOn([prove, team, sell], new Date('2026-10-15'));
    expect(running.map((p) => p.name)).toEqual(['Prove', 'Team', 'Sell']);
  });

  it('and says the overlap is the plan rather than a mistake', () => {
    const said = whereTheCompanyIs([prove, team, sell], new Date('2026-10-15')).says;
    expect(said).toContain('at the same time');
    expect(said).toContain('not a mistake');
  });

  it('and never reports a percentage complete', () => {
    /* A phase ends when its exit condition is true. Being three weeks from the
       end date says nothing about whether it will be. */
    const where = whereTheCompanyIs([prove, team, sell], new Date('2026-10-15'));
    expect(JSON.stringify(where)).not.toMatch(/%|percent|complete/i);
  });

  it('and names what is next when nothing is running yet', () => {
    const where = whereTheCompanyIs([prove], new Date('2026-08-01'));
    expect(where.running).toEqual([]);
    expect(where.next).toBe('Prove');
  });

  it('and counts the first and last day of a phase as inside it', () => {
    expect(whatIsRunningOn([prove], new Date('2026-09-01')).length).toBe(1);
    expect(whatIsRunningOn([prove], new Date('2026-10-31')).length).toBe(1);
    expect(whatIsRunningOn([prove], new Date('2026-11-01')).length).toBe(0);
  });
});

describe('knowing when a phase is done', () => {
  it('reads the exit from the metric registry, so it is not an opinion', () => {
    const told = canWeTellWhenThisIsDone(prove);
    expect(told.checkable).toBe(true);
    expect(METRICS_BY_KEY.has(prove.exitMetric!)).toBe(true);
  });

  it('and says plainly when an exit is a sentence rather than a number', () => {
    /* Inventing a metric for it would be worse than the gap: the number would
       be checked, believed, and about something else. */
    const told = canWeTellWhenThisIsDone(team);
    expect(told.checkable).toBe(false);
    expect(told.says).toContain('Somebody decides');
  });
});

describe('work that makes the company operable', () => {
  it('counts while the phase that permits it is running', () => {
    expect(
      whyThisIsNotOperabilityWork({ runningPhases: [prove, team], on: new Date('2026-10-15') }),
    ).toBeNull();
  });

  it('and is refused outside it, without saying the work is not worth doing', () => {
    const said = whyThisIsNotOperabilityWork({ runningPhases: [sell], on: new Date('2026-12-01') })!;
    /* Reworded on 5 October (request 141): the point first, then the reason. */
    expect(said).toContain('because no phase running today allows it');
    expect(said).not.toMatch(/not worth|pointless|does not matter/i);
  });

  it('and is refused when no phase is running at all', () => {
    expect(whyThisIsNotOperabilityWork({ runningPhases: [], on: new Date('2027-06-01') })).not.toBeNull();
  });

  it('and still needs somebody to agree, like keeping it up does', () => {
    expect(needsSomebodyToAgree('MAKES_THE_COMPANY_OPERABLE')).toBe(true);
  });

  it('and is one of exactly five things work can serve', () => {
    expect(WHAT_WORK_CAN_SERVE.length).toBe(5);
    expect(WHAT_WORK_CAN_SERVE.map((w) => w.serves)).toContain('MAKES_THE_COMPANY_OPERABLE');
  });
});

describe('the seeded workplan', () => {
  /* Comments stripped before matching. Without it the note explaining the
     boundary could satisfy the check that enforces it, which is the whole
     failure `a-guard-that-a-comment-satisfies-is-not-a-guard` exists to catch. */
  const seed = require('fs')
    .readFileSync(require('path').join(__dirname, 'seed-the-foundations.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');

  it('permits operability in exactly one phase', () => {
    /* A category available in every phase is not bounded, and a boundary that
       moves is not one. */
    expect((seed.match(/permitsOperability: true/g) ?? []).length).toBe(1);
  });

  it('and every exit metric it names exists in the registry', () => {
    const named = [...seed.matchAll(/exitMetric: '([a-z_.]+)'/g)].map((m) => m[1]);
    expect(named.length).toBeGreaterThan(0);
    expect(named.filter((k) => !METRICS_BY_KEY.has(k))).toEqual([]);
  });
});
