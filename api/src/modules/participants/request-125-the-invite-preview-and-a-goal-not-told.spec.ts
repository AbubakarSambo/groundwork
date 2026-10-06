import { ParticipantsService } from './participants.service';

/**
 * REQUEST 125, FINDING 7 (decisions 48 and 56). The invitation page said "Only you and Amina see your share of the target" to Tobi, who has not
 * been told he has one, and called the lead "Dr" when her account is "Dr Amina Bello". The page is read with the link, before any sign-in.
 */
const DAY = 24 * 60 * 60 * 1000;
const UNTOLD = { id: 'pg-1', participantId: 'p1', text: 'Close eight renewals a quarter.', awareness: 'NOT_TOLD', authoredBy: 'lead', createdAt: new Date(Date.now() - 2 * DAY) };

function preview(objectives: any[], goals: any[], lead = { firstName: 'Dr', lastName: 'Amina Bello' }, expired = false) {
  const row = { id: 'p1', groundId: 'g1', inviteToken: 'tok', email: 'tobi@x.test', userId: null, awaitingSeat: false, startsAt: null, inviteTokenExpiresAt: new Date(Date.now() + (expired ? -5 : 5) * DAY) };
  const prisma: any = {
    groundParticipant: { findUnique: jest.fn(async () => row) },
    ground: {
      findUnique: jest.fn(async () => ({
        id: 'g1', label: 'Engagement Director, first 90 days', scenario: 'NEW_PROJECT', cadence: 'WEEKLY', cadenceAnchorDay: null, workingDays: [], endsAt: null, startsAt: null,
        whoSeesTargets: 'THEIR_OWN', initiator: lead, organization: { name: 'Baridi Appliances' }, objectives,
      })),
    },
    checkIn: { count: jest.fn(async () => 0) },
    personObjective: { findMany: jest.fn(async ({ where }: any) => goals.filter((g) => !where.awareness || g.awareness === where.awareness)) },
  };
  return new ParticipantsService(prisma, {} as any, {} as any, {} as any).preview('tok') as Promise<any>;
}

const UNTOLD_TARGET = [{ id: 'go1', name: 'Tobi to close 8 renewals per quarter.', target: 8, ownerParticipantId: 'p1' }];
const BOTH = [...UNTOLD_TARGET, { id: 'go2', name: 'Lead the client conversations fully.', target: 3, ownerParticipantId: 'p1' }];

describe('the invitation page and a goal Amina has not told Tobi about', () => {
  it('does not say he has a share of the target when the only one is that goal', async () => {
    expect((await preview(UNTOLD_TARGET, [UNTOLD])).yourNumberIsSeenBy).toBeNull();
  });

  it('still says it when he has a share he was told about', async () => {
    expect((await preview(BOTH, [UNTOLD])).yourNumberIsSeenBy).toBe('you-and-lead');
  });

  it('names the lead Amina, never Dr', async () => {
    const p = await preview(BOTH, []);
    expect(p.leadFirstName).toBe('Amina');
    expect(JSON.stringify(p)).not.toMatch(/\bDr\b(?! Amina)/);
  });
});
