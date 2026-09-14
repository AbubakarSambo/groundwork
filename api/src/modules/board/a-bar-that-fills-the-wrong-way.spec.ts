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
    expect(j.say).toBe('8 at the start, 6 now, said 4.');
  });

  it('still works the ordinary way round', () => {
    const j = theJourneySoFar({ start: 12, now: 26, target: 40 });
    expect(j.covered).toBe(50);
    expect(j.say).toBe('12 at the start, 26 now, said 40.');
  });

  it('says when it is there, in both directions', () => {
    expect(theJourneySoFar({ start: 8, now: 3, target: 4 }).say).toContain('That is where you said');
    expect(theJourneySoFar({ start: 12, now: 41, target: 40 }).say).toContain('That is where you said');
  });

  it('does not count overshooting as more than finished', () => {
    expect(theJourneySoFar({ start: 12, now: 400, target: 40 }).covered).toBe(100);
    expect(theJourneySoFar({ start: 8, now: 0, target: 4 }).covered).toBe(100);
  });

  it('gives nothing for going backwards rather than a negative bar', () => {
    expect(theJourneySoFar({ start: 12, now: 8, target: 40 }).covered).toBe(0);
    expect(theJourneySoFar({ start: 8, now: 11, target: 4 }).covered).toBe(0);
  });

  it('claims no distance when nobody was counting at the start', () => {
    const j = theJourneySoFar({ start: null, now: 26, target: 40 });
    expect(j.covered).toBeNull();
    expect(j.say).toBe('26 now, said 40.');
  });

  it('says something true about a measure that is tracked rather than counted', () => {
    expect(theJourneySoFar({ start: 2, now: 5, target: null }).say).toBe('2 at the start, 5 now.');
    expect(theJourneySoFar({ start: null, now: 5, target: null }).say).toBe('5 so far.');
    expect(theJourneySoFar({ start: 5, now: 5, target: null }).say).toBe('5 so far.');
  });

  it('never produces a percentage complete, only distance with its numbers beside it', () => {
    const j = theJourneySoFar({ start: 8, now: 6, target: 4 });
    expect(j.say).not.toMatch(/%|per cent|complete|on track|behind/i);
  });
});
