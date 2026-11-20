import { LearningService, EVERYONE } from './learning.service';
import { theOrganisationsOwnFindings, MIN_SIGNALS_BEFORE_A_FINDING } from './what-this-organisation-has-found';

const A = 'org-a';
const B = 'org-b';

/** Two organisations' records and a counts table that is kept in memory, so the real service counts, stores and totals. */
function aFakeWorld(stepsA: { step: string; outcome: string | null }[], stepsB: { step: string; outcome: string | null }[]) {
  const rows: any[] = [];
  let id = 0;
  const coaching = (org: string) => (org === A ? stepsA : stepsB);
  const orgOf = (where: any): string => where?.ground?.organizationId ?? where?.participant?.ground?.organizationId;
  const prisma: any = {
    organization: { findMany: async () => [{ id: A }, { id: B }] },
    patternDetection: { findMany: async () => [] },
    checkIn: { groupBy: async () => [], findMany: async () => [] },
    coachingState: { findMany: async ({ where }: any) => [{ history: coaching(orgOf(where)) }] },
    learningSignalCount: {
      findMany: async ({ where, take, orderBy }: any = {}) => {
        let out = rows.filter((r) => (where?.scope && typeof where.scope === 'string' ? r.scope === where.scope : where?.scope?.not ? r.scope !== where.scope.not : true));
        if (where?.judged?.gte != null) out = out.filter((r) => r.judged >= where.judged.gte);
        if (orderBy?.judged === 'desc') out = [...out].sort((a, b) => b.judged - a.judged);
        return take ? out.slice(0, take) : out;
      },
      upsert: async ({ where, create, update }: any) => {
        const key = where.scope_kind_key;
        const hit = rows.find((r) => r.scope === key.scope && r.kind === key.kind && r.key === key.key);
        if (hit) Object.assign(hit, update); else rows.push({ id: `l-${++id}`, ...create });
      },
      deleteMany: async ({ where }: any) => { for (const i of where.id.in) rows.splice(rows.findIndex((r) => r.id === i), 1); },
    },
  };
  return { prisma, rows };
}

const tried = (step: string, outcomes: string[]) => outcomes.map((outcome) => ({ step, outcome }));

describe('what an organisation has found out, from its own record alone', () => {
  it("each organisation's findings are its own, the total is the two added together, and nobody reads another's", async () => {
    const { prisma } = aFakeWorld(
      [...tried('Send the proof the same day', ['done', 'done', 'did more', 'done', 'not done', 'done']), ...tried('Name the next step', ['done'])],
      tried('Call the buyer first', ['not done', 'not done', 'not done', 'not done', 'not done', 'done']),
    );
    const learning = new LearningService(prisma);
    await learning.recountEverything();

    const a = await theOrganisationsOwnFindings(prisma, A);
    const b = await theOrganisationsOwnFindings(prisma, B);
    expect(a).toHaveLength(1);
    expect(a[0].text).toBe('Send the proof the same day. It was offered 6 times, and 6 of those have been asked about in a later check-in. Of those, it was done, or done and more, 5 times, it was not done 1 time, and something else was done 0 times.');
    expect(b[0].text).toContain('Call the buyer first.');
    expect(b[0].text).toContain('it was done, or done and more, 1 time, it was not done 5 times');
    expect(JSON.stringify(a)).not.toMatch(/Call the buyer/);
    expect(JSON.stringify(b)).not.toMatch(/Send the proof/);
    /* The one step tried once is in the counts but is not a finding. */
    expect(a.map((x) => x.text).join(' ')).not.toContain('Name the next step');
  });

  it('the total across organisations is never read back as any organisation\'s finding', async () => {
    const { prisma, rows } = aFakeWorld(tried('Send the proof the same day', ['done', 'done', 'done', 'done', 'done']), tried('Send the proof the same day', ['not done', 'not done', 'not done', 'not done', 'not done']));
    await new LearningService(prisma).recountEverything();
    const total = rows.find((r) => r.scope === EVERYONE && r.key === 'Send the proof the same day');
    expect(total).toMatchObject({ judged: 10, goodCount: 5, badCount: 5 });
    expect((await theOrganisationsOwnFindings(prisma, A))[0].text).toContain('done, or done and more, 5 times, it was not done 0 times');
    expect((await theOrganisationsOwnFindings(prisma, B))[0].text).toContain('done, or done and more, 0 times, it was not done 5 times');
  });

  it('says nothing until at least five signals are in, and says nothing for an organisation with no id', async () => {
    expect(MIN_SIGNALS_BEFORE_A_FINDING).toBe(5);
    const { prisma } = aFakeWorld(tried('A step', ['done', 'done', 'done', 'done']), []);
    await new LearningService(prisma).recountEverything();
    expect(await theOrganisationsOwnFindings(prisma, A)).toEqual([]);
    expect(await theOrganisationsOwnFindings(prisma, '')).toEqual([]);
  });

  it('what is said carries no organisation, no person and no suggested weight', async () => {
    const { prisma } = aFakeWorld(tried('Send the proof the same day', ['done', 'done', 'done', 'done', 'done', 'done', 'done', 'done', 'done', 'done']), []);
    await new LearningService(prisma).recountEverything();
    const [f] = await theOrganisationsOwnFindings(prisma, A);
    expect(f.text).not.toMatch(/org-a|weight|suggest/i);
  });

  it('a failed read says nothing rather than failing', async () => {
    const prisma: any = { learningSignalCount: { findMany: () => Promise.reject(new Error('down')) } };
    expect(await theOrganisationsOwnFindings(prisma, A)).toEqual([]);
  });
});
