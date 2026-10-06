import { GroundStatus } from '@prisma/client';
import { GroundsService } from './grounds.service';

/**
 * ADDING SOMEBODY ALREADY ADDED (reviewer's audit, 7 October). The lead is given back an explicit shape, never the participant row
 * (the stop-reminders token, the invitation's expiry, how specific their answers were, the function they were detected in, their private
 * summary), and a token a caller sends is never used: tokens are made by the server.
 */
function world(opts: { status?: string; held?: any[]; existing?: any } = {}) {
  const status = { value: opts.status ?? 'AWAITING_APPROVAL' };
  const ground: any = () => ({ id: 'g1', organizationId: 'org1', initiatorId: 'nandi', label: 'Kilimani estates, Q4', isFreeGround: false, freeParticipantCap: 4, cadence: 'FORTNIGHTLY', status: status.value, scenario: 'NEW_PROJECT' });
  const participants: any[] = [...(opts.held ?? [])];
  const tx: any = {
    groundParticipant: { create: jest.fn(async (args: any) => { const row = { id: `p-${participants.length + 1}`, createdAt: new Date(), userId: null, notifiedAt: null, leftAt: null, ...args.data }; participants.push(row); return row; }) },
    checkIn: { create: jest.fn(async () => ({})) },
    ground: { update: jest.fn(async () => { status.value = 'AWAITING_PARTIES'; return {}; }) },
  };
  const prisma: any = {
    ground: {
      findFirst: jest.fn(async (args: any) => (args?.where?.status === 'AWAITING_APPROVAL' ? (status.value === 'AWAITING_APPROVAL' ? { id: 'g1' } : null) : ground())),
      update: jest.fn(async (args: any) => { if (args.data.status) status.value = args.data.status; return { id: 'g1', status: status.value }; }),
    },
    groundDocument: { count: jest.fn(async () => 1) },
    leadContextNote: { count: jest.fn(async () => 0) },
    personObjective: { count: jest.fn(async () => 0) },
    groundContextItem: { count: jest.fn(async () => 0) },
    user: { findUnique: jest.fn(async () => ({ id: 'nandi', firstName: 'Nandi', email: 'nandi@x.test' })), count: jest.fn(async () => 0) },
    organization: { findUnique: jest.fn(async () => ({ subscriptionPlan: null, subscriptionStatus: null })) },
    groundParticipant: {
      findFirst: jest.fn(async () => opts.existing ?? null),
      count: jest.fn(async () => participants.length),
      findMany: jest.fn(async ({ where }: any) => participants.filter((p) => p.groundId === where.groundId || !where.groundId).filter((p) => p.invitedAt === null && p.notifiedAt === null && p.awaitingSeat === false && p.partyType === 'PARTICIPANT')),
      update: jest.fn(async ({ where, data }: any) => Object.assign(participants.find((p) => p.id === where.id) ?? {}, data)),
      updateMany: jest.fn(async ({ where, data }: any) => { const p = participants.find((x) => x.id === where.id && x.invitedAt === null && x.notifiedAt === null); if (!p) return { count: 0 }; Object.assign(p, data); return { count: 1 }; }),
      delete: jest.fn(async () => ({})),
    },
    checkIn: { findFirst: jest.fn(async () => null), count: jest.fn(async () => 1) },
    $transaction: jest.fn(async (fn: any) => fn(tx)),
    organizationMembership: { findFirst: jest.fn(async () => null), findUnique: jest.fn(async () => null) },
  };
  const email: any = { sendTheInviteThisGroundSends: jest.fn(async () => ({})), sendGroundApproved: jest.fn(async () => ({})), sendParticipantInvite: jest.fn(async () => ({})) };
  const service: any = new GroundsService(prisma, email, { seatsIncludedFor: async () => null } as any, { emit: () => undefined } as any, { emit: async () => undefined } as any, { get: () => 'http://localhost:5173' } as any, { respond: async () => '' } as any);
  service.refuseAnEvaluationTheAdminWasNotGivenAccessTo = async () => undefined;
  return { service, prisma, email, tx, participants, status };
}

const THE_ROW = { id: 'p-1', groundId: 'g1', email: 'wanjiku@x.test', partyType: 'PARTICIPANT', userId: null, roleAsDescribed: 'Leads Kilimani sales', invitedAt: null, notifiedAt: null, soloArtifactAt: null, createdAt: new Date('2026-10-01'),
  inviteToken: 'the-real-token', inviteTokenExpiresAt: new Date(), stopRemindersToken: 'STOP-TOKEN', specificityHistory: [0.4], soloArtifact: 'PRIVATE-SUMMARY', detectedFunction: 'SALES', detectedFunctionConfidence: 0.8 };

describe('the lead adds somebody she has already added', () => {
  it('is given back what a first add gives back, and none of the rest of the row', async () => {
    const { service } = world({ status: 'OPEN', existing: { ...THE_ROW } });
    const out = await service.addParticipant('g1', 'org1', 'nandi', { email: 'wanjiku@x.test' } as any);
    expect(out.alreadyInvited).toBe(true);
    expect(Object.keys(out).sort()).toEqual(['alreadyInvited', 'createdAt', 'devUrl', 'email', 'id', 'invitedAt', 'notifiedAt', 'partyType', 'roleAsDescribed', 'saying', 'soloArtifactAt', 'userId'].sort());
    expect(JSON.stringify(out)).not.toMatch(/STOP-TOKEN|PRIVATE-SUMMARY|the-real-token|specificityHistory|detectedFunction/);
  });


  it('a token the caller sends is ignored: the one on the new row is the server\'s own', async () => {
    const { service, participants } = world({ status: 'OPEN' });
    await service.addParticipant('g1', 'org1', 'nandi', { email: 'new@x.test', inviteToken: 'CHOSEN-BY-THE-CALLER' } as any);
    expect(participants[0].inviteToken).toMatch(/^[0-9a-f]{64}$/);
    expect(participants[0].inviteToken).not.toBe('CHOSEN-BY-THE-CALLER');
  });
});
