import { readFileSync } from 'fs';
import { join } from 'path';
import { theActivationFunnel, theParticipantStages, ENGAGEMENT_SENDERS } from './the-activation-funnel';
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

/**
 * THE PEOPLE, NOT THE CHECK-INS (participant activation spec, sections 1, 5 and 6). Where each person added to a customer's check-in stands: invited, reached, verified,
 * engaged, in a habit, and where those who stopped are. The query is asked of a double that answers with the counts the database would give, so what is checked is
 * what is asked (who is counted at all) and how the answer is read.
 */
describe('how far each person got', () => {
  const ROW = { added: 40, invited: 36, reached: 34, verified: 30, engaged: 24, in_a_habit: 9, not_invited: 3, invited_not_verified: 6, verified_never_started: 6, started_not_finished: 2, answered_once_not_returned: 7, went_quiet: 6 };
  function asked(rows: any[] = [ROW]) {
    const queries: string[] = [];
    const prisma: any = { $queryRaw: jest.fn(async (strings: TemplateStringsArray) => { queries.push(strings.join('?')); return rows; }) };
    return { prisma, queries };
  }

  it('reads each stage and where the people who stopped are standing', async () => {
    const f = await theParticipantStages(asked().prisma, null, NOW);
    expect(f.reached).toEqual({ added: 40, invited: 36, reached: 34, verified: 30, engaged: 24, inAHabit: 9 });
    expect(f.stuck).toEqual({ notInvited: 3, invitedNotVerified: 6, verifiedNeverStarted: 6, startedNotFinished: 2, answeredOnceNotReturned: 7, wentQuiet: 6 });
  });

  it('counts only people on customers\' live check-ins: not our own organisations, not the lead, not a person who only manages, not an open link\'s placeholder, not one who left', async () => {
    const w = asked();
    await theParticipantStages(w.prisma, null, NOW);
    const sql = w.queries[0];
    expect(sql).toContain("gp.\"partyType\" = 'PARTICIPANT'");
    expect(sql).toContain('o.is_internal = false');
    expect(sql).toContain('gp.managing_only = false');
    expect(sql).toContain('gp.left_at IS NULL');
    expect(sql).toContain("NOT LIKE '%@unclaimed.invalid'");
    expect(sql).toMatch(/g\.status NOT IN \('STALLED', 'CLOSED', 'RESOLVED', 'AWAITING_APPROVAL'\)/);
    /* Setup turns are not a check-in anybody answered. */
    expect(sql).toContain('is_setup = false');
  });

  it('a person waiting for a seat is not "never invited": the invitation waits for the seat', async () => {
    const w = asked();
    await theParticipantStages(w.prisma, null, NOW);
    expect(w.queries[0]).toContain('invited_at IS NULL AND NOT awaiting_seat');
  });

  it('a bounced or complained invitation is not "reached"', async () => {
    const w = asked();
    await theParticipantStages(w.prisma, null, NOW);
    expect(w.queries[0]).toContain("NOT IN ('BOUNCED', 'COMPLAINED')");
  });

  it('is part of the funnel the usage tab is given, and a failed read counts nobody rather than stopping the funnel', async () => {
    const w = world();
    w.prisma.$queryRaw = jest.fn(async (strings: TemplateStringsArray) => (strings.join('?').includes('ground_participants') ? Promise.reject(new Error('no such table')) : [{ n: 7 }]));
    const f = await theActivationFunnel(w.prisma, null, NOW);
    expect(f.participants.reached.added).toBe(0);
    expect(f.leadsWhoCameBack).toBe(7);
    const ok = world();
    ok.prisma.$queryRaw = jest.fn(async (strings: TemplateStringsArray) => (strings.join('?').includes('ground_participants') ? [ROW] : [{ n: 7 }]));
    expect((await theActivationFunnel(ok.prisma, null, NOW)).participants.reached.verified).toBe(30);
  });

  it('says nothing about any person: counts only', async () => {
    const f = await theParticipantStages(asked().prisma, null, NOW);
    expect(JSON.stringify(f)).not.toMatch(/@|name|email/i);
  });
});
