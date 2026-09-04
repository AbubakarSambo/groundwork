/**
 * The brief's own test: about thirty seconds to understand the commercial
 * picture. Thirteen questions, and the order is the design.
 *
 * The failure this guards is not a wrong number - it is an overview that
 * quietly computes its own version of a figure that already exists elsewhere,
 * and then disagrees with the page it summarises. That disagreement is always
 * discovered in a meeting, by somebody who now trusts neither.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { THE_THIRTEEN, WHAT_THIS_PAGE_SEPARATES } from './the-thirty-second-view';

describe('the thirteen questions', () => {
  it('are thirteen, numbered in order', () => {
    expect(THE_THIRTEEN).toHaveLength(13);
    expect(THE_THIRTEEN.map((q) => q.n)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
  });

  it('and every one is a question, not a heading', () => {
    /* A heading is a label somebody chose. A question is a thing somebody wants
       to know, and only the second tells you whether the answer is on the page. */
    const notQuestions = THE_THIRTEEN.filter((q) => !q.question.endsWith('?')).map((q) => q.n);
    expect(notQuestions).toEqual([]);
  });

  it('and each says where its answer comes from', () => {
    const known = ['performance', 'contribution', 'positioning', 'function', 'attribution'];
    const unknown = THE_THIRTEEN.filter((q) => !known.includes(q.from)).map((q) => q.n);
    expect(unknown).toEqual([]);
  });

  it('and they cover the three things the brief keeps apart', () => {
    /**
     * Company performance, the function Sahar owns, and what one person
     * personally created. An overview missing any one of those is an overview
     * that invites the conflation the whole system exists to prevent.
     */
    const sources = new Set(THE_THIRTEEN.map((q) => q.from));
    expect(sources.has('performance')).toBe(true);
    expect(sources.has('function')).toBe(true);
    expect(sources.has('contribution')).toBe(true);
  });

  it('and the page leads with the sentence that keeps them apart', () => {
    expect(WHAT_THIS_PAGE_SEPARATES).toContain('Company performance is not personal contribution');
    expect(WHAT_THIS_PAGE_SEPARATES).toContain('Function ownership is not personal attribution');
    expect(WHAT_THIS_PAGE_SEPARATES).toContain('Operational involvement is not origination');
  });

  it('and it asks about the people whose job this is not', () => {
    /* Question 12. Without it the overview is a sales report, and the whole
       point is that a contributor with no sales duties can create value. */
    const q12 = THE_THIRTEEN.find((q) => q.n === 12)!;
    expect(q12.question).toMatch(/without sales responsibilities/);
  });
});

describe('the overview computes nothing of its own', () => {
  const source = readFileSync(join(__dirname, 'ops-commercial.controller.ts'), 'utf8');
  const overview = source.slice(source.indexOf('async overview('), source.indexOf('// --- The pipeline'));
  const withoutComments = overview.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  it('found the overview, so this cannot pass on an empty slice', () => {
    expect(withoutComments.length).toBeGreaterThan(200);
  });

  it('and does no arithmetic', () => {
    /**
     * No sums, no divisions, no percentages. Every figure comes from the same
     * services the separate pages use - an overview with its own arithmetic
     * eventually disagrees with the page it summarises, and that is discovered
     * in a meeting by somebody who then trusts neither.
     */
    expect(withoutComments).not.toMatch(/\breduce\(/);
    expect(withoutComments).not.toMatch(/Math\.round/);
    expect(withoutComments).not.toMatch(/\/ 100|\* 100/);
  });

  it('and reads no table directly except to list the people it reports on', () => {
    const tables = [...withoutComments.matchAll(/this\.prisma\.(\w+)\./g)].map((m) => m[1]);
    expect([...new Set(tables)]).toEqual(['opsPerson']);
  });
});
