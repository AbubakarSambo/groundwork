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
  it('waits for an admin', () => {
    expect(needsApproval(arriving())).toBe(true);
  });

  it('and so does somebody whose account is being created right now', () => {
    /* The commonest case and the one that was silently making members: no account anywhere, so
       one is created in the inviting organisation. */
    expect(needsApproval(arriving({ theirHomeOrganizationId: null }))).toBe(true);
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

  it('and somebody an admin of this organisation added, because that IS the approval', () => {
    expect(whyTheyDoNotNeedApproval(arriving({ addedByAnAdminOfThisOrg: true })))
      .toMatch(/an admin of this organisation added them/);
  });

  it('each of which gives a reason, not just a false', () => {
    /* "It returned false" is not something anybody can check three months later. */
    for (const over of [
      { alreadyAMemberHere: true },
      { theirHomeOrganizationId: 'acme' },
      { addedByAnAdminOfThisOrg: true },
    ]) {
      expect(whyTheyDoNotNeedApproval(arriving(over))).toBeTruthy();
    }
  });
});
