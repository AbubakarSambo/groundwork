import { DocumentsService } from './documents.service';
import { withoutBankDetails } from './bank-details-are-never-kept';
import { theContextWeHave } from './what-a-document-holds';

/**
 * BANK DETAILS ARE WHAT IT LEFT OUT, NEVER WHAT IT TOOK (request 40 (b)). The prototype's upload
 * screen lists "Bank account details. Never kept, in any document." under "What it left out". The
 * read of a file that held them now says so, on the document's `holds.leftOut`, and in the sentence
 * the chat and the Context page read.
 */
async function readOf(text: string) {
  const s = Object.create(DocumentsService.prototype) as any;
  const saved: any[] = [];
  s.prisma = {
    ground: { findUnique: jest.fn(async () => ({ initiatorId: 'u-lead', participants: [{ id: 'p-lead', userId: 'u-lead', email: 'l@x.test', managingOnly: false, user: { firstName: 'Rukia', lastName: 'Otieno' } }], objectives: [] })) },
    groundDocument: { update: jest.fn(async (a: any) => { saved.push(a.data.holds); return {}; }) },
  };
  s.anthropic = { extract: jest.fn(async () => ({ whatItIs: 'A price list for the 600L cookers.', forOnePerson: [], forEverybody: [{ what: 'Lowest price for the 600L', target: 76000, kind: 'to reach', by: null }], dates: [] })) };
  s.logger = { log: jest.fn(), warn: jest.fn() };
  const held = await s.whatItHolds('d-1', 'g-1', 'p-lead', withoutBankDetails(text), 'Q3 price list.pdf');
  return { held, saved: saved[0] };
}

describe('a file that held bank details', () => {
  it('keeps them under what it left out, in the prototype\'s words, and says so in a plain sentence', async () => {
    const { held, saved } = await readOf('Lowest price for the 600L: 76,000\nPay to account number 0123456789 at Equity Bank.');
    expect(saved.leftOut).toEqual([{ what: 'Bank account details', why: 'Never kept, in any document.' }]);
    const said = theContextWeHave(held)!;
    expect(said).toContain('It also held bank account details. Those are never kept, in any document.');
    expect(said).not.toMatch(/0123456789/);
    expect(JSON.stringify(held.forEverybody)).not.toMatch(/[Bb]ank/);
  });

  it('and a file without them says nothing about bank details', async () => {
    const { held, saved } = await readOf('Lowest price for the 600L: 76,000');
    expect(saved.leftOut).toBeUndefined();
    expect(theContextWeHave(held)).not.toMatch(/bank/i);
  });
});
