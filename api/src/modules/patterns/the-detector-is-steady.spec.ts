/**
 * THE DETECTOR READS THE SAME CHECK-IN THE SAME WAY (Hafsah, 30 September 2026, step 2, then the
 * five-reads build later the same day).
 *
 * Measured live against run-20 of journey/all-24 (50 check-ins - see
 * api/journey/how-steady-each-way-is.py and -2.py and docs/morning-report.md): one ordinary read
 * gives the same (person, pattern) pairs across a scenario only 36% of the time. One read at the
 * model's steadiest setting (temperature 0, a fixed seed) gives 57%. Five steady reads, keeping a
 * pattern only when at least three of the five keep it, gives 80%, and still finds at least as many
 * real patterns as a single read (71% of the patterns most reads agree on, measured
 * independently).
 *
 * This file does not test the live model - it tests the things that are true whatever the
 * measurement said:
 *
 * 1. Every check-in is read five times (READS_PER_CHECK_IN), each extraction call and the
 *    confirming call at the model's steadiest setting (PATTERN_DETECTION_STEADY_OPTIONS).
 * 2. A code is written once at least three of the five reads (READS_THAT_MUST_AGREE) keep it, and
 *    not written when only two do. Since 1 October 2026, when two or three of five keep a code on a
 *    pattern not yet shown, five more reads are taken and it is decided on all ten, on the same line
 *    (six of ten); see a-period-at-the-line-is-settled-on-all-the-evidence.spec.ts.
 * 3. The observation written is the one from the first of the five reads, in order, that kept the
 *    code.
 * 4. If some reads fail, a code still keeps if at least three of the reads that succeeded keep it,
 *    and at least three succeeded; if fewer than three succeed, nothing is written and the check-in
 *    is left unmarked so the nightly sweep retries it.
 * 5. Given the same thing back from the model on every read, the deterministic filtering that
 *    decides what gets written (the borrowed-evidence check, the positive-code short road, the
 *    chaser guard, the confirming call, the F1 composite gate) writes the same (person, code) set
 *    on two separate runs. This is the half of "read it the same way" that does not depend on the
 *    model at all, and it was true before this change and must stay true after it.
 */
import { PatternsService, PATTERN_DETECTION_STEADY_OPTIONS, READS_PER_CHECK_IN, READS_THAT_MUST_AGREE } from './patterns.service';

describe('PATTERN_DETECTION_STEADY_OPTIONS', () => {
  it('is the model\'s steadiest setting: temperature 0 and a fixed seed', () => {
    expect(PATTERN_DETECTION_STEADY_OPTIONS.temperature).toBe(0);
    expect(typeof PATTERN_DETECTION_STEADY_OPTIONS.seed).toBe('number');
  });
});

describe('the five-reads numbers', () => {
  it('reads a check-in five times and needs three of the five to agree', () => {
    expect(READS_PER_CHECK_IN).toBe(5);
    expect(READS_THAT_MUST_AGREE).toBe(3);
  });
});

describe('confirmDetection forwards the exact same options object to anthropic.respond', () => {
  it('passes nothing extra when called with no options', async () => {
    const respond: jest.Mock = jest.fn(async () => 'YES');
    const svc: any = new PatternsService({} as any, { respond } as any);
    await svc.confirmDetection('B1', 'They told the board it shipped; the team says it has not.');
    expect(respond.mock.calls[0][2]).toEqual({});
  });

  it('passes the steady options straight through when a caller asks for them', async () => {
    const respond: jest.Mock = jest.fn(async () => 'YES');
    const svc: any = new PatternsService({} as any, { respond } as any);
    await svc.confirmDetection('B1', 'They told the board it shipped; the team says it has not.', PATTERN_DETECTION_STEADY_OPTIONS);
    expect(respond.mock.calls[0][2]).toBe(PATTERN_DETECTION_STEADY_OPTIONS);
  });
});

describe('analyzeCheckIn reads a check-in five times, at the steady setting', () => {
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

  /**
   * Every extraction call returns the same detection, `keptOn` times out of the first five, in order.
   * When the first five are split (two or three of five), the check-in is read five more times (see
   * a-period-at-the-line-is-settled-on-all-the-evidence); `moreKeptOn` of those keep it.
   */
  function buildAnthropic(keptOn: number, code = 'B1', observationPrefix = 'read', moreKeptOn = 0) {
    let call = 0;
    return {
      extract: jest.fn(async () => {
        call += 1;
        const shouldKeep = call <= 5 ? call <= keptOn : call - 5 <= moreKeptOn;
        return {
          detections: shouldKeep
            ? [{ code, observation: `${observationPrefix} ${call}: what leadership was told does not match what the team describes.` }]
            : [],
        };
      }),
      respond: jest.fn(async () => 'YES'),
    };
  }

  function buildService(prisma: any, anthropic: any) {
    const svc: any = new PatternsService(prisma, anthropic);
    // buildDetectionInputForParticipant does its own set of prisma reads this test does not need
    // to satisfy; B1 has a number-based rule (PATTERN_DETECTORS.B1), so evidenceSourceFor calls it.
    svc.buildDetectionInputForParticipant = jest.fn(async () => ({ submissions: [] }));
    return svc;
  }

  it('makes five extraction calls, each with the steady options', async () => {
    const prisma = buildPrisma();
    const anthropic = buildAnthropic(5);
    const svc = buildService(prisma, anthropic);
    svc.observe = jest.fn(async () => {});
    svc.observePositive = jest.fn(async () => {});

    await svc.analyzeCheckIn('check-1');

    expect(anthropic.extract).toHaveBeenCalledTimes(5);
    for (const call of anthropic.extract.mock.calls as any[]) {
      expect(call[3]).toBe(PATTERN_DETECTION_STEADY_OPTIONS);
    }
  });

  it('the confirming call gets the steady options too', async () => {
    const prisma = buildPrisma();
    const anthropic = buildAnthropic(5);
    const svc = buildService(prisma, anthropic);
    svc.observe = jest.fn(async () => {});
    svc.observePositive = jest.fn(async () => {});

    await svc.analyzeCheckIn('check-1');

    expect(anthropic.respond).toHaveBeenCalled();
    for (const call of anthropic.respond.mock.calls as any[]) {
      expect(call[2]).toBe(PATTERN_DETECTION_STEADY_OPTIONS);
    }
  });

  /* Changed 1 October 2026: three of five is now a split period, so the five more reads it brings
     decide it on all ten. Here three of those five keep it too (six of ten), so it is written. */
  it('a code kept by 3 of 5 reads, and by 3 of the 5 more reads the split brings, is written once', async () => {
    const prisma = buildPrisma();
    const anthropic = buildAnthropic(3, 'B1', 'read', 3);
    const svc = buildService(prisma, anthropic);
    const written: { code: string; observation: string }[] = [];
    svc.observe = jest.fn(async (_g: string, _p: string, code: string, observation: string) => {
      written.push({ code, observation });
    });
    svc.observePositive = jest.fn(async () => {});

    await svc.analyzeCheckIn('check-1');

    expect(written).toHaveLength(1);
    expect(written[0].code).toBe('B1');
  });

  it('a code kept by only 2 of 5 reads is not written', async () => {
    const prisma = buildPrisma();
    const anthropic = buildAnthropic(2);
    const svc = buildService(prisma, anthropic);
    svc.observe = jest.fn(async () => {});
    svc.observePositive = jest.fn(async () => {});

    await svc.analyzeCheckIn('check-1');

    expect(svc.observe).not.toHaveBeenCalled();
    expect(svc.observePositive).not.toHaveBeenCalled();
  });

  it('the observation written is the one from the first of the five reads that kept it', async () => {
    const prisma = buildPrisma();
    const anthropic = buildAnthropic(3, 'B1', 'read', 3);
    const svc = buildService(prisma, anthropic);
    const written: { code: string; observation: string }[] = [];
    svc.observe = jest.fn(async (_g: string, _p: string, code: string, observation: string) => {
      written.push({ code, observation });
    });
    svc.observePositive = jest.fn(async () => {});

    await svc.analyzeCheckIn('check-1');

    expect(written[0].observation).toContain('read 1:');
  });

  it('checks in are still marked analysed when enough reads succeed', async () => {
    const prisma = buildPrisma();
    const anthropic = buildAnthropic(3);
    const svc = buildService(prisma, anthropic);
    svc.observe = jest.fn(async () => {});
    svc.observePositive = jest.fn(async () => {});

    await svc.analyzeCheckIn('check-1');

    expect(prisma.checkIn.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'check-1' } }),
    );
  });
});

describe('when some of the five reads fail', () => {
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
      recordEntry: { findMany: jest.fn(async () => [] as { text: string }[]) },
      patternDetection: { findMany: jest.fn(async () => [] as any[]) },
      groundDependency: { findMany: jest.fn(async () => [] as any[]) },
    };
  }

  function buildService(prisma: any, anthropic: any) {
    const svc: any = new PatternsService(prisma, anthropic);
    svc.buildDetectionInputForParticipant = jest.fn(async () => ({ submissions: [] }));
    return svc;
  }

  /** `failCount` of the five extraction calls reject; the rest all keep the same code. */
  function buildAnthropicWithFailures(failCount: number) {
    let call = 0;
    return {
      extract: jest.fn(async () => {
        call += 1;
        if (call <= failCount) throw new Error('model unreachable');
        return { detections: [{ code: 'B1', observation: `read ${call}: what leadership was told does not match what the team describes.` }] };
      }),
      respond: jest.fn(async () => 'YES'),
    };
  }

  it('with 2 of 5 reads failing and the other 3 agreeing, the code is written', async () => {
    const prisma = buildPrisma();
    const anthropic = buildAnthropicWithFailures(2);
    const svc = buildService(prisma, anthropic);
    const written: { code: string }[] = [];
    svc.observe = jest.fn(async (_g: string, _p: string, code: string) => { written.push({ code }); });
    svc.observePositive = jest.fn(async () => {});

    await svc.analyzeCheckIn('check-1');

    expect(written).toHaveLength(1);
    expect(written[0].code).toBe('B1');
    expect(prisma.checkIn.update).toHaveBeenCalled();
  });

  it('with 3 of 5 reads failing, nothing is written and the check-in is not marked analysed', async () => {
    const prisma = buildPrisma();
    const anthropic = buildAnthropicWithFailures(3);
    const svc = buildService(prisma, anthropic);
    svc.observe = jest.fn(async () => {});
    svc.observePositive = jest.fn(async () => {});

    await svc.analyzeCheckIn('check-1');

    expect(svc.observe).not.toHaveBeenCalled();
    expect(svc.observePositive).not.toHaveBeenCalled();
    expect(prisma.checkIn.update).not.toHaveBeenCalled();
  });
});

describe('two runs of analyzeCheckIn on the same check-in, with a stub model returning the same detections every read, write the same (person, code) set', () => {
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
      // The same detection on every one of the five reads - this is what "the model reads it the
      // same way" means for this test; whether the live model actually does that is the live
      // measurement, not this.
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
