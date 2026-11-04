import { digestBody } from './nothing-lands-at-3am';

/**
 * "5 PEOPLE TOOK PART. 1 THING NEEDS ATTENTION." (messages test, 19 October, finding 19 in the findings file, 18 in Hafsah's list).
 *
 * Drop Access (test), Monday 12 October 14:15, to Kevin: "Everyone has checked in for session 1 of Sales team, Q4. 5 people took part. 1
 * thing needs attention." It did not say what. The count is of the waits still open in the check-in (somebody waiting on somebody for
 * something). The digest carries no name, quote or finding by design (it leaves the product for a mailbox), so it now says what kind of
 * thing it is and where to see who and what, still with no name in it.
 */
const kevins = { groundLabel: 'Sales team, Q4', sessionNumber: 1, participantCount: 5, needsAttention: 1, permalink: 'http://localhost:5196/grounds/3c5ddb85-2722-4db0-b73b-c407dac19071' };

describe('the session digest says what needs attention', () => {
  it('Kevin, session 1: one wait, said as one', () => {
    const body = digestBody(kevins);
    expect(body).toContain('5 people took part. One thing somebody is waiting for is still open, and the check-in\'s board shows who is waiting and for what.');
    expect(body).not.toContain('1 thing needs attention');
  });
  it('Kevin, session 2: three', () => {
    const body = digestBody({ ...kevins, sessionNumber: 2, participantCount: 4, needsAttention: 3 });
    expect(body).toContain('4 people took part. Three things people are waiting for are still open, and the check-in\'s board shows who is waiting and for what.');
  });
});
