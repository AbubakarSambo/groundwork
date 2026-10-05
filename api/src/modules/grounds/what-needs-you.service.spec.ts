import { WhatNeedsYouService } from './what-needs-you.service';

/**
 * THE READ BEHIND TODAY AND "CHOOSE AN ORGANISATION" ASKS ONLY WHAT THE READER IS ALLOWED (C1, U.5).
 *
 * It reads the check-ins list with the reader's own role, asks for the approvals queue only for an
 * admin, and on "Choose an organisation" reads each organisation with the role held THERE, counting
 * only that organisation's own check-ins.
 */

function setup(memberships: { organizationId: string; role: string }[] = [], opts: { awaitingOrgApproval?: boolean } = {}) {
  const grounds: any = {
    list: jest.fn(async (org: string) => [
      {
        id: `g-${org}`, label: `Check-in in ${org}`, status: 'ACTIVE', organizationId: org, initiatorId: 'someone-else',
        participants: [{ id: 'p-me', userId: 'me' }],
        checkIns: [{ id: `c-${org}`, participantId: 'p-me', sessionNumber: 2, status: 'NOT_STARTED', availableFrom: null }],
      },
      /* A check-in in another organisation that the list also carries, because the reader is in it. */
      {
        id: 'g-elsewhere', label: 'Elsewhere', status: 'ACTIVE', organizationId: 'org-other', initiatorId: 'x',
        participants: [{ id: 'p-me2', userId: 'me' }],
        checkIns: [{ id: 'c-else', participantId: 'p-me2', sessionNumber: 2, status: 'NOT_STARTED', availableFrom: null }],
      },
    ]),
    listAwaitingApproval: jest.fn(async () => [{ id: 'g-wait', label: 'Supplier review', createdBy: 'Omar Ali' }]),
  };
  const prisma: any = {
    organizationMembership: { findMany: jest.fn(async () => memberships) },
    user: { findUnique: jest.fn(async () => ({ awaitingOrgApproval: opts.awaitingOrgApproval ?? false })) },
  };
  return { svc: new WhatNeedsYouService(prisma, grounds), grounds, prisma };
}

describe('the read behind Today', () => {
  it('a member is never given the approvals queue', async () => {
    const { svc, grounds } = setup();
    const r = await svc.forReader('me', 'me@x.test', 'org-a', 'MEMBER');
    expect(grounds.listAwaitingApproval).not.toHaveBeenCalled();
    expect(grounds.list).toHaveBeenCalledWith('org-a', 'me', 'me@x.test', 'MEMBER');
    expect(r.needs.map((n) => n.title)).toEqual(['Your next check-in for Check-in in org-a']);
  });

  it('Today and its count hold only this organisation\'s needs; another organisation\'s are its "N new"', async () => {
    const { svc } = setup([{ organizationId: 'org-a', role: 'MEMBER' }, { organizationId: 'org-other', role: 'GUEST' }]);
    const r = await svc.forReader('me', 'me@x.test', 'org-a', 'MEMBER');
    expect(r.count).toBe(1);
    expect(JSON.stringify(r)).not.toContain('Elsewhere');
    const counts = await svc.everywhere('me', 'me@x.test');
    expect(counts.find((c) => c.organizationId === 'org-a')?.count).toBe(r.count);
  });

  it('an admin is asked to approve what is waiting in their organisation', async () => {
    const { svc, grounds } = setup();
    const r = await svc.forReader('me', 'me@x.test', 'org-a', 'ADMIN');
    expect(grounds.listAwaitingApproval).toHaveBeenCalledWith('org-a', 'me');
    expect(r.needs.map((n) => n.title)).toContain('Supplier review is waiting for you to approve it');
  });
});

describe('somebody not yet let into the organisation is offered neither a check-in nor a report (U.8 third review, PRIVACY)', () => {
  /*
   * Faraji joined a check-in through an open link while there was no free seat for him: his
   * account and participant row both exist (so the ground-level rule correctly calls him "own"),
   * but he is `awaitingOrgApproval` - queued for an admin to let him in, exactly the hold
   * WhoIsWaitingAtTheDoorService reads for "Almost in". Today read "The report for Sales team,
   * Q3 is ready… Read it" and "Your first check-in… Start it" for him regardless, because nothing
   * asked whether he had actually been let in.
   */
  function setupHeld(awaitingOrgApproval: boolean) {
    const grounds: any = {
      list: jest.fn(async () => [{
        id: 'g-sales', label: 'Sales team, Q3', status: 'ACTIVE', organizationId: 'org-a', initiatorId: 'lead',
        participants: [{ id: 'p-faraji', userId: 'me' }],
        checkIns: [{ id: 'c-1', participantId: 'p-faraji', sessionNumber: 1, status: 'NOT_STARTED', availableFrom: null }],
        reportWaitingForMe: true,
        latestSummary: 'Where the team stands.',
      }]),
      listAwaitingApproval: jest.fn(async () => []),
    };
    const prisma: any = {
      organizationMembership: { findMany: jest.fn(async () => []) },
      user: { findUnique: jest.fn(async () => ({ awaitingOrgApproval })) },
    };
    return new WhatNeedsYouService(prisma, grounds);
  }

  it('offers him neither while he is held', async () => {
    const svc = setupHeld(true);
    const r = await svc.forReader('me', 'me@x.test', 'org-a', 'MEMBER');
    expect(r.needs).toEqual([]);
    expect(r.count).toBe(0);
    expect(JSON.stringify(r)).not.toMatch(/Sales team, Q3/);
  });

  it('and offers him both, honestly, the moment he is let in', async () => {
    const svc = setupHeld(false);
    const r = await svc.forReader('me', 'me@x.test', 'org-a', 'MEMBER');
    expect(r.needs.map((n) => n.title)).toEqual([
      'Your first check-in for Sales team, Q3',
      'The report for Sales team, Q3 is ready',
    ]);
  });
});

describe('the count on each row of "Choose an organisation"', () => {
  it('reads each organisation with the role held there, and counts only its own check-ins', async () => {
    const { svc, grounds } = setup([
      { organizationId: 'org-a', role: 'ADMIN' },
      { organizationId: 'org-b', role: 'MEMBER' },
    ]);
    const counts = await svc.everywhere('me', 'me@x.test');
    expect(grounds.list).toHaveBeenCalledWith('org-a', 'me', 'me@x.test', 'ADMIN');
    expect(grounds.list).toHaveBeenCalledWith('org-b', 'me', 'me@x.test', 'MEMBER');
    expect(grounds.listAwaitingApproval).toHaveBeenCalledTimes(1);
    expect(counts).toEqual([
      { organizationId: 'org-a', count: 2 },
      { organizationId: 'org-b', count: 1 },
    ]);
  });
});
