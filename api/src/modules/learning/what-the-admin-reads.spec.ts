import 'reflect-metadata';
import { LearningService, EVERYONE } from './learning.service';
import { LearningController } from './learning.controller';
import { plainLearningRows } from './what-the-admin-reads';
import { PlatformAdminGuard } from '../../common/guards/platform-admin.guard';

const row = (o: any) => ({ scope: EVERYONE, kind: 'PATTERN', key: 'M1', judged: 12, goodCount: 3, badCount: 8, unsureCount: 1, answeredCount: 9, talkDue: 12, talkHappened: 7, changeJudged: 5, changedCount: 2, suggestedWeight: 0.6, weightMoved: true, ...o });

describe('what the platform admin reads', () => {
  it('says each pattern, step and question in full sentences, with its counts and weight', () => {
    const rows = plainLearningRows([
      row({}),
      row({ kind: 'COACHING_STEP', key: 'Say what you tried next.', judged: 4, goodCount: 1, badCount: 2, unsureCount: 1, talkDue: 6, talkHappened: 4, suggestedWeight: 1, weightMoved: false }),
      row({ kind: 'PROBE', key: 'situation:PERFORMANCE', judged: 14, goodCount: 11, badCount: 2, unsureCount: 1, suggestedWeight: 1.4 }),
    ]);
    const text = rows.map((r) => [r.kind, r.what, ...r.counts, r.weightSaid].join('\n')).join('\n\n');
    expect(text).toContain('Delivers what was agreed, with proof');
    expect(text).toContain('Leads marked it right 3 times, wrong 8 times and not sure 1 time.');
    expect(text).toContain('Leads had the conversation in 7 of 12 cases.');
    expect(text).toContain('Suggested weight 0.6, where 1 is neutral. This is a suggestion only and is not used yet.');
    expect(text).toContain('Suggested weight 1, which is neutral. It stays there until at least 10 signals are in, and there are 4 so far.');
    expect(text).toContain('The questions written for the situation "performance"');
    expect(text).not.toMatch(/\bM1\b|→|\s—\s/);
    for (const r of rows) for (const s of [...r.counts, r.weightSaid]) expect(s).toMatch(/\.$/);
  });

  function svc(rows: any[]) {
    const findMany = jest.fn(async (a: any) => rows.filter((r) => r.scope === a.where.scope));
    return { s: new LearningService({ learningSignalCount: { findMany } } as any), findMany };
  }

  it('a platform admin is given the total, never an organisation row, and nothing carries an organisation beside it', async () => {
    const { s, findMany } = svc([row({}), row({ scope: 'org-a', key: 'D1' })]);
    const out = await s.readFor({ isPlatformAdmin: true, organizationId: 'org-b' });
    expect(findMany.mock.calls[0][0].where.scope).toBe(EVERYONE);
    expect(out).toHaveLength(1);
    expect(JSON.stringify(out)).not.toMatch(/org-a|org-b|scope|organi[sz]ation/i);
  });

  it("an organisation's own admin reads only their own organisation's counts", async () => {
    const { s, findMany } = svc([row({}), row({ scope: 'org-a', key: 'D1' }), row({ scope: 'org-b', key: 'B1' })]);
    const out = await s.readFor({ isPlatformAdmin: false, organizationId: 'org-a' });
    expect(findMany.mock.calls[0][0].where.scope).toBe('org-a');
    expect(out).toHaveLength(1);
    expect(await s.readFor({ isPlatformAdmin: false, organizationId: null })).toEqual([]);
  });

  it('the platform route is behind the platform admin guard', () => {
    const guards = Reflect.getMetadata('__guards__', LearningController.prototype.total) ?? [];
    expect(guards).toContain(PlatformAdminGuard);
  });
});
