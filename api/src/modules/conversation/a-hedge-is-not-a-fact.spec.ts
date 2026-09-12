import { hardenedAGuess, wasHedged, statedFlatly, quantitiesIn, DO_NOT_HARDEN_IT } from './a-hedge-is-not-a-fact';

/** The turn this was written from, word for word off a live check-in. */
const THE_LIVE_ONE = 'The system will show it. I am tracking well, about a third of the way there I would say.';
const WHAT_IT_SAID = "The system showing it is a clear measure for the 35 units. You're a third of the way there.";

describe('a hedge is not a fact', () => {
  it('catches the turn it was written from', () => {
    expect(hardenedAGuess(THE_LIVE_ONE, WHAT_IT_SAID)).toBe('a third');
  });

  it('leaves a hedge that stayed a hedge alone', () => {
    expect(hardenedAGuess(THE_LIVE_ONE, 'So roughly a third, and what is the actual count?')).toBeNull();
  });

  it('leaves a question about the number alone', () => {
    /* Asking about a quantity is not asserting it, and asking is the whole point. */
    expect(hardenedAGuess(THE_LIVE_ONE, 'Is a third right, or is it closer to ten?')).toBeNull();
  });

  it('leaves a number they stated plainly alone', () => {
    /* "I closed 4" is a count. Restating it is repeating them, not hardening a guess. */
    expect(hardenedAGuess('I closed 4 last month.', 'You closed 4 last month. Which are the next three?')).toBeNull();
  });

  it('does not treat a hedge in one sentence as covering a count in another', () => {
    const said = 'I am not sure about the pipeline. I closed 4 last month.';
    expect(wasHedged(said, '4')).toBe(false);
  });

  it('reads percentages, shares and fractions as quantities, and leaves a ticket number out', () => {
    expect(quantitiesIn('about 30% of it')).toContain('30%');
    expect(quantitiesIn('4 of 35 so far')).toContain('4 of 35');
    expect(quantitiesIn('roughly half')).toContain('half');
    /* A ticket number is not a quantity of anything: OPS-902 must not be read as 902. */
    expect(quantitiesIn('tracked in OPS-902')).not.toContain('902');
  });

  it('knows a flat statement from a hedged one', () => {
    expect(statedFlatly('You are a third of the way there.', 'third')).toBe(true);
    expect(statedFlatly('You are about a third of the way there.', 'third')).toBe(false);
  });

  it('asks for the real figure rather than just putting the hedge back', () => {
    /* Re-hedging keeps a number nobody counted at the centre of the turn. The useful move is to
       treat the estimate as an estimate and ask what it is an estimate of. */
    const s = DO_NOT_HARDEN_IT('third');
    expect(s).toContain('they said roughly');
    expect(s).toContain('what the actual figure is and where it can be seen');
  });

  it('reads a number somebody wrote out, because check-ins are typed in a chat box', () => {
    expect(quantitiesIn('Twelve tickets are over a day old')).toContain('twelve');
    expect(hardenedAGuess('I think about twelve are still open.', 'Twelve are still open.')).toBe('twelve');
  });

  it('but not "one", which does more work in English as a near-article than as a count', () => {
    /* "one thing", "the one that", "no one" - reading it as a quantity would flag ordinary
       sentences all day, and the cost of a false catch here is a turn sent back for nothing. */
    expect(quantitiesIn('I think one thing is still open')).not.toContain('one');
  });

  it('says nothing about an empty turn', () => {
    expect(hardenedAGuess('', 'You are a third of the way there.')).toBeNull();
    expect(hardenedAGuess(THE_LIVE_ONE, '')).toBeNull();
  });
});
