import {
  needsApproval,
  whyTheyDoNotNeedApproval,
} from './nobody-joins-your-company-by-being-invited-to-a-check-in';

const arriving = (over: Partial<Parameters<typeof needsApproval>[0]> = {}) => ({
  groundOrganizationId: 'acme',
  theirHomeOrganizationId: 'other-co',
  alreadyAMemberHere: false,
  addedByAnAdminOfThisOrg: false,
  ...over,
});

describe('somebody from outside, added to a check-in', () => {
  it('waits for an admin when their account is being created right now', () => {
    /* The commonest case and the one that was silently making members: no account anywhere, so
       one is created in the inviting organisation. This is the only person who waits. */
    expect(needsApproval(arriving({ theirHomeOrganizationId: null }))).toBe(true);
  });

  it('but somebody with an account elsewhere does not - they are a guest, and the role is the gate', () => {
    /* The flag is on the account, so making them wait locked them out of their OWN organisation's
       check-ins. A guest holds no seat here and no keys, which is everything the queue was for. */
    expect(needsApproval(arriving())).toBe(false);
    expect(whyTheyDoNotNeedApproval(arriving())).toMatch(/guest/);
  });
});

describe('who never waits', () => {
  it('somebody already in the organisation', () => {
    expect(whyTheyDoNotNeedApproval(arriving({ alreadyAMemberHere: true })))
      .toMatch(/already in this organisation/);
  });

  it('somebody whose own organisation this is', () => {
    expect(whyTheyDoNotNeedApproval(arriving({ theirHomeOrganizationId: 'acme' })))
      .toMatch(/their own organisation/);
  });

  it('and a new account an admin of this organisation is creating, because that IS the approval', () => {
    /* Only a brand-new account can reach this rule: an existing one is a guest before it is asked. */
    expect(whyTheyDoNotNeedApproval(arriving({ theirHomeOrganizationId: null, addedByAnAdminOfThisOrg: true })))
      .toMatch(/an admin of this organisation added them/);
  });

  it('each of which gives a reason, not just a false', () => {
    /* "It returned false" is not something anybody can check three months later. */
    for (const over of [
      { alreadyAMemberHere: true },
      { theirHomeOrganizationId: 'acme' },
      { theirHomeOrganizationId: 'other-co' },
      { theirHomeOrganizationId: null, addedByAnAdminOfThisOrg: true },
    ]) {
      expect(whyTheyDoNotNeedApproval(arriving(over))).toBeTruthy();
    }
  });
});
