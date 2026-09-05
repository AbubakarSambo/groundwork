/**
 * The gate on opening a period, and the second door it also has to cover.
 */
import * as fs from 'fs';
import * as path from 'path';
import {
  whyThisPeriodCannotOpenYet,
  whatStandsBetweenUsAndOpening,
} from './a-period-does-not-open-with-somebody-unset';

const adam = { personId: 'a', displayName: 'Adam' };
const zoe = { personId: 'z', displayName: 'Zoe' };

describe('opening a period', () => {
  it('is refused while somebody active has no objective in it, and names them', () => {
    const said = whyThisPeriodCannotOpenYet({
      periodName: 'Q4 2026',
      active: [adam, zoe],
      ownerIds: new Set(['z']),
    });
    expect(said).toContain('Adam');
    expect(said).not.toContain('Zoe');
    expect(said).toContain('Q4 2026');
  });

  it('names everybody it is waiting on, in a readable order', () => {
    const said = whyThisPeriodCannotOpenYet({
      periodName: 'Q4 2026',
      active: [zoe, adam],
      ownerIds: new Set(),
    })!;
    expect(said.indexOf('Adam')).toBeLessThan(said.indexOf('Zoe'));
  });

  it('is allowed once everybody active owns one', () => {
    expect(
      whyThisPeriodCannotOpenYet({
        periodName: 'Q4 2026',
        active: [adam, zoe],
        ownerIds: new Set(['a', 'z']),
      }),
    ).toBeNull();
  });

  it('does not count somebody who is no longer active', () => {
    /* An inactive person with no objective must not hold the quarter shut
       forever. `active` is the caller's job to filter; this asserts the rule
       reads only what it was given. */
    expect(
      whyThisPeriodCannotOpenYet({ periodName: 'Q4', active: [adam], ownerIds: new Set(['a']) }),
    ).toBeNull();
  });

  it('and an empty team is refused rather than passing on a technicality', () => {
    const said = whyThisPeriodCannotOpenYet({ periodName: 'Q4', active: [], ownerIds: new Set() });
    expect(said).toContain('nobody active');
  });

  it('says nothing about whether the objectives are any good', () => {
    /* Quality is refused where an objective is written. Re-checking it here
       would make opening a quarter a review of six people's work. */
    const said = whyThisPeriodCannotOpenYet({
      periodName: 'Q4',
      active: [adam],
      ownerIds: new Set(),
    })!;
    expect(said).not.toMatch(/justification|approach|instead/i);
  });
});

describe('asking before opening', () => {
  it('gives the same answer the gate would, as a question', () => {
    const asked = whatStandsBetweenUsAndOpening({
      periodName: 'Q4',
      active: [adam, zoe],
      ownerIds: new Set(['z']),
    });
    expect(asked.ready).toBe(false);
    expect(asked.waitingOn).toEqual(['Adam']);
    expect(asked.says).toBe(
      whyThisPeriodCannotOpenYet({ periodName: 'Q4', active: [adam, zoe], ownerIds: new Set(['z']) }),
    );
  });

  it('and says so plainly when there is nothing in the way', () => {
    const asked = whatStandsBetweenUsAndOpening({
      periodName: 'Q4',
      active: [adam],
      ownerIds: new Set(['a']),
    });
    expect(asked.ready).toBe(true);
    expect(asked.waitingOn).toEqual([]);
  });
});

describe('every door that opens a period', () => {
  const source = fs
    .readFileSync(path.join(__dirname, 'ops-foundation.service.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');

  it('runs the gate — including the patch that could already open one', () => {
    /**
     * `resetATargetList` accepted `status: 'OPEN'` long before this gate
     * existed. A gate on the new route only would have been decorative: the
     * form on the target-list page uses the patch.
     */
    const gated = source.match(/whyThisPeriodCannotOpenYet\(/g) ?? [];
    expect(gated.length).toBe(2);
    expect(source).toMatch(/patch\.status === 'OPEN'/);
  });

  it('and nothing else writes an OPEN status', () => {
    const writes = source.match(/status: 'OPEN'/g) ?? [];
    expect(writes.length).toBe(1);
  });
});
