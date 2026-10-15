import { SPECIFICITY_LEVELS, rankOf, mapSpecificityLevel, labelFromMean, NOTHING_SAID, WELL_COVERED_AT, PARTLY_COVERED_AT } from './how-checkable-a-session-was';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * A WORSE SESSION SCORES LOWER.
 *
 * The mapper put the lowest score into `managed`; the report ranked `managed` at 2, above
 * `directional` at 1. A person who said almost nothing outranked a person who gave a directional
 * answer. One order now, worst first, and the rank is monotonic in the score - including the
 * zero-turn default, which used to be two verdicts about the same nothing.
 */
describe('the order', () => {
  it('is worst first, and the index is the rank', () => {
    expect(SPECIFICITY_LEVELS).toEqual(['managed', 'vague', 'directional', 'specific']);
    expect(rankOf('managed')).toBe(0);
    expect(rankOf('directional')).toBe(2);
    expect(rankOf('specific')).toBe(3);
    expect(rankOf(null)).toBeNull();
    expect(rankOf('high')).toBeNull();
  });

  it('a higher score is never a lower level', () => {
    let last = -1;
    for (const score of [0, 0.1, 0.15, 0.2, 0.35, 0.5, 0.6, 0.9, 1]) {
      const r = rankOf(mapSpecificityLevel(score))!;
      expect(r).toBeGreaterThanOrEqual(last);
      last = r;
    }
  });

  it('nothing said is the bottom, for the level and every dimension alike', () => {
    expect(NOTHING_SAID).toBe('managed');
    expect(rankOf(NOTHING_SAID)).toBe(0);
    /* The read lives in the-specificity-read.ts since request 103, so that is where this is pinned. */
    const code = readFileSync(join(__dirname, 'the-specificity-read.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(code).toMatch(/return \{ level: NOTHING_SAID, dimensions: dims \};/);
    expect(code).not.toMatch(/level: 'vague', recallConfidence: 'uncertain'/);
  });
});

describe('the cuts moved with the order', () => {
  it('directional-everywhere is moderate, not high', () => {
    expect(labelFromMean(rankOf('directional')!)).toBe('moderate');
    expect(labelFromMean(rankOf('specific')!)).toBe('high');
    expect(labelFromMean(rankOf('vague')!)).toBe('low');
    expect(WELL_COVERED_AT).toBe(2.5);
    expect(PARTLY_COVERED_AT).toBe(1.5);
  });
});

describe('one mapper, no false recall', () => {
  const code = readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const report = readFileSync(join(__dirname, '../reports/reports.service.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  it('the service has no mapper of its own, and no recall mapper at all', () => {
    expect(code).not.toMatch(/function mapSpecificityLevel/);
    expect(code).not.toMatch(/mapRecallConfidence/);
    /* The column is gone (B12); the service must not have grown a mapper for it under any name. */
    expect(code).not.toMatch(/recallConfidence/);
  });

  it('the report ranks by the shared order, not a map of its own', () => {
    expect(report).not.toMatch(/const RANK: Record<string, number>/);
    expect(report).toMatch(/rankOf\(c\.specificityLevel\)/);
    expect(report).toMatch(/labelFromMean\(mean\)/);
  });
});
