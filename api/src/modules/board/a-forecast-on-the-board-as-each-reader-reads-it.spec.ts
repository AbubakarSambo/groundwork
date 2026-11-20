import { GroundScenario } from '@prisma/client';
import { BISI, FEMI, JUMA, KWAME, SALES_RUN, SETUP_ADMIN, A_RELEASED_REPORT, boardAs, type Setup } from './the-switchboards-sections-harness';
import { WHAT_A_FORECAST_CANNOT_TELL_YOU } from './the-switchboards-own-sections';

/**
 * A FORECAST, AS EACH READER READS IT (request 70, the switchboard's "Forecast": where the numbers are
 * likely to end up). On the sales run's own targets: the team's 40 approved facilities and Kwame's own 14.
 * Only a team number is forecast, from the counts stored when each session closed, carried forward in a
 * straight line, and only for a reader who is already served the target. Never on an evaluation check-in.
 */
const target = (id: string, name: string, n: number, count: number, more: Record<string, any> = {}) => ({
  id, groundId: 'g-1', name, target: n, count, prevCount: count, ownerParticipantId: null, setByParticipantId: 'p-bisi', sortOrder: 0, addedAtSession: null, ...more,
});
const WITH_TARGETS: Setup = {
  ...SALES_RUN,
  objectives: [
    target('o-team', 'Approved facilities this quarter', 40, 11, { direction: 'AIM' }),
    target('o-kwame', 'Approved facilities for Kwame this quarter', 14, 3, { ownerParticipantId: 'p-kwame', direction: 'AIM' }),
  ],
  snapshots: [
    { objectiveId: 'o-team', sessionNumber: 1, count: 6 } as any, { objectiveId: 'o-team', sessionNumber: 2, count: 11 } as any,
    { objectiveId: 'o-kwame', sessionNumber: 1, count: 1 } as any, { objectiveId: 'o-kwame', sessionNumber: 2, count: 3 } as any,
  ],
};
const TEAMS = {
  objectiveId: 'o-team',
  says: 'If it keeps moving at the pace it has since check-in 1, it would be about 21 by check-in 4, against an aim of 40.',
  restsOn: 'It was 6 in check-in 1 and 11 in check-in 2, and this check-in runs for 4 check-ins.',
  cannotTellYou: WHAT_A_FORECAST_CANNOT_TELL_YOU,
};

describe('A forecast, as each person reads it', () => {
  for (const [who, reader, setup] of [
    ['Bisi, who runs it', BISI, WITH_TARGETS],
    ['the admin who set it up', SETUP_ADMIN, { ...WITH_TARGETS, createdByUserId: 'u-setup' }],
    /* A person who checks in reads the forecast as part of the team's picture, once it is shared (request 105). */
    ['Femi, taking part where everybody sees the targets, once the report is shared', FEMI, { ...WITH_TARGETS, whoSeesTargets: 'EVERYBODY', report: A_RELEASED_REPORT }],
  ] as const) {
    it(`${who} reads the team's forecast, and never one about Kwame alone`, async () => {
      const b = await boardAs(setup, reader[0], reader[1]);
      expect(b.forecast).toHaveLength(1);
      expect(b.forecast[0]).toMatchObject(TEAMS);
      expect(b.forecast[0].about).toBe(b.objectives.find((o: any) => o.id === 'o-team').name);
      expect(JSON.stringify(b.forecast)).not.toMatch(/Kwame|14/);
    });
  }

  it('Kwame does not read a forecast of his own number either', async () => {
    const b = await boardAs({ ...WITH_TARGETS, whoSeesTargets: 'EVERYBODY', report: A_RELEASED_REPORT }, ...KWAME);
    expect(b.forecast.map((f: any) => f.objectiveId)).toEqual(['o-team']);
  });

  it('before the team picture is shared, a person who checks in reads no forecast (request 105)', async () => {
    expect((await boardAs({ ...WITH_TARGETS, whoSeesTargets: 'EVERYBODY' }, ...FEMI)).forecast).toBeUndefined();
    expect((await boardAs({ ...WITH_TARGETS, whoSeesTargets: 'EVERYBODY' }, ...KWAME)).forecast).toBeUndefined();
  });

  it('where people see only their own targets, a person reads no forecast, because it says the aim (decision 73)', async () => {
    expect((await boardAs(WITH_TARGETS, ...FEMI)).forecast).toBeUndefined();
    expect((await boardAs(WITH_TARGETS, ...KWAME)).forecast).toBeUndefined();
  });

  /* Decision 86 reverses decision 73 for admins: this used to pin that an admin who only reads read no forecast. */
  it('an admin who only reads reads the same forecast as Bisi, as in the weekly report', async () => {
    const asJuma = (await boardAs(WITH_TARGETS, ...JUMA)).forecast;
    expect(asJuma).toBeDefined();
    expect(asJuma).toEqual((await boardAs(WITH_TARGETS, ...BISI)).forecast);
    expect(asJuma[0].says).toBe('If it keeps moving at the pace it has since check-in 1, it would be about 21 by check-in 4, against an aim of 40.');
  });

  it('a limit is read as a limit, and a number that has not moved says so', async () => {
    const b = await boardAs({
      ...WITH_TARGETS,
      objectives: [target('o-team', 'Bad debt written off this quarter', 5, 2, { direction: 'LIMIT' })],
      snapshots: [{ objectiveId: 'o-team', sessionNumber: 1, count: 2 } as any, { objectiveId: 'o-team', sessionNumber: 3, count: 2 } as any],
    }, ...BISI);
    expect(b.forecast[0].says).toBe('It has not moved since check-in 1, so if nothing changes it would still be 2 by check-in 4, against a limit of 5.');
  });

  it('is never served on an evaluation check-in, to anybody', async () => {
    const evaluation: Setup = { ...WITH_TARGETS, scenario: GroundScenario.PIP, createdByUserId: 'u-setup' };
    expect((await boardAs(evaluation, ...BISI)).forecast).toBeUndefined();
    expect((await boardAs(evaluation, ...SETUP_ADMIN)).forecast).toBeUndefined();
    expect((await boardAs(evaluation, ...KWAME)).forecast).toBeUndefined();
  });

  it('is left out with only one session counted, or once the last session has been counted', async () => {
    expect((await boardAs({ ...WITH_TARGETS, snapshots: [{ objectiveId: 'o-team', sessionNumber: 1, count: 6 } as any] }, ...BISI)).forecast).toBeUndefined();
    expect((await boardAs({ ...WITH_TARGETS, snapshots: [{ objectiveId: 'o-team', sessionNumber: 1, count: 6 } as any, { objectiveId: 'o-team', sessionNumber: 4, count: 30 } as any] }, ...BISI)).forecast).toBeUndefined();
  });

  it('no sentence rates or labels anybody', async () => {
    expect(JSON.stringify((await boardAs(WITH_TARGETS, ...BISI)).forecast)).not.toMatch(/at risk|behind|failing|score|rating|verdict|on track|off track/i);
  });
});
