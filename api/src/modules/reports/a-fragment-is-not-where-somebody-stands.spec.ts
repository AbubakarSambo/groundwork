import { factsAbout, onlyAFragment } from './the-facts-about-a-person';

/**
 * NIGHT QUALITY RUN 1, YES-OR-NO 5. Esther's board read "Jared Okoth works on selling kits in Kisumu. Jared's latest report is
 * The owners." The paragraph was written from the facts, and the fact "where they say they are" was Jared's record line
 * "[The conversations were with] The owners. [INFERRED: ...]", two words of his with the extraction's words in front. A line
 * that says nothing on its own is not where somebody stands. These are his stored lines.
 */
describe('a fragment is not where somebody says they stand', () => {
  const JARED = [
    { type: 'INTENT', text: 'Selling kits in Kisumu.', session: 3 },
    { type: 'PROGRESS', text: "[The conversations were with] The owners. [INFERRED: Implied by the answer to 'Which of those conversations was with someone who can actually decide']", session: 3 },
  ];

  it('Jared\'s "The owners." is not handed on as his latest report', () => {
    const f = factsAbout({ participantId: 'p-jared', label: 'Participant C', isLead: false, said: JARED, targets: [] }, 3);
    expect(f?.whereTheySayTheyAre ?? null).toBeNull();
  });

  it('a short line with a number, and a full sentence, still count', () => {
    expect(onlyAFragment('Five kits sold.')).toBe(false);
    expect(onlyAFragment('I visited eight shops in Kisumu.')).toBe(false);
    expect(onlyAFragment("[The conversations were with] The owners.")).toBe(true);
    const f = factsAbout({ participantId: 'p-jared', label: 'Participant C', isLead: false, said: [...JARED, { type: 'PROGRESS', text: 'I sold five kits this week.', session: 3 }], targets: [] }, 3);
    expect(f?.whereTheySayTheyAre).toBe('I sold five kits this week');
  });
});
