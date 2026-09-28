import { WhoIsWaitingAtTheDoorService } from './who-is-waiting-at-the-door.service';

/**
 * "ALMOST IN" (A3, #/join/waiting), AS THE SERVER GIVES IT TO THE PERSON WAITING (U.3).
 *
 * Hafsah, 26 September: name the admin, as the prototype does ("We've asked Grace Achieng", "Remind
 * Grace"), but only after the person has accepted a real invitation. The admin named is the
 * organisation's owner when they are an active admin, otherwise the admin who has been one longest,
 * and "Remind" reaches that same person, once a day, enforced here.
 */
const HOUR = 60 * 60 * 1000;

function make(opts: { viaInvitation?: boolean; createdAt?: Date; lastRemindedAt?: Date | null; owner?: string | null; none?: boolean; seatsFull?: boolean } = {}) {
  const request = {
    id: 'r1', userId: 'u-peter', email: 'peter@ouma.test', organizationId: 'o1', groundId: 'g1', requestedByUserId: 'u-wairimu',
    createdAt: opts.createdAt ?? new Date(Date.now() - 30 * HOUR), lastRemindedAt: opts.lastRemindedAt ?? null,
    viaInvitation: opts.viaInvitation ?? true, organization: { name: 'Baridi Appliances' },
  };
  const sent: any[] = [];
  const updates: any[] = [];
  const prisma: any = {
    membershipRequest: {
      findFirst: jest.fn(async ({ where }: any) => (opts.none || where.userId !== 'u-peter' ? null : request)),
      update: jest.fn(async (a: any) => { updates.push(a); return {}; }),
    },
    organization: { findUnique: jest.fn(async () => ({ ownerUserId: opts.owner === undefined ? 'u-grace' : opts.owner })) },
    user: {
      findMany: jest.fn(async () => [
        { id: 'u-joseph', email: 'joseph@baridi.test', firstName: 'Joseph', lastName: 'Mwangi' },
        { id: 'u-grace', email: 'grace@baridi.test', firstName: 'Grace', lastName: 'Achieng' },
      ]),
      findUnique: jest.fn(async () => ({ firstName: 'Wairimu', lastName: 'Kamau', email: 'w@baridi.test' })),
    },
    ground: { findUnique: jest.fn(async () => ({ label: 'Sales team, Q3' })) },
  };
  const email: any = { sendSomebodyIsWaiting: jest.fn(async (...a: any[]) => { sent.push(a); }) };
  const billing: any = { canInviteMember: jest.fn(async () => ({ allowed: !opts.seatsFull })) };
  return { door: new WhoIsWaitingAtTheDoorService(prisma, email, billing), sent, updates, request };
}

describe('the person waiting reads their own request', () => {
  it('names the owner, who is an admin, after a real invitation', async () => {
    const { door, request } = make();
    const r: any = await door.myOwnRequest('u-peter');
    expect(r.waiting).toBe(true);
    expect(r.organisationName).toBe('Baridi Appliances');
    expect(r.admin).toEqual({ name: 'Grace Achieng', firstName: 'Grace' });
    expect(r.inviterFirstName).toBe('Wairimu');
    expect(r.askedAt).toBe(request.createdAt.toISOString());
  });

  it('with no owner among the admins, the admin who has been one longest', async () => {
    const { door } = make({ owner: null });
    expect(((await door.myOwnRequest('u-peter')) as any).admin.name).toBe('Joseph Mwangi');
  });

  it('names nobody when they came through a link shared with many people', async () => {
    const { door } = make({ viaInvitation: false });
    const r: any = await door.myOwnRequest('u-peter');
    expect(r.admin).toBeNull();
    expect(r.inviterFirstName).toBeNull();
  });

  it('somebody else, or somebody not waiting, reads nothing', async () => {
    const { door } = make();
    expect(await door.myOwnRequest('u-someone-else')).toEqual({ waiting: false });
  });

  /**
   * THE TRUE REASON, WHEN IT IS SEATS (U.8 re-review). Faraji has this organisation's own address -
   * he is not a stranger to it - but the plan has no free seat, and the page used to say "You're
   * from outside" regardless, because `needsApproval` (what decided he had to wait) is asked before
   * his account exists and cannot yet tell "a stranger" from "one of ours with nowhere to sit".
   */
  it('says when the true reason is that the plan has no free seat, not that they are a stranger', async () => {
    const { door } = make({ seatsFull: true });
    expect(((await door.myOwnRequest('u-peter')) as any).heldForASeat).toBe(true);
  });

  it('and says otherwise when there is room, so an admin genuinely does have to say yes', async () => {
    const { door } = make({ seatsFull: false });
    expect(((await door.myOwnRequest('u-peter')) as any).heldForASeat).toBe(false);
  });
});

describe('"Remind", once a day', () => {
  it('reaches the admin named, and only them', async () => {
    const { door, sent, updates } = make();
    await door.remind('u-peter');
    expect(sent).toHaveLength(1);
    expect(sent[0][0]).toBe('grace@baridi.test');
    expect(updates[0].data.lastRemindedAt).toBeInstanceOf(Date);
  });

  it('is refused within a day of being asked, in a plain sentence, and nothing is sent', async () => {
    const { door, sent } = make({ createdAt: new Date(Date.now() - 2 * HOUR) });
    await expect(door.remind('u-peter')).rejects.toThrow('You can send a reminder once a day. You can send the next one tomorrow.');
    expect(sent).toHaveLength(0);
  });

  it('is refused within a day of the last reminder', async () => {
    const { door, sent } = make({ lastRemindedAt: new Date(Date.now() - 23 * HOUR) });
    await expect(door.remind('u-peter')).rejects.toThrow('once a day');
    expect(sent).toHaveLength(0);
  });

  it('is allowed again a day after the last one', async () => {
    const { door, sent } = make({ lastRemindedAt: new Date(Date.now() - 25 * HOUR) });
    await door.remind('u-peter');
    expect(sent).toHaveLength(1);
  });

  it('has nobody to remind after a shared link', async () => {
    const { door, sent } = make({ viaInvitation: false });
    await expect(door.remind('u-peter')).rejects.toThrow('There is nobody to remind for this request. The admins have already been asked.');
    expect(sent).toHaveLength(0);
  });
});
