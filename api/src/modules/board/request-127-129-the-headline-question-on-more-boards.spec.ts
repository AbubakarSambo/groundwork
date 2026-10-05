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

/**
 * THE FOUNDER'S OWN CHECK-IN (request 136, item 1). One person, one aim: "Get to 20 paying customers by December."
 * It was stored with no number, so Wanjiru's board had no answer and no bar at all — the one number she is running
 * her company by was the one thing her board could not show her. The number is in the aim's own name.
 */
describe('the founder reads her own number', () => {
  /* What this shows is the board once the aim holds its number. That the number is read out of the name at all is
     theCountTheNameAimsAt's own test, and the stored row on her board is put right by rule 3 of
     journey/bring-a-check-in-up-to-date.ts, which has its own. */
  it('asks the question with its figure, and draws the bar', async () => {
    const s: Setup = { ...SALES_RUN, scenario: GroundScenario.NEW_PROJECT, clock, objectives: [aim('Get to 20 paying customers by December.', 20, 11)] as any };
    const b: any = await boardAs(s, ...BISI);
    expect(b.headline.question).toContain('20 paying customers');
    expect(b.headline.answer).not.toBeNull();
    expect(b.headline.bars).toHaveLength(1);
  });
});
