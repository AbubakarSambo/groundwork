import { aReasonIn } from './a-question-about-a-request';

/** B-022: the reason Grace gave when declining on WhatsApp was dropped, so Zawadi was told no and not why. */
describe('the reason given with a decline', () => {
  it.each([
    ["decline Zawadi's request to spend KES 200,000, we cannot afford the van this quarter", 'we cannot afford the van this quarter'],
    ["decline Aisha's leave because Sales is two short that week", 'Sales is two short that week'],
    ["decline Brian's request since the budget is committed.", 'the budget is committed'],
    ["decline Zawadi's request - we cannot afford the van this quarter", 'we cannot afford the van this quarter'],
  ])('keeps the reason in "%s"', (said, reason) => {
    expect(aReasonIn(said)).toBe(reason);
  });
  it('invents none where none was given, and does not cut a number or a list of names', () => {
    expect(aReasonIn("decline Zawadi's request to spend KES 200,000")).toBeNull();
    expect(aReasonIn("decline Aisha's request")).toBeNull();
    expect(aReasonIn("decline the requests of Aisha, Brian and Chidi")).toBeNull();
  });
});

import { readLeaveDates } from './leave-said-in-chat';
import { A_YES } from '../public-api/a-whatsapp-message-is-routed';

/** B-124: "from Monday 19 October to Friday 23 October" was read as the one day, and "Yes please" was not a yes. */
describe('a range of days with the weekday said', () => {
  const today = new Date('2026-10-07T09:00:00Z');
  it('is the whole range', () => {
    expect(readLeaveDates("I need to take leave from Monday 19 October to Friday 23 October for my sister's wedding.", today)).toEqual({ startsOn: '2026-10-19', endsOn: '2026-10-23' });
    expect(readLeaveDates('I need leave from 19 October to Friday 23 October', today)).toEqual({ startsOn: '2026-10-19', endsOn: '2026-10-23' });
    expect(readLeaveDates('I need leave Monday 19 October - Friday 23 October', today)).toEqual({ startsOn: '2026-10-19', endsOn: '2026-10-23' });
  });
  it('still reads one day and plain ranges', () => {
    expect(readLeaveDates('I need leave on Monday 19 October', today)).toEqual({ startsOn: '2026-10-19', endsOn: '2026-10-19' });
    expect(readLeaveDates('I need leave 19 to 23 October', today)).toEqual({ startsOn: '2026-10-19', endsOn: '2026-10-23' });
  });
  it.each(['Yes please', 'yes please!', 'Yes', 'ok', 'sure thanks', 'go ahead'])('%s is a yes', (t) => expect(A_YES.test(t)).toBe(true));
  it.each(['no', 'yes but not Friday'])('%s is not', (t) => expect(A_YES.test(t)).toBe(false));
});
