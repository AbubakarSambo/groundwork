/**
 * A CLAIM IS READ BY HOW IT STANDS, FROM THE ONE SOURCE (Hafsah, 4 November 2026: "In the one source, an unproven claim is always worded
 * as said ('Brian said he sold…'), and an impossible claim or a date already past is left out of the opener, My work and anything else that
 * reads it.").
 *
 * The round 51 shapes (adversarial run on wip/plan c79d60cee): Brian said "I sold 10,000 freezers today." and, on 4 November, "I will
 * deliver the Carrefour freezers on 20 October.", which the assessment's read says cannot be true as said; and "I sold 30 units today."
 * with no proof, which is his word. Read for each reader: Brian himself (the opener's "what they said last time", Ask, My work), everybody
 * in the check-in (the shared reports), and Wairimu, who runs it.
 */
import { anAssessmentHolding } from './an-assessment-for-a-spec';
import { theStandingOf, theWordsThatCannotBeTrue, whatTheyPromisedThemselves, THE_ASSESSMENT_PROMPT, THE_ASSESSMENT_SCHEMA, type TheAssessment } from './the-assessment';
import { theFactsIn, aFactAsALine } from './the-facts-on-record';
import { theRecordLinesIn } from './the-record-from-the-assessment';
import { writeOnlyTheQuestion } from './the-opening-prepared-in-advance';

const item = (section: string, i: number, extra: { words: string } & Record<string, unknown>) => ({ id: `r1.${section}.${i}`, from: [1], whoMaySee: 'the people in this check-in' as const, saidWordForWord: true, ...extra });

function brianOnTheFourthOfNovember(): TheAssessment {
  const a = anAssessmentHolding({});
  return {
    ...a,
    about: { ...a.about, checkInId: 'c-brian-3', groundId: 'g-sales', participantId: 'p-brian', who: 'Brian Otieno', sessionNumber: 3, endedAt: '2026-11-04T16:00:00.000Z' },
    /* The same words read as a piece of work too: one thing said, so it stands as the claim stands. */
    workUpdates: [item('workUpdates', 0, { words: 'I sold 10,000 freezers today.', work: 'Freezers' })],
    claims: [
      item('claims', 0, { words: 'I sold 10,000 freezers today.', proof: 'said', needsProof: true, cannotBeTrue: 'Far more than one sales rep could sell in a day.' }),
      item('claims', 1, { words: 'I sold 30 units today.', proof: 'said', needsProof: true }),
    ],
    promises: [item('promises', 0, { words: 'I will deliver the Carrefour freezers on 20 October.', byThePerson: true, action: 'deliver the Carrefour freezers', when: 'on 20 October', cannotBeTrue: '20 October had already passed when it was said on 4 November.' })],
    messages: [{ n: 1, turnId: 't1', where: 'check-in', at: null }],
  };
}

const day = (d: Date) => d.toISOString().slice(0, 10);

describe('A claim is read by how it stands, from the one source (round 51)', () => {
  const a = brianOnTheFourthOfNovember();

  it('the assessment reads whether something cannot be true as said, by its meaning, on every item', () => {
    expect(THE_ASSESSMENT_PROMPT).toContain('`cannotBeTrue`');
    expect(THE_ASSESSMENT_PROMPT).toContain('a promise for a day that had already passed when they said it');
    /* Said once, in `marks`, and put back on its item by the item's words (fix plan 16 November, group 1: the request had grown too big for the model). */
    expect((THE_ASSESSMENT_SCHEMA.input_schema.properties.marks as any).items.properties.cannotBeTrue).toBeDefined();
  });

  it('the one place says how each stands: the same words in another section stand with them', () => {
    const cannot = theWordsThatCannotBeTrue(a);
    expect(theStandingOf(a.claims[0], cannot)).toBe('cannot be true');
    expect(theStandingOf(a.workUpdates[0], cannot)).toBe('cannot be true');
    expect(theStandingOf(a.promises[0], cannot)).toBe('cannot be true');
    expect(theStandingOf(a.claims[1], cannot)).toBe('said');
  });

  it('Brian, reading his own (the opener, Ask, My work), is never offered back what cannot be true, and his 30 units are his word', () => {
    const facts = theFactsIn(a, { kind: 'the person', participantId: 'p-brian' });
    expect(facts.map((f) => f.words)).toEqual(['I sold 30 units today.']);
    expect(facts[0].standing).toBe('said');
    expect(aFactAsALine(facts[0], day, 'you')).toBe('- 2026-11-04, you said, claims, their word: I sold 30 units today.');
  });

  it('nobody reading what is shared reads what cannot be true', () => {
    const shared = theFactsIn(a, { kind: 'everybody in the check-in' }).map((f) => f.words).join(' ');
    expect(shared).not.toContain('10,000');
    expect(shared).not.toContain('20 October');
    expect(shared).toContain('I sold 30 units today.');
  });

  it('Wairimu, who runs it, still reads what Brian said, as said, and that it cannot be true as said', () => {
    const lines = theFactsIn(a, { kind: 'the lead', judgements: false }).map((f) => aFactAsALine(f, day));
    expect(lines).toEqual([
      '- 2026-11-04, Brian Otieno said, work updates, their word, and it cannot be true as said: I sold 10,000 freezers today. (Freezers)',
      '- 2026-11-04, Brian Otieno said, claims, their word: I sold 30 units today.',
      '- 2026-11-04, Brian Otieno said, promises, their word, and it cannot be true as said: I will deliver the Carrefour freezers on 20 October. (by on 20 October)',
    ]);
  });

  it('a promise for a day already past is not kept as an open promise (no to-do on My work, nothing "still open" on the board)', () => {
    expect(whatTheyPromisedThemselves(a)).toEqual([]);
  });

  it('the record keeps every word he said, and the past-dated promise is what he said, not a commitment', () => {
    const lines = theRecordLinesIn(a, () => true).map((l) => [l.type, l.text]);
    expect(lines).toEqual([
      ['PROGRESS', 'I will deliver the Carrefour freezers on 20 October.'],
      ['PROGRESS', 'I sold 10,000 freezers today.'],
      ['PROGRESS', 'I sold 30 units today.'],
    ]);
  });

  it('the opener\'s question is told to speak as "I", never "we"', () => {
    const told = writeOnlyTheQuestion('Brian, nothing is open from last time.');
    expect(told).toContain('ONE VOICE: "I".');
    expect(told).toContain('Never call yourself "we" or "us"');
  });
});
