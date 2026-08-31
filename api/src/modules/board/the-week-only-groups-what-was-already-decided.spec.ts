import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * A ROUTER, NOT A SECOND OPINION.
 *
 * The value of this read is that every judgement in it was made somewhere else - the handoffs by the
 * board, the ran-out cycle by the escalation rules, asking to be shown by the person themselves. If
 * it ever starts deciding something of its own, the product acquires a second place where somebody
 * is assessed, and that one has no rules written on it.
 *
 * Comments stripped first: this explanation names the fields it protects.
 */
const SRC = readFileSync(join(__dirname, 'board.service.ts'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/^\s*\/\/.*$/gm, '');

const WEEK = SRC.slice(SRC.indexOf('async whoNeedsYouThisWeek'), SRC.indexOf('return whoNeedsYou(needs);'));

describe('the manager\'s week groups what was already decided', () => {
  it('finds the method, so an empty slice cannot pass', () => {
    expect(WEEK.length).toBeGreaterThan(400);
  });

  it('takes handoffs from the board rather than reading dependencies again', () => {
    expect(WEEK).toContain('await this.waitingAcrossTheOrg(organizationId)');
  });

  it('puts the manager in their own list when they are the thing being waited for', () => {
    /* A manager reading a list of people who need attention while BEING what several of them are
       waiting on is the version of this that does harm. */
    expect(WEEK).toContain('w.onPersonKey === key');
    expect(WEEK).toContain("kind: 'WAITING_ON_YOU'");
  });

  it('only calls something stuck when somebody actually raised it', () => {
    expect(WEEK).toContain('if (w.escalatedAt)');
  });

  it('reaches asked-to-be-shown only from what the person said about themselves', () => {
    expect(WEEK).toContain("where: { saidWhy: 'SKILL'");
    /* And never from the other one. Putting a thing off is not a request to be taught. */
    expect(WEEK).not.toContain('CONFIDENCE');
  });

  it('never invents a judgement of its own', () => {
    for (const decides of ['score', 'rank', 'rating', 'underperform', 'risk', 'flagged as']) {
      expect(WEEK.toLowerCase()).not.toContain(decides);
    }
  });

  it('hands the shaping to the module that refuses to be a ranking', () => {
    expect(SRC).toContain('return whoNeedsYou(needs);');
    expect(SRC).toContain("from '../detectors/who-needs-you-this-week'");
  });

  it('never costs a caller the whole read when one part of it fails', () => {
    expect(WEEK).toMatch(/\.catch\(\(\) => \[\] as any\[\]\)/);
  });
});
