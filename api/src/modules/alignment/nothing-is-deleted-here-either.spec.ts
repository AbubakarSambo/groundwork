import { readingsThatStand, takeBackTheirReading, theStateAfterwards, sayItIsTakenBack } from './that-is-not-what-i-said';

const two = [
  { by: 'the document', reads: 'A 20% revenue share is payable.' },
  { by: 'Beta Stores', reads: 'Twenty per cent of net, after landed cost.' },
];

describe('nothing is deleted here either', () => {
  it('takes one reading back and leaves the other exactly as it was', () => {
    const out = takeBackTheirReading(two, 'Beta Stores')!;
    expect(out).toHaveLength(2);
    expect(out[0]).toEqual(two[0]);
    expect(out[1].unsaidAt).toBeTruthy();
    expect(out[1].reads).toBe(two[1].reads);
  });

  it('counts only what still stands', () => {
    const out = takeBackTheirReading(two, 'Beta Stores')!;
    expect(readingsThatStand(out).map((r) => r.by)).toEqual(['the document']);
  });

  it('says so rather than reporting success on an unchanged row', () => {
    expect(takeBackTheirReading(two, 'Somebody Else')).toBeNull();
    expect(takeBackTheirReading(null, 'Beta Stores')).toBeNull();
  });

  it('takes back only their own, and only once', () => {
    const twice = [...two, { by: 'Beta Stores', reads: 'Said again later.' }];
    const out = takeBackTheirReading(twice, 'Beta Stores')!;
    expect(out.filter((r) => r.unsaidAt)).toHaveLength(1);
    expect(out[2].unsaidAt).toBeFalsy();
  });

  it('stops calling it a difference once one side has withdrawn from it', () => {
    expect(theStateAfterwards(two, [])).toBe('read differently by each side');
    expect(theStateAfterwards([two[0]], [])).toBe('read from the document');
  });

  it('does not promote it to checked, because nobody newly confirmed anything', () => {
    expect(theStateAfterwards([two[0]], [])).not.toBe('checked by one side');
    expect(theStateAfterwards([two[0]], ['Alpha Foods'])).toBe('checked by one side');
    expect(theStateAfterwards([two[0]], ['Alpha Foods', 'Beta Stores'])).toBe('agreed by both');
  });

  it('tells them it is kept, not erased', () => {
    expect(sayItIsTakenBack('term')).toContain('stays on the record');
    expect(sayItIsTakenBack('reading')).toContain('Nobody else');
    /* Reworded on 5 October (request 141): "counts toward nothing" is now said with the point first. */
    expect(sayItIsTakenBack('term')).toContain('no longer counts toward anything');
  });
});
