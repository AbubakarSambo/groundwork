import { waitsOnAManagingOnlyLead, THE_LEAD_ONLY_ASKS } from './the-lead-who-only-asks';

/**
 * Read on a live ground, with everybody in: "4 of 5 answered - waiting on Hafsah Lead". The lead of
 * a team update is never given anything to answer, so that round would wait forever and the mail
 * the card is sold on would never send.
 */
describe('the lead who only asks', () => {
  it('is not waited on, in any session, when the situation is one they only ask in', () => {
    expect(waitsOnAManagingOnlyLead('TEAM_UPDATES', 1)).toBe(false);
    expect(waitsOnAManagingOnlyLead('TEAM_UPDATES', 2)).toBe(false);
  });

  /* Everywhere else the old rule stands: everybody gives a first check-in, including a lead who
     chose to manage, and only from session two are they left out. */
  it('and everywhere else a managing lead still gives session one', () => {
    expect(waitsOnAManagingOnlyLead('GOAL_ALIGNMENT', 1)).toBe(true);
    expect(waitsOnAManagingOnlyLead('GOAL_ALIGNMENT', 2)).toBe(false);
    expect(waitsOnAManagingOnlyLead(null, 1)).toBe(true);
  });

  it('and the list of those situations is short and named', () => {
    /* The situations where the lead asks a room a question, or sets up, rather than answering one. */
    expect(THE_LEAD_ONLY_ASKS).toEqual(['TEAM_UPDATES', 'DISCOVERY', 'HELP_TEAM_UNDERSTAND']);
  });

  it("and the anchor's lead is never waited on, even in round one, because her set-up is not an answer", () => {
    expect(waitsOnAManagingOnlyLead('HELP_TEAM_UNDERSTAND', 1)).toBe(false);
    expect(waitsOnAManagingOnlyLead('HELP_TEAM_UNDERSTAND', 2)).toBe(false);
  });
});
