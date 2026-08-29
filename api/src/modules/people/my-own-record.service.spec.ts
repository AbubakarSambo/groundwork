import { readFileSync } from 'fs';
import { join } from 'path';
import { MyOwnRecordService } from './my-own-record.service';

const SRC = readFileSync(join(__dirname, 'my-own-record.service.ts'), 'utf8');

function svc(o: { person?: any; findings?: any[]; suggestions?: any[] } = {}) {
  const asked: any[] = [];
  const empty = { findMany: async () => [], findFirst: async () => null, findUnique: async () => null };
  const mocked: any = {
    user: { findUnique: async () => ({ email: 'ada@x.com', organizationId: 'org-a' }) },
    person: { findFirst: async () => (o.person === undefined ? { externalId: 'ada', timezone: 'UTC' } : o.person) },
    detectorResult: { findMany: async () => o.findings ?? [] },
    scenarioCandidate: { findMany: async (a: any) => { asked.push(['suggestions', a.where]); return o.suggestions ?? []; } },
    groundDependency: { findMany: async (a: any) => { asked.push(['handoffs', a.where]); return []; } },
  };
  const prisma: any = new Proxy(mocked, { get: (t, k: string) => t[k] ?? empty });
  return { service: new MyOwnRecordService(prisma), asked };
}

describe('a subject-access request gets what the product actually holds', () => {
  it('reaches the org-scoped records the old export could not see', () => {
    /*
     * The old one walked participants, and every org-scoped record is keyed to a person's external
     * id. Somebody would have received a real-looking document missing most of what is held about
     * them, with nothing saying so.
     */
    for (const table of ['commitment.findMany', 'contribution.findMany', 'detectorResult.findMany',
      'onboardingStatus.findMany', 'groundDependency.findMany', 'emailPreference.findUnique']) {
      expect(SRC).toContain(table);
    }
  });

  it('and says so plainly when somebody has no directory record', async () => {
    const { service } = svc({ person: null });
    const out: any = await service.orgScopedRecord('u1');
    expect(out.externalId).toBeNull();
    expect(out.note).toMatch(/not linked to a directory record/);
    expect(out.commitments).toEqual([]);
  });
});

describe('what it will not hand them, even about themselves', () => {
  it('strips a score from a finding they asked for', async () => {
    /*
     * §12.8 applies to their own view too. The reason those things never leave is that they should
     * not exist as a judgement about a person at all, and showing them to the person does not make
     * them true.
     */
    const { service } = svc({ findings: [{ key: 'not_shipping', evidence: { says: 'x', clarityScore: 0.3 } }] });
    const out: any = await service.orgScopedRecord('u1');
    expect(JSON.stringify(out.findings)).not.toMatch(/clarityScore/);
    expect(JSON.stringify(out.findings)).toMatch(/says/);
    expect(out.whyWithheld[0]).toMatch(/never leave this product for anyone/);
  });

  it('and a field that names a colleague', async () => {
    const { service } = svc({ findings: [{ key: 'goal_divergence', evidence: { says: 'x', diverging: 3 } }] });
    const out: any = await service.orgScopedRecord('u1');
    expect(JSON.stringify(out.findings)).not.toMatch(/diverging/);
    expect(out.whyWithheld.join(' ')).toMatch(/name other people/);
  });

  it('and a suggestion about them that was put to somebody else', async () => {
    /*
     * Telling somebody a performance conversation has been suggested about them, through a data
     * export, before their manager has decided anything, is the worst possible way to learn it.
     */
    const { service, asked } = svc();
    await service.orgScopedRecord('u1');
    const [, where] = asked.find(([k]) => k === 'suggestions');
    expect(where.proposedToPersonExternalId).toBe('ada');
    expect(where.personExternalId).toBeUndefined();
  });
});

describe('both directions of a handoff are theirs', () => {
  it('because one they are waiting on and one they owe are both about them', async () => {
    const { service, asked } = svc();
    await service.orgScopedRecord('u1');
    const [, where] = asked.find(([k]) => k === 'handoffs');
    expect(JSON.stringify(where.OR)).toMatch(/fromParticipant/);
    expect(JSON.stringify(where.OR)).toMatch(/onParticipant/);
  });
});
