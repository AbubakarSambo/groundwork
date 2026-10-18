import { aPromiseSomebodyElseMade } from './a-promise-somebody-else-made';
import { ConversationService } from './conversation.service';

/**
 * A PROMISE IS FILED AS THE PROMISE OF WHOEVER MADE IT (Hafsah's point 13). Every line below is word for word a line the Drop
 * Access test bed wrote as a COMMITMENT on 12 to 17 October, and what it is.
 */
describe('a promise somebody else made', () => {
  it.each([
    'Rose said she will buy the two units at the end of the month, on October 30th.',
    'Rose still says she will buy the two units on 30 October.',
    'Jane will pay a deposit on Friday.',
    "He said he'll have them for me on Thursday. [INFERRED: 'He' is Joseph]",
    'Peter at Tuskys Westgate will decide by 28 October.',
    'The owner will call me back next week.',
    'Joseph will bring the samples on Thursday.',
    /* Drop Access short run (gw_sweep_drop3), Mercy on 14 October, read as her "Will do" on the team report (item 12). */
    "Delivery is set for Friday, and they'll pay then.",
  ])('is not the speaker\'s: "%s"', (line) => {
    expect(aPromiseSomebodyElseMade(line)).toBe(true);
  });

  it.each([
    "I'll send the price list to Savannah Cafe tomorrow morning.",
    'Kasarani Gym is still on, I will see the owner on Monday.',
    'I have the M-Pesa message from Jane, I will add it later today.',
    "I'll get them to Mercy tomorrow.",
    "If the deposit doesn't come in by Friday, I'll follow up with Jane at Savannah Cafe on Monday.",
    "I'm aiming to sell 120 units by October 30th.",
    "I'm focusing on those 40 units for now.",
    'We will deliver on Monday.',
    'Kevin, Mercy, and Joseph are each responsible for selling 40 units.',
    'They also each need to open 10 new leads weekly.',
    'aiming to sell 120 water dispensers',
    'Kilele Hotel is all done, 40 units sold.',
    'Delivery is set for Friday, and I will collect the payment then.',
  ])('is the speaker\'s own, or no promise at all: "%s"', (line) => {
    expect(aPromiseSomebodyElseMade(line)).toBe(false);
  });
});

/* THE WRITER: what Mercy's check-in writes down as hers, with Release 1's switch on and off. */

async function whatIsWritten(on: boolean) {
  const created: any[] = [];
  const said = ['Rose said she will buy the two units at the end of the month, on October 30th.', 'I will send Peter the quote for 30 units by Friday.'];
  const fake: any = {
    prisma: {
      checkIn: { findUnique: async () => ({ groundId: 'g', sessionNumber: 4, participantId: 'p-mercy', turns: said.map((content) => ({ content })) }) },
      ground: { findUnique: async () => ({ organizationId: 'org' }) },
      organization: { findUnique: async () => ({ release1SalesBoardOn: on }) },
      groundCommitment: { create: async ({ data }: any) => { created.push(data); return { id: `n${created.length}` }; }, findMany: async () => [], update: async () => ({}) },
    },
    anthropic: { extract: async () => ({ commitments: said.map((action) => ({ action, when: null, outcome: null })) }) },
    logger: { log() {}, warn() {} },
  };
  await (ConversationService.prototype as any).writeWhatTheyPromised.call(fake, 'c4');
  return created.map((c) => c.text);
}

describe('what Mercy\'s check-in writes down as her own promises', () => {
  it('with Release 1 on, only her quote to Peter, never Rose\'s promise to buy', async () => {
    expect(await whatIsWritten(true)).toEqual(['I will send Peter the quote for 30 units by Friday.']);
  });
  it('with it off, as before', async () => {
    expect(await whatIsWritten(false)).toHaveLength(2);
  });
});
