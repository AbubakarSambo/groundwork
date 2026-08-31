import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * THE PART A UNIT TEST OF `hasCoachingRunOut` CANNOT PROVE.
 *
 * The function is careful, and being careful about inputs nobody supplies is worth nothing. What
 * matters here is which real state each condition is read from, and two of them are deliberately
 * WIDER than the promise they are read against - both in the direction that escalates less. A later
 * edit narrowing either one to "just this promise" would look like a tightening and would in fact
 * make the product escalate at people who are blocked or who are moving.
 *
 * Comments stripped first, because this file's own explanation quotes the code it protects.
 */
const SRC = readFileSync(join(__dirname, 'grounds-by-api.service.ts'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/^\s*\/\/.*$/gm, '');

const BLOCK = SRC.slice(SRC.indexOf('const howItHasGone'), SRC.indexOf('const read = theReadFor('));

describe('escalation is read from state that exists', () => {
  it('finds the block at all, so an empty slice cannot pass', () => {
    expect(BLOCK.length).toBeGreaterThan(200);
    expect(BLOCK).toContain('stepsOffered');
  });

  it('counts periods as check-ins they were in, never as time elapsed', () => {
    /* Weeks elapsed would escalate at somebody who was on leave. */
    expect(BLOCK).toContain('finishedSince(c.statedAt)');
    expect(SRC).toContain('report: { releasedAt: { gt: since } }');
  });

  it('treats anything they are waiting on as a blocker, not only this promise', () => {
    expect(BLOCK).toContain("blockers: side('from').length");
  });

  it('never treats an unseen expectation as coached', () => {
    expect(BLOCK).toContain('unseenObjectives.has');
  });

  it('scopes whether coaching was offered to the conversation the promise came from', () => {
    /* The one input that would OVER-escalate if widened. A step given in a different check-in about
       a different thing must never read as "the cycle was tried here". */
    expect(BLOCK).toContain('coachingByObjective.get(c.sourcePersonObjectiveId)');
    expect(SRC).toContain('sourcePersonObjectiveId: true');
  });

  it('counts anything but a plain not-done as movement', () => {
    expect(SRC).toContain("h.outcome !== 'not_done'");
  });
});
