import { WhoIsWaitingAtTheDoorService } from './who-is-waiting-at-the-door.service';
import { AskingForMoreTimeService } from '../grounds/asking-for-more-time.service';
import { whoTheyMeant } from '../grounds/who-they-meant';

/**
 * AN ADDRESS IS NEVER SHOWN IN PLACE OF A NAME (Hafsah, 6 October), IN EVERY PLACE A NAME IS SERVED OR SENT.
 * Each case is a person with no name on their account, and what the reader is told must hold no "@" and no part of the address.
 */
const NOBODY = { firstName: null, lastName: null, email: 'amina.otieno@x.test' };
const leaks = (t: unknown) => /@|amina|otieno/i.test(JSON.stringify(t));

describe('who is waiting at the door, for the admin', () => {
  it('names the person who added them, and the person let in, as "Someone" and not as an address', async () => {
    const told: any[] = [];
    const prisma: any = {
      membershipRequest: {
        findMany: jest.fn(async () => [{ id: 'r1', email: 'new@x.test', createdAt: new Date(), groundId: null, requestedByUserId: 'u1', user: null }]),
      },
      user: { findMany: jest.fn(async () => [{ id: 'u1', ...NOBODY }]) },
      ground: { findMany: jest.fn(async () => []) },
    };
    const s = new WhoIsWaitingAtTheDoorService(prisma, { sendTheyAreInNow: (...a: any[]) => told.push(a) } as any, {} as any);
    const rows: any[] = await s.waiting('org');
    expect(rows[0].addedBy).toBe('Someone');
    expect(leaks(rows[0].addedBy)).toBe(false);
  });
});

describe('asking for more time, as the lead reads the email', () => {
  it('says "Someone" when the person has no name, never their address', async () => {
    const sent: any[] = [];
    const prisma: any = {
      groundParticipant: {
        findFirst: jest.fn(async () => ({ id: 'p1', email: 'amina.otieno@x.test', moreTimeAskedAt: null, nameGiven: null })),
        update: jest.fn(async () => ({})),
      },
      ground: { findUnique: jest.fn(async () => ({ id: 'g1', label: 'Sales', status: 'STALLED', endsAt: new Date(), initiator: { firstName: 'Wairimu', email: 'w@x.test' } })) },
      user: { findUnique: jest.fn(async () => NOBODY) },
    };
    const s = new AskingForMoreTimeService(prisma, { sendMoreTimeAsked: jest.fn(async (...a: any[]) => { sent.push(a); }) } as any);
    await s.ask('g1', 'u1');
    expect(sent[0][2]).toBe('Someone');
  });
});

describe('who the lead meant, as the lead confirms it', () => {
  it('reads "Someone" for a person with no name, not their address or the start of it', () => {
    const m = whoTheyMeant('amina.otieno@x.test', [{ id: 'p1', email: 'amina.otieno@x.test', name: null }]);
    expect(m).toEqual({ id: 'p1', label: 'Someone', firstName: 'Someone' });
    expect(leaks([m!.label, m!.firstName])).toBe(false);
  });
  it('still reads the name when there is one', () => {
    expect(whoTheyMeant('amina', [{ id: 'p1', email: 'a@x.test', name: 'Amina Otieno' }])).toEqual({ id: 'p1', label: 'Amina Otieno', firstName: 'Amina' });
  });
});

