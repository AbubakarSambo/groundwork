import { GroundScenario, PartyType } from '@prisma/client';
import { boardAs, person, answered } from './the-switchboards-sections-harness';
import { oneLineInTheirName, inTheirOwnWords, saidWithoutTheirWords, eachLineInTheirName, theRecordsLineFor } from './what-each-person-said-is-in-their-name';

/**
 * "WHO OWNS WHAT", AS EACH PERSON READS IT (review of 1 October 2026, runs re-d and run-21).
 *
 * board.whoOwnsWhat[0].items[3].text was Kwame's own words served as if the page said them: "I'm aiming
 * to have all the documents submitted by Friday." Each line is now said as the person's, and only words
 * they typed go inside quotation marks:
 *  - found whole in what they typed: their line, quoted;
 *  - a tidied version of what they typed: the sentence of theirs it came from, quoted;
 *  - drawn from nothing they typed: a plain sentence with none of their words.
 * Every record line and every typed sentence below is word for word from re-d (sales) or run-21.
 */
const BISI = person('p-bisi', 'u-bisi', 'Bisi', 'Adeyemi', PartyType.INITIATOR);
const KWAME = person('p-kwame', 'u-kwame', 'Kwame', 'Mensah');
const FEMI = person('p-femi', 'u-femi', 'Femi', 'Okonkwo');
const people = [BISI, KWAME, FEMI];

const line = (id: string, participantId: string, type: string, text: string) => ({
  id, participantId, type, text, checkInId: `c1-${participantId}`, createdAt: new Date('2026-09-02T16:00:00Z'),
  recallBased: true, backedBy: null, verifiability: null, sourceDocumentId: null, confirmedBy: null,
});
const lines = [
  /* Found whole in what Kwame typed. */
  line('l1', 'p-kwame', 'COMMITMENT', "I'm aiming to have all the documents submitted by Friday."),
  /* The record reader's tidied version of his sentence (re-d, sales). */
  line('l2', 'p-kwame', 'PROGRESS', "I've had follow-up conversations with all 22 of my applications."),
  /* Drawn from nothing he typed. */
  line('l3', 'p-kwame', 'INTENT', 'Chasing the credit team every day is the plan.'),
  /* A piece of what Femi typed: what success is. */
  line('l4', 'p-femi', 'SUCCESS_DEFINITION', 'to disburse N120m'),
];
const turns = [
  { checkInId: 'c1-p-kwame', content: "I'll follow up with all the customers this week to get everything. I'm aiming to have all the documents submitted by Friday." },
  { checkInId: 'c1-p-kwame', content: "I've also had follow-up conversations with all 22 of my applications." },
  { checkInId: 'c1-p-femi', content: 'I am working to achieve 12 approved facilities this quarter. And I want to disburse N120m.' },
];
const setup = { people, initiatorId: 'u-bisi', lines, turns, checkIns: [answered('p-kwame', 1), answered('p-femi', 1)] };

async function whoOwnsWhatAs(userId: string, role = 'MEMBER', more: Record<string, any> = {}): Promise<Record<string, string[]>> {
  const b = await boardAs({ ...setup, ...more }, userId, role);
  return Object.fromEntries((b.whoOwnsWhat ?? []).filter((r: any) => r.items?.length).map((r: any) => [r.name, r.items.map((i: any) => i.text)]));
}

const KWAME_TO_OTHERS = [
  'Kwame Mensah said, "I\'m aiming to have all the documents submitted by Friday."',
  'Kwame Mensah said, "I\'ve also had follow-up conversations with all 22 of my applications."',
  'Kwame Mensah has said what they intend to do.',
];

describe('who owns what: only words a person said go inside quotation marks', () => {
  it('Bisi, the lead, reads each line by name, quoted only where the words are theirs', async () => {
    expect(await whoOwnsWhatAs('u-bisi')).toEqual({
      'Kwame Mensah': KWAME_TO_OTHERS,
      'Femi Okonkwo': ['Femi Okonkwo said success would be "to disburse N120m".'],
    });
  });

  it('Kwame reads his own lines as "You said", and "You have" where none of his words are kept', async () => {
    const seen = await whoOwnsWhatAs('u-kwame');
    expect(seen['You']).toEqual([
      'You said, "I\'m aiming to have all the documents submitted by Friday."',
      'You said, "I\'ve also had follow-up conversations with all 22 of my applications."',
      'You have said what you intend to do.',
    ]);
  });

  /* Request 105 (the prototype's B5, "Only yours"): a person who checks in is served only their own row. Before,
     Femi read Kwame's lines the same way the lead does. */
  it('Femi, a colleague, is served only his own row, and none of Kwame\'s lines', async () => {
    const seen = await whoOwnsWhatAs('u-femi');
    expect(seen['Kwame Mensah']).toBeUndefined();
    expect(JSON.stringify(seen)).not.toMatch(/22 of my applications|documents submitted/);
  });

  it('an admin outside the check-in reads them the same way', async () => {
    expect((await whoOwnsWhatAs('u-admin', 'ADMIN'))['Kwame Mensah']).toEqual(KWAME_TO_OTHERS);
  });

  it('no reader is served the record reader\'s tidied version, or a line of his with no marks', async () => {
    for (const [u, role] of [['u-bisi', 'MEMBER'], ['u-kwame', 'MEMBER'], ['u-femi', 'MEMBER'], ['u-admin', 'ADMIN']] as const) {
      const all = Object.values(await whoOwnsWhatAs(u, role)).flat();
      expect(all.length).toBeGreaterThan(0);
      expect(JSON.stringify(all)).not.toContain("I've had follow-up conversations");
      expect(JSON.stringify(all)).not.toContain('Chasing the credit team');
      for (const t of all) expect(t).toMatch(/^(?:You|[A-Z][a-z]+ [A-Z][a-z]+|A colleague) (?:said\b|has |have )/);
    }
  });

  it('Kwame, the person an evaluation check-in is about, is served no colleague\'s words here', async () => {
    const b = await boardAs({ ...setup, scenario: GroundScenario.PIP }, 'u-kwame', 'MEMBER');
    expect(b.whoOwnsWhat).toBeUndefined();
    expect(JSON.stringify(b)).not.toContain('disburse N120m');
  });
});

describe('how a line may be said', () => {
  it('a tidied line with marks of its own (run-21, realign): the sentences it came from, quoted, their marks made single', () => {
    const said = inTheirOwnWords('The CEO said it was the thing that would really "move the needle."', ['He said it was the thing that would really "move the needle." So, I took that as pretty clear direction.']);
    expect(said.saidAs).toBe('their-sentences');
    const [row] = eachLineInTheirName([{ participantId: 'p-marco', name: 'Marco Bianchi', items: [{ id: 'm1', type: 'SUCCESS_DEFINITION', ...said }] }], null);
    expect(row.items![0].text).toBe('Marco Bianchi said, "He said it was the thing that would really \'move the needle.\' So, I took that as pretty clear direction."');
    expect(row.items![0]).not.toHaveProperty('saidAs');
  });
  it('leaves the words inside the marks exactly as they were said', () => {
    expect(oneLineInTheirName('All files are complete.', 'Ngozi Eze', 'PROGRESS')).toBe('Ngozi Eze said, "All files are complete."');
  });
  it('a line drawn from nothing they typed says what kind of thing it was, with none of their words', () => {
    expect(saidWithoutTheirWords('Kwame Mensah', 'COMMITMENT')).toBe('Kwame Mensah has made a commitment here.');
    expect(saidWithoutTheirWords('You', 'PROGRESS')).toBe('You have reported progress.');
    expect(saidWithoutTheirWords('Kwame Mensah', null)).toBe('Kwame Mensah has said what they own here.');
  });
  /* Release test, 21 November 2026, bug 25: "Wairimu Njoroge has reported progress." for every line said nothing. A line that is the
     record's own wording is quoted as the record's line. */
  it('a line not in their own words is quoted as the record\'s line, with what it says, for the lead and for the person', () => {
    const rows = [{ participantId: 'p-w', name: 'Wairimu Njoroge', items: [{ id: 'w1', type: 'PROGRESS', text: 'We are at 22 of the 40 new weekly shops', saidAs: 'not-their-words' }] }];
    expect(eachLineInTheirName(rows, null)[0].items![0].text).toBe('Wairimu Njoroge’s line in the record reads "We are at 22 of the 40 new weekly shops."');
    expect(eachLineInTheirName(rows, 'p-w')[0].items![0].text).toBe('Your line in the record reads "We are at 22 of the 40 new weekly shops."');
    expect(JSON.stringify(eachLineInTheirName(rows, null))).not.toMatch(/has reported progress/);
    expect(theRecordsLineFor('Amani Wekesa', 'Kilimani Fresh signs on Monday.')).toBe('Amani Wekesa’s line in the record reads "Kilimani Fresh signs on Monday."');
  });
});
