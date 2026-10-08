import { readFileSync } from 'fs';
import { join } from 'path';
import { theActivationFunnel, ENGAGEMENT_SENDERS } from './the-activation-funnel';
import { WHAT_EACH_MAIL_IS } from '../email/nothing-goes-out-that-was-turned-off';

/**
 * THE ACTIVATION FUNNEL (engagement spec sections 2, 34 and 35), as the Groundwork team reads it on the usage tab. Counts only; no person and no word anybody said.
 * The queries are asked of a double that answers by the shape of the question, so what is checked is what is asked: which check-ins are counted for which stage,
 * that our own organisations are never counted, and that mail that was stopped on purpose is not counted as mail nobody answered.
 */
const NOW = new Date('2026-10-09T10:00:00Z');
function world() {
  const asked: any[] = [];
  const prisma: any = {
    ground: {
      count: jest.fn(async ({ where }: any) => {
        asked.push(where);
        const j = JSON.stringify(where);
        if (j.includes('"participants":{"none"')) return 4; // a test
        if (j.includes('"checkIns":{"none"') && j.includes('"report":{"releasedAt":{"not":null,"lte"')) return 5; // abandoned after value
        if (j.includes('"checkIns":{"none"')) return 6; // abandoned before value
        if (j.includes('"sessionNumber":{"gte":2}')) return 9; // a second round
        if (j.includes('"commitments"')) return 11; // lead acted
        if (j.includes('"releasedAt":{"not":null}')) return 13; // first insight
        if (j.includes('"report":{"isNot":null}')) return 15; // enough to report
        if (j.includes('"checkIns":{"some":{"isSetup":false,"ground":{"organization":{"isInternal":false}},"status":"COMPLETED","participant"')) return 20; // first response
        if (j.includes('"participants":{"some"')) return 30; // people added
        if (j.includes('"recently"') || j.includes('"startedAt":{"gte"')) return 40; // active
        return 50; // created
      }),
    },
    $queryRaw: jest.fn(async () => [{ n: 7 }]),
    notification: { groupBy: jest.fn(async () => [{ outcome: 'sent', _count: { id: 12 } }, { outcome: 'suppressed', _count: { id: 5 } }, { outcome: 'held', _count: { id: 2 } }, { outcome: 'failed', _count: { id: 1 } }]) },
  };
  return { prisma, asked };
}

describe('how far each customer check-in got', () => {
  it('counts each stage in order, and a stage is never more than the one before it was asked of', async () => {
    const w = world();
    const f = await theActivationFunnel(w.prisma, null, NOW);
    expect(f.reached).toEqual({ created: 50, peopleAdded: 30, firstResponse: 20, enoughToReport: 15, firstInsight: 13, leadActed: 11, secondRound: 9 });
    expect(f.leadsWhoCameBack).toBe(7);
  });
  it('reads where each is now: a test, abandoned before value, abandoned after value, active', async () => {
    const f = await theActivationFunnel(world().prisma, null, NOW);
    expect(f.now).toEqual({ test: 4, abandonedBeforeValue: 6, abandonedAfterValue: 5, active: 40 });
  });
  it('never counts our own organisations, in any question', async () => {
    const w = world();
    await theActivationFunnel(w.prisma, null, NOW);
    expect(w.asked.length).toBeGreaterThanOrEqual(10);
    for (const where of w.asked) expect(JSON.stringify(where)).toContain('"organization":{"isInternal":false}');
  });
  it('a test is a check-in a week old or more, with nobody but the lead ever added', async () => {
    const w = world();
    await theActivationFunnel(w.prisma, null, NOW);
    const test = w.asked.find((x) => JSON.stringify(x).includes('"participants":{"none"'));
    expect(test.createdAt.lte).toEqual(new Date('2026-10-02T10:00:00Z'));
    expect(test.participants).toEqual({ none: { partyType: 'PARTICIPANT' } });
  });
  it('is asked only of the range given', async () => {
    const w = world();
    const since = new Date('2026-09-01T00:00:00Z');
    await theActivationFunnel(w.prisma, since, NOW);
    for (const where of w.asked) expect(JSON.stringify(where)).toContain('2026-09-01');
  });
});

describe('mail that was not sent is not mail nobody answered', () => {
  it('keeps what was stopped on purpose and what was held apart from what was delivered', async () => {
    const f = await theActivationFunnel(world().prisma, null, NOW);
    expect(f.emails).toEqual({ delivered: 12, failed: 1, held: 2, notSentOnPurpose: 5 });
  });
  it('counts only the mail Groundwork decides to send, and every sender it names exists', () => {
    for (const s of ENGAGEMENT_SENDERS) expect(Object.keys(WHAT_EACH_MAIL_IS)).toContain(s);
  });
});

describe('where the team reads it', () => {
  it('is on the usage funnel the usage tab asks for', () => {
    const src = readFileSync(join(__dirname, '..', 'prompts', 'prompts.service.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(src).toContain('theActivationFunnel(this.prisma, since, now).catch(() => null)');
    expect(src.slice(src.indexOf('async usageFunnel'), src.indexOf('async platformDashboard'))).toMatch(/avgDaysToFirstCheckin,\s*activation,/);
  });
});
