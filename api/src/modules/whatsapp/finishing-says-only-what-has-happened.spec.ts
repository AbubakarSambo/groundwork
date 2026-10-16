import { theCheckInIsCompleteSaying } from '../grounds/what-is-sent-in-simpler-words';
import { closedByTheClockSaying } from './a-check-in-left-halfway';
import { THANKS_YOUR_ANSWER_IS_IN } from '../public-api/a-whatsapp-message-is-routed';

/**
 * FINISHING SAYS ONLY WHAT HAS HAPPENED (a Pulse check on production, 15 October 2026). The person wrote "finish" and read
 * "Your check-in is complete and on record. Your report follows in a moment.", and then "Thank you, your answer for Pulse
 * check is in. The shared picture is made once everyone has answered". No report followed: the shared picture waits for
 * everyone. The two messages they now read, in order, say nothing that does not happen.
 */
describe('what the person reads on WhatsApp when they finish and the others have not answered yet', () => {
  it('is that it is on record, then when they will hear, and nothing promised in between', () => {
    const read = [theCheckInIsCompleteSaying(), THANKS_YOUR_ANSWER_IS_IN('Pulse check')];
    expect(read).toEqual([
      'Your check-in is complete and on record.',
      'Thank you, your answer for Pulse check is in. The shared picture is made once everyone has answered, and you will be told as soon as there is something to read.',
    ]);
  });
  it('in simpler words, and when the clock closes it, the same', () => {
    expect(theCheckInIsCompleteSaying(true)).not.toMatch(/report|in a moment/i);
    expect(closedByTheClockSaying('Pulse check')).not.toMatch(/report|in a moment/i);
    expect(closedByTheClockSaying('Pulse check', true)).not.toMatch(/report|in a moment/i);
  });
});
