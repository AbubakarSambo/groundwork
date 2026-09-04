/**
 * "Solidify the moat" was the one thing nothing could report on.
 *
 * Four of the five roadmap items are countable — companies live, issues closed,
 * accounts moved, coaches onboarded. This one was a sentence, and an objective
 * that cannot be counted is the one that quietly stops being worked on while
 * the measurable ones get attention. I raised it twice and it stayed a note.
 *
 * It has five named components now, each with the statement it was defined by,
 * and a record of what gets built against each. So the number is entries in a
 * window, and it opens onto them like every other number here.
 *
 * The statements are held to their own words on purpose. They are a strategy
 * document, every clause of one names an asset somebody can deliberately build,
 * and a paraphrase loses exactly that.
 */
import {
  MOAT_COMPONENTS,
  WHAT_GROUNDWORK_IS_BUILDING,
  THE_COMPOUNDING_LOOP,
  MAXIMUM_LEARNING_MINIMUM_EXPOSURE,
  WHAT_AN_ACQUIRER_IS_BUYING,
} from './what-the-moat-is-made-of';
import { METRICS_BY_KEY } from './a-number-you-can-open';

describe('the five components', () => {
  it('are five, in order, each with a key of its own', () => {
    expect(MOAT_COMPONENTS).toHaveLength(5);
    expect(MOAT_COMPONENTS.map((c) => c.ordinal)).toEqual([1, 2, 3, 4, 5]);
    expect(new Set(MOAT_COMPONENTS.map((c) => c.key)).size).toBe(5);
  });

  it('are the five that were named, not four of them or six', () => {
    expect(MOAT_COMPONENTS.map((c) => c.name)).toEqual([
      'Proprietary Elicitation System',
      'Human Dynamics Dataset',
      'Organizational Memory & Situation Intelligence',
      'Human Dynamics Model',
      'Intervention Learning',
    ]);
  });

  it('each carry a real statement rather than a label', () => {
    /* A component with a name and no definition is a bucket, and things get put
       in buckets. The definition is what says whether something counts. */
    const thin = MOAT_COMPONENTS.filter((c) => c.statement.length < 200).map((c) => c.key);
    expect(thin).toEqual([]);
  });

  it('and the statements keep the specific claims that make them buildable', () => {
    const all = MOAT_COMPONENTS.map((c) => c.statement).join(' ');
    for (const phrase of [
      'how to prevent people speaking for others',
      'where accounts diverged',
      'Access to that information is tightly controlled',
      'not simply the underlying AI model',
      'Which intervention resolved the divergence?',
    ]) {
      expect(all).toContain(phrase);
    }
  });
});

describe('what the five are supposed to add up to', () => {
  it('says what is being built, in one sentence', () => {
    expect(WHAT_GROUNDWORK_IS_BUILDING).toMatch(/how people work together/);
    expect(WHAT_GROUNDWORK_IS_BUILDING).toMatch(/learn what actually improves outcomes/);
  });

  it('and holds the loop, which is the argument for collecting anything at all', () => {
    expect(THE_COMPOUNDING_LOOP).toMatch(/More situations/);
    expect(THE_COMPOUNDING_LOOP).toMatch(/greater customer value and retention/);
  });

  it('and the line that decides HOW, kept next to the loop rather than in a footnote', () => {
    expect(MAXIMUM_LEARNING_MINIMUM_EXPOSURE).toBe('Maximum learning. Minimum necessary exposure.');
  });

  it('and what somebody would be buying, which is not a check-in tool', () => {
    expect(WHAT_AN_ACQUIRER_IS_BUYING).toMatch(/^Not a check-in tool/);
  });
});

describe('the moat can now be counted, and opened', () => {
  const prismaWith = (entries: unknown[], components: unknown[]) =>
    new Proxy(
      {},
      {
        get: (_t, table: string) => ({
          findMany: async () => (table === 'opsMoatEntry' ? entries : components),
        }),
      },
    ) as never;

  const WINDOW = { from: new Date('2026-09-01'), to: new Date('2026-09-30') };

  it('counts what was built and names which component each belongs to', async () => {
    const result = await METRICS_BY_KEY.get('moat.built_this_window')!.compute(
      prismaWith(
        [
          { title: 'Evasion probing in intake', builtAt: new Date('2026-09-10'), evidenceUrl: 'https://x', component: { name: 'Proprietary Elicitation System' } },
          { title: 'Divergence captured per round', builtAt: new Date('2026-09-12'), evidenceUrl: null, component: { name: 'Human Dynamics Dataset' } },
        ],
        [],
      ),
      WINDOW,
    );

    expect(result.value).toBe(2);
    expect(result.rows.map((r) => r.component)).toEqual([
      'Proprietary Elicitation System',
      'Human Dynamics Dataset',
    ]);
    expect(result.says).toMatch(/2 on 2 of the five/);
  });

  it('and says how many of the five were touched, not just how many things happened', async () => {
    /**
     * Five things all on elicitation and nothing on the dataset is a different
     * quarter from one thing on each. The count alone cannot tell them apart,
     * and a moat that deepens in one place is not a moat that deepened.
     */
    const same = { component: { name: 'Proprietary Elicitation System' }, builtAt: new Date('2026-09-10'), evidenceUrl: null };
    const result = await METRICS_BY_KEY.get('moat.built_this_window')!.compute(
      prismaWith([{ ...same, title: 'a' }, { ...same, title: 'b' }, { ...same, title: 'c' }], []),
      WINDOW,
    );
    expect(result.says).toMatch(/3 on 1 of the five/);
  });

  it('and names the components nothing has ever been built on', async () => {
    const result = await METRICS_BY_KEY.get('moat.components_untouched')!.compute(
      prismaWith([], [
        { name: 'Proprietary Elicitation System', statement: 'x'.repeat(300), entries: [{}] },
        { name: 'Intervention Learning', statement: 'y'.repeat(300), entries: [] },
      ]),
      WINDOW,
    );
    expect(result.value).toBe(1);
    expect(result.rows[0].component).toBe('Intervention Learning');
    expect(result.says).toMatch(/1 of five have nothing on them/);
  });

  it('and says so plainly when all five have something', async () => {
    const result = await METRICS_BY_KEY.get('moat.components_untouched')!.compute(
      prismaWith([], [{ name: 'A', statement: 'z'.repeat(300), entries: [{}] }]),
      WINDOW,
    );
    expect(result.says).toMatch(/built on all five/);
  });
});
