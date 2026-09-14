import { readFileSync } from 'fs';
import { join } from 'path';
import { onlyWhatIsWorthOffering, theQuestion, WHAT_THE_RECORD_SAYS_PROMPT } from './what-the-record-says-a-number-is';

/**
 * THE BOARD READ 0 OF 40 AT THE CLOSE OF A QUARTER THE TEAM DELIVERED.
 *
 * The screen for this existed - "The record shows 40 for this, not 0. Use 40" - and the rule behind
 * it never once fired. It needed every word of the target's name longer than three letters in one
 * entry, esses stripped, plus a verb from a list of nine; then it suggested the COUNT OF MATCHING
 * ENTRIES rather than the number somebody said. Against a real run: "Nine of the forty teams are
 * migrated" has no listed verb, "All forty migrated by Friday" has no "team". Zero of fourteen.
 *
 * The reading is the model's now. What is held here is the part that is code's: which readings are
 * worth putting in front of a person, and that the instruction still says the things the run showed
 * it had to say.
 *
 * The behaviour itself was checked against the live model, round by round, and walked 0 -> 9 -> 40
 * as the work did - journey/the-real-gate/does-it-read-the-number.ts.
 */
const T = [
  { id: 'A', name: 'Teams through onboarding', target: 200, count: 0 },
  { id: 'B', name: 'Teams migrated', target: 40, count: 9 },
];

describe('what the record says a number is', () => {
  it('offers a reading that moves the number, with the line it came from', () => {
    const out = onlyWhatIsWorthOffering([{ objectiveId: 'B', count: 40, said: 'All forty migrated by Friday.' }], T);
    expect(out).toEqual([{ objectiveId: 'B', count: 40, said: 'All forty migrated by Friday.' }]);
  });

  it('never offers the number the lead already has', () => {
    /* "The record shows 9 for this, not 9" is a prompt about nothing, and a person who sees two of
       those stops reading the third - which is the one that mattered. */
    expect(onlyWhatIsWorthOffering([{ objectiveId: 'B', count: 9, said: 'Nine are migrated.' }], T)).toEqual([]);
  });

  it('refuses a number that is not one, and a target that is not there', () => {
    expect(onlyWhatIsWorthOffering([{ objectiveId: 'B', count: 4.5, said: 'about four and a half' }], T)).toEqual([]);
    expect(onlyWhatIsWorthOffering([{ objectiveId: 'B', count: -3, said: 'minus three' }], T)).toEqual([]);
    expect(onlyWhatIsWorthOffering([{ objectiveId: 'ZZZ', count: 5, said: 'five' }], T)).toEqual([]);
  });

  it('refuses a number with nothing to show for it', () => {
    /* The lead is being asked to accept a figure. A figure from nowhere is one they cannot check. */
    expect(onlyWhatIsWorthOffering([{ objectiveId: 'B', count: 40, said: '   ' }], T)).toEqual([]);
  });

  it('one suggestion per target', () => {
    const out = onlyWhatIsWorthOffering([
      { objectiveId: 'B', count: 40, said: 'All forty migrated by Friday.' },
      { objectiveId: 'B', count: 38, said: 'Thirty-eight are done.' },
    ], T);
    expect(out).toHaveLength(1);
    expect(out[0].count).toBe(40);
  });

  it('the targets and the lines both reach the model, with the number it already has', () => {
    const q = theQuestion(T, [{ text: 'All forty migrated by Friday.', who: null }]);
    expect(q).toContain('id B: "Teams migrated", target 40, currently recorded as 9');
    expect(q).toContain('All forty migrated by Friday.');
  });

  it('and the instruction keeps the two things the run showed it needed', () => {
    /*
     * It answered for one target and stopped, so the closing round moved the 200 and left the other
     * at 9. And it would not match a line that did not repeat the target's name, which is most
     * lines - "all forty migrated" never says "teams".
     */
    expect(WHAT_THE_RECORD_SAYS_PROMPT).toContain('ONE AT A TIME');
    expect(WHAT_THE_RECORD_SAYS_PROMPT).toContain('stopping after the first is the commonest way to get this wrong');
    expect(WHAT_THE_RECORD_SAYS_PROMPT).toContain('does not have to repeat the target');
  });

  it('nothing internal rides into what the lead is shown', () => {
    /*
     * Caught on a gate run: the board offered "The record shows 180 for this" with the line
     * "[VERIFIABILITY:HIGH] We are at 180 teams through onboarding." Extraction keeps its marker
     * inside the text column, so every line arrives wearing one - and it was going to the model as
     * noise in front of every sentence as well as onto the page.
     *
     * Asserted on the listener because that is where the text is taken from the record and handed
     * on, and it is the only place that can strip it for both.
     */
    const L = readFileSync(join(__dirname, 'board.listener.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    /* Off the lines the model reads, and off the line the lead is shown. */
    expect(L).toMatch(/text: cleanText\(s\.text\)/);
    expect(L).toMatch(/suggestedSaid: cleanText\(n\.said\)/);
  });

  it("and its examples are not the sentences it is checked on", () => {
    /*
     * The first pass used the run's own lines as the prompt's examples, which made the check partly
     * a test of whether the model could copy the prompt back.
     *
     * THE SENTENCES ARE WRITTEN OUT HERE RATHER THAN READ OFF THE GATE FILE.
     *
     * This used to open journey/the-real-gate/does-it-read-the-number.ts and assert against its
     * text. That put a product spec's pass or fail in the hands of a test harness, and the moment
     * the product was taken out on its own the spec could not find the file and failed - not
     * because anything was wrong with the prompt, which is the only thing it is here to guard.
     *
     * The rule it holds is about THIS prompt: these three sentences are what the gate checks the
     * model on, so the prompt must not hand them to it. Keeping them written out here is what makes
     * the guard stand on its own. If the gate's sentences ever change, change them here too.
     */
    for (const line of ['All forty migrated by Friday.', 'Nine of the forty teams are migrated.', '200 teams through']) {
      expect(WHAT_THE_RECORD_SAYS_PROMPT).not.toContain(line);
    }
  });
});
