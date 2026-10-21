import { SEED_PROMPTS } from '../conversation/prompt-library';
import { CustomerStandingService } from './the-customer-standing.service';
import { CUSTOMER_STANDING_PROMPT, CUSTOMER_STANDING_PROMPT_KEY, theOneCustomer, whatMayBeKept } from './the-customer-standing';

/**
 * WHERE A CUSTOMER STANDS, WRITTEN FROM A SALES CHECK-IN (request 28a).
 *
 * Baridi Appliances. Miriam's sales check-in said: she sent Green Mart a quote, the buyer said he buys in
 * January, and "the buyer was rude" (which must never be kept). She also said Kariuki Butchery said yes and
 * the deposit is waiting. "Green Mart Westlands" and "Green Mart CBD" are two customers, so "Green Mart"
 * alone is ambiguous in a second organisation. A customer nobody knows writes nothing.
 */

const ORG = 'org-baridi';
const SAID = 'I sent Green Mart a quote on Monday and the buyer said he buys in January. He was rude about the price. Kariuki Butchery said yes, and the deposit is waiting. I also talked to Brightside Foods about 500 crates.';
const PEOPLE = ['Miriam Wanjiku', 'Wairimu Kamau'];

function setup(opts: {
  kindOfWork?: string | null; scenario?: string; customers?: { externalId: string; title: string }[];
  said?: string; model?: any; guest?: boolean; existing?: Record<string, string>;
} = {}) {
  const created: any[] = [];
  const extract = jest.fn(async () => opts.model ?? { customers: [] });
  const prisma: any = {
    ground: { findUnique: jest.fn(async () => ({ organizationId: ORG, scenario: opts.scenario ?? 'PULSE_CHECK', kindOfWork: opts.kindOfWork === undefined ? 'sales org' : opts.kindOfWork })) },
    subject: { findMany: jest.fn(async () => opts.customers ?? [
      { externalId: 'crm-green', title: 'Green Mart' }, { externalId: 'crm-kariuki', title: 'Kariuki Butchery' },
    ]) },
    groundParticipant: { findUnique: jest.fn(async () => ({ userId: 'u-miriam', email: 'miriam@baridi.example', user: { email: 'miriam@baridi.example' } })) },
    /* isAGuestIn reads the organisation's guests through these. */
    organizationMembership: { findMany: jest.fn(async () => (opts.guest ? [{ userId: 'u-miriam', role: 'GUEST', user: { email: 'miriam@baridi.example' } }] : [])) },
    conversationTurn: { findMany: jest.fn(async () => [{ content: opts.said ?? SAID }]) },
    person: { findMany: jest.fn(async () => [
      { displayName: 'Miriam Wanjiku', givenName: 'Miriam', familyName: 'Wanjiku' },
      { displayName: 'Wairimu Kamau', givenName: 'Wairimu', familyName: 'Kamau' },
    ]) },
    customerStanding: {
      findFirst: jest.fn(async ({ where }: any) => (opts.existing?.[where.counterpartyExternalId] ? { says: opts.existing[where.counterpartyExternalId] } : null)),
      create: jest.fn(async ({ data }: any) => { created.push(data); return data; }),
    },
  };
  const prompts: any = { getActive: jest.fn(async () => ({ id: 'pv-7', content: CUSTOMER_STANDING_PROMPT })) };
  const svc = new CustomerStandingService(prisma, prompts, { extract } as any);
  return { svc, created, extract, prisma };
}
const event = { checkInId: 'c1', groundId: 'g1', participantId: 'pp1' };

describe('a sales check-in that names a known customer', () => {
  it('writes one row for each, with the plain words, the customer and the prompt version that ran', async () => {
    const { svc, created, extract } = setup({ model: { customers: [
      { customer: 'Green Mart', says: 'Quote sent. Buys in January.' },
      { customer: 'kariuki butchery', says: 'Said yes. The deposit is waiting.' },
    ] } });
    expect(await svc.write(event)).toBe(2);
    expect(created).toEqual([
      { organizationId: ORG, counterpartyExternalId: 'crm-green', says: 'Quote sent. Buys in January.', promptVersionId: 'pv-7' },
      { organizationId: ORG, counterpartyExternalId: 'crm-kariuki', says: 'Said yes. The deposit is waiting.', promptVersionId: 'pv-7' },
    ]);
    /* One model step, and it read only the person's own words and the customers' names. */
    expect(extract).toHaveBeenCalledTimes(1);
    const sent = JSON.stringify((extract.mock.calls[0] as any[])[1]);
    expect(sent).toContain('Green Mart');
    expect(sent).toContain('I sent Green Mart a quote');
  });

  it('runs the stored version, and the file is what it is seeded from', async () => {
    expect(SEED_PROMPTS.find((p) => p.key === CUSTOMER_STANDING_PROMPT_KEY)?.content).toBe(CUSTOMER_STANDING_PROMPT);
    const { svc, extract } = setup({ model: { customers: [] } });
    (svc as any).prompts.getActive = jest.fn(async () => ({ id: 'pv-9', content: 'THE STORED WORDS' }));
    await svc.write(event);
    expect((extract.mock.calls[0] as any[])[0]).toBe('THE STORED WORDS');
  });

  it('does not write the same words twice, for a retry of the same completion', async () => {
    const { svc, created } = setup({ existing: { 'crm-green': 'Quote sent. Buys in January.' }, model: { customers: [{ customer: 'Green Mart', says: 'Quote sent. Buys in January.' }] } });
    expect(await svc.write(event)).toBe(0);
    expect(created).toEqual([]);
  });

  it('writes a newer line when where the customer stands has changed', async () => {
    const { svc, created } = setup({ existing: { 'crm-green': 'Quote sent.' }, model: { customers: [{ customer: 'Green Mart', says: 'Quote sent. Buys in January.' }] } });
    expect(await svc.write(event)).toBe(1);
    expect(created[0].says).toBe('Quote sent. Buys in January.');
  });
});

describe('an unknown or an ambiguous name writes nothing', () => {
  it('a customer nobody knows', async () => {
    const { svc, created } = setup({ model: { customers: [{ customer: 'Brightside Foods', says: 'Asked for 500 crates.' }] } });
    expect(await svc.write(event)).toBe(0);
    expect(created).toEqual([]);
  });

  it('a name that fits two customers', async () => {
    const two = [{ externalId: 'crm-w', title: 'Green Mart Westlands' }, { externalId: 'crm-c', title: 'Green Mart CBD' }];
    const { svc, created } = setup({ customers: two, model: { customers: [{ customer: 'Green Mart', says: 'Quote sent.' }] } });
    expect(await svc.write(event)).toBe(0);
    expect(created).toEqual([]);
    expect(theOneCustomer('Green Mart', two)).toBeNull();
  });

  it('two customers with the very same name', () => {
    expect(theOneCustomer('Green Mart', [{ title: 'Green Mart' }, { title: 'Green mart' }])).toBeNull();
  });

  it('a name that is a single whole part of exactly one customer is that customer; a fragment is not', () => {
    const k = [{ title: 'Kariuki Butchery' }, { title: 'Green Mart' }];
    expect(theOneCustomer('Kariuki Butchery Ltd', k)).toEqual({ title: 'Kariuki Butchery' });
    expect(theOneCustomer('Kar', k)).toBeNull();
    expect(theOneCustomer('', k)).toBeNull();
  });

  it('does not ask the model at all when the organisation has no customers', async () => {
    const { svc, extract } = setup({ customers: [] });
    expect(await svc.write(event)).toBe(0);
    expect(extract).not.toHaveBeenCalled();
  });
});

describe('nothing about a person, and nothing that was not said', () => {
  const bad: [string, string][] = [
    ['names a person', 'Miriam sent the quote.'],
    ['speaks of the person', 'I sent the quote.'],
    ['is about how somebody works', 'You were slow to follow up.'],
    ['carries a label', 'Quote sent. This is at risk.'],
    ['holds a date nobody said', 'Buys in March.'],
    ['holds a number nobody said', 'Asked for 700 crates.'],
    ['is joined with a colon', 'Stands: quote sent.'],
    ['is an arrow', 'Quote sent -> buys in January.'],
    ['is too long', `${'Quote sent. '.repeat(40)}`],
    ['is empty', ''],
  ];
  for (const [why, says] of bad) {
    it(`drops a line that ${why}`, async () => {
      const { svc, created } = setup({ model: { customers: [{ customer: 'Green Mart', says }] } });
      expect(await svc.write(event)).toBe(0);
      expect(created).toEqual([]);
    });
  }

  it('keeps a number or a month that was said, and puts a full stop on the end', () => {
    expect(whatMayBeKept('Asked for 500 crates', SAID, PEOPLE)).toBe('Asked for 500 crates.');
    expect(whatMayBeKept('Buys in January.', SAID, PEOPLE)).toBe('Buys in January.');
  });

  it('does not count a word in the customer\'s own name as a person', () => {
    expect(whatMayBeKept('Quote sent to Kariuki Butchery.', SAID, ['Kariuki Njenga'], 'Kariuki Butchery')).toBe('Quote sent to Kariuki Butchery.');
    expect(whatMayBeKept('Quote sent to Kariuki Butchery.', SAID, ['Kariuki Njenga'], 'Green Mart')).toBeNull();
  });

  it('the stored instructions say facts about the customer only, no person, no work out of dates', () => {
    expect(CUSTOMER_STANDING_PROMPT).toMatch(/Never name a person/);
    expect(CUSTOMER_STANDING_PROMPT).toMatch(/Facts about the customer only/);
    expect(CUSTOMER_STANDING_PROMPT).toMatch(/Never work out a date or a number/);
  });
});

describe('only a sales check-in is read', () => {
  const said = { customers: [{ customer: 'Green Mart', says: 'Quote sent. Buys in January.' }] };

  it('a check-in about engineering writes none, and never asks the model', async () => {
    const { svc, created, extract } = setup({ kindOfWork: 'engineering release', model: said });
    expect(await svc.write(event)).toBe(0);
    expect(created).toEqual([]);
    expect(extract).not.toHaveBeenCalled();
  });

  it('a sales team (Release 1: one lead and the reps under them) is read exactly as a sales organisation is', async () => {
    const { svc, created } = setup({ kindOfWork: 'sales team', model: said });
    expect(await svc.write(event)).toBe(1);
    expect(created).toEqual([{ organizationId: ORG, counterpartyExternalId: 'crm-green', says: 'Quote sent. Buys in January.', promptVersionId: 'pv-7' }]);
  });

  it('a check-in with no kind of work writes none', async () => {
    const { svc, extract } = setup({ kindOfWork: null, model: said });
    expect(await svc.write(event)).toBe(0);
    expect(extract).not.toHaveBeenCalled();
  });

  it('a sales team\'s performance plan, promotion or renewal writes none', async () => {
    for (const scenario of ['PIP', 'RECOGNITION', 'CONTRACT_RENEWAL']) {
      const { svc, extract } = setup({ scenario, model: said });
      expect(await svc.write(event)).toBe(0);
      expect(extract).not.toHaveBeenCalled();
    }
  });

  it('a guest\'s words are not written into the host\'s customers', async () => {
    const { svc, created } = setup({ guest: true, model: said });
    expect(await svc.write(event)).toBe(0);
    expect(created).toEqual([]);
  });

  it('a check-in too short to say anything writes none', async () => {
    const { svc, extract } = setup({ said: 'Fine.', model: said });
    expect(await svc.write(event)).toBe(0);
    expect(extract).not.toHaveBeenCalled();
  });

  it('a model that fails writes none and never throws', async () => {
    const { svc, prisma } = setup();
    (svc as any).anthropic.extract = jest.fn(async () => { throw new Error('the model is down'); });
    await expect(svc.onCheckInCompleted({ ...event, sessionNumber: 1 })).resolves.toBeUndefined();
    expect(prisma.customerStanding.create).not.toHaveBeenCalled();
  });
});

describe('what it reads', () => {
  it('reads only the person\'s own turns in their own check-in, never a report or a question to Ask Groundwork', async () => {
    const { svc, prisma } = setup({ model: { customers: [] } });
    await svc.write(event);
    expect(prisma.conversationTurn.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { checkInId: 'c1', role: 'PERSON' } }));
    const own = require('fs').readFileSync(require('path').join(__dirname, 'the-customer-standing.service.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(own).not.toMatch(/\b(report|askGroundwork|assistantMessage|privateNote|leadNote)\b/i);
  });
});
