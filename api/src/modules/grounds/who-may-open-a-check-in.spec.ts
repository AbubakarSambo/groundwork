import { mayOpen, CANNOT_OPEN, HOW_A_NEW_ORG_WORKS } from './who-may-open-a-check-in';

/**
 * WHO MAY OPEN A CHECK-IN.
 *
 * "Named leads can open a check-in and get HR approval or org admin approval. Other people that are
 * not named or approved for creating check-ins can't, they can just be part of a check-in. But you
 * can disable these two settings and allow everyone and don't need approvals."
 */
const strict = HOW_A_NEW_ORG_WORKS;
const admin = { role: 'ADMIN', named: false };
const lead = { role: 'MEMBER', named: true };
const person = { role: 'MEMBER', named: false };

describe('by default', () => {
  it('a named lead may open one, and it waits', () => {
    expect(mayOpen(lead, strict)).toEqual({ may: true, waits: true });
  });

  it('somebody who is not named cannot open one at all', () => {
    const answer = mayOpen(person, strict);
    expect(answer.may).toBe(false);
  });

  it('and is told they can still take part, and who can change it', () => {
    /* A refusal with no next step reads as the product being broken. */
    expect(CANNOT_OPEN).toContain('still take part');
    expect(CANNOT_OPEN).toContain('Ask an admin');
    /* And says nothing about them: not being named is a setting, not a judgement. */
    expect(CANNOT_OPEN).not.toMatch(/\b(you are not|permission denied|unauthorised|not allowed to)\b/i);
  });

  it('an admin opens one without waiting for themselves', () => {
    expect(mayOpen(admin, strict)).toEqual({ may: true, waits: false });
  });

  it('the default is the stricter of the two, which an org can then loosen', () => {
    expect(HOW_A_NEW_ORG_WORKS).toEqual({ whoMayOpen: 'NAMED_LEADS', needsApproval: true });
  });
});

describe('the two settings are separate, so all four arrangements exist', () => {
  it('anybody may open one, and it still waits', () => {
    expect(mayOpen(person, { whoMayOpen: 'EVERYONE', needsApproval: true })).toEqual({ may: true, waits: true });
  });

  it('only leads may open one, and they are trusted to get on with it', () => {
    expect(mayOpen(lead, { whoMayOpen: 'NAMED_LEADS', needsApproval: false })).toEqual({ may: true, waits: false });
    expect(mayOpen(person, { whoMayOpen: 'NAMED_LEADS', needsApproval: false }).may).toBe(false);
  });

  it('both off: anybody opens one and nothing waits', () => {
    expect(mayOpen(person, { whoMayOpen: 'EVERYONE', needsApproval: false })).toEqual({ may: true, waits: false });
  });

  it('an admin is subject to neither, whatever they are set to', () => {
    for (const how of [
      { whoMayOpen: 'NAMED_LEADS' as const, needsApproval: true },
      { whoMayOpen: 'EVERYONE' as const, needsApproval: true },
    ]) expect(mayOpen(admin, how)).toEqual({ may: true, waits: false });
  });
});
