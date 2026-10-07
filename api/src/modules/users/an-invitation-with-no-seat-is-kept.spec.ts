import { UsersService } from './users.service';
import { theInvitationsWaiting } from './invitations-waiting-for-a-seat';

/**
 * B-129: Ruth pasted 25 addresses on a plan with room for 19. She was told "19 people were invited. 6
 * people have no seat on your plan." and the six were kept nowhere: not on People, not in the queue of
 * people waiting for a seat, no mail. They are now kept, shown, and invited when there is room.
 */
function aService(opts: { seats: number | null }) {
  const settings = new Map<string, any>();
  const prisma: any = {
    platformSetting: {
      findUnique: jest.fn(async ({ where }: any) => (settings.has(where.key) ? { key: where.key, value: settings.get(where.key) } : null)),
      upsert: jest.fn(async ({ where, create, update }: any) => { settings.set(where.key, settings.has(where.key) ? update.value : create.value); return {}; }),
    },
    organizationMembership: { findMany: jest.fn(async ({ where }: any) => (where.user ? [] : [])), count: jest.fn(async () => 0) },
    groundParticipant: { findMany: jest.fn(async () => []) },
    membershipRequest: { findMany: jest.fn(async () => []) },
    user: { findMany: jest.fn(async () => []) },
    ground: { findMany: jest.fn(async () => []) },
  };
  let seats = opts.seats;
  const invited: string[] = [];
  const billing: any = { seatsLeft: jest.fn(async () => seats) };
  const auth: any = { teamInvite: jest.fn(async (_org: string, email: string) => { if (seats !== null) { if (seats <= 0) throw new Error('no seat'); seats -= 1; } invited.push(email); return { message: 'Invite sent.' }; }) };
  const service = new UsersService(prisma, {} as any, billing, auth, { emit: () => undefined } as any);
  return { service, prisma, invited, setSeats: (n: number | null) => { seats = n; } };
}
const PASTE = ['Ada Obi <ada@x.com>', 'ben@x.com', 'Chi Eze <chi@x.com>', 'dee@x.com'].join('\n');

describe('people invited by a paste who have no seat', () => {
  it('are told so in a sentence that says what happens to them, and are kept', async () => {
    const { service, prisma, invited } = aService({ seats: 2 });
    const r: any = await service.inviteMany('org', 'Fieldnote Studio', PASTE, false);
    expect(invited).toEqual(['ada@x.com', 'ben@x.com']);
    expect(r.summary).toBe('2 people were invited. 2 people have no seat on your plan, so the invitations are kept and will go out when there is room.');
    expect((await theInvitationsWaiting(prisma, 'org')).map((w) => [w.email, w.name])).toEqual([['chi@x.com', 'Chi Eze'], ['dee@x.com', null]]);
  });

  it('are listed in the queue of people waiting for a seat, and on People, by the name typed', async () => {
    const { service } = aService({ seats: 0 });
    await service.inviteMany('org', 'Fieldnote Studio', PASTE, false);
    const queue = await service.theInvitationsWaitingForASeat('org');
    expect(queue.map((q) => [q.email, q.name, q.kind])).toEqual([['ada@x.com', 'Ada Obi', 'INVITATION'], ['ben@x.com', null, 'INVITATION'], ['chi@x.com', 'Chi Eze', 'INVITATION'], ['dee@x.com', null, 'INVITATION']]);
    const people: any = await service.findAll('org', { page: 1, limit: 20 } as any, 'ruth');
    expect(people.data.map((p: any) => p.displayName)).toEqual(['Ada Obi', 'Somebody invited by email', 'Chi Eze', 'Somebody invited by email']);
    expect(people.data.every((p: any) => p.heldForASeat && p.noAccountYet)).toBe(true);
  });

  it('are invited, oldest first, as far as there is room, and the rest stay kept', async () => {
    const { service, setSeats, invited, prisma } = aService({ seats: 0 });
    await service.inviteMany('org', 'Fieldnote Studio', PASTE, false);
    setSeats(3);
    expect(await service.releaseTheInvitationsWaiting('org', 'Fieldnote Studio')).toEqual({ sent: 3, stillWaiting: 1 });
    expect(invited).toEqual(['ada@x.com', 'ben@x.com', 'chi@x.com']);
    expect((await theInvitationsWaiting(prisma, 'org')).map((w) => w.email)).toEqual(['dee@x.com']);
    expect(await service.releaseTheInvitationsWaiting('org', 'Fieldnote Studio')).toEqual({ sent: 0, stillWaiting: 1 });
  });

  it('are not kept twice when the same paste is sent again', async () => {
    const { service, prisma } = aService({ seats: 0 });
    await service.inviteMany('org', 'Fieldnote Studio', PASTE, false);
    await service.inviteMany('org', 'Fieldnote Studio', PASTE, false);
    expect(await theInvitationsWaiting(prisma, 'org')).toHaveLength(4);
  });
});
