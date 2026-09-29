import { theEndCard, isASentence, theCommitmentTheCloseStates, HOW } from './the-end-card';
import { ConversationService } from './conversation.service';

/**
 * THE END CARD, RUN-19 (task 2.7, third try). Two things read on the card:
 * 1. the goodbye said "You will keep following up with customers for their statements." and the card
 *    had no commitment, in 13 of 20 closes;
 * 2. pieces that are not sentences ("The last day of March.", "A target of 40.") were shown as lines.
 * These tests check the words a person reads on the card.
 */

const FEMIS_GOODBYE =
  'You will keep following up with customers for their statements.\n\nThat’s all for today. Below is what I wrote down from your answers. Is anything wrong?';

describe('the commitment the goodbye states', () => {
  it('is read from the text before "That’s all for today", as the reply said it', () => {
    expect(theCommitmentTheCloseStates(FEMIS_GOODBYE)).toBe('You will keep following up with customers for their statements.');
    expect(theCommitmentTheCloseStates('You’ll visit Westgate Deli on Friday. That’s all for today.')).toBe('You’ll visit Westgate Deli on Friday.');
    expect(theCommitmentTheCloseStates('Thanks. You said you will call Tobi. That’s all for today.')).toBe('You said you will call Tobi.');
  });

  it('is not added when the goodbye states none, or a commitment on the card names the same thing', () => {
    expect(theCommitmentTheCloseStates('That’s all for today. Below is what I wrote down from your answers. Is anything wrong?')).toBeNull();
    expect(theCommitmentTheCloseStates('You said sales were slow. That’s all for today.')).toBeNull();
    expect(theCommitmentTheCloseStates(FEMIS_GOODBYE, [{ type: 'COMMITMENT', text: 'Keep following up with customers for statements' }])).toBeNull();
    /* A commitment about something else does not stop it. */
    expect(theCommitmentTheCloseStates(FEMIS_GOODBYE, [{ type: 'COMMITMENT', text: 'I will visit Westgate Deli on Friday' }])).toBe('You will keep following up with customers for their statements.');
  });

  it('goes first on the card, with the commitment note, and is written as a COMMITMENT row when they finish', async () => {
    const nothing: any = { get: () => undefined, emit: jest.fn(() => Promise.resolve()) };
    const prisma: any = {
      conversationTurn: {
        update: jest.fn(async () => ({})),
        findUnique: jest.fn(async () => ({ content: FEMIS_GOODBYE })),
      },
      recordEntry: { createMany: jest.fn(), create: jest.fn() },
      groundDocument: { findMany: jest.fn(async () => []) },
    };
    const service = new ConversationService(prisma, {} as any, { extract: jest.fn(async () => null) } as any, {} as any, nothing, nothing, nothing, nothing, nothing, nothing) as any;
    service.readTheRecord = jest.fn(async () => [
      { participantId: 'femi', checkInId: 'ci1', type: 'PROGRESS', text: "I've visited 46 businesses and taken 31 applications", recallBased: true },
      { participantId: 'femi', checkInId: 'ci1', type: 'TARGET', text: 'A target of 40', recallBased: true },
    ]);
    const card = await service.theEndCardFor({ id: 'ci1', participantId: 'femi', groundId: 'g1' }, 'turn-9');
    expect(card.inYourRecord[0]).toEqual({
      says: 'You will keep following up with customers for their statements.',
      how: 'You said you will do this. I will ask you how it went.',
      mark: 'said',
    });
    expect(card.inYourRecord.map((l: any) => l.says)).not.toContain('A target of 40.');
    expect(card.next[0]).toBe('There is 1 more line in your record. You can read it in your record after you finish.');
    const draft = prisma.conversationTurn.update.mock.calls[0][0].data.recordDraft;
    expect(draft[0]).toEqual({ participantId: 'femi', checkInId: 'ci1', type: 'COMMITMENT', text: 'You will keep following up with customers for their statements.', recallBased: true });
    expect(draft).toHaveLength(3);

    /* Finishing writes exactly the kept lines, the added commitment included, for Femi. */
    prisma.conversationTurn.findFirst = jest.fn(async () => ({ id: 'turn-9', createdAt: new Date(), recordDraft: draft, endCard: card }));
    prisma.conversationTurn.count = jest.fn(async () => 0);
    await service.writeTheRecordAtTheEnd({ id: 'ci1', participantId: 'femi' });
    const written = prisma.recordEntry.createMany.mock.calls[0][0].data;
    expect(written[0]).toMatchObject({ participantId: 'femi', checkInId: 'ci1', type: 'COMMITMENT', text: 'You will keep following up with customers for their statements.' });
    expect(written).toHaveLength(3);
  });
});

describe('a line the card shows is a sentence', () => {
  it('leaves off the pieces read on run-19', () => {
    for (const piece of ['The last day of March.', 'A target of 40.', 'Improved retention.', 'Hit my target of 14 approved facilities.', 'To close the Kano deal.', 'Following up with customers.']) {
      expect([piece, isASentence(piece)]).toEqual([piece, false]);
    }
  });

  it('keeps lines that are sentences', () => {
    for (const line of [
      'Green Mart has a quote.', 'Green Mart will buy in January.', 'You’ll visit Westgate Deli on Friday.', 'Tobi signed the contract.',
      "I've visited 46 businesses and taken 31 applications.", 'Sales rose 10 percent.', 'The eleven files are worth N38m.', 'Nothing has moved since Monday.',
      'You will keep following up with customers for their statements.', 'My target is 14 approved facilities.',
    ]) {
      expect([line, isASentence(line)]).toEqual([line, true]);
    }
  });

  it('a piece stays in the record and is counted, not shown', () => {
    const card = theEndCard([
      { type: 'PROGRESS', text: 'Green Mart has a quote', recallBased: true },
      { type: 'DATE', text: 'The last day of March', recallBased: true },
      { type: 'TARGET', text: 'A target of 40', recallBased: true },
    ])!;
    expect(card.inYourRecord).toEqual([{ says: 'Green Mart has a quote.', how: HOW.said, mark: 'said' }]);
    expect(card.next).toContain('There are 2 more lines in your record. You can read them all in your record after you finish.');
  });
});
