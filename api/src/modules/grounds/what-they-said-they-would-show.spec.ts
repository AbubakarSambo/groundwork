import { readsAsAPromiseOfADocument, whatTheyStillOweAShow } from './what-they-said-they-would-show';

/**
 * "IT IS ALSO A PLACE FOR PARTICIPANTS TO UPLOAD DOCS THEY AGREED THEY WOULD SHARE IN THE CHAT."
 *
 * The page had a dashed box that named nothing anybody had been asked for.
 */
describe('what they said they would show', () => {
  it('a promise to hand something over is one; a promise to do something is not', () => {
    expect(readsAsAPromiseOfADocument('Send the Client B proposal')).toBe(true);
    expect(readsAsAPromiseOfADocument('share the Q4 sheet with Miriam')).toBe(true);
    expect(readsAsAPromiseOfADocument('write up the top 10 customer questions')).toBe(true);
    expect(readsAsAPromiseOfADocument('Ask Client D who signs the budget')).toBe(false);
    expect(readsAsAPromiseOfADocument('send Kennedy a nudge')).toBe(false);
    expect(readsAsAPromiseOfADocument('')).toBe(false);
  });

  it('lists what is outstanding, in the words it was promised in', () => {
    const out = whatTheyStillOweAShow(
      [{ id: 'd1', text: 'I finished the scope', evidence: 'it is in the March deck', createdAt: '2026-09-01' }],
      [{ id: 'c1', text: 'Send the Client B proposal', whenSaid: 'before Thursday', createdAt: '2026-09-02' }],
      [],
    );
    expect(out.map((o) => o.what)).toEqual(['it is in the March deck', 'Send the Client B proposal']);
    expect(out[1].askedIn).toBe('before Thursday');
  });

  it('and a file attached since the promise clears it, because we cannot tell one sheet from another', () => {
    const out = whatTheyStillOweAShow(
      [{ id: 'd1', text: 'x', evidence: 'the March deck', createdAt: '2026-09-01' }],
      [{ id: 'c1', text: 'Send the proposal', createdAt: '2026-09-01' }],
      [{ createdAt: '2026-09-03' }],
    );
    expect(out).toEqual([]);
  });

  it('a commitment somebody has already moved is not outstanding', () => {
    expect(whatTheyStillOweAShow([], [{ id: 'c1', text: 'Send the proposal', createdAt: '2026-09-01', status: 'DONE' }], [])).toEqual([]);
  });
});
