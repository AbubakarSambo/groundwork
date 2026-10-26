import { SETUP_IS_DONE } from './setup-is-the-first-check-in';
import { theAddressesTheyGave, withoutThePersonSettingItUp } from './the-people-the-lead-named-are-other-people';

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

describe('the address they typed goes with the name', () => {
  it('Chidi keeps his address, and Wairimu is given none she did not type', () => {
    expect(theAddressesTheyGave(['Chidi Okafor', 'Wairimu Njoroge'], [SAID])).toEqual({ 'Chidi Okafor': 'chidi.okafor@kito.test' });
  });
  it('an address far from the name, in another sentence, is not guessed to be theirs', () => {
    expect(theAddressesTheyGave(['Amani'], ['Amani runs sales. Please send everything to finance@kito.test.'])).toEqual({});
  });
  it('an address that is plainly theirs is theirs wherever it is said', () => {
    expect(theAddressesTheyGave(['Njeri Kamau'], ['Add njeri.kamau@kito.test too.'])).toEqual({ 'Njeri Kamau': 'njeri.kamau@kito.test' });
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
  const model = { mode: 'something_new', initial: 'Chidi Okafor joining as a customer support agent', peopleNamed: ['Chidi Okafor', 'Wairimu Njoroge'] };

  it('the lead is not among the people, Chidi keeps the address she typed, and nobody is told to add them', async () => {
    const out: any = await world(model, 'Thank you.').onboard(said as any, undefined, undefined, undefined, undefined, { userId: 'u-w', organizationId: 'o1' });
    expect(out.extracted.peopleNamed).toEqual(['Chidi Okafor']);
    expect(out.extracted.peopleEmails).toEqual({ 'Chidi Okafor': 'chidi.okafor@kito.test' });
    expect(out.needsPeople).toBe(false);
  });

  it('the closing words never say who "gives the accounts"', async () => {
    const out: any = await world(model, 'This will help us track Chidi. The next screen will ask who gives the accounts, and the check-in itself will come after that.').onboard(said as any, undefined, undefined, undefined, undefined, { userId: 'u-w', organizationId: 'o1' });
    /* A reply with no question ends setup, so the product's last line follows it (26 October 2026, setup-is-the-first-check-in). */
    expect(out.reply).toBe(`This will help us track Chidi. The next screen will ask whether you will check in too, and the check-in itself will come after that.\n\n${SETUP_IS_DONE}`);
    expect(out.reply).not.toMatch(/account/i);
  });
});
