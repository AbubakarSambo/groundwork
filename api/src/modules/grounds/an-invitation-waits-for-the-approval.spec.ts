import { GroundStatus } from '@prisma/client';
import { GroundsService } from './grounds.service';

/**
 * AN INVITATION WAITS FOR THE APPROVAL AND IS SENT WHEN AN ADMIN ACCEPTS (known issue B5; screens request 174 items 2 and 3).
 *
 * Nandi leads and is not an admin, so her check-in waits for Grace. She names Wanjiku when she saves. Read as each person:
 *   - Nandi is told Wanjiku is named and will be invited once an admin accepts (not that the invitation failed), and nothing is sent;
 *   - Wanjiku receives nothing at all until Grace accepts, then one invitation, once, however many times it is accepted;
 *   - the check-in does not move on to waiting for its parties while it waits, so naming somebody cannot get it past the approval;
 *   - somebody waiting for a seat, or whose start date is ahead, is not invited by the approval.
 * "No invite is sent before the approval" is the point of the gate, because an email cannot be recalled by declining afterwards.
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

describe('Nandi names Wanjiku while the check-in waits for an admin', () => {
  it('Wanjiku is named and held, not refused, and Nandi is told so in a sentence', async () => {
    const { service } = world();
    const out = await service.addParticipant('g1', 'org1', 'nandi', { email: 'wanjiku@x.test', displayName: 'Wanjiku Kamau' } as any);
    expect(out.invitedAt).toBeNull();
    expect(out.notInvitedBecause).toBe('waiting_for_approval');
    expect(out.saying).toBe('Wanjiku will be invited as soon as an admin accepts this check-in.');
    expect(out.emailFailed).toBeUndefined();
  });

  it('with only an address, the sentence does not begin with it', async () => {
    const { service } = world();
    const out = await service.addParticipant('g1', 'org1', 'nandi', { email: 'wanjiku@x.test' } as any);
    expect(out.saying).toBe('The invitation to wanjiku@x.test will go as soon as an admin accepts this check-in.');
  });

  it('nothing is sent, and the check-in does not move on to waiting for its parties', async () => {
    const { service, email, tx, status } = world();
    await service.addParticipant('g1', 'org1', 'nandi', { email: 'wanjiku@x.test', displayName: 'Wanjiku Kamau' } as any);
    expect(email.sendTheInviteThisGroundSends).not.toHaveBeenCalled();
    expect(tx.ground.update).not.toHaveBeenCalled();
    expect(status.value).toBe('AWAITING_APPROVAL');
  });

  it('once an admin has accepted it, adding somebody invites them at once, as it always did', async () => {
    const { service, email } = world({ status: 'OPEN' });
    const out = await service.addParticipant('g1', 'org1', 'nandi', { email: 'wanjiku@x.test', displayName: 'Wanjiku Kamau' } as any);
    expect(email.sendTheInviteThisGroundSends).toHaveBeenCalledTimes(1);
    expect(out.notInvitedBecause).toBeNull();
  });
});

describe('Grace accepts it', () => {
  it('Wanjiku is invited, once, and the check-in moves on to waiting for its parties', async () => {
    const { service, email, status } = world();
    await service.addParticipant('g1', 'org1', 'nandi', { email: 'wanjiku@x.test', displayName: 'Wanjiku Kamau', note: 'Please say how the three developers are moving.' } as any);
    expect(email.sendTheInviteThisGroundSends).not.toHaveBeenCalled();
    await service.approve('g1', 'org1', 'grace');
    expect(email.sendTheInviteThisGroundSends).toHaveBeenCalledTimes(1);
    const [, to, from] = email.sendTheInviteThisGroundSends.mock.calls[0];
    expect(to).toBe('wanjiku@x.test');
    expect(from).toBe('Nandi');
    expect(status.value).toBe('AWAITING_PARTIES');
  });

  it('a second admin accepting the same check-in, or the same one twice, sends nothing more', async () => {
    const { service, email } = world();
    await service.addParticipant('g1', 'org1', 'nandi', { email: 'wanjiku@x.test' } as any);
    await service.approve('g1', 'org1', 'grace');
    const again = await service.approve('g1', 'org1', 'a-second-admin');
    expect(again.alreadyDecided).toBe(true);
    expect(email.sendTheInviteThisGroundSends).toHaveBeenCalledTimes(1);
  });

  it('somebody waiting for a seat, and somebody whose start is ahead, are left for what holds them', async () => {
    const tomorrow = new Date(Date.now() + 86_400_000);
    const row = (id: string, extra: any) => ({ id, groundId: 'g1', partyType: 'PARTICIPANT', email: `${id}@x.test`, invitedAt: null, notifiedAt: null, awaitingSeat: false, leftAt: null, userId: null, inviteToken: 't', remitAsGiven: null, startsAt: null, ...extra });
    const { service, email } = world({ held: [row('no-seat', { awaitingSeat: true }), row('starts-later', { startsAt: tomorrow }), row('ready', {})] });
    await service.approve('g1', 'org1', 'grace');
    expect(email.sendTheInviteThisGroundSends).toHaveBeenCalledTimes(1);
    expect(email.sendTheInviteThisGroundSends.mock.calls[0][1]).toBe('ready@x.test');
  });

  it('a colleague who already has an account, and opened Groundwork early, is invited like anybody else', async () => {
    const row = { id: 'colleague', groundId: 'g1', partyType: 'PARTICIPANT', email: 'colleague@x.test', invitedAt: null, notifiedAt: null, awaitingSeat: false, leftAt: null, userId: 'u-colleague', inviteToken: 't', remitAsGiven: null, startsAt: null };
    const { service, email } = world({ held: [row] });
    await service.approve('g1', 'org1', 'grace');
    expect(email.sendTheInviteThisGroundSends).toHaveBeenCalledTimes(1);
    expect(email.sendTheInviteThisGroundSends.mock.calls[0][1]).toBe('colleague@x.test');
  });

  it('an invitation that fails to send is put back as not sent, so it can be resent', async () => {
    const { service, email, participants } = world();
    await service.addParticipant('g1', 'org1', 'nandi', { email: 'wanjiku@x.test' } as any);
    email.sendTheInviteThisGroundSends.mockRejectedValueOnce(new Error('the mail provider was away'));
    await service.approve('g1', 'org1', 'grace');
    expect(participants[0].invitedAt).toBeNull();
    expect(participants[0].notifiedAt).toBeNull();
  });
});

describe('the one rule that holds either way', () => {
  it('a declined check-in sends nobody anything: the people named while it waited are never written to', async () => {
    const { service, email } = world();
    service.email.sendGroundDeclined = jest.fn(async () => ({}));
    await service.addParticipant('g1', 'org1', 'nandi', { email: 'wanjiku@x.test' } as any);
    await service.declineGround('g1', 'org1', 'grace', 'Not this quarter.');
    expect(email.sendTheInviteThisGroundSends).not.toHaveBeenCalled();
  });
});


/*
 * ADDING SOMEBODY SHE HAS ALREADY ADDED (reviewer's audit, 7 October). The lead is given back an explicit shape, never the participant row,
 * and a token a caller sends is never used: tokens are made by the server. While the check-in waits, adding somebody again writes to nobody.
 */
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

  it('while the check-in waits, nothing is sent and the lead is told when it will go', async () => {
    const { service, email } = world({ existing: { ...THE_ROW } });
    const out = await service.addParticipant('g1', 'org1', 'nandi', { email: 'wanjiku@x.test' } as any);
    expect(email.sendTheInviteThisGroundSends).not.toHaveBeenCalled();
    expect(out.notInvitedBecause).toBe('waiting_for_approval');
    expect(out.saying).toBe('The invitation to wanjiku@x.test will go as soon as an admin accepts this check-in.');
    expect(JSON.stringify(out)).not.toMatch(/STOP-TOKEN|PRIVATE-SUMMARY|the-real-token/);
  });

  it('a token the caller sends is ignored: the one on the new row is the server\'s own', async () => {
    const { service, participants } = world({ status: 'OPEN' });
    await service.addParticipant('g1', 'org1', 'nandi', { email: 'new@x.test', inviteToken: 'CHOSEN-BY-THE-CALLER' } as any);
    expect(participants[0].inviteToken).toMatch(/^[0-9a-f]{64}$/);
    expect(participants[0].inviteToken).not.toBe('CHOSEN-BY-THE-CALLER');
  });
});
