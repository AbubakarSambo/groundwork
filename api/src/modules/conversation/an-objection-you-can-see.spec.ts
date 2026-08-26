import { ConversationService } from './conversation.service';
import { OBJECTION_PROMPT } from './prompt-library';
import { TurnRole } from '@prisma/client';

/**
 * AN OBJECTION SOMEBODY CAN SEE. GW-EXP-7. Her decision: "They should object in a way that you can see."
 *
 * THE IMBALANCE THIS ENDS. A lead revises an expectation and the new words land on the card everybody
 * reads, with a reason attached. The person it is about could disagree all they liked and it went into
 * a transcript nobody opens. The visible lever belonged entirely to the side that already had the
 * power over the expectation.
 *
 * WHAT IT IS NOT. It does not change the expectation - one person still owns that, and an objection
 * that silently rewrote the target would be the chaos the whole design avoided. It makes the
 * disagreement visible so the lead answers it, rather than never hearing it.
 *
 * AND IT IS NOT THE ALIGNMENT READ. "They described doing well differently" is a difference of view,
 * inferred from two statements. This is "I think this is wrong", said on purpose.
 */
function makeService(over: { expectation?: string | null; objected?: boolean; words?: string } = {}) {
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
    conversationTurn: {
      findMany: jest.fn(async () => [{ role: TurnRole.PERSON, content: 'That was never my job.' }]),
    },
  };
  const anthropic: any = {
    extract: jest.fn(async () => ({
      objected: over.objected ?? true,
      words: over.words ?? 'That was never my job, it belongs to the account team.',
    })),
  };
  const svc = new ConversationService(
    prisma, {} as any, anthropic, {} as any, {} as any,
    {} as any, {} as any, {} as any, {} as any, {} as any,
  );
  return { svc, update, anthropic };
}

describe('GW-EXP-7: an objection is recorded in their own words', () => {
  it('stores the sentence they actually said, with a timestamp', async () => {
    const { svc, update } = makeService();
    await svc.extractObjection('c1', 'p1', 'g1');
    const data = (update.mock.calls[0][0] as any).data;
    expect(data.objection).toBe('That was never my job, it belongs to the account team.');
    expect(data.objectionAt).toBeInstanceOf(Date);
  });

  it('and never changes the expectation itself', async () => {
    /**
     * The line that keeps "one person owns it" true. An objection that rewrote the target would be
     * exactly the free-for-all the design was built to avoid.
     */
    const { svc, update } = makeService();
    await svc.extractObjection('c1', 'p1', 'g1');
    const data = (update.mock.calls[0][0] as any).data;
    expect(data.text).toBeUndefined();
    expect(data.authoredBy).toBeUndefined();
    expect(data.seenBySubject).toBeUndefined();
  });
});

describe('GW-EXP-7: nothing is invented', () => {
  it('no expectation means there is nothing to object to, and the model is not called', async () => {
    const { svc, anthropic, update } = makeService({ expectation: null });
    await svc.extractObjection('c1', 'p1', 'g1');
    expect(anthropic.extract).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it('no objection writes nothing', async () => {
    const { svc, update } = makeService({ objected: false });
    await svc.extractObjection('c1', 'p1', 'g1');
    expect(update).not.toHaveBeenCalled();
  });

  it('an objection with no words is discarded rather than recorded as a bare flag', async () => {
    /**
     * "They objected" with no sentence anybody can read is an accusation the person cannot answer and
     * the lead cannot act on. Their words or nothing.
     */
    const { svc, update } = makeService({ objected: true, words: '   ' });
    await svc.extractObjection('c1', 'p1', 'g1');
    expect(update).not.toHaveBeenCalled();
  });
});

describe('GW-EXP-7: the prompt guards hardest against the false positive', () => {
  it('struggling with an expectation is named as NOT objecting to it', () => {
    /**
     * The failure to avoid. Most of a check-in is somebody describing difficulty, and reading that as
     * a dispute would put "objects to their expectation" in front of their lead for a person who
     * disputed nothing - a serious thing to do to somebody by accident.
     */
    expect(OBJECTION_PROMPT).toMatch(/Someone struggling with an expectation has not objected to it/);
    expect(OBJECTION_PROMPT).toMatch(/Saying the work is hard, slow, behind, or going badly/);
    expect(OBJECTION_PROMPT).toMatch(/Describing an obstacle, a blocker/);
    expect(OBJECTION_PROMPT).toMatch(/Saying they have not done it yet/);
  });

  it('and it asks for their words rather than a summary', () => {
    expect(OBJECTION_PROMPT).toMatch(/their own words - the sentence where they said it, quoted from the transcript, not your summary/);
  });

  it('and says no-objection is the normal answer', () => {
    expect(OBJECTION_PROMPT).toMatch(/"No objection" is the correct answer for almost every transcript/);
    expect(OBJECTION_PROMPT).toMatch(/puts words in somebody's mouth/);
  });
});
