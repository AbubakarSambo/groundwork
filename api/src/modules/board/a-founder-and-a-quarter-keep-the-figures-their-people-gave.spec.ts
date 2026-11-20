import { theRecordsPrompt, onlyRecordsTheLinesSay, itemKindsFor } from './the-kind-of-work';

/**
 * A FOUNDER AND A QUARTER KEEP THE FIGURES THEIR PEOPLE GAVE (pilot, number-tracking family). The founder's and the MarketView Q4 boards
 * draw what people said in their own check-ins. The instruction to the model names the labels each board reads, only for its own kind of
 * work, and what a line gives under those labels is kept word for word, with nothing worked out.
 *
 * The instruction is read from the code by board.listener.ts (theRecordsPrompt). No PromptVersion overrides it, so this file is the
 * version that runs.
 */
const LABELS: Record<string, string[]> = {
  "founder's own check-in": ['Money', 'Runway', 'Each week', 'Next step'],
  'MarketView Q4': ['Said', 'Goal', 'Source', 'kind "metric"'],
};

describe('the records prompt for the founder and the quarter', () => {
  it.each(Object.entries(LABELS))('%s names the labels its board reads, and says to give only what the line says', (kind, labels) => {
    const p = theRecordsPrompt(kind as any);
    for (const l of labels) expect(p).toContain(l);
    expect(p).toContain('never a figure added up from several lines or worked out');
    expect(p).toContain('Leave out anything the line does not say.');
  });
  it('gives each kind only its own labels, and none to any other kind', () => {
    expect(theRecordsPrompt("founder's own check-in")).not.toContain('Goal (');
    expect(theRecordsPrompt('MarketView Q4')).not.toContain('Runway');
    for (const k of ['sales team', 'asset loans', 'support desk', 'trader training programme', 'a government programme', 'a law firm matter'] as const) {
      const p = theRecordsPrompt(k);
      expect(p).not.toContain('Runway (');
      expect(p).not.toContain('Goal (the goal');
    }
  });
  it('a quarter may keep a metric as well as a subscription', () => {
    expect(itemKindsFor('MarketView Q4')).toEqual(['subscription', 'metric']);
  });
});

describe('a metric line read into a record', () => {
  const lines = [{ id: 'l1', participantId: 'p-otieno', text: 'We are at 31 paid subscriptions on Paystack and the goal is 40 this quarter.' }];
  it('keeps each detail as the line gave it, and no figure the line did not give', () => {
    const kept = onlyRecordsTheLinesSay('MarketView Q4', [
      { lineId: 'l1', kind: 'metric', name: 'Paid subscriptions', details: [{ label: 'Said', value: '31' }, { label: 'Goal', value: '40 this quarter' }, { label: 'Source', value: 'Paystack' }] },
    ], lines, null, []);
    expect(kept).toHaveLength(1);
    expect(kept[0].kind).toBe('metric');
    expect(kept[0].fields).toEqual({ Said: '31', Goal: '40 this quarter', Source: 'Paystack' });
    expect(kept[0].ownerParticipantId).toBe('p-otieno');
  });
});
