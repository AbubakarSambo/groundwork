import { readFileSync } from 'fs';
import { join } from 'path';
import { GroundsByApiService } from './grounds-by-api.service';

const SRC = readFileSync(join(__dirname, 'grounds-by-api.service.ts'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

function svc(o: { person?: any; user?: any; people?: Record<string, any> } = {}) {
  const calls: any[] = [];
  const prisma: any = {
    person: { findFirst: async ({ where }: any) =>
      (o.people ? o.people[where.externalId] : undefined) ?? (o.person === undefined
        ? { email: `${where.externalId}@x.com`, displayName: where.externalId, active: true } : o.person) },
    user: { findFirst: async () => (o.user === undefined ? { id: `u-${Math.min(1,1)}`, email: 'ada@x.com' } : o.user) },
    ground: { findFirst: async () => ({ id: 'g1' }) },
  };
  const grounds: any = { createForLead: async (org: string, uid: string, dto: any) => {
    calls.push({ org, uid, dto }); return { id: 'g1', ...dto }; } };
  const reports: any = { get: async (gid: string, uid: string) => ({ gid, readAs: uid }) };
  return { service: new GroundsByApiService(prisma, grounds, reports), calls };
}

const base = { actingPersonExternalId: 'ada', label: 'Q4 leadership', scenario: 'OKR_ALIGNMENT', moment: 'STARTING' };

describe('opening a Groundwork from another product', () => {
  it('goes through the same service the product uses', async () => {
    /*
     * The whole reason parity holds. Nothing downstream asks how a ground was made, so reusing
     * createForLead means an API ground is not a different kind of thing that has to be kept in step.
     */
    expect(SRC).toMatch(/this\.grounds\.createForLead\(/);
    const { service, calls } = svc();
    await service.open('org-a', base as any);
    expect(calls).toHaveLength(1);
    expect(calls[0].dto.label).toBe('Q4 leadership');
    expect(calls[0].dto.scenario).toBe('OKR_ALIGNMENT');
  });

  it('refuses to open one with no situation', async () => {
    /* A check-in without a scenario is a form. The scenario pack is most of the intelligence. */
    const { service } = svc();
    await expect(service.open('org-a', { ...base, scenario: '' } as any)).rejects.toThrow(/scenario is required/);
  });

  it('requires a named person and never invents an initiator', async () => {
    /*
     * A machine token carries an organisation and nobody in particular. A ground has an initiator
     * whose name appears in a report and who receives the invitations - a token allowed to conjure
     * one would put grounds in the record that nobody opened.
     */
    const { service } = svc();
    await expect(service.open('org-a', { ...base, actingPersonExternalId: '' } as any))
      .rejects.toThrow(/actingPersonExternalId is required/);
    expect(SRC).not.toMatch(/initiatorId: *['"`]|systemUser|serviceAccount/);
  });

  it('and says which of the two things is missing', async () => {
    /* "Not found" sends a developer to check the wrong thing. Being in the directory and never
       having signed in is a real, fixable state. */
    const notPushed = svc({ person: null });
    await expect(notPushed.service.open('org-a', base as any)).rejects.toThrow(/Push them through SCIM first/);
    const neverSignedIn = svc({ user: null });
    await expect(neverSignedIn.service.open('org-a', base as any)).rejects.toThrow(/never signed in/);
  });

  it('refuses a deactivated person', async () => {
    /* Somebody's integration still running after they left, naming them as initiator for the life
       of the ground. */
    const { service } = svc({ person: { email: 'gone@x.com', displayName: 'Gone', active: false } });
    await expect(service.open('org-a', base as any)).rejects.toThrow(/deactivated/);
  });

  it('takes participants by directory id, never by email address', async () => {
    /*
     * The caller's identity system already has everybody's address. An integration passing raw
     * emails around is a copy of somebody's contact list that nobody asked for.
     */
    const { service, calls } = svc();
    await service.open('org-a', { ...base, participants: [
      /* An email is passed in deliberately: it must be ignored, not trusted. The first version of
         this test passed none, so it could not tell the two apart. */
      { personExternalId: 'lin', email: 'attacker@elsewhere.test', roleAsDescribed: 'Sales' },
    ] } as any);
    expect(calls[0].dto.participants).toEqual([{ email: 'lin@x.com', roleAsDescribed: 'Sales' }]);
  });
});

describe('reading a report through the API', () => {
  it('reads as a named person, never as nobody', async () => {
    /*
     * Treating a machine token as an org admin would make the API a way to read everybody's
     * synthesis with a credential belonging to no one - a permission no human in the company has.
     */
    const { service } = svc();
    await expect(service.report('org-a', 'g1', '')).rejects.toThrow(/reads as somebody, never as nobody/);
    expect(await service.report('org-a', 'g1', 'ada')).toEqual({ gid: 'g1', readAs: 'u-1' });
  });

  it('and hands the existing permission check the person, not a bypass', async () => {
    /* reports.get already refuses somebody with no standing. The API must go through it rather
       than around it. */
    expect(SRC).toMatch(/this\.reports\.get\(groundId, user\.id, organizationId\)/);
  });
});
