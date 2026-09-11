import { stillAsking } from './one-question-per-turn';

/**
 * From a user, 10 Sep 2026: "the session closing without an option to chat more, but the agent asks
 * more questions". The close marker and a question arrived on the same turn, and the turn was marked
 * complete. The signal is held while the last sentence is a question.
 */
describe('a closing turn that still asks does not close', () => {
  it('holds when the last sentence is a question', () => {
    expect(stillAsking('That is now on record. Before we finish, who owns the rota?')).toBe(true);
  });
  it('does not hold on a question earlier in the turn that was then answered by the turn itself', () => {
    expect(stillAsking('Who owns the rota? You said Priya does. That is now on record.')).toBe(false);
  });
  it('does not hold on a plain close, or on nothing', () => {
    expect(stillAsking('Your check-in is complete. Thank you.')).toBe(false);
    expect(stillAsking('')).toBe(false);
  });
});
