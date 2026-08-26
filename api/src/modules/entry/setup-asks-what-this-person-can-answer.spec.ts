import { onboardingIsReady } from './entry.service';

/**
 * SETUP ASKS WHAT THIS PERSON CAN ACTUALLY ANSWER.
 *
 * The old gate was `mode && initial && whoInvolved && decision` for everybody, and it was wrong in
 * both directions at once.
 *
 * FOR A COORDINATOR IT DEMANDED WHAT THEY DO NOT HAVE. Somebody told to set this up often knows one
 * thing: who runs it. The prompt already said "do not press a bystander for a situation they cannot
 * describe" while this gate refused to finish without a situation, a reason and a roster. Instruction
 * and gate contradicted each other and the gate won, by being satisfiable with a guess - observed
 * live, `whoInvolved: "My team"` cleared it.
 *
 * FOR EVERYBODY IT LEFT OUT THE FIELD THAT DECIDES WHAT THE OTHERS MEAN. `yourRole` separates
 * somebody's own account from hearsay about other people. It is asked first on purpose and was not
 * in the gate at all.
 *
 * BEHAVIOUR, NOT SOURCE TEXT. This one is a pure function, so it is tested by calling it.
 */
describe('setup asks what this person can actually answer', () => {
  it('is never ready before it knows whose words these are', () => {
    expect(onboardingIsReady({ mode: 'recurring', initial: 'a thing', decision: 'because' })).toBe(false);
  });

  describe('somebody setting this up for other people', () => {
    /**
     * The step straight after this asks who runs the first check-in, which is the one thing they do
     * have. It needs none of the other fields.
     */
    it('is ready as soon as their role is known, with nothing else', () => {
      expect(onboardingIsReady({ yourRole: 'setting_up_for_others' })).toBe(true);
    });

    it('and so is somebody handing it to a third person', () => {
      expect(onboardingIsReady({ yourRole: 'someone_else_runs_it' })).toBe(true);
    });
  });

  describe('a party', () => {
    it('still owes the situation and why now, because those are genuinely theirs', () => {
      expect(onboardingIsReady({ yourRole: 'a_party', mode: 'recurring' })).toBe(false);
      expect(onboardingIsReady({ yourRole: 'a_party', mode: 'recurring', initial: 'a thing' })).toBe(false);
      expect(onboardingIsReady({ yourRole: 'a_party', mode: 'recurring', initial: 'a thing', decision: 'because' })).toBe(true);
    });

    /**
     * WHO IS INVOLVED IS DELIBERATELY NOT REQUIRED. Hafsah's call: let them through and warn, because
     * a required field somebody cannot answer becomes a field they invent - which is the whole
     * history of "My team". The warning is `needsPeople`, not a refusal.
     */
    it('is let through having named nobody', () => {
      expect(onboardingIsReady({ yourRole: 'a_party', mode: 'recurring', initial: 'a thing', decision: 'because' })).toBe(true);
    });
  });
});
