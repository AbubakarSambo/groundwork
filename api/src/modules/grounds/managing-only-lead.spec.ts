import { GroundsService } from './grounds.service';
import { ForbiddenException, BadRequestException } from '@nestjs/common';

/**
 * MANAGING-ONLY LEAD - restores the choice the dead LeadOnboardingChat used to
 * ask ("are you also a participant, or managing only?"), which regressed
 * silently when confirmLead always created the lead's own session-1 check-in.
 *
 * Two things guarded here:
 *
 * (1) SUPERSEDED BY GW-EXP-6, and the reason is worth keeping. This said managingOnly=true must
 *     create NO check-in, which was right while a check-in could only mean "give your account".
 *     It is what made the lead's expectation interview unreachable for anybody running a check-in
 *     without taking part in it.
 *
 *     A managing-only lead now gets a SETUP conversation - `isSetup: true` - which asks what this is
 *     aiming at and what they expect of each person, and is excluded from every session count.
 *     Setting up is not testifying. managingOnly=false is unchanged.
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
  const service = new GroundsService(prisma, {} as any, {} as any, {} as any, {} as any, {} as any,
      // 7th dep: the model, for the context chat (G37/G23). Unused here.
      { respond: async () => '' } as any,
    );
  return { service, prisma, groundParticipantUpdate, checkInCreate };
}

describe('confirmLead: managing-only choice', () => {
  it('managingOnly=true gives the lead a SETUP conversation and marks the participant managingOnly', async () => {
    const { service, checkInCreate, groundParticipantUpdate } = makeService();
    const res = await service.confirmLead('g1', 'lead1', { managingOnly: true });
    /**
     * REVERSED, WITH THE REASON. GW-EXP-6. A managing-only lead used to get no check-in, so nothing
     * ever asked them what this is aiming at or what they expect of each person - every expectation
     * feature was dead on the grounds most likely to need it. They now get a SETUP conversation:
     * same engine, not an account, and excluded from every session count.
     *
     * The rule this file is really for is the one below - the report must still release, and it does,
     * because `isSessionReadyForReport` filters at the PARTICIPANT level on `managingOnly: false` and
     * so never sees this row at all.
     */
    expect(checkInCreate).toHaveBeenCalled();
    /* A real session 1, not a setup conversation: everyone does a first check-in. */
    expect((checkInCreate.mock.calls[0][0] as any).data.isSetup).toBe(false);
    expect(groundParticipantUpdate).toHaveBeenCalledWith({ where: { id: 'p-lead' }, data: { managingOnly: true } });
    /** No longer null: there is a conversation to open, and the client needs its id to open it. */
    expect(res.checkInId).toBeTruthy();
    expect(res.groundId).toBe('g1');
  });

  it('managingOnly=false (or omitted) is UNCHANGED: a session-1 check-in is created for the lead', async () => {
    const { service, checkInCreate, groundParticipantUpdate } = makeService();
    const res = await service.confirmLead('g1', 'lead1', {});
    expect(checkInCreate).toHaveBeenCalledWith({
      /* CHANGED 11 OCTOBER (decision 133): the lead's session carries optional: true, so no count reads it as missed. */
      data: { groundId: 'g1', participantId: 'p-lead', sessionNumber: 1, status: 'NOT_STARTED', availableFrom: null, optional: true },
    });
    expect(groundParticipantUpdate).not.toHaveBeenCalled();
    expect(res.checkInId).toBe('ci-lead');
  });
});

describe('isSessionReadyForReport: a managing-only lead must not block release', () => {
  function prismaForReadiness(includeManagingOnlyLead: boolean) {
    const all = [
      // the managing-only lead: userId set, NO completed check-in, ever
      ...(includeManagingOnlyLead ? [{ id: 'p-lead', userId: 'lead1', managingOnly: true, partyType: 'INITIATOR' }] : []),
      { id: 'p-a', userId: 'userA', managingOnly: false, partyType: 'PARTICIPANT' },
      { id: 'p-b', userId: 'userB', managingOnly: false, partyType: 'PARTICIPANT' },
    ];
    const completedCheckIns = new Set(['p-a', 'p-b']); // both real participants completed; the lead never will

    return {
      /* The situation, because a lead who only asks is not waited on at all - see
         the-lead-who-only-asks. Everything in this file is the ordinary kind, where they are. */
      ground: { findUnique: jest.fn(async () => ({ scenario: 'GOAL_ALIGNMENT' })) },
      groundParticipant: {
        // Faithful enough re-implementation of the real where-clause semantics
        // to make this test bite if the managingOnly filter is dropped.
        findMany: jest.fn(async (args: any) => {
          const w = args.where;
          return all.filter((p) => {
            if (w.managingOnly !== undefined && p.managingOnly !== w.managingOnly) return false;
            /* whoASessionCounts (decision 133): owes the session, or answered it. */
            for (const and of w.AND ?? []) {
              const ok = (and.OR ?? []).some((c: any) => (c.partyType ? p.partyType === c.partyType && p.managingOnly === c.managingOnly : completedCheckIns.has(p.id)));
              if (!ok) return false;
            }
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
        findFirst: jest.fn(async (args: any) => (completedCheckIns.has(args.where.participantId) ? { id: 'ci-' + args.where.participantId, status: 'COMPLETED' } : null)),
      },
    };
  }

  /* CHANGED 11 OCTOBER (decision 133): session 1 used to wait for the managing-only lead. Every lead
     now checks in when they choose and is never waited on, in session 1 or any other. */
  it('the lead checks in when they choose: neither session 1 nor session 2 waits for them', async () => {
    const prisma: any = prismaForReadiness(true);
    const service = new GroundsService(prisma, {} as any, {} as any, {} as any, {} as any, {} as any,
      // 7th dep: the model, for the context chat (G37/G23). Unused here.
      { respond: async () => '' } as any,
    );
    expect(await service.isSessionReadyForReport('g1', 1)).toBe(true);
    expect(await service.isSessionReadyForReport('g1', 2)).toBe(true);
  });

  it('sanity: without the managing-only lead in the mix, the same 2 real participants still make it ready (unaffected)', async () => {
    const prisma: any = prismaForReadiness(false);
    const service = new GroundsService(prisma, {} as any, {} as any, {} as any, {} as any, {} as any,
      // 7th dep: the model, for the context chat (G37/G23). Unused here.
      { respond: async () => '' } as any,
    );
    const ready = await service.isSessionReadyForReport('g1', 1);
    expect(ready).toBe(true);
  });
});
