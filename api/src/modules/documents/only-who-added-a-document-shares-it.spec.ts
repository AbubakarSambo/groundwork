import { writeADocumentsNumbers, ONLY_WHO_ADDED_IT_CAN_SHARE_IT } from './write-a-documents-numbers';

/**
 * DECISION 92: a private document's numbers and its note reach the check-in only by a yes from the
 * person who added it. Checked where every way of saying yes arrives, on what is written.
 */
function aPrisma(documentOwner: string | null) {
  const created: any[] = [];
  const prisma: any = {
    groundObjective: { findMany: jest.fn(async () => []), createMany: jest.fn(async (q: any) => { created.push(...q.data); return {}; }) },
    groundContextItem: { create: jest.fn(async (q: any) => { created.push(q.data); return {}; }) },
    groundDocument: { findUnique: jest.fn(async () => ({ participantId: documentOwner })), update: jest.fn(async () => ({})) },
    groundParticipant: { findMany: jest.fn(async () => []) },
  };
  return { prisma, created };
}
const input = (who: string) => ({
  groundId: 'g1', documentId: 'd1', fileName: 'targets.xlsx', documentVisibility: 'OWN',
  waiting: [{ name: 'Sales', target: 12, ownerParticipantId: null }], holds: { waiting: [] },
  setByParticipantId: who, sortOrderBase: 1, addNote: true, reader: 'setup' as const,
});

describe('only the person who added a document can share what is in it', () => {
  it('somebody else\'s yes writes nothing, leaves the document waiting, and says why', async () => {
    const { prisma, created } = aPrisma('p-amina');
    const said = await writeADocumentsNumbers(prisma, input('p-wairimu'));
    expect(said).toBe('Nothing was shared, because only the person who added this document can share what is in it.');
    expect(said).toBe(ONLY_WHO_ADDED_IT_CAN_SHARE_IT);
    expect(created).toEqual([]);
    expect(prisma.groundDocument.update).not.toHaveBeenCalled();
  });
  it('a document nobody is recorded as having added is shared by nobody', async () => {
    const { prisma, created } = aPrisma(null);
    expect(await writeADocumentsNumbers(prisma, input('p-wairimu'))).toBe(ONLY_WHO_ADDED_IT_CAN_SHARE_IT);
    expect(created).toEqual([]);
  });
  it('the person who added it shares it with their yes', async () => {
    const { prisma, created } = aPrisma('p-amina');
    const said = await writeADocumentsNumbers(prisma, input('p-amina'));
    expect(said).not.toBe(ONLY_WHO_ADDED_IT_CAN_SHARE_IT);
    expect(created.length).toBeGreaterThan(0);
    expect(prisma.groundDocument.update).toHaveBeenCalled();
  });
});
