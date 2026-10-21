import { theWaitsOnCustomersApart, theirOwnAnswersWhereTheWaitsWereSaid } from './a-customers-reply-is-on-its-deal';

/**
 * THE DROP ACCESS SHORT RUN (gw_sweep_drop3, 18 October). Grace's Blockers still read "A decision on the four units. Waiting on:
 * Ali" and "A reply. Waiting on: Paul" after the rule of 17 October (a customer's reply is on its deal). Read from the record:
 *   - Ali: the Ngong Road Minimart deal keeps no contact (its fields are Need, Units, Next step), so nothing tied Ali to it. Kevin
 *     had said, in the check-in the wait was kept from, "That was Ngong Road Minimart. Ali said he'll decide next week."
 *   - Paul: the Upper Hill Offices deal has Paul as its contact, but "Still no reply from Paul, even after two more calls today."
 *     was stored as blocking, and a blocking wait stayed under Blockers.
 * The rows below are the record's own (ground_dependencies and the deals as served on Grace's board).
 */
const KEVIN = 'c70d2a56-1a2d-48ac-948f-635b6aa817fe';
const MERCY = '73cc71dd-246f-4c23-93fc-3a7d1cc95188';
const JOSEPH = 'f87055a6-e165-4384-ba01-d1cb2def3282';
const KEVIN_DAY_3 = '9486925f-bd80-464a-9b4b-6b4945233956';

const DEALS: { id: string; name: string; ownerParticipantId: string; fields: Record<string, string> }[] = [
  { id: 'd-ngong', name: 'Ngong Road Minimart', ownerParticipantId: KEVIN, fields: { Need: 'a quote for 4 units', Units: '4', 'Next step': 'send the quote', 'Next step by': 'tomorrow by noon' } },
  { id: 'd-upper', name: 'Upper Hill Offices', ownerParticipantId: KEVIN, fields: { Contact: 'Paul', 'Decision maker': 'the office manager' } },
  { id: 'd-savannah', name: 'Savannah Cafe', ownerParticipantId: KEVIN, fields: { Units: '6', Contact: 'Jane', 'Next step': 'Pay a KES 15,000 deposit on Friday' } },
  { id: 'd-tuskys', name: 'Tuskys Westgate', ownerParticipantId: MERCY, fields: { Contact: 'Peter', 'Next step': 'Joseph to bring the samples' } },
];

const WAITS = [
  { id: 'w-samples', fromParticipantId: MERCY, onParticipantId: JOSEPH, onLabel: null, what: 'the sample units he promised', status: 'WAITING', sourceCheckInId: '68c69c64' },
  { id: 'w-paul-1', fromParticipantId: KEVIN, onParticipantId: null, onLabel: 'Paul', what: 'an answer to my call', status: 'WAITING', sourceCheckInId: 'b26de661' },
  { id: 'w-tuskys', fromParticipantId: MERCY, onParticipantId: JOSEPH, onLabel: null, what: 'the samples for Tuskys Westgate', status: 'BLOCKING', sourceCheckInId: '529028e2' },
  { id: 'w-ali', fromParticipantId: KEVIN, onParticipantId: null, onLabel: 'Ali', what: 'a decision on the four units', status: 'WAITING', sourceCheckInId: KEVIN_DAY_3 },
  { id: 'w-paul-2', fromParticipantId: KEVIN, onParticipantId: null, onLabel: 'Paul', what: 'a reply', status: 'BLOCKING', sourceCheckInId: KEVIN_DAY_3 },
  { id: 'w-jane', fromParticipantId: KEVIN, onParticipantId: null, onLabel: 'Jane', what: 'a KES 15,000 deposit', status: 'WAITING', sourceCheckInId: KEVIN_DAY_3 },
];

/* Kevin's own answers on 14 October, as the conversation holds them. */
const KEVIN_ON_DAY_3 = [
  "That was Ngong Road Minimart. Ali said he'll decide next week.",
  "I'd need him to confirm he wants the four units and is ready to make a payment.",
  'Still no reply from Paul, even after two more calls today.',
  'Jane said she\'ll pay a KES 15,000 deposit on Friday.',
];

describe('a wait on a customer of a deal goes on the deal, where the deal keeps no contact and where it was stored as blocking', () => {
  it('Grace\'s Blockers keep only the waits on Joseph; Ali, Paul and Jane are on their deals', () => {
    const apart = theWaitsOnCustomersApart(WAITS as any[], DEALS, new Map([[KEVIN_DAY_3, KEVIN_ON_DAY_3]]));
    expect(apart.team.map((w: any) => w.what)).toEqual(['the sample units he promised', 'the samples for Tuskys Westgate']);
    const on = Object.fromEntries(apart.onDeals.map((w: any) => [w.id, w.dealId]));
    expect(on).toEqual({ 'w-paul-1': 'd-upper', 'w-ali': 'd-ngong', 'w-paul-2': 'd-upper', 'w-jane': 'd-savannah' });
  });

  it('without Kevin\'s own answer nothing ties Ali to a deal, and the wait stays where it was (never guessed)', () => {
    const apart = theWaitsOnCustomersApart(WAITS as any[], DEALS);
    expect(apart.team.map((w: any) => w.onLabel ?? w.what)).toContain('Ali');
  });

  it('an answer naming the holder and two deals of theirs places nothing', () => {
    const apart = theWaitsOnCustomersApart([WAITS[3]] as any[], DEALS, new Map([[KEVIN_DAY_3, ['Ali buys for Ngong Road Minimart and Savannah Cafe.']]]));
    expect(apart.onDeals).toEqual([]);
  });

  it('a wait on a thing that is not a person ("M-Pesa", Drop Access run 1) is never placed by their words', () => {
    const mpesa = { id: 'w-mpesa', fromParticipantId: KEVIN, onParticipantId: null, onLabel: 'M-Pesa', what: 'the M-Pesa message', status: 'WAITING', sourceCheckInId: KEVIN_DAY_3 };
    const apart = theWaitsOnCustomersApart([mpesa] as any[], DEALS, new Map([[KEVIN_DAY_3, ['I will check for the Ngong Road Minimart M-Pesa message.']]]));
    expect(apart.team).toHaveLength(1);
  });

  it('a blocking wait on something else the customer holds stays a blocker', () => {
    const financing = { ...WAITS[4], what: 'their bank loan to come through' };
    const apart = theWaitsOnCustomersApart([financing] as any[], DEALS);
    expect(apart.team).toHaveLength(1);
  });

  it('only the waiting person\'s own check-in is read for their words', async () => {
    const prisma = {
      conversationTurn: {
        findMany: jest.fn(async () => [
          { checkInId: KEVIN_DAY_3, content: KEVIN_ON_DAY_3[0], checkIn: { participantId: KEVIN } },
          { checkInId: 'somebody-elses', content: 'Ali said yes for Ngong Road Minimart.', checkIn: { participantId: MERCY } },
        ]),
      },
    };
    const words = await theirOwnAnswersWhereTheWaitsWereSaid(prisma, [WAITS[3], { ...WAITS[3], sourceCheckInId: 'somebody-elses' }] as any[]);
    expect(words.get(KEVIN_DAY_3)).toEqual([KEVIN_ON_DAY_3[0]]);
    expect(words.has('somebody-elses')).toBe(false);
    expect((prisma.conversationTurn.findMany as jest.Mock).mock.calls[0][0].where.role).toBe('PERSON');
  });
});
