import { whereTheAnswersPoint, theTable } from './the-judgement-over-the-answers';

const read = (id: string, asks: string, counts: { value: string; howMany: number; share: number }[], answered: number) => ({
  field: { id, asks, shape: 'THING' as const },
  asked: answered, answered, couldNotSay: 0, neverReached: 0,
  counts, concentration: counts[0]?.share ?? 0, byKind: [],
}) as any;

const solid = (id: string) => ({ fieldId: id, standing: 'SOLID' as const, because: 'x' });
const thin = (id: string) => ({ fieldId: id, standing: 'THIN' as const, because: 'y' });

/*
 * The expansion brief asked which states, markets, products and actors to prioritise. What came
 * back was a standing per field and no prioritisation at all.
 */
describe('where the answers point', () => {
  const reads = [
    read('states', 'Which states?', [{ value: 'Kano', howMany: 6, share: 0.4 }, { value: 'Lagos', howMany: 3, share: 0.2 }], 15),
    read('products', 'Which products?', [{ value: 'Maize', howMany: 9, share: 0.6 }], 15),
    read('actors', 'Which actors?', [{ value: 'Aggregators', howMany: 2, share: 0.2 }], 10),
  ];
  const assessments = [solid('states'), solid('products'), thin('actors')];

  it('ranks by how many people stand behind each, strongest first', () => {
    const out = whereTheAnswersPoint(reads, assessments);
    expect(out.map((p) => p.value)).toEqual(['Maize', 'Kano', 'Aggregators']);
  });

  it('says the count and the base in the line itself', () => {
    const [top] = whereTheAnswersPoint(reads, assessments);
    expect(top.say).toBe('Which products? -> Maize, named by 9 of the 15 who answered.');
  });

  it('marks a line the counts cannot carry', () => {
    const out = whereTheAnswersPoint(reads, assessments);
    expect(out[2].say).toContain('too few to rank on');
  });

  /* One person naming a thing is an anecdote, and a prioritisation of anecdotes reads as advice. */
  it('drops a field where only one person named the top thing', () => {
    const lonely = [read('risk', 'Biggest risk?', [{ value: 'Flooding', howMany: 1, share: 1 }], 4)];
    expect(whereTheAnswersPoint(lonely, [solid('risk')])).toEqual([]);
  });

  it('reaches the table, with the warning against pairing two columns', () => {
    const t = theTable(reads, assessments, 15);
    expect(t).toContain('WHERE THE ANSWERS POINT');
    expect(t).toContain('do not pair two of them into one claim');
    expect(t).toContain('Maize, named by 9 of the 15');
  });
});
