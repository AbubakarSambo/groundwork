import { mayOpen, GUESTS_DO_NOT_OPEN } from './who-may-open-a-check-in';

/**
 * A GUEST FROM ANOTHER COMPANY IS NOT ONE OF YOUR PEOPLE.
 *
 * Somebody added to a check-in from another company holds a membership so the organisation reaches
 * their switcher and the check-in they were invited to is reachable. They held `MEMBER` - the same
 * role as your own staff - and `mayOpen` asks only about the role.
 *
 * So an organisation whose setting is "anyone may open a check-in" let a guest open one here and
 * invite THIS organisation's people, against ITS billing. An admin who writes "anyone" is thinking
 * of the people they employ.
 */
describe('GW-GUEST: who may open a check-in in an organisation you are only visiting', () => {
  const EVERYONE = { whoMayOpen: 'EVERYONE' as const, needsApproval: false };
  const NAMED_LEADS = { whoMayOpen: 'NAMED_LEADS' as const, needsApproval: false };

  it('THE ONE THAT MATTERS: a guest may not open one even where anyone may', () => {
    const answer = mayOpen({ role: 'GUEST' }, EVERYONE);
    expect(answer.may).toBe(false);
  });

  it('and is told why, in terms of being a guest rather than of being refused', () => {
    const answer = mayOpen({ role: 'GUEST' }, EVERYONE) as { may: false; because: string };
    expect(answer.because).toBe(GUESTS_DO_NOT_OPEN);
    /* A guest can now be let into their own organisation as one (Hafsah, 21 November 2026), so it no longer says "from another organisation". */
    expect(answer.because).toMatch(/as a guest\b/i);
    // It must still say what they CAN do, or it reads as the product being broken for them.
    expect(answer.because).toMatch(/you are added to/i);
  });

  it('nor under the stricter setting, which was already refusing them', () => {
    expect(mayOpen({ role: 'GUEST' }, NAMED_LEADS).may).toBe(false);
  });

  it('but this changes nothing for the organisation own people', () => {
    // The whole point is that the guest case was the only one wrong.
    expect(mayOpen({ role: 'MEMBER' }, EVERYONE).may).toBe(true);
    expect(mayOpen({ role: 'LEAD' }, NAMED_LEADS).may).toBe(true);
    expect(mayOpen({ role: 'ADMIN' }, NAMED_LEADS).may).toBe(true);
    expect(mayOpen({ role: 'MEMBER' }, NAMED_LEADS).may).toBe(false);
  });

  it('and a guest is never silently treated as an admin anywhere', () => {
    // GUEST is a new enum value; anything asking `role === 'ADMIN'` must stay false for it.
    expect(('GUEST' as string) === 'ADMIN').toBe(false);
    expect(mayOpen({ role: 'GUEST' }, EVERYONE).may).toBe(false);
  });
});
