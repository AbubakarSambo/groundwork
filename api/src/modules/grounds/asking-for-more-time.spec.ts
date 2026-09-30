import { AskingForMoreTimeService } from './asking-for-more-time.service';

/**
 * "ASK WAIRIMU FOR MORE TIME" (A3, #/join/outoftime, U.3), BY BEHAVIOUR.
 */
const A_DAY = 24 * 60 * 60 * 1000;

function make(opts: { status?: string; askedAt?: Date | null; notInIt?: boolean; groundIds?: string[] } = {}) {
  const sent: any[] = [];
  const updates: any[] = [];
  const prisma: any = {
    groundParticipant: {
      findFirst: jest.fn(async ({ where }: any) => (opts.notInIt || where.partyType !== 'PARTICIPANT' ? null : { id: 'p1', email: 'miriam@baridi.test', moreTimeAskedAt: opts.askedAt ?? null, nameGiven: null })),
      update: jest.fn(async (a: any) => { updates.push(a); return {}; }),
      /* "All 38 of your check-ins" (item 11): distinct Grounds this person has ever been part of,
         never the sessions inside them. */
      findMany: jest.fn(async () => (opts.groundIds ?? ['g1']).map((groundId) => ({ groundId }))),
    },
    ground: {
      findUnique: jest.fn(async () => ({
        id: 'g1', label: 'Sales team, Q3', status: opts.status ?? 'STALLED', endsAt: new Date('2026-09-30T00:00:00Z'),
        initiator: { firstName: 'Wairimu', email: 'wairimu@baridi.test' },
      })),
    },
    user: { findUnique: jest.fn(async () => ({ firstName: 'Miriam', lastName: 'Otieno', email: 'miriam@baridi.test' })) },
  };
  const email: any = { sendMoreTimeAsked: jest.fn(async (...a: any[]) => { sent.push(a); }) };
  return { s: new AskingForMoreTimeService(prisma, email), sent, updates };
}

describe('asking for more time', () => {
  it('says whose it is, until when it ran, that they have not asked, and how many check-ins are theirs', async () => {
    const { s } = make({ groundIds: ['g1', 'g2', 'g3'] });
    expect(await s.whereItStands('g1', 'u1')).toEqual({
      outOfTime: true, checkInName: 'Sales team, Q3', leadFirstName: 'Wairimu', ranUntil: '2026-09-30T00:00:00.000Z', askedAt: null,
      checkInsCount: 3,
    });
  });

  it('counts each check-in once, distinct on the ground - never the sessions inside it', async () => {
    /* A real query would never repeat a groundId here (that is what `distinct` guarantees), but the
       count this returns must still be of CHECK-INS, not of however many session rows a ground has -
       that is the whole point of reading groundId rather than counting CheckIn rows. */
    const { s } = make({ groundIds: ['g1'] });
    expect((await s.whereItStands('g1', 'u1')).checkInsCount).toBe(1);
  });

  it('sends the lead the request, with who asked and which check-in', async () => {
    const { s, sent, updates } = make();
    await s.ask('g1', 'u1');
    expect(sent[0]).toEqual(['wairimu@baridi.test', 'Wairimu', 'Miriam Otieno', 'Sales team, Q3', 'g1']);
    expect(updates[0].data.moreTimeAskedAt).toBeInstanceOf(Date);
  });

  it('once a day: a second ask the same day is refused, in a plain sentence, and nothing is sent', async () => {
    const { s, sent } = make({ askedAt: new Date(Date.now() - A_DAY / 2) });
    await expect(s.ask('g1', 'u1')).rejects.toThrow('You have already asked today. You can ask again tomorrow.');
    expect(sent).toHaveLength(0);
  });

  it('a check-in that is not out of time has nothing to ask for', async () => {
    const { s, sent } = make({ status: 'ACTIVE' });
    await expect(s.ask('g1', 'u1')).rejects.toThrow('This check-in is not out of time, so there is nothing to ask for.');
    expect(sent).toHaveLength(0);
  });

  it('somebody not taking part in it cannot ask, and learns nothing about it', async () => {
    const { s, sent } = make({ notInIt: true });
    await expect(s.ask('g1', 'u9')).rejects.toThrow('Check-in not found');
    await expect(s.whereItStands('g1', 'u9')).rejects.toThrow('Check-in not found');
    expect(sent).toHaveLength(0);
  });
});
