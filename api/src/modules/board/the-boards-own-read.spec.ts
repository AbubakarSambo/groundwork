import { onlyWhatTheRecordHolds, theBoardsOwnReadFor, theRecordFromTheBoard, THE_PIECES } from './the-boards-own-read';

/**
 * The board's own read (15 November 2026). What a lead reads is a sentence the model wrote; what makes it safe is that every sentence
 * carries words from the record and is dropped when they are not there. These check what is kept and what is served, not the model.
 */
const board = {
  objectives: [{ name: 'File the reply to the High Court by 3 December.' }],
  whoOwnsWhat: [
    { participantId: 'p1', name: 'Tom', items: [{ id: 'a', text: 'We should lead with the limitation point, it is much stronger.', mark: 'said', type: 'COMMITMENT' }] },
    { participantId: 'p2', name: 'Leila', items: [{ id: 'b', text: 'The original contract has not arrived but I believe it supports us.', mark: 'said', type: 'COMMITMENT' }] },
  ],
  blockers: [{ name: 'The original contract has not arrived' }],
  whatTheSystemsShow: undefined as any,
};
const segments = theRecordFromTheBoard(board);

describe('the board’s own read keeps only what the record holds', () => {
  it('keeps a sentence whose words are in the record, word for word, and says it is only what people said', () => {
    const kept = onlyWhatTheRecordHolds('a law firm matter', { pieces: [{ id: 'moreConfident', sentences: [{ says: 'Leila believes the contract supports you, but the original contract has not arrived.', words: ['the original contract has not arrived'] }] }] }, segments);
    expect(kept).toHaveLength(1);
    expect(kept[0]).toMatchObject({ id: 'moreConfident', heading: 'More confident than the evidence allows', place: 'top' });
    expect(kept[0].sentences).toEqual([{ says: 'Leila believes the contract supports you, but the original contract has not arrived.', how: 'said' }]);
  });
  it('drops a sentence whose words are not in the record, and a sentence with no words at all', () => {
    const kept = onlyWhatTheRecordHolds('a law firm matter', { pieces: [{ id: 'moreConfident', sentences: [
      { says: 'The client has paid the deposit.', words: ['the client has paid the deposit'] },
      { says: 'Nothing is in the way.', words: [] },
      { says: 'A short quote is not enough.', words: ['limitation point'] },
    ] }] }, segments);
    expect(kept).toEqual([]);
  });
  it('says a sentence is shown only where the words are in a line a system or a document backs', () => {
    const withASystem = theRecordFromTheBoard({ ...board, whatTheSystemsShow: { numbers: [{ says: 'Paystack shows 31 for paid subscriptions, as of 3 November.' }] }, whoOwnsWhat: [{ name: 'Amina', items: [{ text: 'We have 40 paid subscriptions now', mark: 'said' }] }] });
    const kept = onlyWhatTheRecordHolds('MarketView Q4', { pieces: [{ id: 'saidAgainstSystems', sentences: [{ says: 'Amina said 40 are paid, and Paystack shows 31.', words: ['we have 40 paid subscriptions now', 'paystack shows 31 for paid subscriptions'] }, { says: 'Paystack shows 31 paid subscriptions.', words: ['paystack shows 31 for paid subscriptions'] }] }] }, withASystem);
    expect(kept[0].sentences.map((s) => s.how)).toEqual(['said', 'shown']);
  });
  it('draws no piece the model was not asked for, and no piece with nothing left', () => {
    expect(onlyWhatTheRecordHolds('a law firm matter', { pieces: [{ id: 'somethingElse', sentences: [{ says: 'x y z', words: ['the original contract has not arrived'] }] }] }, segments)).toEqual([]);
  });
});

describe('the board’s own read is asked once for a record', () => {
  const store = new Map<string, string>();
  const prisma = {
    wordedLine: {
      findUnique: async ({ where }: any) => (store.has(where.key) ? { text: store.get(where.key) } : null),
      upsert: async ({ where, create }: any) => { store.set(where.key, create.text); },
    },
  };
  const answer = { pieces: [{ id: 'moreConfident', sentences: [{ says: 'Leila believes the contract supports you, but the original contract has not arrived.', words: ['the original contract has not arrived'] }] }] };
  it('asks the model once, keeps the checked read, and reads it back without asking again', async () => {
    const extract = jest.fn(async () => answer);
    const first = await theBoardsOwnReadFor(prisma, { extract }, 'a law firm matter', board);
    const second = await theBoardsOwnReadFor(prisma, { extract }, 'a law firm matter', board);
    expect(extract).toHaveBeenCalledTimes(1);
    expect(first?.pieces[0].sentences[0].says).toBe('Leila believes the contract supports you, but the original contract has not arrived.');
    expect(second).toEqual(first);
  });
  it('asks again when the record has changed', async () => {
    const extract = jest.fn(async () => answer);
    await theBoardsOwnReadFor(prisma, { extract }, 'a law firm matter', { ...board, blockers: [{ name: 'The original contract has not arrived' }, { name: 'The hearing date is not confirmed' }] });
    expect(extract).toHaveBeenCalledTimes(1);
  });
  it('asks nothing for a kind with no pieces or a record with next to nothing in it, and serves nothing when the model fails', async () => {
    const extract = jest.fn(async () => answer);
    expect(await theBoardsOwnReadFor(prisma, { extract }, 'sales team', board)).toBeNull();
    expect(await theBoardsOwnReadFor(prisma, { extract }, 'a law firm matter', { objectives: [] })).toBeNull();
    expect(extract).not.toHaveBeenCalled();
    expect(await theBoardsOwnReadFor({ wordedLine: undefined }, { extract: async () => { throw new Error('down'); } }, 'a law firm matter', board)).toBeNull();
    expect(await theBoardsOwnReadFor({}, { extract: async () => null }, 'a law firm matter', board)).toBeNull();
  });
  it('has pieces for the seven kinds whose prototype boards hold a written read', () => {
    expect(Object.keys(THE_PIECES).sort()).toEqual(["MarketView Q4", "MarketView where next", "a government programme", "a law firm matter", "asset loans", "founder's own check-in", "trader training programme"].sort());
  });
});
