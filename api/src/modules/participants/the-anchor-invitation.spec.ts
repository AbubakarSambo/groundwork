import { ParticipantsService } from './participants.service';
import { theAnchorInvitation } from '../entry/the-anchor-people-step';
import { THE_SHAPES_KEYS } from '../entry/the-anchor-served-shapes';

/**
 * Request 149: the anchor's invitation, served on the invitation preview for a check-in started from the anchor link, with the switch on.
 * Decision 96: "one to one", not "privately" (item 1); and "has shared" only when the lead has shared (item 8).
 */
function preview(opts: { startedFrom: string | null; on: boolean; invitee?: { email: string; remitAsGiven?: string } }) {
  const invitee = opts.invitee ?? { email: 'amani.wekesa@x.test' };
  const row = { id: 'p1', groundId: 'g1', inviteToken: 'tok', userId: null, awaitingSeat: false, startsAt: null, inviteTokenExpiresAt: new Date(Date.now() + 5 * 86400000), roleAsDescribed: 'Her sales manager, who is not meeting targets', ...invitee };
  const prisma: any = {
    groundParticipant: { findUnique: jest.fn(async () => row) },
    ground: { findUnique: jest.fn(async () => ({ id: 'g1', label: 'Help my team understand', scenario: 'HELP_TEAM_UNDERSTAND', startedFrom: opts.startedFrom, cadence: 'WEEKLY', cadenceAnchorDay: null, workingDays: [], endsAt: null, startsAt: null, whoSeesTargets: 'THEIR_OWN', initiator: { firstName: 'Hafsah', lastName: 'Jumare' }, organization: { name: 'Coamana' }, objectives: [] })) },
    checkIn: { count: jest.fn(async () => 0) },
    personObjective: { findMany: jest.fn(async () => []) },
    platformSetting: { findUnique: jest.fn(async () => (opts.on ? { value: { on: true } } : null)) },
  };
  return new ParticipantsService(prisma, {} as any, {} as any, {} as any).preview('tok') as Promise<any>;
}

const WORDS = {
  subject: 'Hafsah is trying a different way to help the team get on the same page.',
  heading: 'Hafsah is trying a different way to help the team get on the same page.',
  lines: [
    'For the next month, Groundwork will check in with each person one to one about the work you’re doing, what you’re seeing, what’s getting in the way and how it connects to the bigger picture.',
    'Hafsah wants to hear your side.',
    'There aren’t right answers. The point is to help the team understand one another better and make the work move.',
  ],
  leadHasSharedWhatTheyAreSeeing: false,
  button: 'Start your first check-in',
};

describe('the anchor invitation, as the invited person reads it', () => {
  it('is served for a check-in started from the anchor, with the switch on', async () => {
    const p = await preview({ startedFrom: 'anchor', on: true });
    expect(Object.keys(p.anchorInvitation).sort()).toEqual([...THE_SHAPES_KEYS.invitation].sort());
    expect(p.anchorInvitation).toEqual(WORDS);
  });

  it('reads the same to an admin who was invited as a participant, and never holds the lead’s private words about anybody', async () => {
    const p = await preview({ startedFrom: 'anchor', on: true, invitee: { email: 'juma@x.test', remitAsGiven: 'Hafsah thinks Juma is slow' } });
    expect(p.anchorInvitation).toEqual(WORDS);
    const text = JSON.stringify(p.anchorInvitation);
    expect(text).not.toMatch(/privately|sales manager|slow|targets/);
  });

  it('says the lead has shared what they are trying to get across only when that has happened', () => {
    const shared = theAnchorInvitation('Hafsah', true);
    expect(shared.lines[1]).toBe('Hafsah has shared what they are trying to get across. Groundwork now wants to understand your side too.');
    expect(shared.leadHasSharedWhatTheyAreSeeing).toBe(true);
  });

  it('serves nothing with the switch off, not even the key', async () => {
    const p = await preview({ startedFrom: 'anchor', on: false });
    expect('anchorInvitation' in p).toBe(false);
  });

  it('serves nothing for a check-in that did not start from the anchor, switch on', async () => {
    const p = await preview({ startedFrom: null, on: true });
    expect('anchorInvitation' in p).toBe(false);
  });
});
