import { ParticipantsService } from './participants.service';

/* U.6 review: the invitation to a check-in that opens on 5 October must not offer "Answer today's
   check-in now". The preview says when the first check-in opens, only when that is later than now. */
const DAY = 24 * 60 * 60 * 1000;
function previewWith(startsAt: Date | null, participantStartsAt: Date | null = null) {
  const row = { id: 'p1', groundId: 'g1', inviteToken: 'tok', email: 'd@x.test', userId: null, awaitingSeat: false, startsAt: participantStartsAt, inviteTokenExpiresAt: new Date(Date.now() + 5 * DAY) };
  const prisma: any = {
    groundParticipant: { findUnique: jest.fn(async () => row) },
    ground: { findUnique: jest.fn(async () => ({ id: 'g1', label: 'Help someone get back on track', scenario: 'PIP', cadence: 'WEEKLY', cadenceAnchorDay: null, workingDays: [], endsAt: null, startsAt, initiator: { firstName: 'Hafsah', lastName: 'J' }, organization: { name: 'Coamana' } })) },
    checkIn: { count: jest.fn(async () => 0) },
  };
  return new ParticipantsService(prisma, {} as any, {} as any, {} as any).preview('tok') as Promise<any>;
}

describe('the invitation says when the first check-in opens', () => {
  it('when it opens later', async () => {
    const later = new Date(Date.now() + 8 * DAY);
    expect((await previewWith(later)).opensOn).toBe(later.toISOString());
  });
  it('from the person\'s own start when they have one', async () => {
    const theirs = new Date(Date.now() + 3 * DAY);
    expect((await previewWith(new Date(Date.now() + 8 * DAY), theirs)).opensOn).toBe(theirs.toISOString());
  });
  it('and says nothing when it is already open', async () => {
    expect((await previewWith(new Date(Date.now() - DAY))).opensOn).toBeNull();
    expect((await previewWith(null)).opensOn).toBeNull();
  });
});
