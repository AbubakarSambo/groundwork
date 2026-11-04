import { onboardingIsReady } from './entry.service';

/**
 * SETUP ASKS WHAT THIS PERSON CAN ACTUALLY ANSWER.
 *
 * The original gate was `mode && initial && whoInvolved && decision` for everybody, and it demanded
 * a roster from people who did not have one. Instruction and gate contradicted each other - the
 * prompt said "do not press a bystander for a situation they cannot describe" while the gate refused
 * to finish without one - and the gate won, by being satisfiable with a guess. Observed live:
 * `whoInvolved: "My team"` cleared it. Three people, no names.
 *
 * IT THEN GATED ON `yourRole` AND NO LONGER DOES, which is the change this file records.
 *
 * That field was asked first because it decided what every word after it WAS: a party's words are
 * their own account, a non-party's are context about other people. The reasoning rested on a third
 * answer - "somebody else sets the context, you are only setting the check-in up" - which has been
 * removed. Both remaining answers write their own context, so setup's words are the context either
 * way. What is still decided is whether this person is ALSO asked to check in, and that is a
 * question about what happens next.
 *
 * So it is asked at the end now, by the screen, with two buttons - her call: "you either set the
 * context to checkin or set it and other checkin, you just look at the reports". A gate waiting on a
 * question nobody asks any more would never open, and setup would never finish.
 *
 * BEHAVIOUR, NOT SOURCE TEXT. This is a pure function, so it is tested by calling it.
 */
/*
 * AND THE AIM JOINED THEM ON 18 SEPTEMBER 2026. The three fields below are still necessary and they
 * stopped being sufficient: measured across all 22 situations, a lead answering in two words got to
 * the end with an aim three times out of twenty-two, because none of these three is a target. See
 * a-check-in-with-no-aim-has-nothing-to-read-against, which also holds the three situations that
 * have no aim by design. Every case here now carries one, so this file keeps testing what it is
 * about - what setup may and may not wait for - rather than silently testing the aim as well.
 */
const AND_AN_AIM = { goals: ['a number by a date'] };

describe('setup asks what this person can actually answer', () => {
  /* Why now is asked once by setup's instructions and no longer holds the gate (first experience, round 2, 31 October 2026). */
  it('wants the situation and what it is about, from everybody', () => {
    expect(onboardingIsReady({ ...AND_AN_AIM, mode: 'recurring' })).toBe(false);
    expect(onboardingIsReady({ ...AND_AN_AIM, mode: 'recurring', initial: 'a thing' })).toBe(true);
  });

  it('does not wait for a question setup no longer asks', () => {
    /*
     * THE FAILURE THIS PREVENTS, and it would have been total: the gate returned false without
     * `yourRole`, the prompt stopped asking for it, so nothing would ever have been ready and the
     * wrap-up screen would never have appeared for anybody.
     */
    expect(onboardingIsReady({ ...AND_AN_AIM, mode: 'recurring', initial: 'a thing', decision: 'because' })).toBe(true);
  });

  /**
   * WHO IS INVOLVED IS DELIBERATELY NOT REQUIRED. Her call: let them through and warn, because a
   * required field somebody cannot answer becomes a field they invent - which is the whole history
   * of "My team". The warning is `needsPeople`, not a refusal.
   */
  it('is let through having named nobody', () => {
    expect(onboardingIsReady({ ...AND_AN_AIM, mode: 'recurring', initial: 'a thing', decision: 'because' })).toBe(true);
  });

  /* And the same rule now covers the aim: saying there is not one is answering, not failing. */
  it('and is let through having said there is no target', () => {
    expect(onboardingIsReady({ mode: 'recurring', initial: 'a thing', decision: 'because', noAimAndTheySaidSo: true })).toBe(true);
  });
});
