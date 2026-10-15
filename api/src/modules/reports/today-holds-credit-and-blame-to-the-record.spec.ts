import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { todayHeldToTheRecord } from './what-today-reads-from-the-record';

/* Comments are taken out before anything is matched, so a sentence in a comment cannot satisfy a check (a-guard-that-a-comment-satisfies-is-not-a-guard). */
const withoutComments = (t: string): string => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');


/*
 * TODAY GOES THROUGH THE CREDIT, BLAME AND LABEL CHECK (Hafsah, 12 October, step 3: "Never invent credit or blame nobody gave ('colleagues
 * said you helped them' only when a transcript holds it)"). The board, the reports, coaching, the letter and every session turn already
 * ran it; Today did not. Without it each invented line below reaches Esther as written.
 */
const people = [
  { id: 'p-h', partyType: 'PARTICIPANT', nameGiven: 'Hassan Mwenda', createdAt: new Date('2026-10-01'), user: { firstName: 'Hassan', lastName: 'Mwenda' } },
  { id: 'p-a', partyType: 'PARTICIPANT', nameGiven: 'Amina Otieno', createdAt: new Date('2026-10-01'), user: { firstName: 'Amina', lastName: 'Otieno' } },
  { id: 'p-e', partyType: 'INITIATOR', nameGiven: 'Esther Wanjiru', createdAt: new Date('2026-09-30'), user: { firstName: 'Esther', lastName: 'Wanjiru' } },
];
const prismaWith = (lines: { participantId: string; text: string }[]) => ({
  groundParticipant: { findMany: async () => people },
  groundDependency: { findMany: async () => [] },
  recordEntry: { findMany: async () => lines },
  ground: { findUnique: async () => ({ brief: 'Sell kits in Kisii.', label: 'Kits', participants: [], objectives: [] }) },
});
const credit = { id: 'f1', decide: 'A colleague said Hassan Mwenda helped them with the Kisii order.', why: 'Hassan Mwenda did not mention it in his own check-ins.' };

describe('Today, as Esther reads it', () => {
  it('loses a credit no colleague gave', async () => {
    const out = await todayHeldToTheRecord(prismaWith([{ participantId: 'p-h', text: 'I restock the shops in Kisii once a month.' }]), 'g-1', { forTheLead: [credit] });
    expect(JSON.stringify(out)).not.toContain('helped them');
  });

  it('keeps the credit where Amina said it in her own words', async () => {
    const out = await todayHeldToTheRecord(prismaWith([
      { participantId: 'p-h', text: 'I restock the shops in Kisii once a month.' },
      { participantId: 'p-a', text: 'Hassan helped me sort the Kisii order on Tuesday.' },
    ]), 'g-1', { forTheLead: [credit] });
    expect(out.forTheLead?.[0].decide).toBe(credit.decide);
  });

  it('loses a label put on a person', async () => {
    const out = await todayHeldToTheRecord(prismaWith([{ participantId: 'p-h', text: 'I restock the shops in Kisii once a month.' }]), 'g-1', {
      sinceLast: { says: 'Hassan Mwenda is stuck and not chasing. The team sold 21 kits.' } as any,
    });
    expect((out.sinceLast as any).says).toBe('The team sold 21 kits.');
  });

  it('is what whatTodayReads serves', () => {
    const src = withoutComments(readFileSync(join(__dirname, 'what-today-reads-from-the-record.ts'), 'utf8'));
    expect(src).toMatch(/const today = await todayHeldToTheRecord\(prisma, groundId,/);
  });
});
