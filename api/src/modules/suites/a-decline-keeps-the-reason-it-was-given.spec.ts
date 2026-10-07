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
