import { ForbiddenException } from '@nestjs/common';
import { ParticipantRequestsController } from './participant-requests.controller';

/**
 * E4 authz tripwire. ParticipantRequestsController previously had no
 * membership checks: POST trusted a client-sent email, GET let any
 * authenticated user list another ground's pending requests, and PATCH let
 * any authenticated user approve/reject on any ground. These tests pin the
 * fix so the holes can't silently reopen.
 */
describe('ParticipantRequestsController - authz (E4)', () => {
  function buildController(ground: { initiatorId: string; participants: { userId: string }[] } | null) {
    const prisma: any = {
      ground: { findUnique: jest.fn(async () => ground) },
      participantRequest: {
        create: jest.fn(async (args: any) => ({ id: 'req1', ...args.data })),
        findMany: jest.fn(async () => [{ id: 'req1' }]),
        findUnique: jest.fn(async () => ({ id: 'req1', groundId: 'g1', requestedEmail: 'x@y.com', requestedName: null })),
        update: jest.fn(async (args: any) => ({ id: args.where.id, status: args.data.status })),
      },
    };
    const grounds: any = { addParticipant: jest.fn(async () => ({})) };
    const controller = new ParticipantRequestsController(prisma, grounds);
    return { controller, prisma, grounds };
  }

  describe('POST / (create) - assertIsParty', () => {
    it('rejects a user who is neither initiator nor participant', async () => {
      const { controller } = buildController({ initiatorId: 'initiator1', participants: [{ userId: 'p1' }] });
      await expect(
        controller.create('g1', { requestedEmail: 'new@x.com', reason: 'r' } as any, { user: { id: 'stranger', email: 's@x.com' } } as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows an existing participant to create a request', async () => {
      const { controller, prisma } = buildController({ initiatorId: 'initiator1', participants: [{ userId: 'p1' }] });
      await controller.create('g1', { requestedEmail: 'new@x.com', reason: 'r' } as any, { user: { id: 'p1', email: 'p1@x.com' } } as any);
      expect(prisma.participantRequest.create).toHaveBeenCalled();
    });

    it('no longer trusts a client-supplied email - uses req.user.email', async () => {
      const { controller, prisma } = buildController({ initiatorId: 'initiator1', participants: [] });
      await controller.create('g1', { requestedEmail: 'new@x.com', reason: 'r' } as any, { user: { id: 'initiator1', email: 'trusted@x.com' } } as any);
      expect(prisma.participantRequest.create.mock.calls[0][0].data.requestedByEmail).toBe('trusted@x.com');
    });
  });

  describe('GET / (list) - assertIsInitiator', () => {
    it('rejects a non-initiator participant from listing pending requests', async () => {
      const { controller } = buildController({ initiatorId: 'initiator1', participants: [{ userId: 'p1' }] });
      await expect(controller.list('g1', { user: { id: 'p1' } } as any)).rejects.toThrow(ForbiddenException);
    });

    it('allows the initiator to list pending requests', async () => {
      const { controller, prisma } = buildController({ initiatorId: 'initiator1', participants: [] });
      await controller.list('g1', { user: { id: 'initiator1' } } as any);
      expect(prisma.participantRequest.findMany).toHaveBeenCalled();
    });
  });

  describe('PATCH /:reqId (update) - assertIsInitiator + approval invites', () => {
    it('rejects a non-initiator from approving or rejecting', async () => {
      const { controller } = buildController({ initiatorId: 'initiator1', participants: [{ userId: 'p1' }] });
      await expect(
        controller.update('g1', 'req1', { status: 'APPROVED' } as any, { user: { id: 'p1', organizationId: 'org1' } } as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it('approval by the initiator actually invites the person (not just a status flip)', async () => {
      const { controller, grounds } = buildController({ initiatorId: 'initiator1', organizationId: 'org1', participants: [] } as any);
      await controller.update('g1', 'req1', { status: 'APPROVED' } as any, { user: { id: 'initiator1', organizationId: 'org1' } } as any);
      expect(grounds.addParticipant).toHaveBeenCalledWith('g1', 'org1', 'initiator1', expect.objectContaining({ email: 'x@y.com' }));
    });

    it('does not invite on rejection', async () => {
      const { controller, grounds } = buildController({ initiatorId: 'initiator1', participants: [] });
      await controller.update('g1', 'req1', { status: 'DISMISSED' } as any, { user: { id: 'initiator1', organizationId: 'org1' } } as any);
      expect(grounds.addParticipant).not.toHaveBeenCalled();
    });
  });
});
