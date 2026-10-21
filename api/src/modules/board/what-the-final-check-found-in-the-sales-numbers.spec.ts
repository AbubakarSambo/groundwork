import { FC, theCheckAsADatabase, THURSDAY_MORNING } from './the-final-check-bed';
import { theDealsOnRecord, theCountFromTheDeals, theSalesStages } from './a-sales-aim-is-counted-from-the-deals';
import { theDepositFor, aDepositSaid } from './a-deals-proof-is-about-that-deal';
import { theStartOfATargetFromTheDeals } from './where-a-target-from-the-deals-started';
import { theTargetLines } from '../engagement/the-direct-morning';
import { withoutDifferencesNobodyHad, aSideThatOnlyDoesNotKnow } from '../reports/agreeing-with-the-lead-is-not-a-difference';

/**
 * GRACE'S SALES NUMBERS, AS THE FINAL REAL-MODEL CHECK LEFT THEM (items 10, 11, 12 and 13; Hafsah, 21 October 2026). The run's own rows,
 * served with no database and no model. Savannah Cafe paid a KES 15,000 deposit on KES 30,000 and was counted as paid in full ("47 paid",
 * "46 with proof"); the morning said "the open deals cover it if they close"; the board said "It was 40 at the start and is 40 now"; and the
 * report wrote a difference between Grace, who said she did not have the count, and Kevin, who had sold 40 units.
 */
const TEAM_AIM = FC.drop.objectives.find((o: any) => !o.ownerParticipantId && o.target === 120);

describe('a deposit is not a full payment (item 10)', () => {
  it('Savannah Cafe’s only payment record is a deposit of KES 15,000 on KES 30,000', () => {
    const savannah = FC.drop.items.find((i: any) => i.name === 'Savannah Cafe');
    const said = FC.drop.lines.filter((l: any) => /RBT7Y3KQ2P/.test(l.text)).map((l: any) => ({ text: l.text }));
    const d = theDepositFor({ name: savannah.name, fields: savannah.fields }, said)!;
    expect(aDepositSaid(d)).toBe('Deposit paid, KES 15,000 of KES 30,000.');
  });
  it('the team’s count is 47 sold, 41 with proof of payment, and 6 on a deposit, and Kilele Hotel is paid', async () => {
    const deals = await theDealsOnRecord(theCheckAsADatabase('drop', { asOf: THURSDAY_MORNING }), FC.drop.ground.id, { paymentRecord: true });
    expect(deals.find((d) => d.name === 'Savannah Cafe')!.deposit).toEqual({ paid: 15000, of: 30000, currency: 'KES' });
    expect(deals.find((d) => d.name === 'Kilele Hotel')!.deposit).toBeNull();
    const c = theCountFromTheDeals({ name: TEAM_AIM.name, ownerParticipantId: null }, deals, theSalesStages(null), THURSDAY_MORNING, 'Africa/Nairobi')!;
    expect([c.count, c.proven, c.deposit]).toEqual([47, 41, 6]);
    expect(c.says).toBe('47 sold, 41 with proof of payment, and 6 on a deposit.');
    expect((c.paidDeals ?? []).map((x) => x.name)).not.toContain('Savannah Cafe');
  });
});

describe('Grace’s target line (items 10 and 11)', () => {
  it('says what is paid, what is on a deposit, and how much the open deals hold against the gap', () => {
    const board = {
      objectives: [{ target: 120, name: TEAM_AIM.name, ownerParticipantId: null, fromTheDeals: { sold: 47, proven: 41, deposit: 6 } }],
      workRecords: [{ section: 'Deal grid', rows: [
        { kind: 'deal', name: 'Greenfield Supermarket', group: 'need', fields: { Units: '25' } },
        { kind: 'deal', name: 'Juja Hardware', group: 'need', fields: { Units: '20' } },
        { kind: 'deal', name: 'Lavington Business Park', group: 'pitched', fields: { Units: '20' } },
        { kind: 'deal', name: 'Ngong Road Minimart', group: 'quoted', fields: { Units: '5' } },
        { kind: 'deal', name: 'corporate lead', group: 'contacted', fields: { Units: '20' } },
      ] }],
      toCloseTheGap: { deals: [{ name: 'Greenfield Supermarket' }, { name: 'Juja Hardware' }, { name: 'Lavington Business Park' }, { name: 'Ngong Road Minimart' }, { name: 'corporate lead' }] },
    };
    expect(theTargetLines(board, THURSDAY_MORNING, 'Africa/Nairobi').lines[0].text).toBe('47 of 120 sold, 41 paid, 6 on a deposit, 73 short, and the open deals hold 90, which covers it if they close.');
  });
});

describe('where Grace’s target started (item 12)', () => {
  it('a units target set before Monday’s first answer started at what the deals held then, 0, not at Monday evening’s 40', () => {
    const firstAnswer = Math.min(...FC.drop.checkIns.filter((c: any) => c.sessionNumber === 1 && c.completedAt).map((c: any) => new Date(c.completedAt).getTime()));
    const deals = FC.drop.items.filter((i: any) => i.kind === 'deal').map((i: any) => ({ stagesKept: i.fields?._stages ?? [], ownerParticipantId: i.ownerParticipantId, fields: i.fields }));
    expect(theStartOfATargetFromTheDeals(TEAM_AIM, { counts: 'units' }, firstAnswer, deals, 40)).toBe(0);
    /* A target added after people answered keeps its first snapshot. */
    expect(theStartOfATargetFromTheDeals({ ...TEAM_AIM, createdAt: '2026-10-13T12:00:00Z' }, { counts: 'units' }, firstAnswer, deals, 40)).toBe(40);
  });
});

describe('not knowing a number is not a different number (item 13)', () => {
  it('the run’s difference between Grace and Kevin is left out, and a real difference stays', () => {
    const run = {
      topic: 'Your account shows no new sales confirmed, while Kevin Omondi’s account shows 40 units sold with proof.',
      positions: [
        { participantLabel: 'the initiator', view: 'Your account indicates that you do not have a current count of the team\'s sales.' },
        { participantLabel: 'Participant A', view: 'Kevin Omondi reports 40 units sold to Kilele Hotel with proof of payment.' },
      ],
    };
    const real = {
      topic: 'There are different approaches to reporting sales.',
      positions: [
        { participantLabel: 'Participant C', view: 'Participant C is forecasting large deals, such as 15 units for Mama Pima and 20 for Juja Hardware, that are not yet signed.' },
        { participantLabel: 'Participant A', view: 'Participant A reports sales only after they are closed and a transaction is confirmed.' },
      ],
    };
    expect(aSideThatOnlyDoesNotKnow(run.positions[0].view)).toBe(true);
    const out = withoutDifferencesNobodyHad([run, real], () => null, null);
    expect(out.divergences).toEqual([real]);
    expect(out.leftOut).toEqual([run.topic]);
  });
});
