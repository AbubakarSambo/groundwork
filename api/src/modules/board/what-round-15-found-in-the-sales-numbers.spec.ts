import { theRound15AsADatabase, R15, R15_FRIDAY_EVENING } from './the-round-15-bed';
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
