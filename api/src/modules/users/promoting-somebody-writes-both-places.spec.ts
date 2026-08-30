import { setRole } from './a-role-is-stored-twice';

/**
 * PROMOTING A SUB-ADMIN, WHICH USED TO HALF-WORK IN A WAY NOTHING REPORTED.
 *
 * Found while planning a 160-person rollout: `update()` wrote `User.role` - what the guard, the
 * session and every page read - and never `OrganizationMembership.role`, which the organisation
 * switcher reads. The promoted person was an admin everywhere except the one screen that lists
 * their organisations, and no error was raised at any point.
 */
const calls: any[] = [];
const tx = () => {
  calls.length = 0;
  return {
    user: { update: async (a: any) => { calls.push(['user', a]); return {}; } },
    organizationMembership: { updateMany: async (a: any) => { calls.push(['membership', a]); return { count: 1 }; } },
  } as any;
};

describe('a role is stored twice, so it is written twice', () => {
  it('writes the authority, which is the user row', async () => {
    await setRole(tx(), 'u1', 'org1', 'ADMIN');
    const [, arg] = calls.find(([k]) => k === 'user');
    expect(arg.where).toEqual({ id: 'u1' });
    expect(arg.data.role).toBe('ADMIN');
  });

  it('writes the membership too, which is what the switcher reads', async () => {
    await setRole(tx(), 'u1', 'org1', 'ADMIN');
    const found = calls.find(([k]) => k === 'membership');
    expect(found).toBeDefined();
    expect(found[1].data.role).toBe('ADMIN');
  });

  it('scopes the membership write to the organisation it was asked about', async () => {
    /* A user can belong to several. Writing them all would promote somebody in a customer's
       organisation because an admin in a different one promoted them. */
    await setRole(tx(), 'u1', 'org1', 'ADMIN');
    const [, arg] = calls.find(([k]) => k === 'membership');
    expect(arg.where).toEqual({ userId: 'u1', organizationId: 'org1' });
  });

  it('demotes through the same door', async () => {
    await setRole(tx(), 'u1', 'org1', 'MEMBER');
    expect(calls.filter(([, a]) => a.data.role === 'MEMBER')).toHaveLength(2);
  });

  it('does not create a membership that was not there', async () => {
    /* No row is a different condition with a different cause. Conjuring one hides it, so this
       updates many-or-none rather than upserting. */
    await setRole(tx(), 'u1', 'org1', 'ADMIN');
    const [, arg] = calls.find(([k]) => k === 'membership');
    expect(arg.create).toBeUndefined();
    expect(arg.update).toBeUndefined();
  });
});
