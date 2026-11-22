import { SETUP_IS_DONE } from './setup-is-the-first-check-in';
import { withoutThePersonSettingItUp } from './the-people-the-lead-named-are-other-people';

const SAID = 'Check in weekly for four weeks. The new starter is Chidi Okafor, chidi.okafor@kito.test, a customer support agent. Wairimu Njoroge leads it.';

describe('the person setting it up is not one of the people named', () => {
  const wairimu = { firstName: 'Wairimu', lastName: 'Njoroge' };
  it('is taken out by full name and by first name, and nobody else is', () => {
    expect(withoutThePersonSettingItUp(['Chidi Okafor', 'Wairimu Njoroge'], wairimu)).toEqual(['Chidi Okafor']);
    expect(withoutThePersonSettingItUp(['Chidi', 'Wairimu'], wairimu)).toEqual(['Chidi']);
  });
  it('a stranger with no name known is left alone', () => {
    expect(withoutThePersonSettingItUp(['Chidi Okafor', 'Wairimu Njoroge'], null)).toEqual(['Chidi Okafor', 'Wairimu Njoroge']);
  });
});

/** AS THE SETUP CHAT HANDS IT TO THE SCREEN, with a model that heard the lead's own name as one of the people, and said "accounts". */
import { EntryService } from './entry.service';

describe('what the setup screen is handed', () => {
  const world = (extracted: any, reply: string) => {
    const prisma: any = {
      platformSetting: { findUnique: jest.fn(async () => null) },
      user: { findUnique: jest.fn(async () => ({ firstName: 'Wairimu', lastName: 'Njoroge', jobTitle: null })) },
      ground: { findMany: jest.fn(async () => []) },
    };
    const anthropic: any = { extract: jest.fn(async () => extracted), respond: jest.fn(async () => reply) };
    const prompts: any = { getActive: jest.fn(async () => { throw new Error('none'); }) };
    const service = new EntryService(anthropic, prisma, {} as any, {} as any, {} as any, {} as any, {} as any, prompts);
    (service as any).guardedReply = jest.fn(async () => reply);
    return service;
  };
  const said = [{ role: 'user' as const, content: SAID }];
  /* The model reads whose address is whose (setup flow, 22 November 2026): it hands back each person with the address typed for them. */
  const model = { mode: 'something_new', initial: 'Chidi Okafor joining as a customer support agent', peopleNamed: ['Chidi Okafor', 'Wairimu Njoroge'], peopleEmails: [{ name: 'Chidi Okafor', email: 'Chidi.Okafor@kito.test' }] };

  it('the lead is not among the people, Chidi keeps the address she typed, and nobody is told to add them', async () => {
    const out: any = await world(model, 'Thank you.').onboard(said as any, undefined, undefined, undefined, undefined, { userId: 'u-w', organizationId: 'o1' });
    expect(out.extracted.peopleNamed).toEqual(['Chidi Okafor']);
    expect(out.extracted.peopleEmails).toEqual({ 'Chidi Okafor': 'chidi.okafor@kito.test' });
    expect(out.needsPeople).toBe(false);
  });

  it('the closing words never say who "gives the accounts"', async () => {
    /* Changed 4 November 2026 (fix plan, group 5): setup ends on the model's close, read once, not on a guess that a reply without a
       question mark has stopped asking; so the reply that ends it carries the close. */
    const out: any = await world(model, 'This will help us track Chidi. The next screen will ask who gives the accounts, and the check-in itself will come after that. [[SESSION_COMPLETE]]').onboard(said as any, undefined, undefined, undefined, undefined, { userId: 'u-w', organizationId: 'o1' });
    /* A reply with no question ends setup, so the product's last line follows it (26 October 2026, setup-is-the-first-check-in). */
    /* Changed 3 November 2026: no "Anything else I should know?" is put under it any more; its talk of a next screen still comes out. */
    expect(out.reply).toBe(`This will help us track Chidi.\n\n${SETUP_IS_DONE}`);
    expect(out.reply).not.toMatch(/account/i);
  });
});

describe('each person keeps the address typed for them, and only that (setup flow, 22 November 2026)', () => {
  const world = (extracted: any) => {
    const prisma: any = {
      platformSetting: { findUnique: jest.fn(async () => null) },
      user: { findUnique: jest.fn(async () => null) },
      ground: { findMany: jest.fn(async () => []) },
    };
    const anthropic: any = { extract: jest.fn(async () => extracted), respond: jest.fn(async () => 'Got them.') };
    const prompts: any = { getActive: jest.fn(async () => { throw new Error('none'); }) };
    const service = new EntryService(anthropic, prisma, {} as any, {} as any, {} as any, {} as any, {} as any, prompts);
    (service as any).guardedReply = jest.fn(async () => 'Got them.');
    return service;
  };
  const said = [{ role: 'user' as const, content: 'Weekly. Amina, Brian and Esther esther@x.test are on it.' }];

  it('Esther gets her address, and Amina and Brian get none, as the model read it', async () => {
    const out: any = await world({ mode: 'recurring', peopleNamed: ['Amina', 'Brian', 'Esther'], peopleEmails: [{ name: 'Esther', email: 'esther@x.test' }] }).onboard(said as any);
    expect(out.extracted.peopleEmails).toEqual({ Esther: 'esther@x.test' });
  });

  it('an address they never typed is dropped, and so is one for somebody not on the list', async () => {
    const out: any = await world({
      mode: 'recurring',
      peopleNamed: ['Amina', 'Brian', 'Esther'],
      peopleEmails: [{ name: 'Amina', email: 'amina@x.test' }, { name: 'Zawadi', email: 'esther@x.test' }, { name: 'Esther', email: 'esther@x.test' }],
    }).onboard(said as any);
    expect(out.extracted.peopleEmails).toEqual({ Esther: 'esther@x.test' });
  });

  it('nobody named means no addresses at all', async () => {
    const out: any = await world({ mode: 'recurring', peopleEmails: [{ name: 'Esther', email: 'esther@x.test' }] }).onboard(said as any);
    expect(out.extracted.peopleEmails).toBeUndefined();
  });
});
