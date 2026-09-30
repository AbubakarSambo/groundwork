import { theContextWeHave } from './what-a-document-holds';
import { writeADocumentsNumbers } from './write-a-documents-numbers';

/** REQUEST 92, POINT 2. The old context chat's sheet path says the note before the yes, and writes that note. */
const HOLDS: any = {
  fileName: 'q4-targets.xlsx', whatItIs: null,
  forOnePerson: [], forEverybody: [{ what: 'New dealers', target: 12, kind: 'to reach', by: null }],
  dates: [], unmatched: [], waiting: [{ name: 'New dealers', target: 12, ownerParticipantId: null }],
};

describe('the note a yes to a document writes is said first, and is true', () => {
  it.each([
    ['OPEN', 'The numbers on this check-in come from q4-targets.xlsx.'],
    ['OWN', 'The numbers on this check-in come from a document the person running it added.'],
  ])('for a %s document the say-back quotes the note that is then written', async (visibility, note) => {
    const asking = theContextWeHave(HOLDS, { asking: true, willNoteIt: { visibility } })!;
    expect(asking).toContain(`If you say yes, I will also add a note that everyone on this check-in can read. The note will read “${note}”`);
    expect(asking.indexOf('The note will read')).toBeLessThan(asking.indexOf('Is that right?'));
    const made: any[] = [];
    const prisma: any = {
      groundObjective: { findMany: async () => [], createMany: async () => ({}) },
      groundContextItem: { create: async ({ data }: any) => { made.push(data); return {}; } },
      groundDocument: { update: async () => ({}) },
    };
    await writeADocumentsNumbers(prisma, {
      groundId: 'g1', documentId: 'd1', fileName: 'q4-targets.xlsx', documentVisibility: visibility,
      waiting: HOLDS.waiting, holds: HOLDS, setByParticipantId: 'p1', sortOrderBase: 300, addNote: true, reader: 'setup',
    });
    expect(made).toEqual([expect.objectContaining({ text: note, audience: 'EVERYONE' })]);
    expect(made[0].text).not.toContain('when it was set up');
  });

  it('says nothing about a note where none is written (a check-in in progress, the page)', () => {
    expect(theContextWeHave(HOLDS, { asking: true })).not.toContain('I will also add a note');
    expect(theContextWeHave(HOLDS)).not.toContain('I will also add a note');
  });
});
