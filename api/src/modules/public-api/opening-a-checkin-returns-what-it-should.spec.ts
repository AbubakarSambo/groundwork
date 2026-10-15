import { GroundsByApiService } from './grounds-by-api.service';

/**
 * WHAT COMES BACK WHEN AN INTEGRATION OPENS A CHECK-IN.
 *
 * This endpoint returned `{ ...ground }` - forty-five columns, including our own user ids, the
 * billing flags, the audit log and the join token. Found by running the call and counting the keys,
 * not by reading the line, which looks perfectly ordinary.
 *
 * Two separate faults in one spread. It leaked, and it promised: every column added to `Ground`
 * from then on would have appeared in somebody's integration, and taking one away later breaks
 * them. The rest of this API returns a named allow-list for exactly this reason.
 */
const ground = {
  id: 'g1', label: 'Q4 pipeline', scenario: 'OKR_ALIGNMENT', moment: 'STARTING', mode: 'SHARED',
  status: 'AWAITING_LEAD', timelineDays: 90, cadence: 'FORTNIGHTLY', startsAt: null, endsAt: null,
  /* Everything below is ours and must not leave. */
  organizationId: 'org1', initiatorId: 'u1', createdByUserId: 'u1', joinToken: 'secret-join-token',
  groundAuditLog: null, billingEnabled: false, billingActivatedAt: null, paymentConfirmed: false,
  freeParticipantCap: 5, isFreeGround: false, sessionsBalance: 1, createdAt: new Date(),
  updatedAt: new Date(),
};

const service = () => {
  const s = Object.create(GroundsByApiService.prototype) as any;
  s.logger = { log: () => {}, warn: () => {}, error: () => {} };
  s.config = { get: () => 'https://app.example.test' };
  s.grounds = { createForLead: async () => ground };
  s.prisma = {
    person: { findFirst: async ({ where }: any) => ({
      email: `${where.externalId}@example.test`, displayName: where.externalId, active: true,
    }) },
    user: { findFirst: async () => ({ id: 'u1', email: 'ada@example.test' }) },
    groundParticipant: { findMany: async () => [
      { email: 'p-sam@example.test', inviteToken: 'tok', inviteTokenExpiresAt: new Date() },
    ] },
  };
  return s;
};

const dto = {
  actingPersonExternalId: 'p-ada', label: 'Q4 pipeline', scenario: 'OKR_ALIGNMENT',
  moment: 'STARTING', participants: [{ personExternalId: 'p-sam' }],
};

describe('opening a check-in returns what it should and nothing else', () => {
  it('gives back the handle, since every follow-up call takes it', async () => {
    const out: any = await service().open('org1', dto as any);
    /* `/grounds/:groundId/objectives`, `/report`, `/sense-check` all need this. */
    expect(out.id).toBe('g1');
  });

  it('gives back the invitation links, in the caller\'s own vocabulary', async () => {
    const out: any = await service().open('org1', dto as any);
    expect(out.invitations[0].personExternalId).toBe('p-sam');
    expect(out.invitations[0].url).toContain('/invite?token=');
    /* They sent directory ids and never sent an address. Handing addresses back undoes that. */
    expect(JSON.stringify(out.invitations)).not.toContain('@example.test');
  });

  it('never returns the join token, which is a credential', async () => {
    const out: any = await service().open('org1', dto as any);
    expect(JSON.stringify(out)).not.toContain('secret-join-token');
  });

  it('never returns anything that is ours rather than theirs', async () => {
    const out: any = await service().open('org1', dto as any);
    for (const ours of [
      'organizationId', 'initiatorId', 'createdByUserId', 'groundAuditLog',
      'billingEnabled', 'billingActivatedAt', 'paymentConfirmed', 'isFreeGround',
      'sessionsBalance', 'freeParticipantCap', 'createdAt', 'updatedAt',
    ]) {
      expect(Object.keys(out)).not.toContain(ours);
    }
  });

  it('is a named list, so a column added tomorrow does not escape on its own', async () => {
    const out: any = await service().open('org1', { ...dto } as any);
    expect(Object.keys(out).sort()).toEqual([
      /* The brief is echoed since 10 Sep 2026: the caller set the standard and could not see it. */
      'brief',
      'cadence', 'endsAt', 'id', 'invitations', 'label', 'mode', 'moment',
      /* Request 37: says whether the check-in runs until the lead ends it, since timelineDays is then null. */
      'runsUntilEnded',
      'scenario', 'startsAt', 'status', 'timelineDays',
    ]);
  });
});

describe('opening a check-in that runs until its lead ends it, through POST /check-ins', () => {
  it('hands runsUntilEnded on to the same create the product uses, and sends no length', async () => {
    const seen: any[] = [];
    const s = service();
    s.grounds = { createForLead: async (_o: string, _u: string, d: any) => { seen.push(d); return { ...ground, timelineDays: 0, runsUntilEnded: true }; } };
    const out: any = await s.open('org1', { ...dto, runsUntilEnded: true } as any);
    expect(seen[0].runsUntilEnded).toBe(true);
    expect(seen[0].timelineDays).toBeUndefined();
    expect(out.runsUntilEnded).toBe(true);
    expect(out.timelineDays).toBeNull();
  });

  it('does not set it when it is not asked for', async () => {
    const seen: any[] = [];
    const s = service();
    s.grounds = { createForLead: async (_o: string, _u: string, d: any) => { seen.push(d); return ground; } };
    await s.open('org1', dto as any);
    expect(seen[0].runsUntilEnded).toBeUndefined();
  });
});
