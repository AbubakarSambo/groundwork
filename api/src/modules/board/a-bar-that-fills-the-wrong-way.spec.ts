import { theJourneySoFar, whichWayIsGood } from './a-measure-that-goes-down-is-still-going-well';

describe('a bar that fills the wrong way', () => {
  it('reads a ceiling as a ceiling, without being told', () => {
    expect(whichWayIsGood(8, 4)).toBe('down');
    expect(whichWayIsGood(12, 40)).toBe('up');
  });

  it('refuses to guess when a measure opened on its target', () => {
    expect(whichWayIsGood(4, 4)).toBe('unknown');
    expect(whichWayIsGood(null, 4)).toBe('unknown');
    expect(whichWayIsGood(8, null)).toBe('unknown');
  });

  it('gives a team getting faster the distance they covered, not a shrinking bar', () => {
    const j = theJourneySoFar({ start: 8, now: 6, target: 4 });
    expect(j.direction).toBe('down');
    expect(j.covered).toBe(50);
    expect(j.say).toBe('It was 8 at the start and is 6 now, and the aim is 4.');
  });

  it('still works the ordinary way round', () => {
    const j = theJourneySoFar({ start: 12, now: 26, target: 40 });
    expect(j.covered).toBe(50);
    expect(j.say).toBe('It was 12 at the start and is 26 now, and the aim is 40.');
  });

  it('says when it is there, in both directions', () => {
    expect(theJourneySoFar({ start: 8, now: 3, target: 4 }).say).toBe('It was 8 at the start and is 3 now, so the aim of 4 has been reached.');
    expect(theJourneySoFar({ start: 12, now: 41, target: 40 }).say).toBe('It was 12 at the start and is 41 now, so the aim of 40 has been reached.');
  });

  it('does not count overshooting as more than finished', () => {
    expect(theJourneySoFar({ start: 12, now: 400, target: 40 }).covered).toBe(100);
    expect(theJourneySoFar({ start: 8, now: 0, target: 4 }).covered).toBe(100);
  });

  it('gives nothing for going backwards rather than a negative bar', () => {
    expect(theJourneySoFar({ start: 12, now: 8, target: 40 }).covered).toBe(0);
    expect(theJourneySoFar({ start: 8, now: 11, target: 4 }).covered).toBe(0);
  });

  /*
   * THE LINES BELOW USED TO PIN "8 at the start, 6 now, said 4." and "That is where you said." Those are
   * the pieces joined with commas, and the "you" that reached every reader, which the review of
   * 1 October rules out. The same numbers, in the same order of facts, now read as one full sentence.
   */
  it('claims no distance when nobody was counting at the start', () => {
    const j = theJourneySoFar({ start: null, now: 26, target: 40 });
    expect(j.covered).toBeNull();
    expect(j.say).toBe('It is 26 now, and the aim is 40.');
  });

  it('says something true about a measure that is tracked rather than counted', () => {
    expect(theJourneySoFar({ start: 2, now: 5, target: null }).say).toBe('It was 2 at the start and is 5 now.');
    expect(theJourneySoFar({ start: null, now: 5, target: null }).say).toBe('It is 5 so far.');
    expect(theJourneySoFar({ start: 5, now: 5, target: null }).say).toBe('It is 5 so far.');
  });

  it('never produces a percentage complete, only distance with its numbers beside it', () => {
    const j = theJourneySoFar({ start: 8, now: 6, target: 4 });
    expect(j.say).not.toMatch(/%|per cent|complete|on track|behind/i);
  });
});
