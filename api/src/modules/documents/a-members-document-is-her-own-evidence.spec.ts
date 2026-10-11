import { DocumentsService } from './documents.service';
import { theContextWeHave } from './what-a-document-holds';
import { aDocumentReadItemByItem } from './a-document-read-item-by-item';

/**
 * B-102. Amani, a member, sent her pipeline sheet on WhatsApp ("Acme 40000 won") and was asked
 * "For everyone in this check-in, the target for Acme is 40,000. Is that right?". A member's file is
 * her own evidence, in her words; it never becomes a target for everyone. The lead's file still can.
 */
async function readAs(participantId: string) {
  const s = Object.create(DocumentsService.prototype) as any;
  const saved: any[] = [];
  s.prisma = {
    ground: { findUnique: jest.fn(async () => ({ initiatorId: 'u-lead', participants: [
      { id: 'p-lead', userId: 'u-lead', email: 'r@x.test', managingOnly: false, user: { firstName: 'Rukia', lastName: 'Otieno' } },
      { id: 'p-amani', userId: 'u-amani', email: 'a@x.test', managingOnly: false, user: { firstName: 'Amani', lastName: 'Wekesa' } },
    ], objectives: [] })) },
    groundDocument: { update: jest.fn(async (a: any) => { saved.push(a.data.holds); return {}; }) },
  };
  s.anthropic = { extract: jest.fn(async () => ({ whatItIs: 'A sales pipeline.', forOnePerson: [], forEverybody: [{ what: 'Acme', target: 40000, kind: 'to reach', by: null }], dates: [] })) };
  s.logger = { log: jest.fn(), warn: jest.fn() };
  const held = await s.whatItHolds('d-1', 'g-1', participantId, 'Acme 40000 won\nBeta 25000 open', 'pipeline.pdf');
  return { held, saved: saved[0] };
}

describe('B-102: a member\'s document is her own evidence', () => {
  it('Amani\'s pipeline offers no target for everyone, and nothing waits on a yes', async () => {
    const { held, saved } = await readAs('p-amani');
    expect(held.forEverybody).toEqual([]);
    expect(saved.waiting).toEqual([]);
    const said = theContextWeHave(held, { asking: true, reader: { participantId: 'p-amani' } });
    expect(said ?? '').not.toMatch(/For everyone in this check-in/);
    expect(said ?? '').not.toMatch(/40,000/);
  });

  it('and her own read says plainly what it left out and why', async () => {
    const { held } = await readAs('p-amani');
    const items = aDocumentReadItemByItem(held)!;
    expect(items.leftOut).toContainEqual(expect.objectContaining({
      what: 'Targets for everyone in this check-in',
      why: 'Only the lead sets a target for everyone. The numbers stay in your file as your own evidence, in your words.',
    }));
  });

  it('the lead\'s own file still offers it, as before', async () => {
    const { held } = await readAs('p-lead');
    expect(theContextWeHave(held, { asking: true })).toContain('For everyone in this check-in, the target for Acme is 40,000.');
  });
});
