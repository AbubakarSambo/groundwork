import { whoARoundWaitsFor } from './who-a-round-waits-for';
import { recordRoundCompletion } from './round-completion';
import { GroundworkEvents } from '../../common/events';

/**
 * Run 6, 20 November: Taa Solar's rounds never closed because the round waited for ever on Ruth (invited by address, never opened it,
 * invitation long out of date) and on Mary (removed). A stand-in database that applies the real clause to a cast of people.
 */
type P = { id: string; userId: string | null; leftAt: Date | null; invitedAt: Date | null; expires: Date | null; answered: boolean };
const DAY = 86_400_000;
const people: P[] = [
  { id: 'joel', userId: 'u1', leftAt: null, invitedAt: null, expires: null, answered: true },
  { id: 'asha', userId: 'u2', leftAt: null, invitedAt: null, expires: null, answered: true },
  { id: 'mary', userId: 'u3', leftAt: new Date(Date.now() - 5 * DAY), invitedAt: null, expires: null, answered: false },
  { id: 'ruth', userId: null, leftAt: null, invitedAt: new Date(Date.now() - 60 * DAY), expires: new Date(Date.now() - 30 * DAY), answered: false },
];

function harness(cast: P[]) {
  const matches = (p: P, where: any) => {
    if (where.leftAt === null && p.leftAt) return false;
    return (where.OR as any[]).some((c) => {
      if (c.userId?.not === null) return p.userId !== null;
      if (c.checkIns) return p.answered;
      if (c.userId === null) return p.userId === null && p.invitedAt !== null && p.expires !== null && p.expires > c.inviteTokenExpiresAt.gt;
      return false;
    });
  };
  const created: any[] = [];
  const prisma: any = {
    groundParticipant: { findMany: async ({ where }: any) => cast.filter((p) => matches(p, where)).map((p) => ({ id: p.id, userId: p.userId })) },
    checkIn: { count: async ({ where }: any) => cast.filter((p) => where.participantId.in.includes(p.id) && p.answered).length },
    roundCompletion: { create: async (a: any) => { created.push(a.data); return a.data; } },
  };
  return { prisma, events: { emit: jest.fn() } as any, created };
}

describe('who a round waits for', () => {
  it('leaves out somebody removed and somebody whose invitation ran out unopened, so the round closes', async () => {
    const { prisma, events, created } = harness(people);
    await expect(recordRoundCompletion(prisma, events, 'g', 2)).resolves.toBe(true);
    expect(created).toEqual([{ groundId: 'g', sessionNumber: 2, participantCount: 2 }]);
    expect(events.emit).toHaveBeenCalledWith(GroundworkEvents.ROUND_COMPLETED, expect.objectContaining({ groundId: 'g', sessionNumber: 2 }));
  });

  it('still waits for somebody with an open invitation or somebody signed in who has not answered', async () => {
    const waiting = harness([...people, { id: 'sam', userId: 'u4', leftAt: null, invitedAt: null, expires: null, answered: false }]);
    await expect(recordRoundCompletion(waiting.prisma, waiting.events, 'g', 2)).resolves.toBe(false);
    const invited = harness([...people, { id: 'eric', userId: null, leftAt: null, invitedAt: new Date(), expires: new Date(Date.now() + 5 * DAY), answered: false }]);
    await expect(recordRoundCompletion(invited.prisma, invited.events, 'g', 2)).resolves.toBe(false);
  });

  it('is one clause that asks for people who have not left', () => {
    expect(whoARoundWaitsFor(3).leftAt).toBeNull();
  });
});
