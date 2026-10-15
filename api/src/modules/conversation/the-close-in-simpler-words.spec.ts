import { endingOnTheClose, endsOnTheClose, THE_CLOSE_ON, THE_CLOSE_ON_IN_SIMPLER_WORDS, theCloseFor, type Door } from './the-close-says-what-comes-next';

/**
 * THE LAST THING A CHECK-IN SAYS, WITH AND WITHOUT "USE SIMPLER WORDS". The person reads it on the
 * web, on WhatsApp or through the API, and it is the same whether they are the lead or somebody
 * the lead asked. Off, it is the sentence every check-in has always ended on.
 */
const DOORS: Door[] = ['web', 'whatsapp', 'api'];
const THEY_SAID = 'Thank you. You will call the Quickmart buyer on Monday.';

describe.each(DOORS)('the close on %s', (door) => {
  it('is the usual close with the switch off or never set', () => {
    expect(endingOnTheClose(THEY_SAID, door)).toBe(`${THEY_SAID}\n\n${THE_CLOSE_ON[door]}`);
    expect(endingOnTheClose(THEY_SAID, door, false)).toBe(endingOnTheClose(THEY_SAID, door));
  });
  it('is the plainer close with the switch on, said once', () => {
    const once = endingOnTheClose(THEY_SAID, door, true);
    expect(once).toBe(`${THEY_SAID}\n\n${THE_CLOSE_ON_IN_SIMPLER_WORDS[door]}`);
    expect(endingOnTheClose(once, door, true)).toBe(once);
    expect(once).not.toMatch(/’/);
  });
  it('is known as a close in either form, so it is never closed twice', () => {
    expect(endsOnTheClose(`${THEY_SAID}\n\n${THE_CLOSE_ON[door]}`)).toBe(true);
    expect(endsOnTheClose(`${THEY_SAID}\n\n${THE_CLOSE_ON_IN_SIMPLER_WORDS[door]}`)).toBe(true);
  });
  it('takes out the model\'s own full "That is all for today." only in the plainer form', () => {
    const said = `${THEY_SAID} That is all for today.`;
    expect(endingOnTheClose(said, door, true).match(/all for today/g)).toHaveLength(1);
  });
});

it('reads, on WhatsApp, as short sentences with the next step first', () => {
  expect(theCloseFor('whatsapp', true)).toBe('That is all for today. Write "finish" to end this check-in. Your report will come to this chat.');
  expect(theCloseFor('whatsapp', false)).toBe('That’s all for today. Reply "finish" to close this check-in, and your report will come here.');
});
