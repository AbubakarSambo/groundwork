import { TheOrganisationInviteLinkService, aNewCode } from './the-organisation-invite-link.service';

/**
 * THE ORGANISATION'S OWN INVITE LINK (U.3, Hafsah, 26 September), BY BEHAVIOUR.
 */
function make(o: { code?: string | null; room?: boolean; member?: boolean } = {}) {
  let code: string | null = o.code === undefined ? 'baridi-7k2p' : o.code;
  const created: any[] = [];
  const prisma: any = {
    organization: {
      findUnique: jest.fn(async ({ where }: any) => {
        if (where.id) return { name: 'Baridi Appliances', inviteLinkCode: code };
        if (where.inviteLinkCode && where.inviteLinkCode === code) return { id: 'baridi', name: 'Baridi Appliances', inviteLinkByUserId: 'u-wairimu' };
        return null;
      }),
      findFirst: jest.fn(async () => null),
      update: jest.fn(async ({ data }: any) => { code = data.inviteLinkCode; return {}; }),
    },
    user: { findUnique: jest.fn(async () => ({ firstName: 'Wairimu', lastName: 'Kamau', isActive: true })) },
    organizationMembership: {
      findUnique: jest.fn(async () => (o.member ? { id: 'm' } : null)),
      create: jest.fn(async ({ data }: any) => { created.push(data); return data; }),
    },
  };
  const billing: any = { canInviteMember: jest.fn(async () => ({ allowed: o.room ?? true })) };
  const auth: any = { switchOrganization: jest.fn(async () => ({ accessToken: 'tok', user: { role: 'MEMBER' } })) };
  return { s: new TheOrganisationInviteLinkService(prisma, billing, auth), created, auth, getCode: () => code };
}

describe('the code', () => {
  it('is the organisation\'s name with a random part', () => {
    expect(aNewCode('Baridi Appliances')).toMatch(/^baridi-appliances-[a-z2-9]{4}$/);
    expect(aNewCode('Baridi Appliances')).not.toBe(aNewCode('Baridi Appliances'));
  });
});

describe('the admin\'s switch', () => {
  it('off clears the link, so the old one stops working', async () => {
    const { s, getCode } = make();
    expect(await s.set('baridi', 'u1', false)).toEqual({ on: false, code: null });
    expect(getCode()).toBeNull();
    expect(await s.preview('baridi-7k2p')).toEqual({ open: false });
  });

  it('on again makes a new link', async () => {
    const { s, getCode } = make({ code: null });
    const r = await s.set('baridi', 'u1', true);
    expect(r.on).toBe(true);
    expect(r.code).toMatch(/^baridi-appliances-[a-z2-9]{4}$/);
    expect(getCode()).toBe(r.code);
  });
});

describe('somebody holding the link', () => {
  it('reads the organisation and who shared it, and nothing else', async () => {
    const { s } = make();
    expect(await s.preview('baridi-7k2p')).toEqual({ open: true, organisationName: 'Baridi Appliances', inviterName: 'Wairimu Kamau' });
  });

  it('a name alone is not a link', async () => {
    const { s } = make();
    expect(await s.preview('baridi')).toEqual({ open: false });
  });

  it('joins as "Takes part", through the seat check, and is switched in', async () => {
    const { s, created, auth } = make();
    const r: any = await s.join('baridi-7k2p', 'u9');
    /* U.3 review: the membership also records that they came by the link. */
    expect(created).toEqual([{ userId: 'u9', organizationId: 'baridi', role: 'MEMBER', joinedHow: 'link' }]);
    expect(auth.switchOrganization).toHaveBeenCalledWith('u9', 'baridi', 'password');
    expect(r.accessToken).toBe('tok');
  });

  it('is refused, in a sentence, when there is no room, and nothing is joined', async () => {
    const { s, created } = make({ room: false });
    await expect(s.join('baridi-7k2p', 'u9')).rejects.toThrow('Baridi Appliances has no room for another person on its plan right now.');
    expect(created).toHaveLength(0);
  });

  it('a link that was turned off does not let anybody in', async () => {
    const { s, created } = make({ code: null });
    await expect(s.join('baridi-7k2p', 'u9')).rejects.toThrow('That invite link is not open any more. Ask whoever sent it for the new one.');
    expect(created).toHaveLength(0);
  });
});
