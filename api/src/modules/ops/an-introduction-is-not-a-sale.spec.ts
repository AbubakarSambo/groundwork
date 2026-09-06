/**
 * Activity is recorded. Outcomes earn credit.
 *
 * Somebody should not appear commercially valuable because they make many
 * introductions. The only way to tell "Nate made ten introductions" from "Nate
 * made ten introductions, two became paying clients worth $30,000" is to keep
 * the whole funnel and read the far end - so every stage is counted separately
 * and nothing collapses into a points total.
 *
 * This also covers the two ways a record could quietly become a claim: a person
 * being credited because they typed the opportunity in, and a claim being made
 * after a deal has become worth claiming.
 */
import { ForbiddenException } from '@nestjs/common';
import { OpsCommercialService } from './ops-commercial.service';

const NOW = new Date('2026-09-04');

function serviceOver(opportunity: Record<string, unknown>) {
  const writes: Array<{ table: string; data: Record<string, unknown> }> = [];
  const prisma = {
    opsCompany: { findUnique: async () => ({ id: 'c1', key: 'acme' }) },
    opsCommercialOpportunity: {
      findUnique: async () => opportunity,
      create: async ({ data }: never) => {
        writes.push({ table: 'opportunity', data: data as Record<string, unknown> });
        return { id: 'o1', ...(data as object) };
      },
      update: async ({ data }: never) => {
        writes.push({ table: 'opportunity-update', data: data as Record<string, unknown> });
        return { id: 'o1' };
      },
    },
    opsAttributionClaim: {
      create: async ({ data }: never) => {
        writes.push({ table: 'claim', data: data as Record<string, unknown> });
        return { id: 'cl1', ...(data as object) };
      },
      findUnique: async () => null,
    },
    opsCommercialPayment: {
      create: async ({ data }: never) => {
        writes.push({ table: 'payment', data: data as Record<string, unknown> });
        return { id: 'p1', ...(data as object) };
      },
    },
  } as never;
  return { service: new OpsCommercialService(prisma), writes };
}

const aLead = {
  id: 'o1',
  stage: 'LEAD' as const,
  originatorState: 'NEEDS_REVIEW' as const,
  positioningState: 'NEEDS_REVIEW' as const,
  attributionLockedAt: null,
  firstPaymentAt: null,
  nextAction: null,
  lostAt: null,
  lostReason: null,
  payments: [],
};

describe('opening an opportunity', () => {
  it('records nobody as having created it', async () => {
    /**
     * Whoever types the record is not thereby its originator. Offering the
     * field at creation is precisely how the person entering data becomes the
     * person credited, and it happens without anybody deciding to do it.
     */
    const { service, writes } = serviceOver(aLead);
    await service.open({ companyKey: 'acme', name: 'Acme platform' });

    const written = writes.find((w) => w.table === 'opportunity')!.data;
    expect(written).not.toHaveProperty('opportunityOriginatorId');
    expect(written).not.toHaveProperty('positioningSourceId');
  });
});

describe('claiming that you created something', () => {
  it('is allowed while it is only a lead', async () => {
    const { service, writes } = serviceOver(aLead);
    await service.claim({
      opportunityId: 'o1',
      claimantId: 'nate',
      role: 'OPPORTUNITY_ORIGINATOR',
      claimedBasis: 'First commercial conversation, 3 September',
    });
    expect(writes.some((w) => w.table === 'claim')).toBe(true);
  });

  it('and refused once the deal is qualified, which is when it becomes worth claiming', async () => {
    const { service } = serviceOver({ ...aLead, stage: 'QUALIFIED' });
    await expect(
      service.claim({
        opportunityId: 'o1',
        claimantId: 'nate',
        role: 'OPPORTUNITY_ORIGINATOR',
        claimedBasis: 'I remember being involved',
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('and the refusal says an admin can still do it, so it does not read as a dead end', async () => {
    const { service } = serviceOver({ ...aLead, stage: 'PAYING' });
    await expect(
      service.claim({
        opportunityId: 'o1',
        claimantId: 'nate',
        role: 'OPPORTUNITY_ORIGINATOR',
        claimedBasis: 'x',
      }),
    ).rejects.toThrow(/admin can still set it/);
  });
});

describe('deciding a claim', () => {
  const claim = {
    id: 'cl1',
    opportunityId: 'o1',
    claimantId: 'nate',
    role: 'OPPORTUNITY_ORIGINATOR' as const,
    state: 'CLAIMED' as const,
    opportunity: aLead,
  };

  const serviceWithClaim = (state: string = 'CLAIMED', opportunity: Record<string, unknown> = aLead) => {
    const writes: Array<{ table: string; data: Record<string, unknown> }> = [];
    const prisma = {
      opsAttributionClaim: {
        findUnique: async () => ({ ...claim, state, opportunity }),
        update: async ({ data }: never) => {
          writes.push({ table: 'claim', data: data as Record<string, unknown> });
          return { id: 'cl1' };
        },
      },
      opsCommercialOpportunity: {
        update: async ({ data }: never) => {
          writes.push({ table: 'opportunity', data: data as Record<string, unknown> });
          return {};
        },
      },
    } as never;
    return { service: new OpsCommercialService(prisma), writes };
  };

  const approver = {
    personId: 'hafsah',
    key: 'hafsah',
    displayName: 'Hafsah',
    functionalRole: 'CEO' as const,
    capabilities: ['commercial:approve'],
  };

  it('needs the capability, not merely an opinion', async () => {
    const { service } = serviceWithClaim();
    await expect(
      service.decideClaim('cl1', { state: 'APPROVED' }, { ...approver, capabilities: [] }),
    ).rejects.toThrow(/needs commercial:approve/);
  });

  it('credits the claimant when approved as claimed', async () => {
    const { service, writes } = serviceWithClaim();
    await service.decideClaim('cl1', { state: 'APPROVED' }, approver);
    expect(writes.find((w) => w.table === 'opportunity')!.data).toMatchObject({
      originatorState: 'APPROVED',
      opportunityOriginatorId: 'nate',
    });
  });

  it('credits somebody else when the approver says it was somebody else', async () => {
    const { service, writes } = serviceWithClaim();
    await service.decideClaim('cl1', { state: 'APPROVED', insteadPersonId: 'hafsah' }, approver);
    expect(writes.find((w) => w.table === 'opportunity')!.data).toMatchObject({
      opportunityOriginatorId: 'hafsah',
    });
  });

  it('and keeps the original claim alongside the change', async () => {
    /**
     * The history is what makes attribution defensible in a conversation about
     * what somebody created. A record holding only the current answer cannot
     * support that conversation - somebody says "I claimed that" and there is
     * nothing to look at.
     */
    const { service, writes } = serviceWithClaim();
    await service.decideClaim('cl1', { state: 'APPROVED', insteadPersonId: 'hafsah' }, approver);
    expect(writes.find((w) => w.table === 'claim')!.data).toMatchObject({
      modifiedToPersonId: 'hafsah',
      decidedById: 'hafsah',
    });
  });

  it('returns a rejected opportunity to unattributed rather than leaving it claimed', async () => {
    /* Otherwise it sits as CLAIMED for ever and never reappears in the list of
       things nobody has established. */
    const { service, writes } = serviceWithClaim();
    await service.decideClaim('cl1', { state: 'REJECTED', note: 'That was not you' }, approver);
    expect(writes.find((w) => w.table === 'opportunity')!.data).toMatchObject({
      originatorState: 'NEEDS_REVIEW',
    });
  });

  it('and rejecting one role writes only that role, leaving the other alone', async () => {
    /**
     * THE BUG THIS TEST EXISTS FOR, and the first version of it did not catch.
     *
     * Nate's positioning approved, Hafsah's origination approved, then Sahar's
     * origination claim correctly rejected - and one shared attribution field
     * meant the rejection set the whole opportunity back to NEEDS_REVIEW,
     * silently removing credit from both of them. Every write was right on its
     * own. Only the ledgers showed it, as four rows of zeroes.
     *
     * My first attempt at this test asserted the pure credit function instead of
     * the service that did the clobbering, so re-introducing the bug left it
     * green. A rule about what a WRITE does has to look at the write.
     */
    const { service, writes } = serviceWithClaim();
    await service.decideClaim('cl1', { state: 'REJECTED' }, approver);

    const written = writes.find((w) => w.table === 'opportunity')!.data;
    expect(written).toEqual({ originatorState: 'NEEDS_REVIEW' });
    expect(written).not.toHaveProperty('positioningState');
  });

  it('and rejecting a positioning claim never touches origination', async () => {
    const positioningClaim = { ...aLead };
    const { service, writes } = serviceWithClaim('CLAIMED', positioningClaim);
    (claim as { role: string }).role = 'POSITIONING_SOURCE';
    await service.decideClaim('cl1', { state: 'REJECTED' }, approver);
    (claim as { role: string }).role = 'OPPORTUNITY_ORIGINATOR';

    expect(writes.find((w) => w.table === 'opportunity')!.data).toEqual({ positioningState: 'NEEDS_REVIEW' });
  });

  it('and approving one role writes only that role too', async () => {
    const { service, writes } = serviceWithClaim();
    await service.decideClaim('cl1', { state: 'APPROVED' }, approver);

    const written = writes.find((w) => w.table === 'opportunity')!.data;
    expect(written).not.toHaveProperty('positioningState');
    expect(written).not.toHaveProperty('positioningSourceId');
  });

  it('and rejecting a competing claim leaves the person already credited alone', async () => {
    /**
     * Two people claiming the same role is the ordinary case, not the exception.
     * Hafsah originated the deal; Sahar, who ran the entire sales process,
     * believed she had. Rejecting Sahar's claim is the right decision and it
     * must not take the credit off Hafsah - which is exactly what it did, and
     * which only showed up as a row of zeroes on Hafsah's ledger.
     */
    const alreadyHafsahs = { ...aLead, opportunityOriginatorId: 'hafsah', originatorState: 'APPROVED' as const };
    const { service, writes } = serviceWithClaim('CLAIMED', alreadyHafsahs);

    await service.decideClaim('cl1', { state: 'REJECTED', note: 'You ran the process, you did not originate it.' }, approver);

    expect(writes.find((w) => w.table === 'opportunity')).toBeUndefined();
  });

  it('but does clear the role when nobody is credited for it yet', async () => {
    const { service, writes } = serviceWithClaim();
    await service.decideClaim('cl1', { state: 'REJECTED' }, approver);
    expect(writes.find((w) => w.table === 'opportunity')!.data).toEqual({ originatorState: 'NEEDS_REVIEW' });
  });

  it('and refuses to decide the same claim twice', async () => {
    const { service } = serviceWithClaim('APPROVED');
    await expect(service.decideClaim('cl1', { state: 'REJECTED' }, approver)).rejects.toThrow(
      /Decide it once/,
    );
  });
});

describe('a payment moves the pipeline to match the bank', () => {
  it('stamps the first payment date and marks them paying', async () => {
    const { service, writes } = serviceOver(aLead);
    await service.recordPayment({
      opportunityId: 'o1',
      amount: 600,
      paidAt: NOW,
      recordedById: 'sahar',
    });
    expect(writes.find((w) => w.table === 'opportunity-update')!.data).toMatchObject({
      firstPaymentAt: NOW,
      stage: 'PAYING',
    });
  });

  it('and recording who took the money creates no attribution', async () => {
    /* Sahar entering a payment does not make it Sahar's client. */
    const { service, writes } = serviceOver(aLead);
    await service.recordPayment({ opportunityId: 'o1', amount: 600, paidAt: NOW, recordedById: 'sahar' });
    const update = writes.find((w) => w.table === 'opportunity-update')!.data;
    expect(update).not.toHaveProperty('opportunityOriginatorId');
  });
});
