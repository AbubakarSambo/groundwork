import { PartyType } from '@prisma/client';
import { boardAs, person, answered } from './the-switchboards-sections-harness';
import { oneLineInTheirName } from './what-each-person-said-is-in-their-name';

/**
 * "WHO OWNS WHAT", AS EACH PERSON READS IT (review of 1 October 2026, run re-d, sales, session 1).
 *
 * board.whoOwnsWhat[0].items[3].text and participantBoard.whoOwnsWhat[0].items[3].text were Kwame's
 * own words, served as if the page said them: "I'm aiming to have all the documents submitted by
 * Friday." Every line below is word for word what re-d stored. Each is now the person's words in
 * quotation marks, with their name, and "You said" for the person themselves.
 */
const people = [
  person('p-bisi', 'u-bisi', 'Bisi', 'Adeyemi', PartyType.INITIATOR),
  person('p-kwame', 'u-kwame', 'Kwame', 'Mensah'),
  person('p-femi', 'u-femi', 'Femi', 'Okonkwo'),
];
const line = (id: string, participantId: string, type: string, text: string) => ({
  id, participantId, type, text, checkInId: `c1-${participantId}`, createdAt: new Date('2026-09-02T16:00:00Z'),
  recallBased: true, backedBy: null, verifiability: null, sourceDocumentId: null, confirmedBy: null,
});
const lines = [
  line('l1', 'p-kwame', 'COMMITMENT', "I'm aiming to have all the documents submitted by Friday."),
  line('l2', 'p-kwame', 'PROGRESS', "I've already submitted 22 applications"),
  line('l3', 'p-femi', 'SUCCESS_DEFINITION', 'to disburse N120m'),
];
const setup = { people, initiatorId: 'u-bisi', lines, checkIns: [answered('p-kwame', 1), answered('p-femi', 1)] };

async function whoOwnsWhatAs(userId: string, role = 'MEMBER'): Promise<Record<string, string[]>> {
  const b = await boardAs(setup, userId, role);
  return Object.fromEntries((b.whoOwnsWhat ?? []).filter((r: any) => r.items?.length).map((r: any) => [r.name, r.items.map((i: any) => i.text)]));
}

describe('who owns what: each line is the person’s words, in quotation marks, with their name', () => {
  it('Bisi, the lead, reads each line as said by the person, by name', async () => {
    expect(await whoOwnsWhatAs('u-bisi')).toEqual({
      'Kwame Mensah': [
        'Kwame Mensah said, "I\'m aiming to have all the documents submitted by Friday."',
        'Kwame Mensah said, "I\'ve already submitted 22 applications."',
      ],
      'Femi Okonkwo': ['Femi Okonkwo said success would be "to disburse N120m".'],
    });
  });

  it('Kwame reads his own lines as "You said"', async () => {
    const seen = await whoOwnsWhatAs('u-kwame');
    expect(Object.values(seen).flat()).toContain('You said, "I\'m aiming to have all the documents submitted by Friday."');
    expect(Object.values(seen).flat()).not.toContain("I'm aiming to have all the documents submitted by Friday.");
  });

  it('no line is served bare in the first person, to the lead, a participant or an admin', async () => {
    for (const [u, role] of [['u-bisi', 'MEMBER'], ['u-femi', 'MEMBER'], ['u-admin', 'ADMIN']] as const) {
      const all = Object.values(await whoOwnsWhatAs(u, role)).flat();
      expect(all.length).toBeGreaterThan(0);
      for (const t of all) expect(t).toMatch(/^(?:You|[A-Z][a-z]+ [A-Z][a-z]+|A colleague) said\b/);
    }
  });

  it('leaves the words inside the marks exactly as they were said', () => {
    expect(oneLineInTheirName('All files are complete.', 'Ngozi Eze', 'PROGRESS')).toBe('Ngozi Eze said, "All files are complete."');
  });
});
