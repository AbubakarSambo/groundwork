import { BISI, SALES_RUN, boardAs, type Setup } from './the-switchboards-sections-harness';

/**
 * REQUEST 125, ITEM 2. The lead read "talk Tobi through a goal you set" under "What needs you" and, on the same
 * board, "Tobi has not been told about 2 goals yet" under the team today. Both come from one count now.
 */
const goal = (text: string) => ({ participantId: 'p-kwame', text, awareness: 'NOT_TOLD', authoredBy: 'lead', createdAt: new Date('2026-09-01T09:00:00Z') });
const TWO: Setup = { ...SALES_RUN, personObjectives: [goal('Kwame gets 14 approved facilities this quarter.'), goal('Kwame answers every client within a day.')] };
const ONE: Setup = { ...SALES_RUN, personObjectives: [goal('Kwame gets 14 approved facilities this quarter.')] };

describe('the lead reads one count of the goals not told', () => {
  it('says 2 goals in both places when there are two', async () => {
    const b: any = await boardAs(TWO, ...BISI);
    const action = (b.leadActions ?? []).map((a: any) => a.says).find((s: string) => /not been told/.test(s));
    expect(action).toBe('You need to talk Kwame Mensah through the 2 goals you set for this work, because Kwame Mensah has not been told about them yet.');
    const points = (b.eachPersonToday ?? []).flatMap((r: any) => r.conversationPoints ?? []);
    expect(points.join(' ')).toContain('Kwame Mensah has not been told about 2 goals yet.');
  });

  it('says one goal in both places when there is one', async () => {
    const b: any = await boardAs(ONE, ...BISI);
    const action = (b.leadActions ?? []).map((a: any) => a.says).find((s: string) => /not been told/.test(s));
    expect(action).toContain('through a goal you set');
    const points = (b.eachPersonToday ?? []).flatMap((r: any) => r.conversationPoints ?? []);
    expect(points.join(' ')).toContain('has not been told about this goal yet.');
  });
});
