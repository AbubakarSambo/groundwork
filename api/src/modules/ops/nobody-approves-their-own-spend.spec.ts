/**
 * The person who holds spend:approve is also a person who claims expenses.
 *
 * That is the ordinary arrangement in a company this size, and it is exactly
 * the one an auditor asks about. A capability check alone permits it: the CEO
 * holds spend:approve, so without a second rule she can approve her own
 * reimbursement and the record will say it was properly approved.
 *
 * So the rule is about identity, not capability, and it applies to everybody
 * including the only person who currently holds the grant.
 */
import { ForbiddenException } from '@nestjs/common';
import { OpsCeoService } from './ops-ceo.service';

const expense = { id: 'e1', requesterId: 'hafsah-id', paidAt: null };

const serviceFor = (row = expense) =>
  new OpsCeoService({
    opsExpense: {
      findUnique: async () => row,
      update: async ({ data }: never) => ({ ...row, ...(data as object) }),
    },
  } as never);

const person = (personId: string, capabilities: string[]) => ({
  personId,
  key: personId,
  displayName: personId,
  functionalRole: 'CEO' as const,
  capabilities,
});

describe('approving an expense', () => {
  it('is refused to the person who claimed it, even holding spend:approve', async () => {
    const identity = person('hafsah-id', ['spend:approve', 'ceo:board']);
    await expect(serviceFor().decideExpense('e1', 'APPROVED', identity)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('and says plainly that somebody else has to do it', async () => {
    const identity = person('hafsah-id', ['spend:approve']);
    await expect(serviceFor().decideExpense('e1', 'APPROVED', identity)).rejects.toThrow(
      /Somebody else approves your spend/,
    );
  });

  it('is allowed for somebody else’s claim', async () => {
    const identity = person('james-id', ['spend:approve']);
    await expect(serviceFor().decideExpense('e1', 'APPROVED', identity)).resolves.toMatchObject({
      status: 'APPROVED',
      approvedById: 'james-id',
    });
  });

  it('and refusing your own is refused too, not just approving it', async () => {
    const identity = person('hafsah-id', ['spend:approve']);
    await expect(serviceFor().decideExpense('e1', 'REJECTED', identity, 'no')).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('and so is marking your own as paid', async () => {
    const identity = person('hafsah-id', ['spend:approve']);
    await expect(serviceFor().decideExpense('e1', 'PAID', identity)).rejects.toThrow(ForbiddenException);
  });
});

describe('the balance', () => {
  const balanceOver = (earnings: unknown[], expenses: unknown[]) =>
    new OpsCeoService({
      opsEarningsEntry: { findMany: async () => earnings },
      opsExpense: { findMany: async () => expenses },
      opsGrant: { findMany: async () => [] },
    } as never).balance();

  it('treats money already approved as gone, because it is', async () => {
    /**
     * Approved-but-unpaid is money promised to somebody. Counting it as still
     * available is how the next approval gets made against a balance that does
     * not exist.
     */
    const result = await balanceOver(
      [{ amount: 1000 }],
      [
        { status: 'PAID', amount: 200 },
        { status: 'APPROVED', amount: 300 },
        { status: 'REQUESTED', amount: 400 },
      ],
    );
    expect(result.remaining).toBe(500);
    expect(result.approvedNotPaid).toBe(300);
    expect(result.awaitingDecision).toBe(400);
  });

  it('and says there is no balance rather than showing zero when nothing is recorded', async () => {
    const result = await balanceOver([], []);
    expect(result.says).toMatch(/no balance to give/);
  });
});

describe('a claim nobody is allowed to approve', () => {
  /**
   * The two rules meet badly. Nobody approves their own spend, and one person
   * holds spend:approve — so her own claims can be decided by nobody, and sit
   * at REQUESTED for ever looking exactly like a claim somebody has not got
   * round to.
   *
   * Found by submitting one against the running system and watching it strand.
   * The fix is a decision about who else may approve spend, which the system
   * does not get to make — but it must not hide the situation either.
   */
  const balanceWith = (expenses: unknown[], approverIds: string[]) =>
    new OpsCeoService({
      opsEarningsEntry: { findMany: async () => [{ amount: 1000 }] },
      opsExpense: { findMany: async () => expenses },
      opsGrant: { findMany: async () => approverIds.map((personId) => ({ personId })) },
    } as never).balance();

  it('is named when the only approver is the claimant', async () => {
    const result = await balanceWith(
      [{ id: 'e1', status: 'REQUESTED', amount: 400, description: 'Conference ticket', requesterId: 'hafsah' }],
      ['hafsah'],
    );
    expect(result.nobodyCanApprove).toHaveLength(1);
    expect(result.nobodyCanApprove[0].description).toBe('Conference ticket');
  });

  it('and stops being named as soon as somebody else may approve', async () => {
    const result = await balanceWith(
      [{ id: 'e1', status: 'REQUESTED', amount: 400, description: 'Conference ticket', requesterId: 'hafsah' }],
      ['hafsah', 'james'],
    );
    expect(result.nobodyCanApprove).toEqual([]);
  });

  it('and somebody else’s claim is never stranded', async () => {
    const result = await balanceWith(
      [{ id: 'e1', status: 'REQUESTED', amount: 25, description: 'Coffee', requesterId: 'adam' }],
      ['hafsah'],
    );
    expect(result.nobodyCanApprove).toEqual([]);
  });

  it('and an already-decided claim is not stranded, whoever made it', async () => {
    const result = await balanceWith(
      [{ id: 'e1', status: 'APPROVED', amount: 400, description: 'Ticket', requesterId: 'hafsah' }],
      ['hafsah'],
    );
    expect(result.nobodyCanApprove).toEqual([]);
  });
});

describe('reading everybody’s spend', () => {
  /**
   * Reading and deciding were one grant. The consequence nobody chose: the only
   * people who could see the CEO's own spend were the people who could approve
   * spend — which is her. Her claims are RECORDED rather than approved, because
   * nobody may approve their own, so the one record with no second person on it
   * was also the one record nobody else could open.
   *
   * Decided 2026-09-05: the team reads everybody's, hers included. Who may
   * approve did not move, so this is not a loosening of the approval rule.
   */
  const people = [
    { id: 'hafsah-id', key: 'hafsah', displayName: 'Hafsah' },
    { id: 'adam-id', key: 'adam', displayName: 'Adam' },
  ];
  const rows = [
    { id: 'e1', requesterId: 'hafsah-id', description: 'Flight', status: 'RECORDED' },
    { id: 'e2', requesterId: 'adam-id', description: 'Coffee', status: 'REQUESTED' },
  ];

  const service = () =>
    new OpsCeoService({
      opsExpense: {
        findMany: async ({ where }: never) =>
          (where as { requesterId?: string } | undefined)?.requesterId
            ? rows.filter((r) => r.requesterId === (where as { requesterId: string }).requesterId)
            : rows,
      },
      opsPerson: {
        findMany: async () => people,
        findUnique: async ({ where }: never) =>
          people.find((p) => p.key === (where as { key: string }).key) ?? null,
      },
    } as never);

  const identity = (key: string, capabilities: string[]) => ({
    personId: `${key}-id`,
    key,
    displayName: key,
    functionalRole: 'TECH' as const,
    capabilities,
  });

  it('shows the CEO’s own claim to somebody who cannot approve anything', async () => {
    const seen = await service().expensesFor(identity('adam', ['spend:read-all', 'spend:submit']));
    expect(seen.map((e) => e.description)).toEqual(['Flight', 'Coffee']);
  });

  it('names whose claim each one is, because a list of ids is not a list', async () => {
    const seen = await service().expensesFor(identity('adam', ['spend:read-all']));
    expect(seen[0]).toMatchObject({ requesterName: 'Hafsah', requesterKey: 'hafsah' });
  });

  it('still gives somebody without the grant only their own', async () => {
    const seen = await service().expensesFor(identity('adam', ['spend:submit']));
    expect(seen.map((e) => e.description)).toEqual(['Coffee']);
  });

  it('and refuses them somebody else’s by name', async () => {
    await expect(
      service().expensesFor(identity('adam', ['spend:submit']), 'hafsah'),
    ).rejects.toThrow(/spend:read-all/);
  });
});
