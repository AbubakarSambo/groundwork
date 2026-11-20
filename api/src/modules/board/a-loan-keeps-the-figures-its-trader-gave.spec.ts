import { theRecordsPrompt, onlyRecordsTheLinesSay } from './the-kind-of-work';

/**
 * A LOAN KEEPS THE FIGURES ITS TRADER GAVE (pilot, build order 3). The loans board draws what each trader said in their own check-in.
 * The instruction to the model names the labels the board reads, only for an asset loans cohort, and what a line gives under those
 * labels is kept on the loan word for word, with nothing worked out.
 */
describe('the records prompt for an asset loans cohort', () => {
  it('names the labels the loans board reads, and says to give only what the line says', () => {
    const p = theRecordsPrompt('asset loans');
    for (const label of ['Business', 'Place', 'Sales', 'Repayment', 'In the way', 'Next step']) expect(p).toContain(label);
    expect(p).toContain('never a figure added up from several lines');
  });
  it('is not given to any other kind of work', () => {
    expect(theRecordsPrompt('support desk')).not.toContain('In the way');
    expect(theRecordsPrompt('sales team')).not.toContain('Repayment (how');
  });
});

describe('a loan line read into a record', () => {
  const lines = [{ id: 'l1', participantId: 'p-achieng', text: 'My freezer loan is on time and I sold KES 38,000 in the last four weeks. Nothing is in the way.' }];
  it('keeps each detail as the line gave it, and no figure the line did not give', () => {
    const kept = onlyRecordsTheLinesSay('asset loans', [
      { lineId: 'l1', kind: 'loan', name: 'freezer loan', stage: 'Repaying', details: [{ label: 'Sales', value: 'KES 38,000 in the last four weeks' }, { label: 'Repayment', value: 'on time' }, { label: 'In the way', value: 'Nothing' }] },
    ], lines, null, []);
    expect(kept).toHaveLength(1);
    expect(kept[0].fields).toEqual({ Sales: 'KES 38,000 in the last four weeks', Repayment: 'on time', 'In the way': 'Nothing' });
    expect(kept[0].stage).toBe('Repaying');
    expect(kept[0].ownerParticipantId).toBe('p-achieng');
  });
});
