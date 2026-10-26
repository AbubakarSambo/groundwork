import { theRound15AsADatabase, R15, R15_FRIDAY_EVENING, thePersonOfRound15 } from './the-round-15-bed';
import { ReportsService } from '../reports/reports.service';
import { BoardService } from './board.service';
import { aPersonRecordTable } from './the-persons-record-bed';
import { rebuildThePersonsRecords, readThePersonsRecord } from './the-persons-record-store';
import { theRecordInWords } from './the-persons-record-in-words';
import { theDealsOnRecord, theCountFromTheDeals, theSalesStages, theSalesAnswer } from './a-sales-aim-is-counted-from-the-deals';
import { theDepositFor, thePaymentsAddedUp } from './a-deals-proof-is-about-that-deal';
import { theDealWasDropped } from './a-deal-that-was-dropped';

/**
 * GRACE'S AND KEVIN'S SALES NUMBERS, AS POLISH ROUND 15 LEFT THEM (Drop Access, "Sales team, Q4", 12 to 16 October; the scorer's untrue
 * lines U1 to U8 and U14). The truth on record: Kevin proved Kilele Hotel (40 units, the M-Pesa PDF for KES 200,000), Ngong Road Minimart
 * (5 units, SFK2P8LQ4C, KES 25,000) and Savannah Cafe (6 units, the KES 15,000 deposit RBT7Y3KQ2P and the KES 15,000 balance SGL9W4MN7T);
 * Joseph proved Juja Hardware (2 units, TGH5K2M9QX). The run's own rows, served with no database and no model.
 */
const TEAM_UNITS = (R15.drop.objectives as any[]).find((o) => !o.ownerParticipantId && /units/i.test(o.name));
const deals = () => theDealsOnRecord(theRound15AsADatabase({ asOf: R15_FRIDAY_EVENING }), R15.drop.ground.id, { paymentRecord: true });

describe('the balance paid makes a deposit paid in full (U7)', () => {
  it('Savannah Cafe’s deposit and its balance add up to the KES 30,000, so it is not on a deposit', async () => {
    const savannah = (await deals()).find((d) => d.name === 'Savannah Cafe')!;
    expect(savannah.paid).toBe(true);
    expect(savannah.deposit).toBeNull();
  });
  it('a deposit with no balance yet is still a deposit', () => {
    const d = theDepositFor({ name: 'Savannah Cafe', fields: { Contact: 'Jane', Quoted: 'KES 30,000' } }, [{ text: 'Jane paid a deposit of KES 15,000 yesterday by M-Pesa. The code is RBT7Y3KQ2P.' }]);
    expect(d).toEqual({ paid: 15000, of: 30000, currency: 'KES' });
  });
  it('one payment on record twice is added once', () => {
    expect(thePaymentsAddedUp([
      { text: 'Jane paid a deposit of KES 15,000 yesterday by M-Pesa. The code is RBT7Y3KQ2P.' },
      { text: 'Jane paid a deposit of KES 15,000 yesterday by M-Pesa. The code is RBT7Y3KQ2P.' },
      { text: 'The M-Pesa code from Jane for the remaining KES 15,000 is SGL9W4MN7T.' },
    ])).toEqual({ amount: 30000, currency: 'KES' });
  });
});

describe('a deal is dropped only by a sentence about it (U6)', () => {
  it('Ngong Road Minimart is not lost when Kevin gives up Upper Hill Offices and turns to other shops on Ngong Road', async () => {
    const all = await deals();
    expect(all.find((d) => d.name === 'Ngong Road Minimart')!.dropped).toBeNull();
    expect(all.find((d) => d.name === 'Upper Hill Offices')!.dropped).not.toBeNull();
    expect(all.find((d) => d.name === 'Kamau Electricals')!.dropped).not.toBeNull();
  });
  it('“They already buy from Aqua Pure.” drops the deal the sentence before it named, not the road’s other deal', () => {
    const line = { text: 'I visited Kamau Electricals on Ngong Road today, but they weren\'t interested. They already buy from Aqua Pure.', participantId: 'k', createdAt: '2026-10-13T08:00:00Z' };
    const others = ['Kamau Electricals', 'Ngong Road Minimart'];
    expect(theDealWasDropped({ name: 'Ngong Road Minimart', ownerParticipantId: 'k' }, [line], { otherDeals: others })).toBeNull();
    expect(theDealWasDropped({ name: 'Kamau Electricals', ownerParticipantId: 'k' }, [line], { otherDeals: others })).not.toBeNull();
  });
});

describe('Kevin’s 51 units are all paid (U1 and U8)', () => {
  it('the team’s count names Savannah Cafe with Kilele and Ngong Road Minimart, and nothing is on a deposit', async () => {
    const c = theCountFromTheDeals({ name: TEAM_UNITS.name, ownerParticipantId: null }, (await deals()).filter((d) => d.ownerParticipantId === (R15.drop.participants as any[]).find((p) => p.nameGiven === 'Kevin Omondi').id), theSalesStages(null), R15_FRIDAY_EVENING, 'Africa/Nairobi')!;
    expect(c.says).toBe('51 sold, 51 with proof of payment.');
    expect(theSalesAnswer(c, 120, 0)).toBe('Not yet. 51 of the 120 units are sold. 51 are paid (Kilele, Ngong Road Minimart and Savannah Cafe).');
  });
});

/* ------------------------------------------------------------------------------------------------ Joseph's Juja Hardware, and what each sale is worth */

async function theBoardAs(first: 'Grace' | 'Kevin' | 'Joseph') {
  const prisma = theRound15AsADatabase({ asOf: R15_FRIDAY_EVENING });
  const reports = Object.create(ReportsService.prototype) as ReportsService;
  const svc = new BoardService(prisma as any, { respond: jest.fn(async () => null) } as any, { getSessionProgress: async () => null } as any, reports);
  const userId = first === 'Grace' ? R15.drop.ground.initiatorId : thePersonOfRound15(first).userId;
  return (await svc.get(R15.drop.ground.id, userId, undefined, { now: R15_FRIDAY_EVENING })) as any;
}
const everyLine = (w: any): string[] => (JSON.stringify(w).match(/"(?:[^"\\]|\\.)*"/g) ?? []).map((x) => JSON.parse(x));
const aimSays = (b: any, name: RegExp) => (b.objectives as any[]).filter((o) => name.test(o.name)).map((o) => [o.fromTheDeals?.says, o.journey?.say]);

describe('Joseph’s M-Pesa code, typed as the answer to “What shows the sale of those two units?”, is Juja Hardware’s payment (U14)', () => {
  it('Juja Hardware is paid, by M-Pesa code TGH5K2M9QX, for the 2 units he sold, and keeps the 5 units he asked a price for', async () => {
    const juja = (await deals()).find((d) => d.name === 'Juja Hardware')!;
    expect([juja.paid, juja.paymentOnFile, juja.mpesaCode, juja.deposit]).toEqual([true, true, 'TGH5K2M9QX', null]);
    expect([juja.soldFields?.Units, juja.soldFields?.Value]).toEqual(['2', 'KES 10,000']);
    expect([juja.fields.Units, juja.fields.Value]).toEqual(['5', 'KES 22,500']);
  });
  it('Joseph’s own aim reads 2 sold, on every board that shows it', async () => {
    for (const reader of ['Grace', 'Joseph'] as const) {
      expect(aimSays(await theBoardAs(reader), /30 units, easily/)).toEqual([['2 sold, 2 with proof of payment.', 'It is 2 now, and the aim is 30.']]);
    }
    expect(everyLine(await theBoardAs('Joseph'))).toContain('You have sold 2 of your 30 units so far, all to Juja Hardware, paid.');
  });
  it('Joseph reads both of his lines about those 2 units as shown by the M-Pesa code, never “Nothing on file shows it yet”', async () => {
    const t = aPersonRecordTable();
    await rebuildThePersonsRecords(theRound15AsADatabase({ asOf: R15_FRIDAY_EVENING, personRecord: t }), R15.drop.ground.id, R15_FRIDAY_EVENING);
    const stored = await readThePersonsRecord({ personRecord: t }, thePersonOfRound15('Joseph').participantId);
    const said = theRecordInWords(stored!.record, stored!.coaching, { self: true, firstName: 'Joseph' }, R15.drop.ground.label).parts.find((p) => p.heading === 'What you said and what shows it')!;
    expect(said.evidence).toContain('On Thursday 15 October you said “Juja Hardware bought 2 units today. KES 10,000 by M-Pesa.” The M-Pesa code TGH5K2M9QX shows it.');
    expect(said.evidence).toContain('On Friday 16 October you said “Mr. Mutua bought 2 units yesterday at KES 5,000 each.” The M-Pesa code TGH5K2M9QX shows it.');
  });
});

describe('the team’s numbers, as Grace, Kevin and Joseph read them (U1, U2, U7, U8)', () => {
  it('Grace reads 53 units and KES 265,000 sold, all with proof of payment, from the four orders by name', async () => {
    const grace = await theBoardAs('Grace');
    expect(aimSays(grace, /120 units/)).toEqual([['53 sold, 53 with proof of payment.', 'It is 53 now, and the aim is 120.']]);
    expect(aimSays(grace, /600,000/)).toEqual([['KES 265,000 sold, KES 265,000 with proof of payment.', 'It is 265,000 now, and the aim is 600,000.']]);
    expect(grace.whereThisIsHeading.signals[0].from).toBe('From the deals. The 53 sold came from four orders, Kilele, Juja Hardware, Ngong Road Minimart and Savannah Cafe.');
  });
  it('Grace reads what each of them won, with the M-Pesa code or the payment record that shows it', async () => {
    const lines = everyLine(await theBoardAs('Grace'));
    expect(lines).toContain('Juja Hardware is won for 2 units at KES 10,000, and the M-Pesa code TGH5K2M9QX shows it.');
    expect(lines).toContain('Savannah Cafe is won for 6 units at KES 30,000, and the M-Pesa code RBT7Y3KQ2P shows it.');
    expect(lines).toContain('Ngong Road Minimart is won for 5 units at KES 25,000, and the M-Pesa code SFK2P8LQ4C shows it.');
    expect(lines).toContain('Kilele is won for 40 units at KES 200,000, and a payment record shows it.');
    expect(lines.filter((l) => /Deposit paid|on a deposit/.test(l))).toEqual([]);
    expect(lines.filter((l) => /Ngong Road Minimart was lost/.test(l))).toEqual([]);
    /* The price Joseph asked about is still for the 5 units he asked it for. */
    expect(lines).toContain('Juja Hardware wants 5 units at KES 4,500 instead of 5,000, and Joseph is waiting for your yes or no.');
  });
  it('Kevin reads his 51 units as Kilele, Ngong Road Minimart and Savannah Cafe, all paid', async () => {
    const lines = everyLine(await theBoardAs('Kevin'));
    expect(lines).toContain('You have sold 51 units so far, 21 more than your target of 30, all to Kilele, Ngong Road Minimart and Savannah Cafe, paid.');
    expect(lines.filter((l) => /no deals on the board yet|was lost/.test(l) && /Ngong Road Minimart|no deals/.test(l))).toEqual([]);
  });
});
