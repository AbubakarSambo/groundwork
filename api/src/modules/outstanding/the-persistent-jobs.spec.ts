import { advanceOneJob, advanceThePersistentJobs, coverageOf, ensureThePrincipalsJobs, THE_TWO_JOBS } from './the-persistent-jobs';
import { anOrganisationForAnExecutive, ORG } from './an-organisation-for-an-executive';
import * as fs from 'fs';
import * as path from 'path';

const NOW = new Date('2026-11-10T09:00:00Z');
const day = (d: number) => new Date(NOW.getTime() - d * 86_400_000);

describe('each principal has two standing jobs, made once', () => {
  it('creates both with the names the spec gives, a default year-end deadline, and her as the one who may act', async () => {
    const o = anOrganisationForAnExecutive(NOW);
    await ensureThePrincipalsJobs(o.prisma, { organizationId: ORG, principalUserId: 'u-fatima', now: NOW });
    const rows = o.tables.persistentJob.rows;
    expect(rows.map((r: any) => r.title)).toEqual(['2026 annual report and presentation', '2026 outstanding matters and 2027 carry-forward register']);
    expect(rows.map((r: any) => r.kind)).toEqual(['annual_report', 'outstanding_register']);
    expect(rows[0]).toMatchObject({ state: 'collecting', authorisedActorUserId: 'u-fatima' });
    expect((rows[0].deadline as Date).toISOString().slice(0, 10)).toBe('2026-12-31');
    expect(THE_TWO_JOBS(2026).map((j) => j.title)).toEqual(rows.map((r: any) => r.title));
  });

  it('asking for them again, or on the first question, makes no second copy', async () => {
    const o = anOrganisationForAnExecutive(NOW);
    await ensureThePrincipalsJobs(o.prisma, { organizationId: ORG, principalUserId: 'u-fatima', now: NOW });
    await ensureThePrincipalsJobs(o.prisma, { organizationId: ORG, principalUserId: 'u-fatima', now: NOW });
    jest.useFakeTimers({ now: NOW, doNotFake: ['nextTick', 'setImmediate', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'queueMicrotask'] });
    await o.says('u-fatima', 'What is outstanding?');
    jest.useRealTimers();
    expect(o.tables.persistentJob.rows).toHaveLength(2);
  });

  it('is created on the first ask, with no form', async () => {
    const o = anOrganisationForAnExecutive(NOW);
    expect(o.tables.persistentJob.rows).toHaveLength(0);
    jest.useFakeTimers({ now: NOW, doNotFake: ['nextTick', 'setImmediate', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'queueMicrotask'] });
    await o.says('u-fatima', 'What needs my decision?');
    jest.useRealTimers();
    expect(o.tables.persistentJob.rows).toHaveLength(2);
  });
});

describe('a job is recomputed from the record, so a restart loses nothing', () => {
  it('records coverage by month, workstream and person, and says what to do next', async () => {
    const o = anOrganisationForAnExecutive(NOW);
    await ensureThePrincipalsJobs(o.prisma, { organizationId: ORG, principalUserId: 'u-fatima', now: NOW });
    expect(await advanceThePersistentJobs(o.prisma, NOW)).toBe(2);
    const [report, register] = o.tables.persistentJob.rows;
    expect(report.coverage.months).toMatchObject({ '2026-10': expect.any(Number), '2026-11': expect.any(Number) });
    expect(report.coverage.workstreams).toMatchObject({ 'Ministry engagement': expect.any(Number) });
    expect(report.coverage.people).toMatchObject({ 'Amina Yusuf': expect.any(Number) });
    expect(report.coverage.gaps).toContain('2026-01');
    /* Readiness follows the plan (30.4): a draft can go as soon as the record holds something, and what is missing is said plainly in it and asked for meanwhile. */
    expect(report.state).toBe('draft_ready');
    expect(report.nextAction).toBe('The draft can be sent, with what is verified and what is still unconfirmed said plainly. Still to do: ask Ibrahim Sule (You said "File the quarterly assembly summary" is done. What was it, who got it, and on which day?); find out who owns "Chase the audit letter"; ask the team for anything from January, February, March, April, May, June, July, August and September, which the record does not cover yet.');
    expect(register.state).toBe('draft_ready');
    expect(register.nextAction).toBe('The draft can be sent, with what is verified and what is still unconfirmed said plainly. Still to do: ask Ibrahim Sule (You said "File the quarterly assembly summary" is done. What was it, who got it, and on which day?); find out who owns "Chase the audit letter".');
  });

  it('running it twice, or after a restart, changes nothing and moves no contact date', async () => {
    const o = anOrganisationForAnExecutive(NOW);
    await ensureThePrincipalsJobs(o.prisma, { organizationId: ORG, principalUserId: 'u-fatima', now: NOW });
    await advanceThePersistentJobs(o.prisma, NOW);
    const first = JSON.stringify(o.tables.persistentJob.rows.map((r: any) => ({ s: r.state, n: r.nextAction, c: r.coverage, m: r.lastMeaningfulContactAt })));
    /* A restart: nothing but the database survives. A later night, with nothing new. */
    await advanceThePersistentJobs(o.prisma, new Date(NOW.getTime() + 3 * 86_400_000));
    expect(JSON.stringify(o.tables.persistentJob.rows.map((r: any) => ({ s: r.state, n: r.nextAction, c: r.coverage, m: r.lastMeaningfulContactAt })))).toBe(first);
    expect(o.tables.persistentJob.rows).toHaveLength(2);
  });

  it('silence is not progress: with nothing arriving for days the job does not finish itself, and with nothing on the record at all it keeps collecting', async () => {
    const o = anOrganisationForAnExecutive(NOW);
    await ensureThePrincipalsJobs(o.prisma, { organizationId: ORG, principalUserId: 'u-fatima', now: NOW });
    for (let d = 0; d < 7; d += 1) await advanceThePersistentJobs(o.prisma, new Date(NOW.getTime() + d * 86_400_000));
    expect(o.tables.persistentJob.rows.every((r: any) => r.state === 'draft_ready')).toBe(true);
    const empty = anOrganisationForAnExecutive(NOW);
    for (const k of Object.keys(empty.tables)) if (/commitment|dependency|obligation|todo|request/i.test(k)) (empty.tables as any)[k].rows.length = 0;
    await ensureThePrincipalsJobs(empty.prisma, { organizationId: ORG, principalUserId: 'u-fatima', now: NOW });
    await advanceThePersistentJobs(empty.prisma, NOW);
    expect(empty.tables.persistentJob.rows.map((r: any) => [r.state, r.nextAction])).toEqual([['collecting', 'Wait for the first check-in or document, and ask nobody until then.'], ['collecting', 'Wait for the first check-in or document, and ask nobody until then.']]);
  });

  it('new evidence moves the last meaningful contact and the next action', async () => {
    const o = anOrganisationForAnExecutive(NOW);
    await ensureThePrincipalsJobs(o.prisma, { organizationId: ORG, principalUserId: 'u-fatima', now: NOW });
    await advanceThePersistentJobs(o.prisma, NOW);
    const before = new Date(o.tables.persistentJob.rows[1].lastMeaningfulContactAt).getTime();
    o.tables.groundCommitment.rows.push({ id: 'c-new', groundId: 'g-ministry', participantId: 'gp-amina', text: 'Book the ministry courtesy visit', action: 'Amina Yusuf books the ministry courtesy visit.', whenSaid: null, status: 'UNKNOWN', source: 'CHECK_IN', settledBy: null, settledAt: null, createdAt: new Date(NOW.getTime() + 86_400_000), updatedAt: new Date(NOW.getTime() + 86_400_000) });
    await advanceThePersistentJobs(o.prisma, new Date(NOW.getTime() + 2 * 86_400_000));
    expect(new Date(o.tables.persistentJob.rows[1].lastMeaningfulContactAt).getTime()).toBeGreaterThan(before);
  });

  it('one job failing does not stop the next', async () => {
    const o = anOrganisationForAnExecutive(NOW);
    await ensureThePrincipalsJobs(o.prisma, { organizationId: ORG, principalUserId: 'u-fatima', now: NOW });
    const jobs = o.tables.persistentJob.rows;
    let calls = 0;
    const real = o.tables.persistentJob.update;
    o.tables.persistentJob.update = async (a: any) => { calls += 1; if (calls === 1) throw new Error('database blip'); return real(a); };
    expect(await advanceThePersistentJobs(o.prisma, NOW)).toBe(1);
    expect(jobs[1].lastCheckedAt).toEqual(NOW);
  });

  it('coverage names the months with nothing in them', () => {
    const c = coverageOf([{ at: day(40), kind: 'commitment', workstream: 'A', owner: 'Amina Yusuf' }], NOW);
    expect(c.gaps).toContain('2026-01');
    expect(c.gaps).not.toContain('2026-10');
    expect(advanceOneJob).toBeDefined();
  });
});

describe('the nightly pass is on the schedule, once across copies', () => {
  it('is wired in the grounds cron', () => {
    const src = fs.readFileSync(path.join(__dirname, '../grounds/grounds.cron.ts'), 'utf8');
    expect(src).toMatch(/@Cron\('15 4 \* \* \*'[^)]*\)\s*async advanceThePrincipalsJobs\(\)/);
    expect(src).toContain("onceAcrossCopies(this.prisma, 'advance-the-principals-jobs'");
  });
});
