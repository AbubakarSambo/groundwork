import { TheOrganisationInviteLinkService, aNewCode } from './the-organisation-invite-link.service';

/**
 * THE ORGANISATION'S OWN INVITE LINK (U.3, Hafsah, 26 September), BY BEHAVIOUR.
 */
function make(o: {
  code?: string | null; room?: boolean; member?: boolean;
  /** The founding admin's address, whose domain is "the organisation's domain" (item 11). */
  orgEmail?: string;
  /** The address of whoever is joining through the link. */
  joinerEmail?: string;
  /** They already asked once, and it is still pending. */
  pendingRequest?: boolean;
} = {}) {
  let code: string | null = o.code === undefined ? 'baridi-7k2p' : o.code;
  const orgEmail = o.orgEmail ?? 'wairimu@baridi.co.ke';
  const joinerEmail = o.joinerEmail ?? 'amani@baridi.co.ke';
  const created: any[] = [];
  const requests: any[] = [];
  const prisma: any = {
    organization: {
      findUnique: jest.fn(async ({ where }: any) => {
        if (where.id) return { name: 'Baridi Appliances', inviteLinkCode: code };
        if (where.inviteLinkCode && where.inviteLinkCode === code) return { id: 'baridi', name: 'Baridi Appliances', inviteLinkByUserId: 'u-wairimu', email: orgEmail };
        return null;
      }),
      findFirst: jest.fn(async () => null),
      update: jest.fn(async ({ data }: any) => { code = data.inviteLinkCode; return {}; }),
    },
    user: {
      findUnique: jest.fn(async ({ where }: any) => {
        if (where.id === 'u-wairimu') return { firstName: 'Wairimu', lastName: 'Kamau', isActive: true };
        return { email: joinerEmail };
      }),
    },
    organizationMembership: {
      findUnique: jest.fn(async () => (o.member ? { id: 'm' } : null)),
      create: jest.fn(async ({ data }: any) => { created.push(data); return data; }),
    },
    membershipRequest: {
      findUnique: jest.fn(async () => (o.pendingRequest ? { status: 'PENDING' } : null)),
      upsert: jest.fn(async ({ create }: any) => { requests.push(create); return create; }),
    },
  };
  const billing: any = { canInviteMember: jest.fn(async () => ({ allowed: o.room ?? true })) };
  const auth: any = { switchOrganization: jest.fn(async () => ({ accessToken: 'tok', user: { role: 'MEMBER' } })) };
  return { s: new TheOrganisationInviteLinkService(prisma, billing, auth), created, requests, auth, getCode: () => code };
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

describe('the code is already random, not guessable from the organisation\'s name (item 11)', () => {
  it('draws its random part from crypto.randomBytes, not from anything about the organisation', () => {
    /* Two codes for the same name never repeat, which a name-derived code would. */
    const codes = new Set(Array.from({ length: 20 }, () => aNewCode('Baridi Appliances')));
    expect(codes.size).toBe(20);
    expect([...codes].every((c) => /^baridi-appliances-[a-z2-9]{4}$/.test(c))).toBe(true);
  });
});

describe('somebody from outside the domain waits for an admin (item 11, no DNS proof for now)', () => {
  it('is not made a member on the spot when their email domain does not match the organisation\'s', async () => {
    const { s, created, requests, auth } = make({ orgEmail: 'wairimu@baridi.co.ke', joinerEmail: 'stranger@example.com' });
    const r: any = await s.join('baridi-7k2p', 'u9');
    expect(r).toEqual({ queuedForApproval: true, organisationName: 'Baridi Appliances' });
    expect(created).toHaveLength(0);
    expect(auth.switchOrganization).not.toHaveBeenCalled();
    expect(requests).toEqual([{ organizationId: 'baridi', userId: 'u9', email: 'stranger@example.com', viaInvitation: false }]);
  });

  it('still joins on the spot when the domain matches', async () => {
    const { s, created, requests } = make({ orgEmail: 'wairimu@baridi.co.ke', joinerEmail: 'amani@baridi.co.ke' });
    await s.join('baridi-7k2p', 'u9');
    expect(created).toEqual([{ userId: 'u9', organizationId: 'baridi', role: 'MEMBER', joinedHow: 'link' }]);
    expect(requests).toHaveLength(0);
  });

  it('does not make anybody wait when the organisation\'s own address is a public mail domain - there is no real domain to compare', async () => {
    const { s, created, requests } = make({ orgEmail: 'wairimu@gmail.com', joinerEmail: 'stranger@example.com' });
    await s.join('baridi-7k2p', 'u9');
    expect(created).toEqual([{ userId: 'u9', organizationId: 'baridi', role: 'MEMBER', joinedHow: 'link' }]);
    expect(requests).toHaveLength(0);
  });

  it('says they are still waiting rather than raising a second request', async () => {
    const { s, requests } = make({ orgEmail: 'wairimu@baridi.co.ke', joinerEmail: 'stranger@example.com', pendingRequest: true });
    const r: any = await s.join('baridi-7k2p', 'u9');
    expect(r).toEqual({ queuedForApproval: true, organisationName: 'Baridi Appliances' });
    expect(requests).toHaveLength(0);
  });
});
