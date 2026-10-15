import { readFileSync } from 'fs';
import { join } from 'path';
import { aWaitThatConfirms, theLineToConfirm, thePrompt, namesTheSameThing } from './confirmed-by-who-received-it';
import { theEndCard, HOW } from './the-end-card';
import { ConversationService } from './conversation.service';

/**
 * CONFIRMED BY THE PERSON WHO RECEIVED IT (week 6). A colleague's line is confirmed when the person
 * who was waiting on that work says, in their own check-in, that it is no longer in their way.
 */

describe('which changes to a wait can confirm a line', () => {
  const w = { status: 'CLEARED', previousStatus: 'WAITING', fromParticipantId: 'brian', onParticipantId: 'miriam' };
  it('a wait on a colleague that goes from waiting or blocking to cleared', () => {
    expect(aWaitThatConfirms(w)).toBe(true);
    expect(aWaitThatConfirms({ ...w, previousStatus: 'BLOCKING' })).toBe(true);
  });
  it('not a wait that was already cleared, or is still open', () => {
    expect(aWaitThatConfirms({ ...w, previousStatus: 'CLEARED' })).toBe(false);
    expect(aWaitThatConfirms({ ...w, status: 'WAITING' })).toBe(false);
    expect(aWaitThatConfirms({ ...w, previousStatus: null })).toBe(false);
  });
  it('not a wait on somebody outside the check-in, and never the person themselves', () => {
    expect(aWaitThatConfirms({ ...w, onParticipantId: null })).toBe(false);
    expect(aWaitThatConfirms({ ...w, onParticipantId: 'brian' })).toBe(false);
  });
  it('and a departure, which clears waits too, never reaches this', () => {
    const departure = readFileSync(join(__dirname, '..', 'people', 'departure.service.ts'), 'utf8');
    expect(departure).not.toMatch(/confirmWhatArrived|confirmedAt/);
  });
});

describe('the line the model picks', () => {
  const lines = [
    { id: 'a', text: 'I sent the sales deck to Brian on Tuesday', confirmedAt: null, disputedAt: null },
    { id: 'b', text: 'I will finish the pricing sheet next week', confirmedAt: new Date(), disputedAt: null },
    { id: 'c', text: 'The quote went to Green Mart', confirmedAt: null, disputedAt: new Date() },
  ];
  it('is taken when it is a real, unconfirmed, undisputed line', () => {
    expect(theLineToConfirm(lines, 0, 'the sales deck')?.id).toBe('a');
  });
  it('is not taken when there is none, it is out of range, already confirmed or disputed', () => {
    expect(theLineToConfirm(lines, null, 'the sales deck')).toBeNull();
    expect(theLineToConfirm(lines, 7, 'the sales deck')).toBeNull();
    expect(theLineToConfirm(lines, 1.5, 'the sales deck')).toBeNull();
    expect(theLineToConfirm(lines, 1, 'the pricing sheet')).toBeNull();
    expect(theLineToConfirm(lines, 2, 'the quote')).toBeNull();
  });
  /* Read on the local corpus. */
  it('is not taken when it is about something else, whatever the model said', () => {
    const letter = [{ id: 'x', text: 'We received the letter outlining the nine to eleven-month process. I sent it to the COO in June.', confirmedAt: null, disputedAt: null }];
    expect(theLineToConfirm(letter, 0, "clarity on Wanjiru's project")).toBeNull();
    expect(namesTheSameThing('the lease variant signature', 'I signed the lease variant on Monday')).toBe(true);
    expect(namesTheSameThing('an answer', 'I gave them an answer')).toBe(false);
  });
  it('is asked with what was waited for and their lines, numbered', () => {
    expect(thePrompt('the sales deck', lines)).toBe("WHAT THE COLLEAGUE WAS WAITING FOR:\nthe sales deck\n\nTHIS PERSON'S RECORD LINES:\n[0] I sent the sales deck to Brian on Tuesday\n[1] I will finish the pricing sheet next week\n[2] The quote went to Green Mart");
  });
});

describe('when the waiter says it arrived', () => {
  function aService(answer: number | null) {
    const prisma: any = {
      recordEntry: {
        findMany: jest.fn(async () => [{ id: 'a', text: 'I sent the sales deck to Brian on Tuesday', confirmedAt: null, disputedAt: null }]),
        update: jest.fn(async () => ({})),
      },
    };
    const anthropic: any = { extract: jest.fn(async () => ({ line: answer })) };
    const nothing: any = { get: () => undefined, emit: jest.fn(() => Promise.resolve()) };
    const svc: any = new ConversationService(prisma, {} as any, anthropic, {} as any, nothing, nothing, nothing, nothing, nothing, nothing);
    return { svc, prisma, anthropic };
  }
  it('marks the colleague\'s line, with who received it', async () => {
    const { svc, prisma, anthropic } = aService(0);
    await svc.confirmWhatArrived('miriam', 'the sales deck', 'brian');
    expect(prisma.recordEntry.findMany.mock.calls[0][0].where).toEqual({ participantId: 'miriam', disputedAt: null, confirmedAt: null });
    expect(anthropic.extract.mock.calls[0][1][0].content).toContain('the sales deck');
    expect(prisma.recordEntry.update).toHaveBeenCalledWith({ where: { id: 'a' }, data: { confirmedAt: expect.any(Date), confirmedByParticipantId: 'brian' } });
  });
  it('marks nothing when no line says it was delivered', async () => {
    const { svc, prisma } = aService(null);
    await svc.confirmWhatArrived('miriam', 'the sales deck', 'brian');
    expect(prisma.recordEntry.update).not.toHaveBeenCalled();
  });
  it('is asked only from the waiter\'s own update to an existing wait', () => {
    const src = readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(src).toContain('if (aWaitThatConfirms({ status, previousStatus: existing.status, fromParticipantId: participantId, onParticipantId: existing.onParticipantId })) {');
    expect(src.match(/this\.confirmWhatArrived\(/g)).toHaveLength(1);
  });
});

describe('on the end card', () => {
  it('a confirmed line says so, in a sentence', () => {
    const card = theEndCard([{ type: 'PROGRESS', text: 'I sent the sales deck to Brian on Tuesday', confirmedAt: new Date() }])!;
    /* Ends as a sentence since task 2.7's review. */
    expect(card.inYourRecord![0]).toEqual({ says: 'I sent the sales deck to Brian on Tuesday.', how: HOW.confirmed, mark: 'confirmed' });
    expect(HOW.confirmed).toBe('The person who received it confirmed it.');
    expect(card.next).toBeUndefined();
  });
  it('a document still comes first', () => {
    const card = theEndCard([{ type: 'PROGRESS', text: 'I sent the sales deck', confirmedAt: new Date(), recallBased: false, anchoredDocumentId: 'd' }])!;
    expect(card.inYourRecord![0].mark).toBe('proven');
  });
});
