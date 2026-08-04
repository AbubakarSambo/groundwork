import { GroundsService } from './grounds.service';
import { ForbiddenException, BadRequestException } from '@nestjs/common';

/**
 * MANAGING-ONLY LEAD - restores the choice the dead LeadOnboardingChat used to
 * ask ("are you also a participant, or managing only?"), which regressed
 * silently when confirmLead always created the lead's own session-1 check-in.
 *
 * Two things guarded here:
 *
 * (1) confirmLead: managingOnly=true must NOT create a check-in for the lead
 *     and must mark their participant row managingOnly - so nothing is ever
 *     asked of an account that will never exist. managingOnly=false (default,
 *     omitted) is UNCHANGED behaviour - a check-in is created exactly as
 *     before this feature existed.
 *
 * (2) isSessionReadyForReport - the CRITICAL one. A managing-only lead has
 *     userId set (they ARE a real user) but no check-in ever. If they were
 *     counted as an "active" party, the readiness loop would wait forever for
 *     a completed check-in that can never happen, and the report would never
 *     release. This proves release still happens with a managing-only lead
 *     present, and bites if the managingOnly:false exclusion is removed.
 */

function makeService(overrides: any = {}) {
  const groundParticipantUpdate = jest.fn(async (a: any) => ({ id: a.where.id, ...a.data }));
  const checkInCreate = jest.fn(async (a: any) => ({ id: 'ci-lead', ...a.data }));
  const prisma: any = {
    ground: {
      findUnique: jest.fn(async () => overrides.ground ?? {
        id: 'g1', initiatorId: 'lead1', status: 'AWAITING_LEAD', organizationId: 'org1',
      }),
      update: jest.fn(async (a: any) => ({ id: a.where.id, ...a.data })),
    },
    groundParticipant: {
      findFirst: jest.fn(async () => overrides.leadParticipant ?? { id: 'p-lead', groundId: 'g1', userId: 'lead1', partyType: 'INITIATOR' }),
      count: jest.fn(async () => overrides.otherParticipantCount ?? 0),
      update: groundParticipantUpdate,
    },
    checkIn: { create: checkInCreate },
    $transaction: jest.fn(async (ops: any[]) => Promise.all(ops)),
  };
  const service = new GroundsService(prisma, {} as any, {} as any, {} as any, {} as any, {} as any);
  return { service, prisma, groundParticipantUpdate, checkInCreate };
}

describe('confirmLead: managing-only choice', () => {
  it('managingOnly=true creates NO check-in for the lead and marks the participant managingOnly', async () => {
    const { service, checkInCreate, groundParticipantUpdate } = makeService();
    const res = await service.confirmLead('g1', 'lead1', { managingOnly: true });
    expect(checkInCreate).not.toHaveBeenCalled();
    expect(groundParticipantUpdate).toHaveBeenCalledWith({ where: { id: 'p-lead' }, data: { managingOnly: true } });
    expect(res.checkInId).toBeNull();
    expect(res.groundId).toBe('g1');
  });

  it('managingOnly=false (or omitted) is UNCHANGED: a session-1 check-in is created for the lead', async () => {
    const { service, checkInCreate, groundParticipantUpdate } = makeService();
    const res = await service.confirmLead('g1', 'lead1', {});
    expect(checkInCreate).toHaveBeenCalledWith({
      data: { groundId: 'g1', participantId: 'p-lead', sessionNumber: 1, status: 'NOT_STARTED', availableFrom: null },
    });
    expect(groundParticipantUpdate).not.toHaveBeenCalled();
    expect(res.checkInId).toBe('ci-lead');
  });
});

describe('isSessionReadyForReport: a managing-only lead must not block release', () => {
  function prismaForReadiness(includeManagingOnlyLead: boolean) {
    const all = [
      // the managing-only lead: userId set, NO completed check-in, ever
      ...(includeManagingOnlyLead ? [{ id: 'p-lead', userId: 'lead1', managingOnly: true }] : []),
      { id: 'p-a', userId: 'userA', managingOnly: false },
      { id: 'p-b', userId: 'userB', managingOnly: false },
    ];
    const completedCheckIns = new Set(['p-a', 'p-b']); // both real participants completed; the lead never will

    return {
      groundParticipant: {
        // Faithful enough re-implementation of the real where-clause semantics
        // to make this test bite if the managingOnly filter is dropped.
        findMany: jest.fn(async (args: any) => {
          const w = args.where;
          return all.filter((p) => {
            if (w.managingOnly !== undefined && p.managingOnly !== w.managingOnly) return false;
            const orMatches = (w.OR ?? []).some((clause: any) => {
              if (clause.userId) return p.userId != null;
              if (clause.checkIns) return completedCheckIns.has(p.id);
              return false;
            });
            return orMatches;
          }).map((p) => ({ id: p.id }));
        }),
      },
      checkIn: {
        findFirst: jest.fn(async (args: any) => (completedCheckIns.has(args.where.participantId) ? { id: 'ci-' + args.where.participantId } : null)),
      },
    };
  }

  it('with a managing-only lead present: 2 real participants completed -> report IS ready (release is not blocked)', async () => {
    const prisma: any = prismaForReadiness(true);
    const service = new GroundsService(prisma, {} as any, {} as any, {} as any, {} as any, {} as any);
    const ready = await service.isSessionReadyForReport('g1', 1);
    expect(ready).toBe(true);
  });

  it('sanity: without the managing-only lead in the mix, the same 2 real participants still make it ready (unaffected)', async () => {
    const prisma: any = prismaForReadiness(false);
    const service = new GroundsService(prisma, {} as any, {} as any, {} as any, {} as any, {} as any);
    const ready = await service.isSessionReadyForReport('g1', 1);
    expect(ready).toBe(true);
  });
});
