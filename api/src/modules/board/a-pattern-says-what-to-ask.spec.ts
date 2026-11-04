import { whatToAskAbout, PATTERN_PROBE_BY_CODE, ALIGNMENT_FEED_ONLY_CODES } from '../patterns/pattern-library';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * A PATTERN ON THE BOARD SAID WHAT HAPPENED AND NOT WHAT TO DO.
 *
 * Read on a real cohort board: "Direct questions about deliverables were met with unrelated
 * statements about needs and blockers." True, useful, and a dead end - "i would expect a coaching
 * line or an assessment after, what do i do with this".
 *
 * Every pattern in the library has carried a `probe` since it was written: the question to put to
 * somebody once the pattern has been seen, which is the whole reason a pattern is worth naming. It
 * had simply never left that file.
 */
describe('what to ask about a pattern', () => {
  it('hands back the library\'s own question', () => {
    expect(whatToAskAbout('D1')).toBe('Has the team depending on this confirmed it works for them?');
  });

  /**
   * F5's `probe` is a routing instruction - "Surface to alignment feed only. Never name to either
   * person directly." - and my first attempt at this built a fresh map over every code with a
   * probe string, which would have printed that onto a shared board as a coaching question.
   */
  it('and never mistakes a routing instruction for a question', () => {
    expect(whatToAskAbout('F5')).toBeNull();
    for (const code of ALIGNMENT_FEED_ONLY_CODES) expect(whatToAskAbout(code)).toBeNull();
  });

  it('and says nothing for a code it does not know, including one the model invented', () => {
    expect(whatToAskAbout('k5')).toBeNull();
    expect(whatToAskAbout('')).toBeNull();
  });

  /** An allowlist by construction: no entry means no safe question, not "ask something anyway". */
  it('and only ever answers from the allowlist', () => {
    for (const code of ['D1', 'D2', 'D3']) {
      if (whatToAskAbout(code)) expect(PATTERN_PROBE_BY_CODE.has(code)).toBe(true);
    }
  });
});

/*
 * The board no longer builds its pattern rows itself: every served pattern is built by
 * patterns/who-reads-a-pattern, which the board calls, so the question is attached there, for
 * whoever runs the check-in (the person themselves is asked what is behind it instead).
 */
describe('and the board sends it', () => {
  const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const SRC = strip(readFileSync(join(__dirname, 'board.service.ts'), 'utf8'));
  const RULES = strip(readFileSync(join(__dirname, '../patterns/who-reads-a-pattern.ts'), 'utf8'));

  it('serves stored rows only through the rules, which give the question to nobody but a non-owner, and the lead’s rows from the record layer', () => {
    /* Hafsah, 2 November 2026: the lead reads the assessment's pattern layer, not stored patterns. */
    /* The board's stored rows still go through the one servedPatterns call and its kept wording. */
    expect(SRC).toMatch(/servedPatterns\(detections as any, patternReader, \{ \.\.\.namesForPatterns, now \}\)/);
    expect(SRC).toMatch(/const worded = await wordPatternEvidence\(/);
    /* What the lead reads about each person is the record layer, appended after the reader's own stored rows. */
    expect(SRC).toMatch(/out\.patterns = \[\.\.\.worded, \.\.\.\(await whatTheRecordShowsTheLead\(this\.prisma, groundId, patternReader\)\)\]/);
    /* A stored row is served only to the person it is about, who is asked what is behind it, never handed the library's question. */
    expect(RULES).toMatch(/askThem: yours \? null : whatToAskAbout\(row\.code\)/);
    expect(RULES).toMatch(/return !!reader\.participantId && row\.participantId === reader\.participantId;/);
  });
});

/**
 * AND EVERY PATTERN THAT CAN REACH A BOARD HAS ONE.
 *
 * Thirteen of the thirty-eight had no `probe` at all - including K3 and E2, which are the two that
 * actually fired on a real twelve-session cohort. So the first version of this shipped a coaching
 * line that was null on every pattern the lead could see. Found by rendering it and reading the
 * board, not by testing the helper.
 */
describe('every pattern a person can be shown carries a question', () => {
  const { POSITIVE_CODES, BAD_FAITH_CODES } = require('../patterns/pattern-library');
  const PERSON_JUDGING = new Set(['COLLUSION_RISK', 'ARC_CONCENTRATION']);

  it('found the library, so an empty list cannot pass', () => {
    expect([...POSITIVE_CODES, ...BAD_FAITH_CODES].length).toBeGreaterThan(20);
  });

  it('and none of the ones that reach a board is silent about what to do', () => {
    const silent = [...POSITIVE_CODES, ...BAD_FAITH_CODES]
      .filter((c: any) => !ALIGNMENT_FEED_ONLY_CODES.has(c.code) && !PERSON_JUDGING.has(c.code))
      .filter((c: any) => !whatToAskAbout(c.code))
      .map((c: any) => `${c.code} ${c.name}`);
    expect(silent).toEqual([]);
  });

  /**
   * PUT TO A PERSON, NOT TO THE SYSTEM. Most end in a question mark; F2's ends "Help me understand
   * that gap", which is the same act and better writing. What must never appear is F5's shape - a
   * routing instruction about where to surface something - because on a board that reads as the
   * product talking to itself in front of the person it is about.
   */
  it('and each one is addressed to a person', () => {
    for (const c of [...POSITIVE_CODES, ...BAD_FAITH_CODES] as any[]) {
      const q = whatToAskAbout(c.code);
      if (!q) continue;
      expect(q).not.toMatch(/surface to|alignment feed|never name|do not name/i);
      expect(q.length).toBeGreaterThan(20);
    }
  });
});
