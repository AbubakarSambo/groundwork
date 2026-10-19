import { screen } from './nothing-invented-reaches-them';
import { aSentenceOfTheirsInsideOurs } from './their-words-in-your-person';

/**
 * THE DROP ACCESS SHORT RUN (gw_sweep_drop3), ITEM 4. Kevin, 14 October, read as the conversation holds it:
 *   "You said Doing well means consistently hitting my sales targets and bringing in new clients., then reported specific sales."
 * and Mercy, 13 and 14 October: "You said Doing well means consistently meeting and exceeding your sales targets, ..."
 * Their own sentence went into ours whole, with its capital and its full stop.
 */
const KEVIN_SAID = [
  "I'm responsible for generating leads, making sales, and building relationships with businesses in Nairobi. Doing well means consistently hitting my sales targets and bringing in new clients.",
  'Still no reply from Paul, even after two more calls today.',
  'Grace', 'Kevin', 'Omondi',
];

describe('a sentence of theirs inside ours is reported, never pasted', () => {
  it('Kevin reads "You said doing well means consistently hitting your sales targets and bringing in new clients, then reported specific sales."', () => {
    const r = screen('Understood. You said Doing well means consistently hitting my sales targets and bringing in new clients., then reported specific sales. Which of those stands now?', KEVIN_SAID, 'Kevin', []);
    expect(r.text).toContain('You said doing well means consistently hitting your sales targets and bringing in new clients, then reported specific sales.');
    expect(r.text).not.toMatch(/\.,/);
    expect(r.text).not.toMatch(/You said Doing/);
  });

  it('Mercy reads "You said doing well means", in small letters', () => {
    const out = aSentenceOfTheirsInsideOurs('You said Doing well means consistently meeting and exceeding your sales targets. The Greenfield order for 25 units is in the record.', ['Doing well means consistently meeting and exceeding my sales targets.']);
    expect(out).toBe('You said doing well means consistently meeting and exceeding your sales targets. The Greenfield order for 25 units is in the record.');
  });

  it('a name after "you said" keeps its capital, and words in quotation marks are theirs', () => {
    expect(aSentenceOfTheirsInsideOurs('You said Paul has not answered.', KEVIN_SAID)).toBe('You said Paul has not answered.');
    expect(aSentenceOfTheirsInsideOurs('You said I would call.', KEVIN_SAID)).toBe('You said I would call.');
    expect(aSentenceOfTheirsInsideOurs('Last time you said "Tomorrow, I\'ll call Mrs. Njeri."', ['Mrs. Njeri'])).toBe('Last time you said "Tomorrow, I\'ll call Mrs. Njeri."');
  });
});
