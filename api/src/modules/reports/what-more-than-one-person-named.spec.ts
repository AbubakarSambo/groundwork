import { whatMoreThanOnePersonNamed, namedByMoreThanOne, namesIn } from './what-more-than-one-person-named';

/**
 * THE WORKPLAN DOUBLE-COUNT, WHICH WAS IN THE RECORD AND IN NEITHER THE REPORT NOR THE JUDGEMENT.
 *
 * The right answer is that the plans come to 141% of the budget because two leads have both costed
 * the same design contractor for the same eight weeks, and neither knows. The judgement said the
 * budget is 180,000 and the plans are 254,000, and asked for the cost of one supplier - circling
 * it without landing on it.
 *
 * The reason it could not land: the judgement is built from one written paragraph per person, and
 * Studio Lune survived into one of the two paragraphs. Telling the model to read across the blocks
 * cannot recover a fact that is not in the blocks.
 *
 * The fixture below is the real record, word for word.
 */
const CHIDI = [
  "we're committing to a total budget of 96k for the quarter",
  '34k of that specifically allocated to Studio Lune for the brand refresh, starting in October for eight weeks.',
  "design contractor, Studio Lune. They're booked for eight weeks starting in October, and that alone is 34k.",
];
const SARA = [
  'My internal team and the engineering time are approved',
  'Studio Lune is booked and confirmed.',
  "The main thing would be if Studio Lune wasn't available for the full eight weeks we need them.",
];
const HELEN = ["I have a budget of 180k for this quarter. I've received two plans that total 254k."];

describe('the thing two people named, and neither knows the other named it', () => {
  const shared = whatMoreThanOnePersonNamed([
    { who: 'Helen Oyelaran', texts: HELEN },
    { who: 'Chidi Eze', texts: CHIDI },
    { who: 'Sara Lindqvist', texts: SARA },
  ]);

  it('finds the contractor both of them booked', () => {
    const studio = shared.find((s) => s.name === 'Studio Lune');
    expect(studio).toBeDefined();
    expect(studio!.who.sort()).toEqual(['Chidi Eze', 'Sara Lindqvist']);
  });

  it('quotes each of them in their own words, untouched', () => {
    const studio = shared.find((s) => s.name === 'Studio Lune')!;
    const said = studio.asSaid.map((x) => x.said);
    expect(said).toContain('Studio Lune is booked and confirmed.');
    expect(said.some((t) => t.includes('34k') && t.includes('eight weeks'))).toBe(true);
  });

  it('leaves out anything only one person named', () => {
    /* Helen is the only one who says 180k or 254k, so neither is a shared thing. */
    expect(shared.map((s) => s.name)).not.toContain('Innovate');
    for (const s of shared) expect(s.who.length).toBeGreaterThan(1);
  });

  it('renders it for the judgement with both sides of it', () => {
    const block = namedByMoreThanOne(shared);
    expect(block).toContain('NAMED BY MORE THAN ONE PERSON');
    expect(block).toContain('Studio Lune - named by Chidi Eze and Sara Lindqvist');
    expect(block).toContain('Studio Lune is booked and confirmed.');
  });

  it('says nothing at all where nothing is shared, rather than padding the prompt', () => {
    const none = whatMoreThanOnePersonNamed([
      { who: 'A', texts: ['I am working on the Kano rollout.'] },
      { who: 'B', texts: ['I am working on the Enugu rollout.'] },
    ]);
    expect(namedByMoreThanOne(none)).toBe('');
  });
});

describe('and it does not find things that are not names', () => {
  it('ignores the people in the check-in, who name each other constantly', () => {
    const shared = whatMoreThanOnePersonNamed([
      { who: 'Ruth Njeri', texts: ['Marco Bianchi and I spoke about it.'] },
      { who: 'Marco Bianchi', texts: ['Ruth Njeri asked me last week.'] },
    ]);
    expect(shared).toEqual([]);
  });

  it('ignores a capital letter that is only the start of a sentence', () => {
    expect(namesIn('Started building it that day.')).not.toContain('Started');
    expect(namesIn('We booked them in October.')).not.toContain('We');
  });

  it('ignores months, which are dates and not things', () => {
    const shared = whatMoreThanOnePersonNamed([
      { who: 'A', texts: ['It starts in October.'] },
      { who: 'B', texts: ['Mine also starts in October.'] },
    ]);
    expect(shared.map((s) => s.name)).not.toContain('October');
  });

  it('does find an acronym said by two people, because the CEO is exactly that case', () => {
    const shared = whatMoreThanOnePersonNamed([
      { who: 'Ruth Njeri', texts: ['The CEO asked me to build it on September 2nd.'] },
      { who: 'Marco Bianchi', texts: ['The CEO mentioned pricing to me at dinner.'] },
    ]);
    const ceo = shared.find((s) => s.name === 'CEO');
    expect(ceo).toBeDefined();
    expect(ceo!.who.sort()).toEqual(['Marco Bianchi', 'Ruth Njeri']);
  });

  it('puts the thing most people named first', () => {
    const shared = whatMoreThanOnePersonNamed([
      { who: 'A', texts: ['Studio Lune and Acme Corp.'] },
      { who: 'B', texts: ['Studio Lune again.'] },
      { who: 'C', texts: ['Studio Lune once more.'] },
      { who: 'D', texts: ['Acme Corp here.'] },
    ]);
    expect(shared[0].name).toBe('Studio Lune');
    expect(shared[0].who.length).toBe(3);
  });
});
