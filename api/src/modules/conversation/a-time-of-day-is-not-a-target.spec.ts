import { theNumbersIn, theNumbersDoNotMeet } from './the-numbers-do-not-meet';

/**
 * A TIME OF DAY IS NOT A TARGET (messages test, fourth run). Drop Access, Kevin's WhatsApp check-in, Wednesday 14 October. He said
 * "I'll follow up with Ngong Road Minimart next week. I'm visiting Kasarani Gym tomorrow at 10 to discuss their 3 units." and was
 * asked "This check-in is aiming at 120. You said 10. Is that your own part of it?" He had never said 10.
 */
const TEAM = [{ name: 'Sell 120 units by 30 October', target: 120, ownerParticipantId: null }];

describe('Kevin\'s "tomorrow at 10"', () => {
  it('is not a number he said', () => {
    expect(theNumbersIn("I'll follow up with Ngong Road Minimart next week. I'm visiting Kasarani Gym tomorrow at 10 to discuss their 3 units.")).toEqual([]);
    expect(theNumbersDoNotMeet(TEAM, "I'll follow up with Ngong Road Minimart next week. I'm visiting Kasarani Gym tomorrow at 10 to discuss their 3 units.")).toBeNull();
  });
  it('nor is "at 10:30", "10am" or "at 10." at the end', () => {
    expect(theNumbersIn('The meeting is at 10:30 tomorrow.')).toEqual([]);
    expect(theNumbersIn('I see Faith at 10am.')).toEqual([]);
    expect(theNumbersIn('We meet tomorrow at 11.')).toEqual([]);
  });
  it('a count is still read: "Kasarani Gym wants 12 units" and "priced at 10,000 shillings"', () => {
    expect(theNumbersIn('Kasarani Gym wants 12 units.')).toEqual([12]);
    expect(theNumbersIn('The quote is priced at 10,000 shillings.')).toEqual([10000]);
  });
});
