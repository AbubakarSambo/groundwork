import { ConversationService } from './conversation.service';
import { ALIGNMENT_PROMPT } from './prompt-library';

/**
 * DO THE TWO VIEWS OF THIS PERSON'S JOB CONNECT? GW-EXP-3.
 *
 * The finding the product exists for, and the last of the six slices:
 *
 *     "I was measured on a queue and judged on judgement, and only one of those was said."
 *
 * One side is what the lead said they expect. The other is what this person said doing well looks
 * like, in their own session, in their own words. Neither is wrong. Whether they CONNECT is the only
 * question the product is allowed to ask, and it is the one nobody in that story ever asked.
 *
 * THE STATE THIS FILE MOSTLY EXISTS TO PROTECT IS CANNOT_TELL. `mayCompare` already refuses to infer
 * connection from word overlap and says why: "this is a real comparison for a person to make, not
 * something to infer from word overlap." A read that guesses invents agreement - letting a real
 * mismatch run for months - or invents conflict, starting an argument out of nothing. Both are worse
 * than saying plainly that it cannot be told, which is a prompt for two people to talk.
 */
function makeService(over: { expectation?: string | null; own?: string[]; verdict?: string; note?: string } = {}) {
  const update = jest.fn(async (a: any) => a);
  const prisma: any = {
    personObjective: {
      /**
       * `findFirst` as well as `findUnique`: a person can now be held to several things, so the
       * service reads the most recently changed row and writes the objection or the alignment read
       * BACK TO THAT ROW - which is why the fixture carries an id.
       */
      findFirst: jest.fn(async () =>
        over.expectation === null ? null : { id: 'obj-1', text: over.expectation ?? 'Own the weekly delivery call by week four' },
      ),
      update,
    },
    recordEntry: {
      findMany: jest.fn(async () => (over.own ?? ['What good looks like is owning the weekly number end to end']).map((text) => ({ text }))),
    },
  };
  const anthropic: any = {
    extract: jest.fn(async () => ({ verdict: over.verdict ?? 'ALIGNS', note: over.note ?? 'Both describe owning the weekly cycle.' })),
  };
  const svc = new ConversationService(
    prisma, {} as any, anthropic, {} as any, {} as any,
    {} as any, {} as any, {} as any, {} as any, {} as any,
  );
  return { svc, update, anthropic, prisma };
}

describe('GW-EXP-3: nothing is invented where somebody has not spoken', () => {
  it('no expectation means no read, and the model is never called', async () => {
    const { svc, anthropic, update } = makeService({ expectation: null });
    await svc.extractAlignment('c1', 'p1', 'g1');
    expect(anthropic.extract).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it('no stated view of their own means no read either', async () => {
    /**
     * The important half. Leaving alignment null makes the surface say "not yet said" - an absent view
     * must never render as a matching one, which is what a default of ALIGNS would have done.
     */
    const { svc, anthropic, update } = makeService({ own: [] });
    await svc.extractAlignment('c1', 'p1', 'g1');
    expect(anthropic.extract).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it('and it compares their own words, newest first, not the whole history', async () => {
    const { svc, prisma } = makeService();
    await svc.extractAlignment('c1', 'p1', 'g1');
    const arg = prisma.recordEntry.findMany.mock.calls[0][0];
    expect(arg.where.type).toBe('SUCCESS_DEFINITION');
    expect(arg.orderBy).toEqual({ createdAt: 'desc' });
    expect(arg.take).toBe(3);
  });
});

describe('GW-EXP-3: what gets stored', () => {
  it.each(['ALIGNS', 'DIFFERS', 'CANNOT_TELL'])('stores %s as given', async (verdict) => {
    const { svc, update } = makeService({ verdict });
    await svc.extractAlignment('c1', 'p1', 'g1');
    expect((update.mock.calls[0][0] as any).data.alignment).toBe(verdict);
  });

  it('an unrecognised verdict becomes CANNOT_TELL rather than being stored raw or dropped', async () => {
    /**
     * Dropping would leave a previous read standing over words that have since changed. Storing junk
     * would put a state on screen nothing knows how to render. Neither is honest; "cannot tell" is.
     */
    const { svc, update } = makeService({ verdict: 'PROBABLY_FINE' });
    await svc.extractAlignment('c1', 'p1', 'g1');
    expect((update.mock.calls[0][0] as any).data.alignment).toBe('CANNOT_TELL');
  });

  it('an empty note is stored as null, not as an empty string', async () => {
    const { svc, update } = makeService({ note: '   ' });
    await svc.extractAlignment('c1', 'p1', 'g1');
    expect((update.mock.calls[0][0] as any).data.alignmentNote).toBeNull();
  });
});

describe('GW-EXP-3: the prompt pushes towards cannot-tell and never judges', () => {
  it('CANNOT_TELL is offered as the right answer when reaching', () => {
    expect(ALIGNMENT_PROMPT).toMatch(/CANNOT_TELL is the right answer whenever you are reaching/);
    expect(ALIGNMENT_PROMPT).toMatch(/Two statements sharing a word are not aligned/);
    expect(ALIGNMENT_PROMPT).toMatch(/If you are inferring rather than reading, say CANNOT_TELL/);
  });

  it('and comparing is explicitly not ranking', () => {
    expect(ALIGNMENT_PROMPT).toMatch(/Never say which is better, more ambitious, more realistic, or more correct/);
    expect(ALIGNMENT_PROMPT).toMatch(/You are comparing two sentences, not assessing anybody/);
  });

  it('and DIFFERS is stated as not a criticism, because it will be read as one', () => {
    expect(ALIGNMENT_PROMPT).toMatch(/This is not a criticism of either person/);
  });

  it('and it never tells anybody what to do about it', () => {
    /** The moment it suggests a fix, it has taken over the conversation the two of them should have. */
    expect(ALIGNMENT_PROMPT).toMatch(/Never suggest what either of them should do about it/);
  });
});
