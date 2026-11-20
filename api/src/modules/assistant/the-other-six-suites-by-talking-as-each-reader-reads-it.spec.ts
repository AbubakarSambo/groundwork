import { askGroundwork, textOf } from './request-92-harness';
import { route } from './the-router-is-deterministic';
import { readTheSwitch } from './a-suite-switched-by-talking';

/**
 * THE OTHER SIX SUITES, SWITCHED BY TALKING (chat is king, step 5). Grace is an admin; Miriam is a member; Joy is a lead.
 * Proved as the words each reader reads, and at the write: only whoever the Suites service says may set the suite up is asked
 * anything, nothing is written before a yes, and a yes writes through `SuitesService.switch`.
 */
const PEOPLE = [{ id: 'u-wairimu', name: 'Wairimu Kamau' }, { id: 'u-kamau', name: 'Kamau Njenga' }, { id: 'u-kamau2', name: 'Kamau Otieno' }];

function as(userId: string, role: string, mayThey: (suite: string) => boolean, engine?: any) {
  const h = askGroundwork({ userId, role, engine });
  h.prisma.todo = { findMany: async () => [] };
  const proposals: any[] = [];
  h.prisma.assistantProposal.create = jest.fn(async ({ data }: any) => { const row = { id: `pr${proposals.length + 1}`, state: 'PARKED', createdAt: new Date(), ...data }; proposals.push(row); return row; });
  h.prisma.assistantProposal.findFirst = jest.fn(async () => [...proposals].reverse().find((p) => p.state === 'PARKED') ?? null);
  h.prisma.assistantProposal.update = jest.fn(async ({ where, data }: any) => { const p = proposals.find((x) => x.id === where.id); Object.assign(p, data); return p; });
  const switched: any[] = [];
  (h.service as any).suites = {
    maySetUp: jest.fn(async (_r: any, key: string) => mayThey(key)),
    duties: jest.fn(async () => ({ people: PEOPLE })),
    switch: jest.fn(async (r: any, key: string, input: any) => { if (!mayThey(key)) { const e: any = new Error('no'); e.status = 403; throw e; } switched.push({ r, key, input }); return {}; }),
  };
  const say = async (m: string) => textOf(await h.service.respond('org-a', 'p1', m));
  return { say, switched, proposals, suites: (h.service as any).suites };
}

describe('the other six suites, switched by talking', () => {
  it('Grace switches equipment on: asked who looks after it, told it back by name, and nothing is written before the yes', async () => {
    const g = as('u-grace', 'ADMIN', () => true);
    expect(await g.say('Switch on equipment')).toBe('To switch on equipment, I need to know one thing. Who looks after equipment and repairs?');
    expect(await g.say('Wairimu')).toBe('I will switch on equipment. Wairimu Kamau will be the answer to “Who looks after equipment and repairs”. Shall I go ahead?');
    expect(g.switched).toHaveLength(0);
    expect(await g.say('yes')).toBe('Equipment is switched on. Wairimu Kamau is the answer to “Who looks after equipment and repairs”. You can change it by asking me again, or on the Suites page.');
    expect(g.switched).toEqual([expect.objectContaining({ key: 'equipment', input: { on: true, answers: { keeper: 'u-wairimu' } } })]);
  });

  it('a name that could be two people is asked again, with both named', async () => {
    const g = as('u-grace', 'ADMIN', () => true);
    await g.say('turn on when someone leaves');
    expect(await g.say('Kamau')).toBe('I found more than one person that could be. They are Kamau Njenga and Kamau Otieno. Tell me which one, with their full name.');
    expect(await g.say('Kamau Njenga')).toBe('Who works out their final pay?');
    expect(await g.say('Wairimu')).toBe('I will switch on the process for when someone leaves. Kamau Njenga will be the answer to “Who removes a person’s access on their last day”. Wairimu Kamau will be the answer to “Who works out their final pay”. Shall I go ahead?');
  });

  it('a suite with no questions is said back at once, and a no writes nothing', async () => {
    const g = as('u-grace', 'ADMIN', () => true);
    expect(await g.say('set up the role map')).toBe('I will switch on the role map. Shall I go ahead?');
    expect(await g.say('no')).toBe('I have left the role map as it was. Nothing was changed.');
    expect(g.switched).toHaveLength(0);
  });

  it('switching off says that what was set is kept', async () => {
    const g = as('u-grace', 'ADMIN', () => true);
    expect(await g.say('switch off customers and deals')).toBe('I will switch off customers and deals. What was set for it stays, so switching it on again brings it back. Shall I go ahead?');
    expect(await g.say('yes')).toBe('Customers and deals is switched off. What was set for it is kept. Ask me to switch it on, and it comes back.');
    expect(g.switched[0].input).toEqual({ on: false, answers: {} });
  });

  it('a member is told an admin does it, is asked nothing, and nothing is parked or written', async () => {
    const m = as('u-miriam', 'MEMBER', () => false);
    expect(await m.say('switch on equipment')).toBe('Only an admin switches equipment on or off. Ask an admin in your organisation, and they can ask me. Nothing has changed.');
    expect(m.proposals).toHaveLength(0);
    expect(m.switched).toHaveLength(0);
  });

  it('a yes after the right was lost still writes nothing: the Suites service refuses and the person is told', async () => {
    const state = { may: true };
    const g = as('u-grace', 'ADMIN', () => state.may);
    await g.say('set up the role map');
    state.may = false;
    expect(await g.say('yes')).toBe('Only an admin switches the role map on or off. Ask an admin in your organisation, and they can ask me. Nothing has changed.');
    expect(g.switched).toHaveLength(0);
  });

  /*
   * Changed 20 November 2026: whether the message answers the waiting question is read by the model (who-a-message-is-for.ts), no
   * longer by the router's word list, so the pretend model here says "ask". The switch is let go and the message is answered as
   * itself; the separate "I have stopped" line went with the word-list path (stopSettingUpAndAnswer was deleted).
   */
  it('a different question in the middle, read by the model as something else, lets the switch go and is answered', async () => {
    const model = { respond: jest.fn(async () => { throw new Error('no composing here'); }), extract: jest.fn(async (prompt: string, h: any[]) => (/is waiting on an answer from them/.test(prompt) && /what is on my to-dos/.test(String(h[0].content)) ? { for: 'ask' } : null)) };
    const g = as('u-grace', 'ADMIN', () => true, model);
    await g.say('switch on equipment');
    const said = await g.say('what is on my to-dos?');
    expect(said).not.toMatch(/Who looks after equipment|could not find that person/);
    expect(g.proposals[0].state).toBe('DROPPED');
    expect(g.switched).toHaveLength(0);
  });

  it('is read from the words, and never from a check-in, a to-do or a person', () => {
    expect(readTheSwitch('Switch on equipment')).toEqual({ suite: 'equipment', on: true });
    expect(readTheSwitch('turn off onboarding')).toEqual({ suite: 'onboard', on: false });
    expect(readTheSwitch('set up a check-in for equipment')).toBeNull();
    for (const m of ['add the rota to my to-do list', 'my onboarding', 'what is on my to-dos', 'set up performance reviews']) expect(route(m).lane).not.toBe('switch_a_suite');
  });
});

describe('a check-in set up from one sentence (chat is king, step 2), the same offer on every channel', () => {
  const lead = (withSessions: boolean) => {
    const h = askGroundwork({ userId: 'lead-1', role: 'LEAD' });
    const created: any[] = [];
    h.prisma.assistantProposal.create = jest.fn(async ({ data }: any) => { const r = { id: 'pr1', state: 'PARKED', ...data }; created.push(r); return r; });
    h.prisma.person.findMany = jest.fn(async () => [
      { externalId: 'lead', displayName: 'Grace Achieng', managerExternalId: null, active: true },
      { externalId: 'm', displayName: 'Mercy Wairimu', managerExternalId: 'lead', active: true },
      { externalId: 'k', displayName: 'Kevin Omondi', managerExternalId: 'lead', active: true },
      { externalId: 'x', displayName: 'Nia Chebet', managerExternalId: 'other', active: true },
    ]);
    (h.service as any).truth = { forPerson: async () => ({ person: { externalId: 'lead' }, sessions: { value: withSessions ? [{ standing: 'running', label: 'Sales team, Q4', groundId: 'g1' }] : [] } }) };
    const say = async (m: string) => textOf(await h.service.respond('org-a', 'p1', m));
    const respondOnWhatsApp = async (m: string) => textOf(await h.service.respondOnWhatsApp('org-a', 'p1', m));
    return { say, respondOnWhatsApp, created };
  };

  /* Batch S, S6: the sentence now starts the setup by talking. With the model off, what they want updates on is asked (never guessed), and the
     lead's own people are offered at the next step. Checked: it is read as a check-in, and the setup is what waits for the answer. */
  it('is read as asking for a check-in, for a lead who already has one going, and the setup waits for the answer', async () => {
    expect(route('Get updates from my team on deals, payments and visits').lane).toBe('start_a_check_in');
    const l = lead(true);
    const said = await l.say('Get updates from my team on deals, payments and visits');
    expect(said).toBe('What do you want updates on? For example, "deals, payments and visits", or somebody joining, or a role changing hands.');
    expect(said).not.toContain('Nia Chebet');
    expect(l.created[0].kind).toBe('check_in_setup');
    expect(l.created[0].payload.offered.map((p: any) => p.name)).toEqual([]);
  });

  it('is the same on WhatsApp: the same people are named and the same yes is waited for', async () => {
    const web = lead(true); const phone = lead(true);
    expect(await phone.respondOnWhatsApp('Get updates from my team on deals, payments and visits')).toBe(await web.say('Get updates from my team on deals, payments and visits'));
  });
});
