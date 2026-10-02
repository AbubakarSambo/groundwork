import { whoItIsOnIsInTheirWords } from '../board/a-thing-is-not-somebody';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * SCREENS REQUEST 117 (5): A WAIT NEEMA NEVER SPOKE OF.
 *
 * Neema Achieng typed "I signed Karen Hardware on 22 September." and "Naivas Karen still has not answered me about
 * the order.", and the record held her "waiting on the warehouse for a delivery to Naivas Karen". Who a wait is on is
 * now kept only where a word of it is in what the person typed in that check-in, as the time they gave for it already
 * is. The wait already stored is taken off by journey/bring-a-check-in-up-to-date.ts under the same rule.
 */
const NEEMA = ['I signed Karen Hardware on 22 September.', 'Naivas Karen still has not answered me about the order.'];

describe('request 117 (5): who a wait is on is somebody they named', () => {
  it('the warehouse Neema never mentioned is not who she waits on', () => {
    expect(whoItIsOnIsInTheirWords('the warehouse', NEEMA)).toBe(false);
  });

  it('somebody or something they did name is', () => {
    expect(whoItIsOnIsInTheirWords('Naivas Karen', NEEMA)).toBe(true);
    expect(whoItIsOnIsInTheirWords('Mr. Adebayo', ["I don't have a date. I'm waiting for Mr. Adebayo."])).toBe(true);
    expect(whoItIsOnIsInTheirWords('the credit committee', ['The committee has not met yet.'])).toBe(true);
    expect(whoItIsOnIsInTheirWords('the customers', ['Two customer statements are missing.'])).toBe(true);
    expect(whoItIsOnIsInTheirWords(null, NEEMA)).toBe(true);
  });

  it('the conversation asks the rule before it writes a wait on a label', () => {
    const service = readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8');
    expect(service).toContain('if (!onParticipantId && onLabel && !whoItIsOnIsInTheirWords(onLabel, theirWords)) continue;');
  });
});
