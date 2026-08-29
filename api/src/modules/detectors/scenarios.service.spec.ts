import { ScenarioCandidateState, GroundScenario } from '@prisma/client';
import { ScenariosService } from './scenarios.service';
import { COOLING_DAYS, CANDIDATE_LIFE_DAYS } from './a-conversation-the-record-suggests';

const NOW = new Date('2026-03-01T00:00:00Z');
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

function svc(o: { existing?: any[]; quiet?: any[]; assignments?: any[]; people?: any[] } = {}) {
  const created: any[] = [];
  const updated: any[] = [];
  const empty = { findMany: async () => [], findFirst: async () => null, updateMany: async () => ({ count: 0 }) };
  const mocked: any = {
    detectionQuietPeriod: { findMany: async () => o.quiet ?? [] },
    person: { findMany: async () => o.people ?? [{ externalId: 'ada', managerExternalId: 'boss', active: true }] },
    roleAssignment: { findMany: async () => o.assignments ?? [
      { id: 'r1', personExternalId: 'ada', roleName: 'Engineer', startedAt: daysAgo(3),
        endedAt: null, predecessorAssignmentId: null, successor: null },
    ] },
    subject: { findMany: async () => [] },
    detectorResult: { findMany: async () => [] },
    contribution: { findMany: async () => [] },
    scenarioCandidate: {
      findFirst: async ({ where }: any) => (o.existing ?? []).find((e) =>
        e.scenario === where.scenario
        && (e.state === where.state || where.state === undefined)
        && (where.state !== ScenarioCandidateState.DECLINED || e.resolvedAt > where.resolvedAt.gt)
        && (where.expiresAt === undefined || e.expiresAt > where.expiresAt.gt)) ?? null,
      create: async ({ data }: any) => { const row = { id: `c${created.length}`, ...data }; created.push(row); return row; },
      update: async ({ data }: any) => { updated.push(data); return { ...data }; },
      updateMany: async () => ({ count: 0 }),
      findMany: async () => [],
    },
  };
  const prisma: any = new Proxy(mocked, { get: (t, k: string) => t[k] ?? empty });
  const events: any = { emit: () => {} };
  return { service: new ScenariosService(prisma, events), created, updated };
}

describe('the quiet period after an import', () => {
  it('stops every suggestion, because they would all be about the import', () => {
    /* §13C.5 names scenario candidates specifically. An org that imported yesterday has no
       conversational data to ground a suggestion in. */
    return svc({ quiet: [{ endsAt: new Date(NOW.getTime() + 86_400_000) }] })
      .service.propose('org-a', NOW)
      .then((r) => expect(r).toEqual({ ran: false, proposed: 0 }));
  });
});

describe('not asking twice', () => {
  it('says nothing while a live proposal about the same thing is unanswered', async () => {
    /* Asking twice while somebody is still deciding is the most obviously broken behaviour
       available. */
    const { service, created } = svc({
      existing: [{ scenario: GroundScenario.NEW_HIRE, state: ScenarioCandidateState.PROPOSED,
        expiresAt: new Date(NOW.getTime() + 86_400_000) }],
    });
    await service.propose('org-a', NOW);
    expect(created).toEqual([]);
  });

  it('and stays quiet for a long time after somebody declines', async () => {
    const { service, created } = svc({
      existing: [{ scenario: GroundScenario.NEW_HIRE, state: ScenarioCandidateState.DECLINED,
        resolvedAt: daysAgo(COOLING_DAYS - 1) }],
    });
    await service.propose('org-a', NOW);
    expect(created).toEqual([]);
  });

  it('but asks again once the cooling window has passed', async () => {
    const { service, created } = svc({
      existing: [{ scenario: GroundScenario.NEW_HIRE, state: ScenarioCandidateState.DECLINED,
        resolvedAt: daysAgo(COOLING_DAYS + 1) }],
    });
    await service.propose('org-a', NOW);
    expect(created).toHaveLength(1);
  });

  it('and a fresh proposal stands for a bounded time', async () => {
    const { service, created } = svc();
    await service.propose('org-a', NOW);
    expect(created[0].expiresAt).toEqual(new Date(NOW.getTime() + CANDIDATE_LIFE_DAYS * 86_400_000));
  });
});

describe('only the person it was put to may answer', () => {
  it('and anybody else gets the same answer as somebody guessing an id', async () => {
    /*
     * A suggestion about somebody's performance, accepted by anybody who happened to have the id,
     * would be the whole "a human opens it" guarantee undone by a missing where-clause. Not found
     * rather than forbidden, so the id itself is not confirmed to somebody probing.
     */
    const prisma: any = {
      scenarioCandidate: {
        findFirst: async () => ({ id: 'c1', proposedToPersonExternalId: 'boss',
          state: ScenarioCandidateState.PROPOSED }),
      },
    };
    const s = new ScenariosService(prisma, { emit: () => {} } as any);
    await expect(s.decide('org-a', 'c1', 'somebody-else', true)).rejects.toThrow(/No such suggestion/);
  });

  it('and one already decided cannot be decided again', async () => {
    const prisma: any = {
      scenarioCandidate: {
        findFirst: async () => ({ id: 'c1', proposedToPersonExternalId: 'boss',
          state: ScenarioCandidateState.DECLINED }),
      },
    };
    const s = new ScenariosService(prisma, { emit: () => {} } as any);
    await expect(s.decide('org-a', 'c1', 'boss', true)).rejects.toThrow(/already declined/);
  });
});
