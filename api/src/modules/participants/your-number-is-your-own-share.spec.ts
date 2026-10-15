import { ParticipantsService } from './participants.service';

/**
 * "YOUR NUMBER" (A3, join-invite.txt: "Only you and Wairimu see your share of the target."), ON THE
 * INVITATION PREVIEW. Screens-owned (participants.service.ts), through the engine's own rule for
 * whose share a person may see (`targetsFor`, board/whose-number-is-whose-business.ts) - the same
 * rule the board asks, nothing new decided about visibility here.
 *
 * HAFSAH'S LAST CHECK: this preview is read with the link's token, before any sign-in - the one
 * person who must not be handed a number here is the one this token is for, over a channel that
 * proves nothing about who is holding it. So the preview never carries a number at all, only WHO
 * would see the token holder's own share: `'you-and-lead'`, `'everybody'` (the check-in's own
 * `whoSeesTargets` setting), or `null` (no share of their own, or they have already joined and the
 * page does not show this block to them again).
 */
const DAY = 24 * 60 * 60 * 1000;

function previewWith(objectives: any[], opts: { whoSeesTargets?: 'THEIR_OWN' | 'EVERYBODY'; participantId?: string; alreadyAccepted?: boolean } = {}) {
  const participantId = opts.participantId ?? 'p1';
  const row = {
    id: participantId, groundId: 'g1', inviteToken: 'tok', email: 'baraka@x.test',
    userId: opts.alreadyAccepted ? 'u-baraka' : null,
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

const OWN_ONLY = [{ name: 'Deals closed', target: 13, ownerParticipantId: 'p1' }];
const OWN_AND_ANOTHERS = [
  { name: 'Deals closed', target: 13, ownerParticipantId: 'p1' },
  { name: 'Deals closed', target: 40, ownerParticipantId: 'p2' },
];

describe('the invitation preview never contains a number', () => {
  it('never, for any of these shapes - own share, shared, or none', async () => {
    for (const preview of await Promise.all([
      previewWith(OWN_ONLY),
      previewWith(OWN_AND_ANOTHERS, { whoSeesTargets: 'EVERYBODY' }),
      previewWith([]),
      previewWith(OWN_ONLY, { alreadyAccepted: true }),
    ])) {
      expect(preview).not.toHaveProperty('yourShareOfTarget');
      /* No number anywhere in the field's value, whatever it is. */
      expect(typeof preview.yourNumberIsSeenBy === 'number').toBe(false);
      expect(JSON.stringify(preview)).not.toMatch(/"target":\s*\d/);
    }
  });
});

describe('who would see it, from the engine\'s own rule', () => {
  it('"you-and-lead" when they own a numeric share and the check-in keeps shares to their own', async () => {
    expect((await previewWith(OWN_ONLY)).yourNumberIsSeenBy).toBe('you-and-lead');
  });

  it('"everybody" when the check-in shows every number to everyone, and they still own a share', async () => {
    expect((await previewWith(OWN_ONLY, { whoSeesTargets: 'EVERYBODY' })).yourNumberIsSeenBy).toBe('everybody');
  });

  it('null when there are no objectives at all', async () => {
    expect((await previewWith([])).yourNumberIsSeenBy).toBeNull();
  });

  it('null when nobody owns a target - a team-wide number is not "your number"', async () => {
    const objectives = [{ name: 'Paying companies', target: 100, ownerParticipantId: null }];
    expect((await previewWith(objectives)).yourNumberIsSeenBy).toBeNull();
  });

  it('null when somebody else owns the only target - never changes the answer to theirs', async () => {
    const objectives = [{ name: 'Deals closed', target: 40, ownerParticipantId: 'somebody-else' }];
    expect((await previewWith(objectives)).yourNumberIsSeenBy).toBeNull();
  });

  it('another person\'s share, present alongside their own, never changes the answer', async () => {
    expect((await previewWith(OWN_AND_ANOTHERS)).yourNumberIsSeenBy).toBe('you-and-lead');
  });

  it('null when their own row is qualitative - tracked, not counted', async () => {
    const objectives = [{ name: 'Ship the redesign', target: null, ownerParticipantId: 'p1' }];
    expect((await previewWith(objectives)).yourNumberIsSeenBy).toBeNull();
  });

  it('null once they have already joined, even if they still own a share - the page does not ask again', async () => {
    expect((await previewWith(OWN_ONLY, { alreadyAccepted: true })).yourNumberIsSeenBy).toBeNull();
    expect((await previewWith(OWN_ONLY, { alreadyAccepted: true, whoSeesTargets: 'EVERYBODY' })).yourNumberIsSeenBy).toBeNull();
  });
});
