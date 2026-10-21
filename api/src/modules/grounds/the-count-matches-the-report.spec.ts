import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * "0 OF 3 CHECKED IN" PRINTED ABOVE A REPORT BUILT FROM THREE ACCOUNTS.
 *
 * Found on a live ground where Eric, Nate and Sahar had all completed session 1. The report body was
 * right - two gaps, both stakes named, a recommended next conversation. The header above it said
 * "Picture forming - 0 of 3 checked in. You haven't checked in yet for this round", to somebody who
 * had checked in minutes earlier.
 *
 * The cause was not a race. Completing session 1 creates the session 2 rows immediately, and this
 * counted the HIGHEST session any row existed for - so it flipped to session 2, where nobody had
 * answered yet, while the report described session 1. The count was accurate about a round nobody had
 * been asked to do, and useless about the one on screen.
 *
 * A leader cannot act on a page that contradicts itself, so this is pinned.
 */
const SRC = readFileSync(join(__dirname, 'grounds.service.ts'), 'utf8');
const CODE = SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const fn = CODE.slice(CODE.indexOf('async getSessionProgress('), CODE.indexOf('async getSessionProgress(') + 2600);

describe('the round counted is the round answered', () => {
  it('asks for the newest COMPLETED session, not the newest row', () => {
    expect(fn).toMatch(/status: CheckInStatus\.COMPLETED[\s\S]*?_max: \{ sessionNumber: true \}/);
  });

  it('and prefers it over the newest open round', () => {
    /**
     * Order matters: the fallback must only apply when nothing has been completed anywhere, which is
     * a genuinely-just-started ground.
     */
    expect(fn).toMatch(/lastAnswered\._max\.sessionNumber \?\? newestOpen\._max\.sessionNumber \?\? 1/);
  });

  it('a ground with nothing finished still reports on its open round', () => {
    expect(fn).toMatch(/newestOpen/);
  });
});

describe('who the denominator counts', () => {
  /* CHANGED 11 OCTOBER (decision 133): the lead, managing-only or not, is counted in a session only
     when they answered it, the same as the release rule; the rule is whoASessionCounts now. */
  it('counts the lead only in a session they answered, the same as the release rule', () => {
    /**
     * They give session 1 like everybody else and are waited on for it (waitsOnAManagingOnlyLead);
     * from session 2 they give no account and counting them made "2 of 3" unreachable. Read off
     * Hafsah's own ground, 21 Sep 2026: "1 of 1 checked in" beside a roster of two.
     */
    /* Asked of how-many-have-answered now rather than copied here; the clause lives there. */
    expect(fn).toContain('await howManyHaveAnswered(this.prisma, groundId, sessionNumber)');
    const theRule = require('fs').readFileSync(require('path').join(__dirname, '..', 'reports', 'how-many-have-answered.ts'), 'utf8');
    expect(theRule).toContain('AND: [whoASessionCounts(sessionNumber, AN_ANSWER)]');
  });

  it('and still counts anyone who has actually completed this round', () => {
    const theRuleToo = require('fs').readFileSync(require('path').join(__dirname, '..', 'reports', 'how-many-have-answered.ts'), 'utf8');
    expect(theRuleToo).toMatch(/checkIns: \{ some: \{ sessionNumber, status: \{ in: AN_ANSWER \} \} \}/);
  });
});
