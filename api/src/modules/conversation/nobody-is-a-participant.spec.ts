import { PLAIN_WORDS } from './plain-words';
import { SEED_PROMPTS } from './prompt-library';

/**
 * "THE OTHER TWO PARTICIPANTS REPORT..." (run 32, several scenarios).
 *
 * Also "both branch participants" and "two other participants report that the company's CEO...".
 * Participant is our word for a row in a database. Nobody says it about a colleague.
 *
 * It was in none of the wording rules, and the scorer's label check only catches "Participant A",
 * so the bare noun passed everything and reached readers.
 */
const flat = (t: string) => t.replace(/\s+/g, ' ');

describe('nobody reading this is called a participant', () => {
  it('the rulebook says so, with the word a person would use instead', () => {
    expect(flat(PLAIN_WORDS)).toContain('Never call anybody a participant');
    expect(flat(PLAIN_WORDS)).toContain('Name them, or say "people"');
  });

  it('shows the sentence both ways, because the rule is easier to follow than to state', () => {
    expect(flat(PLAIN_WORDS)).toContain('"the other two people in this check-in", never "the other two participants"');
  });

  it('covers the other three words of ours that mean a row', () => {
    expect(flat(PLAIN_WORDS)).toContain('"party", "the initiator" and "the respondent"');
  });

  it('and it reaches the two prompts that are seeded', () => {
    for (const key of ['system', 'report_synthesis']) {
      const p = (SEED_PROMPTS as any[]).find((x) => x.key === key);
      expect(flat(p.content)).toContain('Never call anybody a participant');
    }
  });
});
