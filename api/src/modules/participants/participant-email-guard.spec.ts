import { ParticipantsService } from './participants.service';

/**
 * GW-EMAIL-HIJACK tripwire.
 *
 * PATCH /participants/:id/email exists to fix a BOUNCED address and resend
 * the invite. Its guards are load-bearing:
 *  - once a participant has ACCEPTED (userId set), their address must be
 *    IMMUTABLE here - rewriting it would silently repoint their record and
 *    invite link at a different inbox (account hijack),
 *  - only the ground's initiator may fix an address,
 *  - the happy path rotates the token and resends with delivery context.
 */
function makeService(participant: any) {
  const updates: any[] = [];
  const prisma: any = {
    groundParticipant: {
      findUnique: jest.fn(async () => participant),
      update: jest.fn(async (args: any) => { updates.push(args); return {}; }),
    },
    user: { findUnique: jest.fn(async () => ({ id: 'init-user', firstName: 'Zainab' })) },
  };
  const email: any = { sendParticipantInvite: jest.fn(async () => ({})) };
  const service = Object.create(ParticipantsService.prototype);
  (service as any).prisma = prisma;
  (service as any).email = email;
  return { service: service as ParticipantsService, prisma, email, updates };
}

const GROUND = {
  id: 'g1', label: 'Test ground', initiatorId: 'init-user',
  participants: [{ userId: 'init-user', partyType: 'INITIATOR' }],
};

describe('participant email fix-and-resend guards', () => {
  it('REJECTS when the participant has already accepted (userId set) - the hijack vector', async () => {
    const { service, updates } = makeService({
      id: 'p1', userId: 'their-user', email: 'old@x.test', groundId: 'g1', ground: GROUND,
    });
    await expect(service.updateEmail('p1', 'init-user', 'new@x.test'))
      .rejects.toThrow('already joined');
    expect(updates).toHaveLength(0); // nothing written
  });

  it('REJECTS a non-initiator caller', async () => {
    const { service, updates } = makeService({
      id: 'p1', userId: null, email: 'old@x.test', groundId: 'g1', ground: GROUND,
    });
    await expect(service.updateEmail('p1', 'some-other-user', 'new@x.test')).rejects.toThrow();
    expect(updates).toHaveLength(0);
  });

  it('accepts ONLY the unaccepted case: updates email, rotates token, resends with context', async () => {
    const { service, email, updates } = makeService({
      id: 'p1', userId: null, email: 'bounced@x.test', groundId: 'g1', ground: GROUND,
    });
    const res = await service.updateEmail('p1', 'init-user', 'Fixed@X.Test ');
    expect(res).toEqual({ id: 'p1', email: 'fixed@x.test' });
    const first = updates[0];
    expect(first.data.email).toBe('fixed@x.test');
    expect(first.data.inviteToken).toMatch(/^[a-f0-9]{64}$/); // rotated
    expect(first.data.inviteDeliveryStatus).toBeNull(); // cleared; recordSend sets SENT on the fresh send
    expect(email.sendParticipantInvite).toHaveBeenCalledWith(
      'fixed@x.test', 'Zainab', 'Test ground', expect.any(String), undefined,
      { kind: 'PARTICIPANT_INVITE', participantId: 'p1', groundId: 'g1' },
    );
  });
});
