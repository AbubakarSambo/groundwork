import { readFileSync } from 'fs';
import { join } from 'path';
import {
  isContested, canFinish, sayContention, REQUIRED_TO_FINISH, CONTESTABLE_FIELDS, DIFFERENT_BELOW,
} from './it-does-not-average-and-it-does-not-defer';

/**
 * IF THE INITIATOR SAYS FOURTEEN DAYS AND A CONTRIBUTOR SAYS THAT WAS NEVER ACHIEVABLE.
 *
 * Three things a system could do and two of them are wrong. Average them, and you get a number
 * nobody argued for which both will be measured against. Let the first one stand, and the objection
 * becomes a comment nobody reads - which is what happens in a planning meeting and is the reason
 * objectives miss quietly. Hold it open, and the two people have to say which it is.
 */
const SERVICE = readFileSync(join(__dirname, 'drafts.service.ts'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

/*
 * Import lines dropped as well as comments. The rule below refuses the word "average", and this
 * file's own module is called it-does-not-average - so the import naming it matched, and the guard
 * failed on the thing it was guarding. Same shape as the comment-stripping rule, one step further.
 */
const BODY = SERVICE.split('\n')
  /* Any line carrying a module path, not just one starting with `import` - this file's import is
     multi-line, so the continuation `} from './it-does-not-average...'` slipped through the first
     version and the guard failed on the thing it guards. */
  .filter((l) => !/from '/.test(l) && !/^import /.test(l.trim()))
  .join('\n');

const shape = (o: any = {}) => ({
  state: 'GATHERING' as const, proposedMeasure: 'median days', proposedTarget: '14 days',
  openContentionFields: [] as string[], ...o,
});

describe('it does not average and it does not defer', () => {
  it('never computes a middle', () => {
    /* Eleven days is a number nobody argued for, and both would be measured against it. */
    /*
     * `\/ 2` with a space was the first version, and `(a + b)/2` walked straight past it - the
     * exact expression the rule exists to forbid, written the way anybody would actually write it.
     * Whitespace optional now.
     */
    expect(BODY).not.toMatch(/average|midpoint|\bmean\b|\/\s*2\b/i);
  });

  it('the initiator’s own proposal is a position like any other', () => {
    /*
     * Leaving it out would be exactly the deference this refuses - their version would never be
     * the one contested, because it would never be compared.
     */
    expect(SERVICE).toMatch(/positions\.push\(\{ personExternalId: draft\.initiatorExternalId/);
  });

  it('opens a contention when two people give different answers', () => {
    expect(isContested([
      { personExternalId: 'a', body: '14 days' },
      { personExternalId: 'b', body: '25 days, fourteen was never achievable with one engineer' },
    ])).toBe(true);
  });

  it('and none when they say the same thing differently', () => {
    /* A mechanism that treated rephrasing as disagreement would open a contention on every draft
       anybody touched. */
    expect(isContested([
      { personExternalId: 'a', body: 'median days from signature to first login' },
      { personExternalId: 'b', body: 'the median number of days between signature and first login' },
    ])).toBe(false);
  });

  it('one person cannot contest themselves', () => {
    expect(isContested([
      { personExternalId: 'a', body: '14 days' },
      { personExternalId: 'a', body: 'actually 25 days' },
    ])).toBe(false);
  });
});

describe('a contested draft cannot become an objective', () => {
  it('is refused while a required field is disputed, with the reason', () => {
    /*
     * The rule that makes the whole mechanism worth having. There is no flag to skip it: somebody
     * wanting past this has to go and agree with a colleague.
     */
    const r = canFinish(shape({ openContentionFields: ['target'] }));
    expect(r.ready).toBe(false);
    expect((r as any).because).toMatch(/do not yet agree on the target/);
  });

  it('but a disputed TITLE does not block it', () => {
    /* A working title everybody understands is enough to seed with, and holding a draft hostage
       over wording is how the mechanism gets a reputation for pedantry. */
    expect(canFinish(shape({ openContentionFields: ['title'] })).ready).toBe(true);
    expect(REQUIRED_TO_FINISH).not.toContain('title');
  });

  it('refuses a draft with no measure or no target, and says which', () => {
    /* An objective without them is a wish. */
    expect((canFinish(shape({ proposedMeasure: null })) as any).because).toMatch(/no measure/i);
    expect((canFinish(shape({ proposedTarget: '  ' })) as any).because).toMatch(/no target/i);
  });

  it('and the reason is always there, because the reader is usually who could fix it', () => {
    for (const s of [
      shape({ state: 'SEEDED' }), shape({ state: 'ABANDONED' }),
      shape({ openContentionFields: ['measure'] }), shape({ proposedTarget: null }),
    ]) {
      const r = canFinish(s);
      expect(r.ready).toBe(false);
      expect((r as any).because.length).toBeGreaterThan(10);
    }
  });

  it('the seed path checks it and does not take a flag', () => {
    expect(SERVICE).toMatch(/if \(!s\.ready\) throw new BadRequestException\(s\.because\)/);
    expect(SERVICE).not.toMatch(/force|skipContention|override/i);
  });
});

describe('what a contention says', () => {
  it('names the field, not the people', () => {
    /* Turning it into a disagreement between two named colleagues is how a useful mechanism
       becomes an argument nobody wants to have in writing. */
    const line = sayContention('target', [
      { personExternalId: 'u-naomi', body: '14 days' },
      { personExternalId: 'u-tom', body: '25 days' },
    ]);
    expect(line).toContain('target');
    expect(line).not.toContain('u-naomi');
    expect(line).not.toContain('u-tom');
  });

  it('quotes both and prefers neither', () => {
    const line = sayContention('target', [
      { personExternalId: 'a', body: '14 days' }, { personExternalId: 'b', body: '25 days' },
    ]);
    expect(line).toContain('14 days');
    expect(line).toContain('25 days');
    expect(line).toMatch(/not be settled by whoever wrote it first/i);
  });
});

describe('a settled disagreement is applied, not just marked settled', () => {
  it('writes the resolution onto the field it settles', () => {
    /* Agreeing and then not applying it is the ordinary way a decision made in a conversation
       evaporates. */
    expect(SERVICE).toMatch(/proposedTarget: resolution\.trim\(\)/);
    expect(SERVICE).toMatch(/proposedMeasure: resolution\.trim\(\)/);
  });

  it('and a resolution has to say what it is', () => {
    expect(SERVICE).toMatch(/Say what it is, rather than only that it is settled/);
  });
});

describe('what is seeded is known to have been agreed', () => {
  it('is authored as self rather than imported', () => {
    /*
     * Everybody on the draft was demonstrably in the conversation - the one case where work
     * arriving in the system is known to have been agreed rather than assigned. An objective people
     * agreed to must never render the same as one that appeared on their list.
     */
    expect(SERVICE).toMatch(/authoredBy: 'self'/);
    expect(SERVICE).not.toMatch(/authoredBy: 'imported'/);
  });

  it('and carries the evidence it was built from', () => {
    /* "Why is the target fourteen days" needs an answer six months from now, when the findings may
       be resolved, superseded or closed. */
    expect(SERVICE).toMatch(/groundedOnFindingIds: grounded\.map/);
  });
});

describe('every contestable field is one somebody could actually disagree about', () => {
  it('and general remarks are not one of them', () => {
    /* A comment is not a competing answer, and treating it as one would contest a draft because
       somebody said "sounds good". */
    expect(CONTESTABLE_FIELDS).not.toContain('general');
    expect(SERVICE).toMatch(/if \(f === 'general'\) return \{ recorded: true, contention: null \}/);
  });

  it('the threshold is one number in one place', () => {
    expect(DIFFERENT_BELOW).toBeGreaterThan(0);
    expect(DIFFERENT_BELOW).toBeLessThan(1);
  });
});
