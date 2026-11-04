import { EntryService } from './entry.service';
import { SETUP_IS_DONE } from './setup-is-the-first-check-in';

/**
 * SETUP AS A LEAD GETS IT, FROM THE REAL PROMPT AND THE REAL SERVED REPLY (fix plan, release batch 1, group 5).
 *
 * The model is a fixture; everything else is the product: the prompt setup assembles, the reading it keeps, and the words it serves.
 * Round 39 (4 November 2026), every lead: "it kept asking me the same things over and over". Four of eight setups got no reply at all on
 * the turn the lead said the read-back was right.
 */
async function* said(text: string) { yield text; }

function aSetup(reply: string, read: Record<string, unknown> = {}) {
  const asked: { system: string }[] = [];
  const anthropic: any = {
    respondStream: (system: string) => { asked.push({ system }); return said(reply); },
    respond: async (system: string) => { asked.push({ system }); return reply; },
    extract: async () => ({ mode: 'recurring', ...read }),
  };
  const prisma: any = { user: { findUnique: async () => null }, ground: { findMany: async () => [] }, platformSetting: { findUnique: async () => null } };
  const service = new EntryService(anthropic, prisma, {} as any, {} as any, {} as any, {} as any, { emit: () => undefined } as any);
  return { service, asked };
}

const KATO = [
  { role: 'user', content: 'We are building a school fees app for Uganda and we are stuck on user adoption.' },
  { role: 'assistant', content: 'You have set up a check-in for Mugisha, aiming for 20 schools signed up and 1000 parents making payments. Is anything wrong?' },
  { role: 'user', content: 'Just show me the board now.' },
] as any[];

const WHAT_KATO_GAVE = {
  initial: 'Getting more schools and parents using the school fees app',
  peopleNamed: ['Mugisha Okello', 'Nalule Kazibwe'],
  peopleEmails: { 'Mugisha Okello': 'mugisha@startup.test', 'Nalule Kazibwe': 'nalule@startup.test' },
  peoplePhones: { 'Mugisha Okello': '+256-772-332372', 'Nalule Kazibwe': '+256-771-222275' },
  goals: ['20 schools signed up', '1000 parents making payments'],
  classifiedScenario: 'PULSE_CHECK',
};

describe('the turn the lead says it is right', () => {
  it('closes with the product\'s last line when the model closes with nothing but the close, and streams it nowhere twice', async () => {
    const { service } = aSetup('[[SESSION_COMPLETE]]');
    const deltas: string[] = [];
    const out = await service.onboard(KATO, 'PULSE_CHECK', undefined, (t) => deltas.push(t), WHAT_KATO_GAVE, null);
    expect(out.ready).toBe(true);
    expect(out.reply.trim()).toBe(SETUP_IS_DONE);
    expect(out.reply).not.toMatch(/SESSION_COMPLETE|\[\[/);
  });

  it('keeps the model\'s own closing sentence and adds the product\'s last line', async () => {
    const { service } = aSetup('Good, it is all set. [[SESSION_COMPLETE]]');
    const out = await service.onboard(KATO, 'PULSE_CHECK', undefined, () => undefined, WHAT_KATO_GAVE, null);
    expect(out.ready).toBe(true);
    expect(out.reply).toBe(`Good, it is all set.\n\n${SETUP_IS_DONE}`);
  });

  it('a question with no close keeps setup open', async () => {
    const { service } = aSetup('Where do things stand today, as far as you know?');
    const out = await service.onboard(KATO.slice(0, 1), undefined, undefined, () => undefined, null, null);
    expect(out.ready).toBe(false);
    expect(out.reply).toBe('Where do things stand today, as far as you know?');
  });
});

describe('what the model is told on each turn', () => {
  it('everything setup knows, the team whole with emails and numbers, as known, not to be asked again', async () => {
    const { service, asked } = aSetup('Where do things stand today, as far as you know?');
    await service.onboard(KATO, 'PULSE_CHECK', undefined, () => undefined, WHAT_KATO_GAVE, null);
    const system = asked[0].system;
    expect(system).toContain('WHAT SETUP KNOWS, FROM WHAT THEY HAVE SAID. This is known: do not ask for any of it again, in any words.');
    expect(system).toContain('  - Mugisha Okello, mugisha@startup.test, +256-772-332372');
    expect(system).toContain('  - Nalule Kazibwe, nalule@startup.test, +256-771-222275');
    expect(system).toContain('- What they want out of it: 20 schools signed up, 1000 parents making payments');
    expect(system).toContain('from WHAT SETUP KNOWS above and nothing else');
  });

  it('no reason-and-example rule, no sales example, and no pushback directive from a word list', async () => {
    const { service, asked } = aSetup('Where do things stand today, as far as you know?');
    await service.onboard([...KATO.slice(0, 2), { role: 'user', content: 'Stop wasting my time with these questions.' }], 'PULSE_CHECK', undefined, () => undefined, WHAT_KATO_GAVE, null);
    const system = asked[0].system;
    expect(system).not.toMatch(/SAY WHY IT HELPS|It helps to keep a definition|AND SHOW WHAT AN ANSWER COULD LOOK LIKE/);
    expect(system).not.toMatch(/for a sales lead|behind on quota|A number if you have one/);
    expect(system).not.toContain('AND RIGHT NOW: their last message is pushback');
    expect(system).not.toMatch(/SAID THE SAME THING TWICE|asked .* twice already/i);
    expect(system).toContain('2. A COMPLAINT IS INFORMATION, NOT A QUESTION TO ASK BACK.');
  });
});

describe('what the screen is sent back', () => {
  it('the whole reading, with what was known before and what this turn read, and the kind named', async () => {
    const { service } = aSetup('Where do things stand today, as far as you know?', { peopleNamed: ['Mugisha Okello', 'Nalule Kazibwe', 'Aisha Nakato'] });
    const out = await service.onboard(KATO, 'PULSE_CHECK', undefined, () => undefined, WHAT_KATO_GAVE, null);
    expect(out.extracted).toMatchObject({
      initial: WHAT_KATO_GAVE.initial,
      goals: WHAT_KATO_GAVE.goals,
      peopleNamed: ['Mugisha Okello', 'Nalule Kazibwe', 'Aisha Nakato'],
      peoplePhones: WHAT_KATO_GAVE.peoplePhones,
      classifiedScenario: 'PULSE_CHECK',
      kindName: 'Keep a read on live work',
    });
    expect(out.needsPeople).toBe(false);
  });
});
