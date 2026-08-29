import { readFileSync } from 'fs';
import { join } from 'path';
import { CommitmentState, DependencyStatus } from '@prisma/client';
import { DepartureService } from './departure.service';

const SRC = readFileSync(join(__dirname, 'departure.service.ts'), 'utf8');

function svc(o: { findings?: any[]; person?: any } = {}) {
  const calls: any[] = [];
  const empty = {
    findMany: async () => [], findFirst: async () => null, findUnique: async () => null,
    updateMany: async (a: any) => { calls.push(['updateMany', a]); return { count: 1 }; },
    update: async (a: any) => { calls.push(['update', a]); return {}; },
    upsert: async () => ({ id: 'd1' }), deleteMany: async (a: any) => { calls.push(['deleteMany', a]); return { count: 3 }; },
  };
  const mocked: any = {
    departureRecord: { upsert: async () => ({ id: 'd1' }), update: async (a: any) => { calls.push(['record', a.data]); return {}; },
      findMany: async () => [] },
    commitment: { updateMany: async (a: any) => { calls.push(['commitments', a]); return { count: 2 }; } },
    person: { findFirst: async () => (o.person === undefined ? { email: 'gone@x.com' } : o.person) },
    groundDependency: { updateMany: async (a: any) => { calls.push(['blockers', a]); return { count: 1 }; } },
    detectorResult: {
      findMany: async () => o.findings ?? [{ id: 'f1', evidence: { says: 'they did not ship' } }],
      update: async (a: any) => { calls.push(['finding', a]); return {}; },
    },
  };
  const prisma: any = new Proxy(mocked, { get: (t, k: string) => t[k] ?? empty });
  return { service: new DepartureService(prisma), calls };
}

const DEPARTED = new Date('2026-03-01T00:00:00Z');

describe('the moment somebody leaves', () => {
  it('closes their open commitments as DROPPED, not SLIPPED', async () => {
    /*
     * Slipped is a judgement - they said they would and did not. Applying it to somebody on the day
     * they left would put a failure on the record of everybody who leaves mid-commitment. Dropped is
     * "overtaken", which is what actually happened.
     */
    const { service, calls } = svc();
    await service.onDeparture('org-a', 'gone', DEPARTED, 'Head of Partnerships');
    const [, c] = calls.find(([k]) => k === 'commitments');
    expect(c.data.state).toBe(CommitmentState.DROPPED);
    expect(c.data.state).not.toBe(CommitmentState.SLIPPED);
  });

  it('clears handoffs in both directions', async () => {
    /* One they were waiting on and one somebody was waiting on them for both read as live, and both
       get chased. */
    const { service, calls } = svc();
    await service.onDeparture('org-a', 'gone', DEPARTED, 'Head of Partnerships');
    const [, b] = calls.find(([k]) => k === 'blockers');
    expect(b.data.status).toBe(DependencyStatus.CLEARED);
    expect(JSON.stringify(b.where.OR)).toMatch(/fromParticipant/);
    expect(JSON.stringify(b.where.OR)).toMatch(/onParticipant/);
  });

  it('collapses a finding to the role rather than deleting it', async () => {
    /*
     * The finding is what makes the objective's history intelligible to the people still on it. What
     * goes is the name; what stays is that it happened and what it was about.
     */
    const { service, calls } = svc();
    await service.onDeparture('org-a', 'gone', DEPARTED, 'Head of Partnerships');
    const [, f] = calls.find(([k]) => k === 'finding');
    expect(f.data.personExternalId).toBeNull();
    expect(f.data.evidence.attribution).toBe('the person who held Head of Partnerships');
    /* And the rest of the evidence survives, so the finding still says what it found. */
    expect(f.data.evidence.says).toBe('they did not ship');
  });

  it('and deletes nothing at all', async () => {
    /*
     * Stage one runs the instant somebody leaves, which is before the handover brief has been read
     * and long before the retention window closes. Anything irreversible here would destroy the
     * substrate the brief and the findings are built from.
     */
    const { service, calls } = svc();
    await service.onDeparture('org-a', 'gone', DEPARTED, 'Head of Partnerships');
    expect(calls.filter(([k]) => k === 'deleteMany')).toEqual([]);
  });

  it('and writes counts, never contents, to the audit record', async () => {
    /* The row outlives the data. It must not become a copy of what was removed. */
    const { service, calls } = svc();
    await service.onDeparture('org-a', 'gone', DEPARTED, 'Head of Partnerships');
    const [, data] = calls.find(([k]) => k === 'record');
    expect(data).toEqual({ commitmentsClosed: 2, blockersClosed: 1, findingsCollapsed: 1 });
    expect(JSON.stringify(data)).not.toMatch(/did not ship/);
  });
});

describe('the part that cannot be undone', () => {
  it('is on a clock, not on the departure event', () => {
    /*
     * §13C.1: the handover brief generates BEFORE turn ageing begins, otherwise the brief is built
     * from data already gone. Stage one is an event and deletes nothing; stage two is a cron.
     */
    const stageOne = SRC.slice(SRC.indexOf('async onDeparture('), SRC.indexOf('async ageOutDepartedTurns('));
    expect(stageOne).not.toMatch(/deleteMany|\.delete\(/);
    expect(SRC).toMatch(/@Cron\([^)]*\)\s*\n\s*async ageOutDepartedTurns/);
  });

  it('and deletes turns in both places one can exist', () => {
    /* Missing either makes the deletion cosmetic in exactly the way the spec warns about
       embeddings. */
    const stageTwo = SRC.slice(SRC.indexOf('async ageOutDepartedTurns('));
    expect(stageTwo).toMatch(/conversationTurn\.deleteMany/);
    expect(stageTwo).toMatch(/assistantTurn\.deleteMany/);
  });

  it('and one organisation failing does not stop the rest', () => {
    /* This is the job that answers a security review. A silent stall in it is the worst outcome
       available. */
    const stageTwo = SRC.slice(SRC.indexOf('async ageOutDepartedTurns('));
    expect(stageTwo).toMatch(/catch \(err: any\)/);
    expect(stageTwo).toMatch(/this\.logger\.error/);
  });
});
