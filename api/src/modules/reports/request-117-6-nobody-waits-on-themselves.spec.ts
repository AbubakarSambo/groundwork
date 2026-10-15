import { serviceFor, theSessionReportAs, everyString } from './__fixtures__/sales-team-q3-two-sessions';
import { boardAs } from '../board/the-switchboards-sections-harness';
import { review5, RUKIA_RUNS_IT, AMANI, BARAKA_M, NEEMA, JUMA_READS, GRACE_SET_IT_UP } from '../board/__fixtures__/sales-board-review-5';

/**
 * SCREENS REQUEST 117 (6): "You are waiting on themselves to approve a discount for Baraka Mwangi and to send a
 * price list to Amani Wekesa." Rukia's own things to do were stored as a wait on "themselves" before request 111
 * (e). The board had stopped reading it as a wait, but the report's coaching and probe list read every stored
 * wait, so Rukia's own coaching note said "Put to approve a discount ... in writing", which is what the wording
 * pass turned into "waiting on themselves", and the lead's probe list said "Rukia Otieno has been waiting for 6
 * days for to approve a discount ...". What she should read is her colleagues' own waits on her: "Baraka Mwangi
 * and Amani Wekesa are waiting on you for the discount and the price list."
 *
 * Read as Rukia who runs it, Amani and Baraka who check in, Juma an admin who only reads, and Grace who set it
 * up, on the report, a session's report, the board's coaching and the board.
 */
const SELF = /themselves|to approve a discount for Baraka Mwangi/;

function withTheStoredRows() {
  const { svc, w } = serviceFor('sales');
  (svc as any).anthropic = { respond: jest.fn(async () => null) };
  const deps = w.dependencies as any[];
  deps[0].status = 'WAITING'; deps[0].clearedAt = null; deps[0].what = 'the discount';
  deps[1].what = 'the price list';
  deps.push({
    id: 'd-self', groundId: 'g1', fromParticipantId: 'p-rukia', onParticipantId: null, onLabel: 'themselves',
    what: 'to approve a discount for Baraka Mwangi and to send a price list to Amani Wekesa', status: 'WAITING',
    createdAt: new Date('2026-09-26T09:00:00Z'), clearedAt: null, escalatedAt: null, triedSaid: null, blockerKind: null, sourceCheckInId: 'c-p-rukia-1', namedTheThing: true,
  });
  return svc;
}

describe('request 117 (6): nobody waits on themselves, on the coaching and the probe list', () => {
  it('Rukia reads her colleagues waiting on her, and nothing of hers as a wait on herself', async () => {
    const svc = withTheStoredRows();
    const c: any = await svc.coachingForTheBoard('g1', 'u-rukia');
    expect(everyString(c).filter((s) => SELF.test(s))).toEqual([]);
    expect(c.yours.beforeNextTime[0]).toMatch(/^Baraka Mwangi and Amani Wekesa are waiting on you\b.* for the discount and the price list\./);
  });

  it('Grace, who set it up, reads no wait of Rukia\'s on herself in the probe list', async () => {
    const svc = withTheStoredRows();
    const c: any = await svc.coachingForTheBoard('g1', 'u-grace');
    expect(everyString(c).filter((s) => SELF.test(s))).toEqual([]);
    const rukia = c.eachPerson.find((p: any) => p.who === 'Rukia Otieno');
    expect(rukia.probe[0]).toMatch(/^Baraka Mwangi and Amani Wekesa say the work is waiting on Rukia Otieno for the discount and the price list\. Not backed: no attempt to unblock mentioned\. Baraka Mwangi and Amani Wekesa could have messaged Rukia Otieno or asked again\./);
  });

  it.each([['Rukia', 'u-rukia'], ['Amani', 'u-amani'], ['Baraka', 'u-baraka'], ['Juma', 'u-juma'], ['Grace', 'u-grace']])(
    '%s reads it nowhere on the report or session 2\'s own report', async (_who, userId) => {
      const svc = withTheStoredRows();
      const report = await svc.get('g1', userId, 'org1').catch(() => null);
      const session = await theSessionReportAs(svc, userId, 2);
      expect(everyString({ report, session }).filter((s) => SELF.test(s))).toEqual([]);
    });
});

describe('request 117 (6): on the board, as each reader', () => {
  it.each([
    ['Rukia, who runs it', RUKIA_RUNS_IT],
    ['Amani, who checks in', AMANI],
    ['Baraka, who checks in', BARAKA_M],
    ['Neema, who checks in', NEEMA],
    ['Juma, an admin who only reads', JUMA_READS],
    ['Grace, the admin who set it up', GRACE_SET_IT_UP],
  ])('%s reads nobody waiting on themselves, with and without people seeing each other', async (_who, reader) => {
    for (const peersVisibleToEachOther of [true, false]) {
      const board = await boardAs(review5({ peersVisibleToEachOther }), reader[0], reader[1]);
      expect(JSON.stringify(board)).not.toMatch(SELF);
    }
  });

  it('Rukia reads Baraka and Amani waiting on her, each once on their own row', async () => {
    const board = await boardAs(review5(), ...RUKIA_RUNS_IT);
    expect(board.blockers.map((b: any) => b.says)).toEqual(expect.arrayContaining([
      /* Change 4: neither has Rukia's own promise of it, so each reads as the speaker's account, with the note. */
      'Baraka Mwangi says the work is waiting on you for the discount. Not backed: no attempt to unblock mentioned. Baraka Mwangi could have messaged you or asked again.',
      'Amani Wekesa says the work is waiting on you for the price list. Not backed: no attempt to unblock mentioned. Amani Wekesa could have messaged you or asked again.',
    ]));
  });
});
