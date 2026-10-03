import { BISI, SALES_RUN, boardAs, handoff, type Setup } from './the-switchboards-sections-harness';
import { whatItIsHoldingUp } from './the-blockers';

/**
 * The onboarding board's wording faults that sit in the engine (third review, "Engagement Director, first 90 days").
 * Each case failed before this change.
 */
describe('onboarding: the wording faults', () => {
  it('a wait cleared on the day it was raised is never "0 days in all"', async () => {
    const same: Setup = {
      ...SALES_RUN,
      dependencies: [handoff('d-1', 'p-ngozi', 'the Head of Credit\'s reply', {
        onLabel: 'the Head of Credit', status: 'CLEARED', createdAt: new Date('2026-09-02T09:00:00Z'), clearedAt: new Date('2026-09-02T15:00:00Z'),
      })],
    };
    const b = await boardAs(same, ...BISI);
    const says = (b.whoWaitedOnWhom ?? []).map((w: any) => w.says);
    expect(says).toEqual(['Ngozi Eze waited on the Head of Credit for the Head of Credit\'s reply on 2 September, and it was cleared the same day.']);
    expect(JSON.stringify(says)).not.toMatch(/0 days/);
  });

  it('questions that would go to somebody are not given "you will"', () => {
    const line = whatItIsHoldingUp('questions about client needs and contract details would go to Tobi', null, 'You');
    expect(line).toBe('Once it is cleared, questions about client needs and contract details would go to Tobi.');
    expect(line).not.toMatch(/you will questions/i);
  });
});
