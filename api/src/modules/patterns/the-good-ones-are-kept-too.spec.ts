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
    /*
     * Since the five-reads build (30 September 2026), one read (whatOneReadKeeps) decides what it
     * would keep - isPositiveCode(d.code) is taken out in front of the bad-faith drop, the same as
     * before, but it now pushes to `kept` rather than writing straight away. observePositive() is
     * called once per check-in, after the five reads are counted, by the write loop that follows.
     * Both halves of that journey are checked here.
     */
    expect(src).toMatch(/if \(isPositiveCode\(d\.code\)\) \{[\s\S]{0,750}kept\.push\(/);
    expect(src.indexOf('isPositiveCode(d.code)')).toBeLessThan(src.indexOf('if (!isBadFaithCode(d.code)) continue;'));
    expect(src).toMatch(/if \(isPositiveCode\(code\)\) \{[\s\S]{0,200}observePositive\(/);
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

  /*
   * Since 28 September 2026 a person's own record serves patterns through patterns/who-reads-a-pattern,
   * and the softening wrapper ("Your record across sessions shows something worth noticing") is gone
   * for every kind, so this reads what is served rather than the branch that used to choose it.
   */
  it('and nobody softens a compliment, which one hardcoded copy of the list would have done', () => {
    const grounds = readFileSync(join(__dirname, '..', 'grounds', 'grounds.service.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(grounds).not.toMatch(/const POSITIVE_CODES = new Set\(\['R3'\]\)/);
    expect(grounds).not.toMatch(/worth noticing/);
    const { servedPatterns } = require('./who-reads-a-pattern');
    const [served] = servedPatterns([{ id: 'x', participantId: 'p', code: 'R3', observationText: 'Credited Ngozi for the pricing sheet.', seenInSessions: [1, 2, 3] }], { participantId: 'p', runsIt: false }, { on: true });
    expect(served.kind).toBe('good');
    expect(served.whatHappened).toBe('Credited Ngozi for the pricing sheet.');
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

/*
 * The third family. Left out of the positives on purpose - every code in that list is badged
 * "Good sign", and "Good sign: this person is absorbing everybody else's coordination debt" is the
 * wrong sentence. Put in with the bad-faith codes it would have been worse: softened as though the
 * person had done something wrong, when what they have done is hold something together.
 */
describe('carrying is its own thing, neither a good sign nor a fault', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const lib = require('./pattern-library');

  it('the absorption codes exist and are in neither of the other two families', () => {
    for (const c of ['A1', 'A2', 'A3']) {
      expect(lib.isCarryingCode(c)).toBe(true);
      expect(lib.isPositiveCode(c)).toBe(false);
      expect(lib.isBadFaithCode(c)).toBe(false);
    }
  });

  it('the model can actually answer with one', () => {
    const codes = lib.PATTERN_DETECTION_SCHEMA.input_schema.properties.detections.items.properties.code.enum;
    for (const c of lib.CARRYING_CODES) expect(codes).toContain(c.code);
    expect(lib.PATTERN_DETECTION_PROMPT).toMatch(/AND THE ONES THAT ARE NEITHER/);
  });

  it('and is told to write it about the situation, never about the person', () => {
    expect(lib.PATTERN_DETECTION_PROMPT).toMatch(/never a fault in the person/);
    expect(lib.PATTERN_DETECTION_PROMPT).toMatch(/usually a fault around them/);
  });

  it('it takes the three-period rule, because one hard week is not carrying the place', () => {
    /*
     * Since the five-reads build (30 September 2026), a single read no longer writes anything -
     * whatOneReadKeeps only decides what one read would keep, and analyzeCheckIn writes once a
     * code is kept by three of the five. A carrying code is never routed through
     * observePositive (that stays for the isPositiveCode branch only), so it lands in the same
     * write path as a bad-faith code - this.observe(), which is where the three-period rule
     * lives. That is what this test checks now, in two parts.
     */
    const src = readFileSync(join(__dirname, 'patterns.service.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    // The carrying branch keeps the code (for the vote) without surfacing it immediately.
    expect(src).toMatch(/if \(isCarryingCode\(d\.code\)\) \{[\s\S]{0,120}kept\.push\(/);
    // And the write loop only calls observePositive for a positive code - everything else,
    // carrying included, goes through this.observe(), which is where THREE_PERIOD_RULE lives.
    expect(src).toMatch(/if \(isPositiveCode\(code\)\) \{[\s\S]{0,200}observePositive\([\s\S]{0,200}\} else \{[\s\S]{0,150}this\.observe\(/);
  });

  it('but skips the confirming call, which is there to slow an accusation down', () => {
    const src = readFileSync(join(__dirname, 'patterns.service.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    const branch = src.slice(src.indexOf('if (isCarryingCode(d.code))'), src.indexOf('if (!isBadFaithCode(d.code)) continue;'));
    expect(branch).not.toMatch(/confirmDetection/);
  });

  /* Served through patterns/who-reads-a-pattern since 28 September 2026: the kind comes from the plain names. */
  it('the board gives it its own word, not one of the other two', () => {
    expect(lib.WHAT_A_CARRYING_CODE_IS_CALLED).toBe('Carrying');
    const { plainNameOf } = require('./plain-pattern-names');
    for (const c of lib.CARRYING_CODES) expect(plainNameOf(c.code).kind).toBe('carrying');
  });

  it('and nobody softens it as bad news about them', () => {
    const { servedPatterns } = require('./who-reads-a-pattern');
    const [served] = servedPatterns([{ id: 'x', participantId: 'p', code: 'A2', observationText: 'Fixed the pricing sheet the night before the pitch.', seenInSessions: [1, 2, 3] }], { participantId: 'p', runsIt: false }, { on: true });
    expect(served.kind).toBe('carrying');
    expect(served.whatHappened).toBe('Fixed the pricing sheet the night before the pitch.');
  });

  it('every reader of the code catalogue knows about it, or the report dies on a missing code', () => {
    const reports = readFileSync(join(__dirname, '..', 'reports', 'reports.service.ts'), 'utf8');
    expect(reports).toMatch(/\.\.\.BAD_FAITH_CODES, \.\.\.POSITIVE_CODES, \.\.\.CARRYING_CODES/);
  });
});
