import { whatHasBeenHeard, withoutTheOpeningsOwnWords } from './the-anchor-setup';

/**
 * B-099. After Baraka's first answer the panel read "You are responsible for running deliveries to about 300 shops from four depots." and "your drivers
 * and depot staff". Two turns later they had become the opening line's own words, "keeping the work, customers and company moving" and "your team".
 */
const OPENING = 'You know what it takes to keep the work, customers and company moving. Does your team?';
const HIS = ['We run deliveries to about 300 shops from four depots. My drivers and depot staff do their jobs, but they do not see that a shop that waits twice stops ordering.'];

describe('B-099: what the lead said is not overwritten by the opening', () => {
  const before = { responsibleFor: 'You are responsible for running deliveries to about 300 shops from four depots.', tryingToMove: 'Your drivers and depot staff.' };
  it('keeps what he gave when the next read hands back the opening\'s words', () => {
    const next = withoutTheOpeningsOwnWords({ responsibleFor: 'Keeping the work, customers and company moving.', tryingToMove: 'Your team.' }, OPENING, HIS);
    expect(whatHasBeenHeard(next, before)).toEqual(before);
  });
  it('still takes a new fact he does give, in his own words', () => {
    const next = withoutTheOpeningsOwnWords({ seeingToday: 'Drivers do not tell the shops when a load is late.', responsibleFor: 'Keeping the work, customers and company moving.' }, OPENING, [...HIS, 'Drivers do not tell the shops when a load is late.']);
    expect(whatHasBeenHeard(next, before)).toEqual({ ...before, seeingToday: 'Drivers do not tell the shops when a load is late.' });
  });
  it('does not call the opening\'s words something he said when he heard nothing yet', () => {
    expect(whatHasBeenHeard(withoutTheOpeningsOwnWords({ responsibleFor: 'Keeping the work, customers and company moving.' }, OPENING, ['Hello.']), undefined)).toEqual({});
  });
  it('leaves his words alone when he repeats the same ones himself', () => {
    const hers = ['I keep the work, customers and company moving.'];
    expect(withoutTheOpeningsOwnWords({ responsibleFor: 'You keep the work, customers and company moving.' }, OPENING, hers)).toEqual({ responsibleFor: 'You keep the work, customers and company moving.' });
  });
});
