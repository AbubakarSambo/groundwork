import { ParticipantsService } from './participants.service';

/**
 * "YOUR NUMBER" (A3, join-invite.txt: "Only you and Wairimu see your share of the target."), ON THE
 * INVITATION PREVIEW. Screens-owned (participants.service.ts), through the engine's own rule for
 * whose share a person may see (`targetsFor`, board/whose-number-is-whose-business.ts) - the same
 * rule the board asks, nothing new decided about visibility here. The preview must carry the token
 * holder's OWN share only: never anyone else's, and never a share at all when there is none to show.
 */
const DAY = 24 * 60 * 60 * 1000;

function previewWith(objectives: any[], opts: { whoSeesTargets?: 'THEIR_OWN' | 'EVERYBODY'; participantId?: string } = {}) {
  const participantId = opts.participantId ?? 'p1';
  const row = {
    id: participantId, groundId: 'g1', inviteToken: 'tok', email: 'baraka@x.test', userId: null,
    awaitingSeat: false, startsAt: null, inviteTokenExpiresAt: new Date(Date.now() + 5 * DAY),
  };
  const prisma: any = {
    groundParticipant: { findUnique: jest.fn(async () => row) },
    ground: {
      findUnique: jest.fn(async () => ({
        id: 'g1', label: 'Sales team, Q3', scenario: 'NEW_PROJECT', cadence: 'WEEKLY', cadenceAnchorDay: null,
        workingDays: [], endsAt: null, startsAt: null,
        whoSeesTargets: opts.whoSeesTargets ?? 'THEIR_OWN',
        initiator: { firstName: 'Wairimu', lastName: 'Kamau' },
        organization: { name: 'Baridi Appliances' },
        objectives,
      })),
    },
    checkIn: { count: jest.fn(async () => 0) },
  };
  return new ParticipantsService(prisma, {} as any, {} as any, {} as any).preview('tok') as Promise<any>;
}

describe('the invitation preview carries only the token holder\'s own share', () => {
  it('their own numeric target, when they own one', async () => {
    const objectives = [{ name: 'Deals closed', target: 13, ownerParticipantId: 'p1' }];
    expect((await previewWith(objectives)).yourShareOfTarget).toBe(13);
  });

  it('never anyone else\'s - not even the best seller\'s, sat right next to their own', async () => {
    const objectives = [
      { name: 'Deals closed', target: 13, ownerParticipantId: 'p1' },
      { name: 'Deals closed', target: 40, ownerParticipantId: 'p2' },
    ];
    expect((await previewWith(objectives)).yourShareOfTarget).toBe(13);
  });

  it('nobody else\'s share leaks even when the check-in shows everybody everything', async () => {
    /* targetsFor(..., 'everybody') hands back every target, own included - the preview still picks
       out only the row owned by this participant, never the others it was just handed. */
    const objectives = [
      { name: 'Deals closed', target: 13, ownerParticipantId: 'p1' },
      { name: 'Deals closed', target: 40, ownerParticipantId: 'p2' },
    ];
    expect((await previewWith(objectives, { whoSeesTargets: 'EVERYBODY' })).yourShareOfTarget).toBe(13);
  });

  it('null when there are no objectives at all', async () => {
    expect((await previewWith([])).yourShareOfTarget).toBeNull();
  });

  it('null when nobody owns a target - a team-wide number is not "your number"', async () => {
    const objectives = [{ name: 'Paying companies', target: 100, ownerParticipantId: null }];
    expect((await previewWith(objectives)).yourShareOfTarget).toBeNull();
  });

  it('null when somebody else owns the only target', async () => {
    const objectives = [{ name: 'Deals closed', target: 40, ownerParticipantId: 'somebody-else' }];
    expect((await previewWith(objectives)).yourShareOfTarget).toBeNull();
  });

  it('null when their own row is qualitative - tracked, not counted', async () => {
    const objectives = [{ name: 'Ship the redesign', target: null, ownerParticipantId: 'p1' }];
    expect((await previewWith(objectives)).yourShareOfTarget).toBeNull();
  });
});
