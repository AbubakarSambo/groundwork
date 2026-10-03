import { HandoverService } from './handover.service';

const NOW = new Date('2026-03-01T00:00:00Z');

function svc(assignment: any, extra: { commitments?: any[]; goals?: any[] } = {}) {
  const state = { rows: [assignment] as any[], events: [] as any[] };
  const prisma: any = {
    roleAssignment: {
      findFirst: async ({ where }: any) => state.rows.find((r) => r.id === where.id) ?? null,
      update: async ({ where, data }: any) => {
        Object.assign(state.rows.find((r) => r.id === where.id), data);
        return {};
      },
      create: async ({ data }: any) => { const row = { id: 'successor', ...data }; state.rows.push(row); return row; },
    },
    person: { findFirst: async () => ({ email: 'leaver@x.com' }) },
    commitment: { findMany: async () => extra.commitments ?? [] },
    personObjective: { findMany: async ({ where }: any) => (extra.goals ?? []).filter((g: any) => where.id.in.includes(g.id) && (!where.awareness || g.awareness === where.awareness)) },
    contribution: { findMany: async () => [] },
    subject: { findMany: async () => [] },
  };
  const board: any = { waitingAcrossTheOrg: async () => ({ waiting: [], waitedOn: [] }) };
  const events: any = { emit: (name: string, e: any) => state.events.push([name, e]) };
  return { service: new HandoverService(prisma, board, events, { onDeparture: async () => ({}) } as any), state };
}

const assignment = (o: any = {}) => ({
  id: 'a1', organizationId: 'org-a', personExternalId: 'leaver',
  roleName: 'Head of Partnerships', startedAt: new Date('2024-01-01'), endedAt: null, ...o,
});

describe('a role changing hands', () => {
  it('files the brief against the SUCCESSOR, not the leaver', async () => {
    /*
     * A handover is something the incoming holder has rather than something the departing one is
     * owed. The leaver has gone; nobody is going to read a record filed against them.
     */
    const { service, state } = svc(assignment());
    await service.endAssignment('org-a', 'a1', { successorPersonExternalId: 'newbie', endedAt: NOW });

    const leaver = state.rows.find((r) => r.id === 'a1');
    const successor = state.rows.find((r) => r.id === 'successor');
    expect(leaver.handoverBrief).toBeUndefined();
    expect(leaver.endedAt).toEqual(NOW);
    expect(successor.handoverBrief).toBeTruthy();
    expect(successor.predecessorAssignmentId).toBe('a1');
    /* The successor starts when the leaver stopped, not when the API call happened. */
    expect(successor.startedAt).toEqual(NOW);
  });

  it('builds no brief when there is no successor', async () => {
    /*
     * A real and common case - a role retired, or nobody found yet. A brief built now and read in
     * three months describes an organisation that has moved on.
     */
    const { service, state } = svc(assignment());
    const out = await service.endAssignment('org-a', 'a1', {});
    expect(out.brief).toBeNull();
    expect(state.rows).toHaveLength(1);
    expect(state.events).toEqual([]);
  });

  it('refuses to end one twice, rather than building a second brief', async () => {
    /*
     * The second brief would be built after the ageing rule has begun on the leaver's data, so it
     * would be emptier than the first and would overwrite nothing - two records disagreeing about
     * what somebody inherited.
     */
    const { service } = svc(assignment({ endedAt: new Date('2026-01-01') }));
    await expect(service.endAssignment('org-a', 'a1', { successorPersonExternalId: 'newbie' }))
      .rejects.toThrow(/already ended/i);
  });

  it('stamps when the brief was built, because it is never rebuilt', async () => {
    const { service, state } = svc(assignment());
    await service.endAssignment('org-a', 'a1', { successorPersonExternalId: 'newbie', endedAt: NOW });
    expect(state.rows.find((r) => r.id === 'successor').handoverReadyAt).toBeInstanceOf(Date);
  });

  it('and announces it as ready, saying whether it was empty', async () => {
    /* An empty brief and a brief that failed to build look identical to a receiver otherwise, and
       a successor told nothing assumes the second. */
    const { service, state } = svc(assignment());
    await service.endAssignment('org-a', 'a1', { successorPersonExternalId: 'newbie', endedAt: NOW });
    expect(state.events).toEqual([['handover.ready',
      { roleAssignmentId: 'successor', organizationId: 'org-a', empty: true }]]);
  });
});

describe('reading a brief that is not there', () => {
  it('says nobody held the role before, rather than reporting an error', async () => {
    const { service } = svc(assignment());
    const out: any = await service.get('org-a', 'a1');
    expect(out.brief).toBeNull();
    expect(out.why).toMatch(/Nobody held this role before/);
  });
});

describe('a role changing hands, and a goal the leaver was never told about', () => {
  it('does not hand the successor a commitment copied from it (request 125, second privacy review)', async () => {
    const { service, state } = svc(assignment(), {
      commitments: [
        { text: 'Close eight renewals a quarter', state: 'OPEN', dueAt: null, statedAt: new Date('2026-09-01'), sourcePersonObjectiveId: 'pg-untold' },
        { text: 'Send the Westgate quote', state: 'OPEN', dueAt: null, statedAt: new Date('2026-09-02'), sourcePersonObjectiveId: null },
      ],
      goals: [{ id: 'pg-untold', awareness: 'NOT_TOLD', authoredBy: 'lead' }],
    });
    await service.endAssignment('org-a', 'a1', { successorPersonExternalId: 'newbie', endedAt: NOW });
    const brief = JSON.stringify(state.rows.find((r) => r.id === 'successor').handoverBrief);
    expect(brief).toContain('Westgate quote');
    expect(brief).not.toContain('eight renewals');
  });
});
