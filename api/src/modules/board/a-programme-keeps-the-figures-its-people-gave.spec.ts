import { theRecordsPrompt, onlyRecordsTheLinesSay } from './the-kind-of-work';

/**
 * A PROGRAMME KEEPS THE FIGURES ITS PEOPLE GAVE (pilot, programme family). The trader training, government programme and where-next
 * boards draw what people said in their own check-ins. The instruction to the model names the labels each board reads, only for its
 * own kind of work, and what a line gives under those labels is kept word for word, with nothing worked out.
 *
 * The instruction is read from the code by board.listener.ts (theRecordsPrompt). There is no PromptVersion for it, so this file is the
 * version that runs.
 */
const LABELS: Record<string, string[]> = {
  'trader training programme': ['County', 'Group size', 'Women', 'Attended', 'Completed', 'Reached', 'Drop-off', 'Why missed', 'Budget spent', 'Cost per trainee', 'Next step'],
  'a government programme': ['County', 'Reached', 'Activity', 'In the way'],
  'MarketView where next': ['Theme', 'Would pay', 'Next step'],
};

describe('the records prompt for the programme family', () => {
  it.each(Object.entries(LABELS))('%s names the labels its board reads, and says to give only what the line says', (kind, labels) => {
    const p = theRecordsPrompt(kind as any);
    for (const l of labels) expect(p).toContain(l);
    expect(p).toContain('never a figure added up from several lines or worked out');
    expect(p).toContain('Leave out anything the line does not say.');
  });
  it('gives each kind only its own labels, and gives none to any other kind', () => {
    expect(theRecordsPrompt('trader training programme')).not.toContain('Would pay');
    expect(theRecordsPrompt('a government programme')).not.toContain('Cost per trainee');
    expect(theRecordsPrompt('MarketView where next')).not.toContain('Group size');
    for (const k of ['sales team', 'asset loans', 'support desk', 'engineering release', 'a law firm matter'] as const) {
      const p = theRecordsPrompt(k);
      expect(p).not.toContain('Cost per trainee');
      expect(p).not.toContain('Would pay');
      expect(p).not.toContain('Activity (the work done');
    }
  });
});

describe('a group line read into a record', () => {
  const lines = [{ id: 'l1', participantId: 'p-achieng', text: 'Kondele women traders in Kisumu has 42 people, 26 are women. 38 came to session 2. Market day moved.' }];
  it('keeps each detail as the line gave it, and no figure the line did not give', () => {
    const kept = onlyRecordsTheLinesSay('trader training programme', [
      { lineId: 'l1', kind: 'group', name: 'Kondele women traders', details: [{ label: 'County', value: 'Kisumu' }, { label: 'Group size', value: '42' }, { label: 'Women', value: '26 of 42' }, { label: 'Attended', value: '38 of 42 at session 2' }, { label: 'Why missed', value: 'market day moved' }] },
    ], lines, null, []);
    expect(kept).toHaveLength(1);
    expect(kept[0].fields).toEqual({ County: 'Kisumu', 'Group size': '42', Women: '26 of 42', Attended: '38 of 42 at session 2', 'Why missed': 'market day moved' });
    expect(kept[0].ownerParticipantId).toBe('p-achieng');
  });
});
