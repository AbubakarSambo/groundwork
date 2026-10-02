import { ReportsService } from './reports.service';

/**
 * SCREENS REQUEST 111 (e), "WHAT TO ASK EACH PERSON", ON THE SALES BOARD ("Sales team, Q3"), 2 OCTOBER 2026.
 *
 * Rukia Otieno runs it and checks in herself. She read, in her own list of what to ask each person:
 *  - a card for herself, though the list is of what to ask the others;
 *  - "Worth getting on record, where anyone could check it later: Twelve signed supply contracts ... and I
 *    want us to sign 12 shops.": two pieces joined with a colon, and "I" in the middle of a sentence.
 *
 * Built through the report's own builder, with Rukia reading and Amani in the check-in.
 */
const PEOPLE = [
  { id: 'p-rukia', userId: 'u-rukia', partyType: 'INITIATOR', managingOnly: false, roleAsDescribed: 'runs the sales team' },
  { id: 'p-amani', userId: 'u-amani', partyType: 'PARTICIPANT', managingOnly: false, roleAsDescribed: 'sales' },
];
const NAMES: Record<string, string> = { 'p-rukia': 'Rukia Otieno', 'p-amani': 'Amani Wekesa' };

function probesFor(readerId: string, lines: any[]) {
  const prisma: any = {
    patternDetection: { findMany: jest.fn(async () => []) },
    groundDependency: { findMany: jest.fn(async () => []) },
    recordEntry: { findMany: jest.fn(async () => lines) },
    groundDocument: { findMany: jest.fn(async () => []) },
    checkIn: { findMany: jest.fn(async () => [{ participantId: 'p-rukia', sessionNumber: 1 }, { participantId: 'p-amani', sessionNumber: 1 }]) },
  };
  const svc = Object.create(ReportsService.prototype) as any;
  svc.prisma = prisma;
  svc.logger = { warn: () => undefined, log: () => undefined };
  const nameOf = (pid: string | null) => (pid === readerId ? 'you' : pid ? NAMES[pid] : null);
  const plain = (pid: string) => NAMES[pid] ?? null;
  return svc.whatToProbeOn('g-sales', { id: 'g-sales', scenario: 'OKR_ALIGNMENT', participants: PEOPLE, checkIns: [] }, true, nameOf, plain);
}

const RUKIAS_LINE = { participantId: 'p-rukia', type: 'SUCCESS_DEFINITION', text: 'Twelve signed supply contracts with shops in Nairobi, and I want us to sign 12 shops.', recallBased: false, saidWordForWord: false };
const AMANIS_LINE = { participantId: 'p-amani', type: 'PROGRESS', text: 'I will deliver the Tuskys cookers on 9 October.', recallBased: false, saidWordForWord: true };

describe('what to ask each person', () => {
  it('Rukia, who runs it, is not listed to herself', async () => {
    const rows = await probesFor('p-rukia', [RUKIAS_LINE, AMANIS_LINE]);
    expect(rows.map((r: any) => r.who)).toEqual(['Amani Wekesa']);
  });

  it('a line in the person\'s own words is quoted as theirs, in a sentence of its own, with no colon', async () => {
    const rows = await probesFor('p-rukia', [RUKIAS_LINE, AMANIS_LINE]);
    expect(rows[0].encourage).toEqual(['Amani Wekesa said, "I will deliver the Tuskys cookers on 9 October." That is worth getting on record, so anyone can check it later.']);
  });

  it('a line the record wrote in its own words is counted, and never put mid-sentence with its "I"', async () => {
    /* The admin who set it up reads Rukia's row. */
    const rows = await probesFor('p-nobody', [RUKIAS_LINE]);
    const rukia = rows.find((r: any) => r.who === 'Rukia Otieno');
    expect(rukia.encourage).toEqual(['Rukia Otieno put one thing on record that anyone could check later, which is worth recognising.']);
    expect(JSON.stringify(rows)).not.toMatch(/later: /);
  });
});
