import { GroundScenario } from '@prisma/client';
import { boardAs, SALES_RUN, BISI, type Setup } from './the-switchboards-sections-harness';

/**
 * Requests 127 and 129: "Engineering release, test" and the support desk had no headline question. The release's aim is
 * stored as a finished state ("All 100 tasks for the release are deployed to production."), and the support desk has
 * an aim with no number and no deadline. The prototype opens both on a question.
 */
const aim = (name: string, n: number | null, count: number) => ({
  id: 'o-1', groundId: 'g-1', name, target: n, count, prevCount: count, ownerParticipantId: null, setByParticipantId: 'p-bisi', sortOrder: 0, addedAtSession: null, assumes: [], direction: 'AIM',
});
const clock = { createdAt: new Date('2026-09-01T09:00:00Z'), timelineDays: 29, cadence: 'WEEKLY' as const };

describe('the headline question, as the lead reads it', () => {
  it('asks a finished state as a question, with the day of the check-in (engineering release)', async () => {
    const s: Setup = { ...SALES_RUN, scenario: GroundScenario.NEW_PROJECT, clock, objectives: [aim('All 100 tasks for the release are deployed to production.', 100, 96)] as any };
    const b: any = await boardAs(s, ...BISI);
    expect(b.headline.question).toBe('Will all 100 tasks for the release be deployed to production by 30 September?');
    expect(b.headline.bars).toHaveLength(1);
  });

  it('asks an aim with no number and no deadline without a day (support desk)', async () => {
    const s: Setup = { ...SALES_RUN, scenario: GroundScenario.NEW_PROJECT, clock: { ...clock, runsUntilEnded: true, timelineDays: 0 } as any, objectives: [aim('Resolve customer issues within a day, without reopening them', null, 0)] as any };
    const b: any = await boardAs(s, ...BISI);
    expect(b.headline.question).toBe('Will we resolve customer issues within a day, without reopening them?');
  });
});

describe('an aim put as a question is the question (request 133, asset loans)', () => {
  it('is asked as the lead put it', async () => {
    const s: Setup = { ...SALES_RUN, scenario: GroundScenario.COHORT_CHECK, clock, objectives: [aim("Is the cohort repaying, and why not where it isn't?", null, 0)] as any };
    const b: any = await boardAs(s, ...BISI);
    expect(b.headline.question).toBe("Is the cohort repaying, and why not where it isn't?");
  });
});
