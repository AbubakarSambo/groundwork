import { readFileSync } from 'fs';
import { join } from 'path';
import { buildIntakeBlock } from './prompt-library';

/**
 * A PERSON IS TOLD HOW LONG THE RUN IS. IT HAS TO BE THE REAL NUMBER.
 *
 * `buildIntakeBlock` renders "SESSION: n of TOTAL" into every session prompt, and falls back to 4
 * when nothing supplies the total. Nothing supplied it: `totalSessionsFor` was imported into
 * conversation.service.ts and never called, so every session of every check-in in the product said
 * "of 4" whatever the ground held.
 *
 * Found by having a conversation, not by reading code. The header said "Session 1 of 8" and the
 * assistant said "the first of four check-ins", in the same viewport.
 *
 * IT IS NOT A LABEL. `whereInTheRun` reads the total to decide whether this is an early, a middle
 * or a CLOSING session and how hard to press. On an eight-session ground, session four was treated
 * as the last one - so the interview changed shape at the wrong time and named a deadline that did
 * not exist.
 *
 * Two places that had to agree, computed in different files from different sources, with nothing
 * comparing them. The usual shape.
 */
const SERVICE = readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

describe('the session count reaches the prompt', () => {
  it('conversation.service actually calls totalSessionsFor', () => {
    // The regression exactly: imported, never called.
    /* E2 (13 October 2026): a daily check-in with no end said passes no total; every other one still passes totalSessionsFor. */
    expect(SERVICE).toMatch(/totalSessions:\s*(?:aDailyCheckInWithNoEndSaid\(ground as any\) \? undefined : )?totalSessionsFor\(/);
  });

  it('and derives it from the same timeline and cadence the header uses', () => {
    /* Changed 2 November 2026 (twice a week): the count also takes the weekdays it meets on. */
    expect(SERVICE).toMatch(/totalSessionsFor\(\s*ground\.timelineDays,\s*ground\.cadence,\s*ground\.cadenceDays\s*\)/);
  });
});

describe('what the prompt says about where you are', () => {
  const ctx = (over: Record<string, unknown> = {}) =>
    ({ groundLabel: 'Renewal push', sessionNumber: 1, ...over }) as any;

  it('renders the total it is given', () => {
    expect(buildIntakeBlock(ctx({ totalSessions: 8 }))).toContain('SESSION: 1 of 8');
  });

  it('does not quietly say four when it is eight', () => {
    const block = buildIntakeBlock(ctx({ totalSessions: 8 }));
    expect(block).not.toContain('of 4');
  });

  /**
   * The fallback stays - a ground with no timeline has no honest number - but it must never be
   * reachable while the ground HAS one, which is what the service-side assertions above pin.
   */
  it('still says something when there is no total to be had', () => {
    expect(buildIntakeBlock(ctx())).toMatch(/SESSION: 1 of \d+/);
  });

  it('and the closing-session calibration uses the same number', () => {
    const mid = buildIntakeBlock(ctx({ sessionNumber: 4, totalSessions: 8 }));
    const last = buildIntakeBlock(ctx({ sessionNumber: 8, totalSessions: 8 }));
    expect(mid).not.toEqual(last);
  });
});
