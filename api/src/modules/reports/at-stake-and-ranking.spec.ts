import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * WHAT MATTERS MOST, WHY IT MATTERS, AND WHO IT IS NOT ABOUT.
 *
 * A buyer read a real report and said it showed differences but not what to do
 * about them. The investigation agreed: divergences were emitted flat, in
 * whatever order the model produced them, and carried no statement of what was
 * at stake. The engine had already found the subtle, serious thing on that
 * ground - one account had opted out of quarterly goals entirely - and printed
 * it as the third sentence of a three-sentence block, weighted exactly like the
 * other two.
 *
 * So the report now ranks, and each gap says what happens to the work if it
 * holds.
 *
 * THE GUARDRAIL IS THE WHOLE RISK. Ranking and consequence are safe while they
 * attach to a GAP. The moment they attach to a person they become a verdict,
 * and this product promises it never delivers one. The same fact can be said
 * either way:
 *
 *   gap:        "how success is defined is not agreed"
 *   accusation: "one party has opted out of the quarterly goal"
 *
 * Identical information. The second has a defendant. These tests exist to keep
 * the instruction on the first side of that line, because a sharper report is
 * exactly the change most likely to cross it.
 */

const src = (p: string) => readFileSync(join(__dirname, '..', '..', '..', p), 'utf8');
const SCHEMA = src('src/modules/reports/reports.service.ts');

/**
 * The prompt is hard-wrapped at 80 columns, so a phrase these tests care about
 * ("never imply the first gap is anyone's failing") is split across a line
 * break at whatever column it happened to reach. Assertions must be about the
 * words, not about where the wrap fell - otherwise a harmless re-wrap turns the
 * guardrail tests red and the next person "fixes" them by deleting them.
 */
const PROMPT = src('src/modules/conversation/prompt-library.ts').replace(/\s+/g, ' ');

/** The divergence item's schema block, so assertions cannot stray elsewhere. */
const DIVERGENCE_BLOCK = (() => {
  const i = SCHEMA.indexOf('      divergences: {');
  const j = SCHEMA.indexOf('centralQuestion:', i);
  expect(i).toBeGreaterThan(-1);
  return SCHEMA.slice(i, j);
})();

describe('each gap says what is at stake', () => {
  it('the model is given somewhere to put it', () => {
    expect(DIVERGENCE_BLOCK).toMatch(/atStake: \{/);
  });

  it('asks what happens to the WORK, and rules out consequences for a person', () => {
    expect(DIVERGENCE_BLOCK).toMatch(/what happens TO THE WORK/i);
    expect(DIVERGENCE_BLOCK).toMatch(/never about a person/i);
    expect(DIVERGENCE_BLOCK).toMatch(/no fault/i);
  });

  it('is conditional, because it has not happened yet', () => {
    // "the quarter WILL end badly" is a prediction the record cannot support.
    // "if this holds, the quarter COULD end..." is what the evidence allows.
    expect(DIVERGENCE_BLOCK).toMatch(/[Cc]onditional/);
    expect(PROMPT).toMatch(/ATSTAKE is one plain sentence about what happens TO THE WORK/);
    expect(PROMPT).toMatch(/if this holds/i);
  });

  it('is expected on every gap, but may still be left out rather than invented', () => {
    // Two failures, and they pull opposite ways. An engine that MUST produce a
    // stake invents one on a thin record. An engine free to skip produces
    // nothing: on the first real run over three grounds, only one of three gaps
    // came back with a stake - including one where ten sessions of deferred
    // decisions plainly supported one.
    //
    // So the instruction expects it and names the escape narrowly. The reason
    // this is safe is the evidence bar upstream: a gap only gets reported at all
    // with direct quotes from two records, and a gap that costs the work nothing
    // should not have cleared that bar.
    expect(DIVERGENCE_BLOCK).toMatch(/Write one for every gap you report/);
    expect(DIVERGENCE_BLOCK).toMatch(/if and only if you would have to invent a consequence/i);
    // Required, so declining is a decision the model makes rather than a field it skips.
    expect(DIVERGENCE_BLOCK).toContain("required: ['topic', 'positions', 'atStake']");
    expect(PROMPT).toMatch(/if and only if you would have to invent a consequence the record does not point to, return an empty string/i);
    // And the tiebreak, so the model knows which way to fail.
    expect(PROMPT).toMatch(/Reaching for a dramatic one is the worse failure/);
  });
});

describe('the gaps are ordered by what matters', () => {
  it('the schema requires the most significant first', () => {
    expect(DIVERGENCE_BLOCK).toMatch(/ORDER MATTERS/);
    expect(DIVERGENCE_BLOCK).toMatch(/put the gap that matters most FIRST/);
  });

  it('measures significance on the work, not on a party', () => {
    expect(DIVERGENCE_BLOCK).toMatch(/[Ss]ignificance is about the WORK/);
    // "which party is more at fault" became "who is more at fault" in the
    // plain-language pass. Same rule, plainer words.
    expect(DIVERGENCE_BLOCK).toMatch(/never about who is more at fault/i);
    expect(PROMPT).toMatch(/ranking gaps, not people/i);
  });

  it('tells the model why a definitional gap outranks a scheduling one', () => {
    // Without a worked reason, "most significant" collapses into "most
    // dramatic", which is how a report starts sounding like an accusation.
    expect(PROMPT).toMatch(/what success even means outranks a gap about a date/);
  });
});

describe('the guardrail: a gap is ranked, a person is never accused', () => {
  it('carries the worked example of the same fact said both ways', () => {
    // This is the case the engine actually met, and the one most likely to be
    // got wrong: the unusual position belonged to one identifiable person.
    expect(PROMPT).toMatch(/How success is defined is not agreed" is a gap/);
    expect(PROMPT).toMatch(/is an accusation with a person at the end of it/);
  });

  it('forbids the ranking itself reading as a verdict', () => {
    expect(PROMPT).toMatch(/never imply the first gap is anyone's failing/i);
    expect(PROMPT).toMatch(/never let the ranking read as a verdict/i);
  });

  it('holds even when one party is the odd one out', () => {
    // The tempting exception. If the instruction let significance justify
    // naming someone "when it is really their doing", the promise is over.
    expect(PROMPT).toMatch(/even when one party's position is the unusual one/);
  });

  it('does not tell the model to predict what a person will do', () => {
    expect(PROMPT).toMatch(/[Nn]ever what a person will do/);
    expect(PROMPT).toMatch(/never a prediction about anyone's future behaviour/i);
  });
});
