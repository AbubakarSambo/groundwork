/**
 * THE DETECTOR'S PROMPT IS A STORED VERSION, AND EACH PATTERN SAYS WHICH ONE READ IT (decision 128).
 *
 * The version stored under `pattern_detection` is the one that runs; the text in the code is what a
 * start seeds and what is used when nothing is stored. A pattern keeps the id of the version that
 * read the check-in that last kept it. Rows written before this stay valid with no id.
 */
import { PatternsService } from './patterns.service';
import { PATTERN_DETECTION_PROMPT, PATTERN_DETECTION_PROMPT_KEY, PATTERN_DETECTION_SCHEMA } from './pattern-library';
import { SEED_PROMPTS } from '../conversation/prompt-library';
import { PatternStatus } from '@prisma/client';

describe('the detector prompt as a stored version', () => {
  it('is seeded on start with the code text, under its own key', () => {
    const seed = SEED_PROMPTS.find((p) => p.key === PATTERN_DETECTION_PROMPT_KEY);
    expect(PATTERN_DETECTION_PROMPT_KEY).toBe('pattern_detection');
    expect(seed?.content).toBe(PATTERN_DETECTION_PROMPT);
  });

  it('runs the stored active version and reports its id', async () => {
    const prompts: any = { getActive: jest.fn(async () => ({ id: 'v-new', content: 'STORED TEXT' })) };
    const svc: any = new PatternsService({} as any, {} as any, undefined, prompts);
    expect(await svc.theDetectorPrompt()).toEqual({ content: 'STORED TEXT', id: 'v-new' });
    expect(prompts.getActive).toHaveBeenCalledWith('pattern_detection');
  });

  it('falls back to the code text, with no id, when nothing is stored or the lookup fails', async () => {
    const none: any = { getActive: jest.fn(async () => { throw new Error('no version'); }) };
    expect(await (new PatternsService({} as any, {} as any, undefined, none) as any).theDetectorPrompt()).toEqual({ content: PATTERN_DETECTION_PROMPT, id: null });
    expect(await (new PatternsService({} as any, {} as any) as any).theDetectorPrompt()).toEqual({ content: PATTERN_DETECTION_PROMPT, id: null });
  });

  function prismaWith(existing: any) {
    const update = jest.fn(async (args: any) => ({ ...existing, ...args.data }));
    const create = jest.fn(async (args: any) => ({ id: 'n', ...args.data }));
    return { prisma: { patternDetection: { findUnique: jest.fn(async () => existing), create, update }, groundParticipant: { findUnique: jest.fn(async () => null) } } as any, update, create };
  }

  it('writes the version id on a new pattern and moves it on a later sighting', async () => {
    const a = prismaWith(null);
    const svcA: any = new PatternsService(a.prisma, {} as any);
    jest.spyOn(svcA, 'createAndMirror').mockImplementation(async (data: any) => a.create({ data }));
    await svcA.observe('g', 'p', 'B2', 'Something.', 1, 'model', 'v1');
    expect(a.create).toHaveBeenCalledWith({ data: expect.objectContaining({ promptVersionId: 'v1' }) });

    const existing = { id: 'x', lastPeriodNumber: 1, periodsObserved: 1, seenInSessions: [1], status: PatternStatus.CANDIDATE, evidenceSource: 'model', readyAt: null, promptVersionId: 'v1' };
    const b = prismaWith(existing);
    await (new PatternsService(b.prisma, {} as any) as any).observe('g', 'p', 'B2', 'Again.', 2, 'model', 'v2');
    expect(b.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ promptVersionId: 'v2' }) }));
  });

  it('leaves a row with no id valid, and does not blank an id when the code text ran', async () => {
    const existing = { id: 'x', lastPeriodNumber: 1, periodsObserved: 1, seenInSessions: [1], status: PatternStatus.CANDIDATE, evidenceSource: 'model', readyAt: null, promptVersionId: null };
    const c = prismaWith(existing);
    await (new PatternsService(c.prisma, {} as any) as any).observePositive('g', 'p', 'M1', 'Shipped 3 of 3.', 2, 'model', null);
    expect(c.update.mock.calls[0][0].data).not.toHaveProperty('promptVersionId');
  });
});

describe('the sharper detector prompt (decision 124, item 3)', () => {
  it('tells the model to decide every code the same way and to quote the sentence that shows it', () => {
    expect(PATTERN_DETECTION_PROMPT).toContain('DECIDE EVERY CODE THE SAME WAY, EVERY TIME');
    expect(PATTERN_DETECTION_PROMPT).toContain('copy that sentence, exactly as it is written, into "quote"');
    expect(PATTERN_DETECTION_PROMPT).toContain('A hint is not a sentence that does what the signal says');
  });

  it('keeps every code, and gives the codes that came and went most a line for what counts and what does not', () => {
    for (const code of ['D6', 'K1', 'D3', 'F1', 'A1', 'D1', 'M1', 'B11', 'E2', 'K3']) {
      expect(PATTERN_DETECTION_PROMPT).toMatch(new RegExp(`- ${code} \\(.*Counts when`));
    }
    expect((PATTERN_DETECTION_PROMPT.match(/^- [A-Z]\d+ \(/gm) ?? []).length).toBeGreaterThanOrEqual(49);
  });

  it('asks for the quote in the schema ahead of the observation, but does not require it, so the earlier stored version still works', () => {
    const item: any = (PATTERN_DETECTION_SCHEMA as any).input_schema.properties.detections.items;
    expect(Object.keys(item.properties)).toEqual(['code', 'quote', 'observation']);
    expect(item.required).toEqual(['code', 'observation']);
  });
});
