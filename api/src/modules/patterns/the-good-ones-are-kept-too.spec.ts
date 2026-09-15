import { readFileSync } from 'fs';
import { join } from 'path';
import {
  POSITIVE_CODES, BAD_FAITH_CODES, isPositiveCode, isBadFaithCode, PATTERN_DETECTION_PROMPT,
  PATTERN_DETECTION_SCHEMA,
} from './pattern-library';

/*
 * "This is not the case, we need the positive things tracked as well." Hafsah, 15 September 2026,
 * on finding the product detected thirty-eight ways work goes wrong and one way it goes right.
 *
 * The good ones were never missing from the product's idea of itself - the conversation prompt has
 * carried MOVEMENT and COORDINATION patterns for its whole life with the instruction "name
 * explicitly when seen". They were said out loud in the moment and then gone: nothing stored,
 * nothing accumulating, nothing reaching a board or a report.
 */
describe('the good ones are detected and kept, the same as the bad ones', () => {
  it('there is more than one of them now', () => {
    expect(POSITIVE_CODES.length).toBeGreaterThan(7);
    for (const c of ['M1', 'M2', 'M3', 'M4', 'C1', 'C2', 'C3', 'R3']) {
      expect(isPositiveCode(c)).toBe(true);
    }
  });

  it('and none of them is also a bad-faith code, because a code means one thing', () => {
    for (const c of POSITIVE_CODES) expect(isBadFaithCode(c.code)).toBe(false);
    for (const c of BAD_FAITH_CODES) expect(isPositiveCode(c.code)).toBe(false);
  });

  it('every one says what to ask about it, or it reaches a board saying nothing useful', () => {
    for (const c of POSITIVE_CODES) {
      expect(c.probe && c.probe.trim().length).toBeGreaterThan(10);
      expect(c.signal.trim().length).toBeGreaterThan(10);
    }
  });

  it('the detection prompt actually asks for them', () => {
    for (const c of POSITIVE_CODES) expect(PATTERN_DETECTION_PROMPT).toContain(`${c.code} (${c.name})`);
    expect(PATTERN_DETECTION_PROMPT).toMatch(/AND THE ONES THAT ARE GOOD NEWS/);
  });

  it('and says they are not a consolation prize for a quiet period', () => {
    expect(PATTERN_DETECTION_PROMPT).toMatch(/not consolation prizes|These are not\s*consolation prizes/);
    expect(PATTERN_DETECTION_PROMPT).toMatch(/gets no code at all, which is a perfectly good period/);
  });

  it('the service keeps them instead of dropping them on the floor', () => {
    const src = readFileSync(join(__dirname, 'patterns.service.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    /* The line that used to throw every non-bad-faith code away now has the good ones taken out
       in front of it, and routed to the method that was already there for them. */
    expect(src).toMatch(/if \(isPositiveCode\(d\.code\)\) \{[\s\S]{0,260}observePositive\(/);
    expect(src.indexOf('isPositiveCode(d.code)')).toBeLessThan(src.indexOf('if (!isBadFaithCode(d.code)) continue;'));
  });

  it('they surface immediately, which is the product’s own written rule for good news', () => {
    const src = readFileSync(join(__dirname, 'patterns.service.ts'), 'utf8');
    /* The METHOD, not everything after it: a first version of this sliced to the end of the file
       and failed on a three-period rule belonging to somebody else's method. */
    const from = src.indexOf('async observePositive');
    const positive = src.slice(from, src.indexOf('\n  }', from));
    expect(positive).not.toMatch(/THREE_PERIOD_RULE/);
    expect(positive).toMatch(/PatternStatus\.SURFACED/);
  });

  it('and nobody softens a compliment, which one hardcoded copy of the list would have done', () => {
    const grounds = readFileSync(join(__dirname, '..', 'grounds', 'grounds.service.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(grounds).not.toMatch(/const POSITIVE_CODES = new Set\(\['R3'\]\)/);
    expect(grounds).toMatch(/observation: isPositiveCode\(d\.code\)/);
  });

  it('the schema lets the model answer with a good one, which is where this actually failed', () => {
    /*
     * The enum listed the bad-faith codes alone. Run live against a plainly positive record - a
     * rewritten brief that stopped three teams asking the same question, an unowned release
     * checklist picked up - it returned R1 "named as a blocker by others", R2 "creates confusion
     * downstream", R4 "two people stopped corroborating". The observations underneath were
     * accurate and warm; it simply had to pick a code and those were the only codes on offer.
     *
     * Two prompt fixes did not move it. A schema that offers one kind of answer gets one kind of
     * answer. With both families in the enum the same record came back C1, M3, M4, M2.
     */
    const codes = (PATTERN_DETECTION_SCHEMA as never as {
      input_schema: { properties: { detections: { items: { properties: { code: { enum: string[] } } } } } };
    }).input_schema.properties.detections.items.properties.code.enum;
    for (const c of POSITIVE_CODES) expect(codes).toContain(c.code);
    for (const c of BAD_FAITH_CODES) expect(codes).toContain(c.code);
  });

  it('the absorption family stays out until it has a label that is not "Good sign"', () => {
    for (const c of ['A1', 'A2', 'A3']) expect(isPositiveCode(c)).toBe(false);
  });
});
