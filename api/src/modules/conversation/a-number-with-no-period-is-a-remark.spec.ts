import { theFiguresTheyStated, FIGURE_PROMPT, theDayThisWasSaid } from './a-figure-is-not-a-figure-until-somebody-says-so';

const ok = {
  says: 'net revenue', minorUnits: 125050, currency: 'NGN',
  periodFrom: '2026-08-01', periodTo: '2026-08-31', source: 'the monthly Xero export',
};

describe('a number with no period is a remark', () => {
  it('keeps a figure that has all of it', () => {
    const [f] = theFiguresTheyStated({ figures: [ok] });
    expect(f.says).toBe('net revenue');
    expect(f.minorUnits).toBe(125050);
    expect(f.periodFrom.toISOString().slice(0, 10)).toBe('2026-08-01');
  });

  it('drops one with no period', () => {
    expect(theFiguresTheyStated({ figures: [{ ...ok, periodFrom: null }] })).toEqual([]);
    expect(theFiguresTheyStated({ figures: [{ ...ok, periodTo: 'August' }] })).toEqual([]);
  });

  it('drops one with no source, because it cannot be compared to anything later', () => {
    expect(theFiguresTheyStated({ figures: [{ ...ok, source: '  ' }] })).toEqual([]);
  });

  it('drops one they hedged, however it was hedged', () => {
    expect(theFiguresTheyStated({ figures: [{ ...ok, approximate: true }] })).toEqual([]);
    expect(theFiguresTheyStated({ figures: [{ ...ok, says: 'roughly net revenue' }] })).toEqual([]);
    expect(theFiguresTheyStated({ figures: [{ ...ok, says: 'about what we shipped' }] })).toEqual([]);
  });

  it('drops a period that runs backwards', () => {
    expect(theFiguresTheyStated({ figures: [{ ...ok, periodFrom: '2026-09-01', periodTo: '2026-08-01' }] })).toEqual([]);
  });

  it('refuses a decimal or a negative where an integer of minor units belongs', () => {
    expect(theFiguresTheyStated({ figures: [{ ...ok, minorUnits: 1250.5 }] })).toEqual([]);
    expect(theFiguresTheyStated({ figures: [{ ...ok, minorUnits: -5 }] })).toEqual([]);
  });

  it('refuses a currency that is not a code', () => {
    expect(theFiguresTheyStated({ figures: [{ ...ok, currency: 'naira' }] })).toEqual([]);
  });

  it('never stores a word the pack forbids', () => {
    for (const bad of ['revenue withheld', 'the missing quarter', 'amount owed', 'under-reported sales', 'breached minimum']) {
      expect(theFiguresTheyStated({ figures: [{ ...ok, says: bad }] })).toEqual([]);
    }
    expect(theFiguresTheyStated({ figures: [{ ...ok, source: 'the concealed ledger' }] })).toEqual([]);
  });

  it('takes an empty answer, which is the common one', () => {
    expect(theFiguresTheyStated({ figures: [] })).toEqual([]);
    expect(theFiguresTheyStated(null)).toEqual([]);
    expect(theFiguresTheyStated({} as any)).toEqual([]);
  });

  it('does not let a transcript be mined', () => {
    const many = Array.from({ length: 30 }, (_, i) => ({ ...ok, says: `line ${i}` }));
    expect(theFiguresTheyStated({ figures: many })).toHaveLength(12);
  });

  it('tells the model what year it is, because it guessed 2024 on a 2026 check-in', () => {
    const block = theDayThisWasSaid(new Date('2026-09-11T10:00:00.000Z'));
    expect(block).toContain('TODAY IS 2026-09-11');
    expect(block).toContain('the most recent one that has already');
    expect(block).toContain('it is never a future August');
    expect(block).toContain('leave the figure');
  });

  it('tells the reader an empty list is correct, and forbids the accusing words', () => {
    expect(FIGURE_PROMPT).toContain('An empty list is a correct and common answer');
    expect(FIGURE_PROMPT).toContain('NEVER describe anything as missing, withheld');
    expect(FIGURE_PROMPT).toContain('that is arithmetic and it is not an accusation');
  });
});
