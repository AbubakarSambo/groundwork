import { WhatNeedsYouService } from './what-needs-you.service';

/**
 * THE READ BEHIND TODAY AND "CHOOSE AN ORGANISATION" ASKS ONLY WHAT THE READER IS ALLOWED (C1, U.5).
 *
 * It reads the check-ins list with the reader's own role, asks for the approvals queue only for an
 * admin, and on "Choose an organisation" reads each organisation with the role held THERE, counting
 * only that organisation's own check-ins.
 */

function setup(memberships: { organizationId: string; role: string }[] = []) {
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
  const prisma: any = { organizationMembership: { findMany: jest.fn(async () => memberships) } };
  return { svc: new WhatNeedsYouService(prisma, grounds), grounds };
}

describe('the read behind Today', () => {
  it('a member is never given the approvals queue', async () => {
    const { svc, grounds } = setup();
    const r = await svc.forReader('me', 'me@x.test', 'org-a', 'MEMBER');
    expect(grounds.listAwaitingApproval).not.toHaveBeenCalled();
    expect(grounds.list).toHaveBeenCalledWith('org-a', 'me', 'me@x.test', 'MEMBER');
    expect(r.needs.map((n) => n.title)).toEqual(['Your own check-in for Check-in in org-a', 'Your own check-in for Elsewhere']);
  });

  it('an admin is asked to approve what is waiting in their organisation', async () => {
    const { svc, grounds } = setup();
    const r = await svc.forReader('me', 'me@x.test', 'org-a', 'ADMIN');
    expect(grounds.listAwaitingApproval).toHaveBeenCalledWith('org-a');
    expect(r.needs.map((n) => n.title)).toContain('Supplier review is waiting for you to approve it');
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
