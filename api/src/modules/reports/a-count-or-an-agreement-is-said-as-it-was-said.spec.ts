import { SEED_PROMPTS, REPORT_SYNTHESIS, OPEN_WITH_SOMETHING_THEY_DO_NOT_ALREADY_HAVE } from '../conversation/prompt-library';
import { WHAT_TO_DO_WITH_THESE, whatMayBeSaidAboutAColleaguesProof } from '../conversation/where-this-document-came-from';

/**
 * NIGHT QUALITY RUN 1, PROBLEM 6. Week 3 of the run: a board said a person "sold only two" when they said
 * five (the two were shop visits), and every member read that "the people selling the kits have not agreed"
 * to a rule, from somebody's "we did not agree anything about that" said about another matter. The rule is
 * in the stored report_synthesis prompt, in general words: a product prompt never names a test run's people
 * or quotes its lines.
 */
const THE_RUNS_PEOPLE_AND_PLACES = ['Hassan', 'Collins', 'Amina', 'Jared', 'Esther', 'Keroka', 'Lakeshore', 'Otieno', 'Odhiambo', 'Mwenda', 'Okoth', 'Awuor', 'Kendu', 'Oyugis', 'Rangwe', 'Kisii', 'M-Pesa'];

describe('report_synthesis says a count and an agreement only as they were said', () => {
  const seeded = SEED_PROMPTS.find((s) => s.key === 'report_synthesis')!.content;
  const flat = seeded.replace(/\s+/g, ' ');

  it('is in the text seeded and activated as report_synthesis', () => {
    expect(seeded).toBe(REPORT_SYNTHESIS);
    expect(seeded).toContain('A NUMBER, OR WHO AGREED TO WHAT, IS SAID ONLY AS SOMEBODY SAID IT.');
  });

  it('says a count as the person said it, of the thing they said it about', () => {
    expect(flat).toContain('A count is reported as the person said it, of the thing they said it about, for the round they said it in.');
    expect(flat).toContain('Two counts of different things are never set against each other.');
  });

  it('never reads "we did not agree" about one matter as a refusal of another', () => {
    expect(flat).toContain('"We did not agree X", said about one matter, is never read as a refusal of another matter.');
  });
});

describe('no product prompt names a test run\'s people or places', () => {
  it('in any seeded prompt', () => {
    for (const s of SEED_PROMPTS) for (const n of THE_RUNS_PEOPLE_AND_PLACES) {
      expect({ key: s.key, name: n, found: s.content.includes(n) }).toEqual({ key: s.key, name: n, found: false });
    }
  });

  it('nor in the prompt lines built in code by this round', () => {
    const lines = [OPEN_WITH_SOMETHING_THEY_DO_NOT_ALREADY_HAVE, WHAT_TO_DO_WITH_THESE, whatMayBeSaidAboutAColleaguesProof(null)].join('\n');
    for (const n of THE_RUNS_PEOPLE_AND_PLACES) expect({ name: n, found: lines.includes(n) }).toEqual({ name: n, found: false });
  });
});
