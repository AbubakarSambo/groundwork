import { aDefinitionOfSuccessHolds } from '../grounds/a-dump-is-many-things';
import { whereYouAreAgainstWhatYouNamed } from './where-you-are-against-what-you-named';
import { RecordEntryType } from '@prisma/client';

/**
 * NINE RAW ANSWERS PRINTED AS NINE DEFINITIONS OF SUCCESS.
 *
 * Read on a live board, 23 September 2026, under "And what each person says it is":
 *
 *   Hafsah (Coamana): horticulture
 *   Hafsah (Coamana): sales records
 *   Hafsah (Coamana): Yield too
 *   Hafsah (Coamana): no specific states but they have to be woemn
 *
 * They were answers to whatever the last question happened to be, typed SUCCESS_DEFINITION by the
 * extractor, and printed as though each were somebody's account of what good looks like.
 */
describe('what counts as a definition of success', () => {
  it('not a bare fragment', () => {
    /* "Q4" carries a digit, so it passes the countable escape - a two-character fragment is not a
       definition of anything and this is the honest limit of a deterministic bar. The synthesis
       layer (P1) is what removes the need to print any raw line at all; until then this stops the
       four real ones read off a live board. */
    for (const t of ['horticulture', 'sales records', 'Yield too', 'women']) {
      expect(aDefinitionOfSuccessHolds(t)).toBeNull();
    }
  });

  /* A negation of a question is an answer, not a picture of success. */
  it('and not an answer to the question that was asked', () => {
    expect(aDefinitionOfSuccessHolds('no specific states but they have to be woemn')).toBeNull();
    expect(aDefinitionOfSuccessHolds('no volumes, just increase their incomes by 30%')).toBeNull();
  });

  /**
   * AND THE FAILURE THAT WOULD HAVE BEEN WORSE THAN THE BUG.
   *
   * My first version was a six-word floor, which threw away "Fifteen meetings a month" - one of the
   * best definitions anybody gives. A real standard silently missing from a report is worse than a
   * fragment printed in one. A number, or a verb, is enough: both mean it describes a state of
   * affairs rather than naming a thing.
   */
  it('but a short one with a number in it', () => {
    expect(aDefinitionOfSuccessHolds('Fifteen meetings a month')).toBe('Fifteen meetings a month');
    expect(aDefinitionOfSuccessHolds('30% income increase')).toBe('30% income increase');
  });

  it('and a short one that describes a state', () => {
    expect(aDefinitionOfSuccessHolds('Getting to quota.')).toBe('Getting to quota.');
    expect(aDefinitionOfSuccessHolds('She is not asking me to sit in on calls.')).toBeTruthy();
  });

  /* The product in it is THEIRS. `aSuccessStatementHolds` refuses this and is right to for a lead
     pasting a statement about their team; applied to somebody's own check-in it is wrong. */
  it('and one that mentions a product, because the product is theirs', () => {
    expect(aDefinitionOfSuccessHolds('I know the product well enough to demo it alone.')).toBeTruthy();
  });
});

describe('and the board no longer prints fragments as definitions', () => {
  const entry = (type: RecordEntryType, text: string, who: string | null = 'Hafsah') => ({ type, text, who } as any);
  const base = { stated: null, version: null, conditions: [], leadHasSaidIt: false, entries: [] as any[] };

  it('drops her four and keeps a real one', () => {
    const out = whereYouAreAgainstWhatYouNamed({
      ...base,
      entries: [
        entry(RecordEntryType.SUCCESS_DEFINITION, 'horticulture'),
        entry(RecordEntryType.SUCCESS_DEFINITION, 'sales records'),
        entry(RecordEntryType.SUCCESS_DEFINITION, 'Yield too'),
        entry(RecordEntryType.SUCCESS_DEFINITION, 'Thirty thousand women farmers earning 30% more'),
      ],
    } as any);
    expect(out.definitions.map((d: any) => d.text)).toEqual(['Thirty thousand women farmers earning 30% more']);
  });
});
