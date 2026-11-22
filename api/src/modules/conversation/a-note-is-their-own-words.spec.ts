import { aLastTimeInTheirOwnWords } from './a-last-time-is-their-own-words';

/*
 * A NOTE THEY WROTE IS THEIR OWN WORDS (final run, 22 November 2026, bug 11). Wairimu typed a note under her finished check-in; her next
 * opener raised it, and the "last time you said" check, given only her conversation turns, cut it, so she read "What has moved since your
 * last check-in?". With her note among the words she wrote, it is cited in her words and the question stays.
 */
describe('a note she wrote backs a "last time you wrote"', () => {
  const note = { text: 'Baraka offered a second Kilimani run from 1 December if I confirm 15 drops', at: new Date('2026-11-22T11:00:00Z') };
  const opener = 'Last time you wrote that Baraka offered a second Kilimani run from 1 December. Have you confirmed the 15 drops?';
  it('with the note among her words, it is cited in her own words and the question is kept', () => {
    const r = aLastTimeInTheirOwnWords(opener, [note]);
    expect(r.text).toContain('Baraka offered a second Kilimani run from 1 December if I confirm 15 drops');
    expect(r.text).toContain('Have you confirmed the 15 drops?');
    expect(r.text).not.toContain('What has moved since your last check-in?');
  });
  it('without it, as before, the claim is cut', () => {
    expect(aLastTimeInTheirOwnWords(opener, []).text).not.toContain('Baraka offered');
  });
});
