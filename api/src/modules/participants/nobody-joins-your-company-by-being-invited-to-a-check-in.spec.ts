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

/*
 * U.4: FOUR PEOPLE AN ADMIN ADDED WERE ALL HELD FOR HER OWN APPROVAL. Sahar, an admin, set a check-in
 * up for a lead through /grounds/for-lead and added four people. The rule asked the person who RUNS
 * the check-in (the lead, not an admin), so every one of them waited. The question is now asked of
 * whoever added the person, which is recorded on their row.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { isAnAdminOf, whoToAsk } from './nobody-joins-your-company-by-being-invited-to-a-check-in';

describe('who added them decides, not who runs the check-in', () => {
  it('asks whoever added this person, and only falls back to the lead on rows that do not say', () => {
    expect(whoToAsk('sahar-the-admin', 'the-lead')).toBe('sahar-the-admin');
    expect(whoToAsk(null, 'the-lead')).toBe('the-lead');
    expect(whoToAsk(undefined, 'the-lead')).toBe('the-lead');
  });

  it('an admin of this organisation who added them is the approval; an admin somewhere else is not', () => {
    expect(isAnAdminOf('acme', { role: 'ADMIN', organizationId: 'acme' })).toBe(true);
    expect(isAnAdminOf('acme', { role: 'ADMIN', organizationId: 'other-co' })).toBe(false);
    expect(isAnAdminOf('acme', { role: 'LEAD', organizationId: 'acme' })).toBe(false);
    expect(isAnAdminOf('acme', null)).toBe(false);
  });

  it('so a brand-new person an admin added to a lead\'s check-in walks straight in', () => {
    const adder = { role: 'ADMIN', organizationId: 'acme' };
    expect(needsApproval(arriving({ theirHomeOrganizationId: null, addedByAnAdminOfThisOrg: isAnAdminOf('acme', adder) }))).toBe(false);
    /* And somebody a lead added still waits, as before. */
    const lead = { role: 'LEAD', organizationId: 'acme' };
    expect(needsApproval(arriving({ theirHomeOrganizationId: null, addedByAnAdminOfThisOrg: isAnAdminOf('acme', lead) }))).toBe(true);
  });

  const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  it('accept() asks the recorded adder, and both doors that add a person record who did', () => {
    const service = strip(readFileSync(join(__dirname, 'participants.service.ts'), 'utf8'));
    expect(service).toMatch(/where: \{ id: whoToAsk\(participant\.addedByUserId, ground\.initiatorId\) \}/);
    expect(service).toMatch(/addedByAnAdminOfThisOrg: isAnAdminOf\(ground\.organizationId, inviter\)/);
    const grounds = strip(readFileSync(join(__dirname, '..', 'grounds', 'grounds.service.ts'), 'utf8'));
    /* createForLead: the admin setting it up. addParticipant: the lead, or the admin who set it up. */
    expect(grounds).toMatch(/addedByUserId: adminUserId,/);
    expect(grounds).toMatch(/addedByUserId: initiatorId,/);
  });
});
