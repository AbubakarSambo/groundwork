/**
 * THE DETECTOR READS THE SAME CHECK-IN THE SAME WAY (Hafsah, 30 September 2026, step 2).
 *
 * Measured live against run-20 of journey/all-24 (see api/journey/the-detector-read-twice.ts and
 * docs/morning-report.md, "Step 2, the fix"): only 31 of 87 check-ins gave identical kept patterns
 * across two reads. This does not test the live model - it tests the two things that are true
 * whatever the measurement said:
 *
 * 1. The plumbing exists and both detector calls can be asked for the model's steadiest setting
 *    (temperature 0, a fixed seed) with the exact same options object, so a future decision to turn
 *    it on does not need new code - only the numbers to justify it.
 * 2. Given the SAME thing back from the model twice, the deterministic filtering that decides what
 *    gets written (the borrowed-evidence check, the positive-code short road, the chaser guard, the
 *    confirming call, the F1 composite gate) writes the same (person, code) set both times. This is
 *    the half of "read twice, get the same answer" that does not depend on the model at all, and it
 *    was true before this change and must stay true after it.
 */
import { PatternsService, PATTERN_DETECTION_STEADY_OPTIONS } from './patterns.service';

describe('PATTERN_DETECTION_STEADY_OPTIONS', () => {
  it('is the model\'s steadiest setting: temperature 0 and a fixed seed', () => {
    expect(PATTERN_DETECTION_STEADY_OPTIONS.temperature).toBe(0);
    expect(typeof PATTERN_DETECTION_STEADY_OPTIONS.seed).toBe('number');
  });
});

describe('confirmDetection forwards the exact same options object to anthropic.respond', () => {
  it('passes nothing extra when called the way every check-in is confirmed today', async () => {
    const respond: jest.Mock = jest.fn(async () => 'YES');
    const svc: any = new PatternsService({} as any, { respond } as any);
    await svc.confirmDetection('B1', 'They told the board it shipped; the team says it has not.');
    expect(respond.mock.calls[0][2]).toEqual({});
  });

  it('passes the steady options straight through when a caller (the measurement script) asks for them', async () => {
    const respond: jest.Mock = jest.fn(async () => 'YES');
    const svc: any = new PatternsService({} as any, { respond } as any);
    await svc.confirmDetection('B1', 'They told the board it shipped; the team says it has not.', PATTERN_DETECTION_STEADY_OPTIONS);
    expect(respond.mock.calls[0][2]).toBe(PATTERN_DETECTION_STEADY_OPTIONS);
  });
});

describe('two runs of analyzeCheckIn on the same check-in, with a stub model returning the same detections, write the same (person, code) set', () => {
  function checkInFixture() {
    return {
      id: 'check-1', groundId: 'g1', participantId: 'p1', sessionNumber: 3,
      patternsAnalyzedAt: null, specificityDimensions: null,
      completedAt: new Date('2026-09-01'), startedAt: null, createdAt: new Date('2026-09-01'),
      ground: { cadence: 'WEEKLY' },
    };
  }

  function buildPrisma() {
    return {
      checkIn: {
        findUnique: jest.fn(async () => checkInFixture()),
        update: jest.fn(async () => ({})),
      },
      conversationTurn: {
        findMany: jest.fn(async () => [
          { role: 'PERSON', content: 'The board heard it shipped; the team says three things are still open.', createdAt: new Date('2026-09-01') },
        ]),
      },
      recordEntry: {
        findMany: jest.fn(async () => [] as { text: string }[]),
      },
      patternDetection: {
        findMany: jest.fn(async () => [] as any[]),
      },
      groundDependency: {
        findMany: jest.fn(async () => [] as any[]),
      },
    };
  }

  function buildAnthropic() {
    return {
      // The same detections both times - this is what "the model reads it the same way" means for
      // this test; whether the live model actually does that is the live measurement, not this.
      extract: jest.fn(async () => ({
        detections: [
          { code: 'B1', observation: 'What leadership was told does not match what the team describes.' },
        ],
      })),
      respond: jest.fn(async () => 'YES'),
    };
  }

  async function runOnce() {
    const prisma = buildPrisma();
    const anthropic = buildAnthropic();
    const svc: any = new PatternsService(prisma as any, anthropic as any);
    // buildDetectionInputForParticipant does its own set of prisma reads this test does not need
    // to satisfy; B1 has a number-based rule (PATTERN_DETECTORS.B1), so evidenceSourceFor calls it.
    svc.buildDetectionInputForParticipant = jest.fn(async () => ({ submissions: [] }));
    const written: { participantId: string; code: string }[] = [];
    svc.observe = jest.fn(async (_groundId: string, participantId: string, code: string) => {
      written.push({ participantId, code });
    });
    svc.observePositive = jest.fn(async (_groundId: string, participantId: string, code: string) => {
      written.push({ participantId, code });
    });
    await svc.analyzeCheckIn('check-1');
    return written;
  }

  it('writes the same set both times', async () => {
    const a = await runOnce();
    const b = await runOnce();
    expect(a.length).toBeGreaterThan(0);
    expect(new Set(a.map((w) => `${w.participantId}::${w.code}`)))
      .toEqual(new Set(b.map((w) => `${w.participantId}::${w.code}`)));
  });
});

describe('nothing was dropped: every one of the 49 codes is still in the library and still reachable', () => {
  it('the three families add up to 49 codes', () => {
    const { POSITIVE_CODES, CARRYING_CODES, BAD_FAITH_CODES } = require('./pattern-library');
    expect(POSITIVE_CODES.length + CARRYING_CODES.length + BAD_FAITH_CODES.length).toBe(49);
  });

  it('every code the library knows is in the schema the model is asked to choose from', () => {
    const { POSITIVE_CODES, CARRYING_CODES, BAD_FAITH_CODES, PATTERN_DETECTION_SCHEMA } = require('./pattern-library');
    const every = [...POSITIVE_CODES, ...CARRYING_CODES, ...BAD_FAITH_CODES].map((c: any) => c.code);
    const enumInSchema: string[] = PATTERN_DETECTION_SCHEMA.input_schema.properties.detections.items.properties.code.enum;
    for (const code of every) expect(enumInSchema).toContain(code);
    expect(enumInSchema.length).toBe(49);
  });

  it('every code the library knows is named in the detection prompt', () => {
    const { POSITIVE_CODES, CARRYING_CODES, BAD_FAITH_CODES, PATTERN_DETECTION_PROMPT } = require('./pattern-library');
    const every = [...POSITIVE_CODES, ...CARRYING_CODES, ...BAD_FAITH_CODES];
    for (const c of every) expect(PATTERN_DETECTION_PROMPT).toContain(c.code);
  });
});
