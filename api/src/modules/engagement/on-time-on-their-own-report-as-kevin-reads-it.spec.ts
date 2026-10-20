import { onTimeForThemselves } from './who-answers-and-when';
import { theNightRunsDatabase, N } from './the-night-run-bed';

/**
 * "YOU CHECKED IN ON TIME TODAY, 6 DAYS RUNNING." ON KEVIN'S OWN REPORT (nudges that get answers, 20 October 2026), from the second night
 * run (gw_night_run2). Kevin answered every session from Monday 12 to Monday 19 October at about two in the afternoon in Nairobi, on the
 * day each opened. Served on GET /check-ins/:id/session-report, which serves a session's report to the person who wrote it and nobody else.
 */
const DROP = N.drop.ground.id;
const KEVIN = '9f2e58a4-06d8-4a0a-bddc-03cd96df027c';
const JOSEPH = '2274e6af-8d37-4388-bd39-8a7aeb582d7b';
const dated = (db: any) => { const rows = (N.drop.checkIns as any[]).map((c) => ({ ...c, completedAt: c.completedAt && new Date(c.completedAt), availableFrom: c.availableFrom && new Date(c.availableFrom), createdAt: new Date(c.createdAt) })); db.checkIn.findMany = jest.fn(async ({ where }: any) => rows.filter((c) => c.participantId === where.participantId)); return db; };

describe('Kevin’s own report, with the direct morning on', () => {
  it('on Monday afternoon, after his check-in, he reads that he checked in on time today, 6 days running', async () => {
    expect(await onTimeForThemselves(dated(theNightRunsDatabase('drop', { directMorning: true })), DROP, KEVIN, new Date('2026-10-19T12:00:00Z'))).toBe('You checked in on time today, 6 days running.');
  });
  it('on Tuesday morning, before he answers, he reads it of yesterday', async () => {
    expect(await onTimeForThemselves(dated(theNightRunsDatabase('drop', { directMorning: true })), DROP, KEVIN, new Date('2026-10-20T06:00:00Z'))).toBe('You checked in on time yesterday, 6 days running.');
  });
  it('Joseph, whose last session was closed by the clock, is credited with nothing, and told nothing about it here', async () => {
    expect(await onTimeForThemselves(dated(theNightRunsDatabase('drop', { directMorning: true })), DROP, JOSEPH, new Date('2026-10-20T06:00:00Z'))).toBeNull();
  });
});

describe('with the direct morning off', () => {
  it('nothing is said', async () => {
    expect(await onTimeForThemselves(dated(theNightRunsDatabase('drop', { directMorning: false })), DROP, KEVIN, new Date('2026-10-19T12:00:00Z'))).toBeNull();
  });
});

describe('only the person whose report it is', () => {
  it('the route reads the check-in as its owner’s before it says anything', () => {
    const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'conversation', 'conversation.service.ts'), 'utf8');
    const at = src.indexOf('async getSessionReport(');
    const body = src.slice(at, src.indexOf('\n  }\n', at));
    expect(body.indexOf('this.loadOwnedCheckIn(checkInId, requestingUserId)')).toBeGreaterThan(0);
    expect(body.indexOf('this.loadOwnedCheckIn(checkInId, requestingUserId)')).toBeLessThan(body.indexOf('onTimeForThemselves('));
    expect(body).toContain('onTimeForThemselves(this.prisma, row?.groundId ?? null, checkIn.participantId)');
  });
});
