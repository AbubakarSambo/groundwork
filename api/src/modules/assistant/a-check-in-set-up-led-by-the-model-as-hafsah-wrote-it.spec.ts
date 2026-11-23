import { askGroundwork, textOf } from './request-92-harness';
import { CHECK_IN_SETUP_PROMPT, CHECK_IN_SETUP_KIND, theBriefOf } from './a-check-in-set-up-by-talking';

/**
 * A CHECK-IN SET UP BY TALKING, AS HAFSAH WROTE IT ON WHATSAPP ON 23 NOVEMBER 2026, AND AS SHE READS IT.
 *
 * Her six messages, word for word. The set-up was a form: it lost the AI project and Abubakar from her second message, read "He is under my
 * team" and "This is a fucking mess" as people's names, and started again from scratch at "Can I setup a checkin from here". Now the model
 * leads it. The model is stubbed with what Gemini returns for each of her messages; what is checked is what she reads, what is kept between
 * turns, and that nothing is opened or sent before her yes.
 */
const HER_SIX = [
  'I want to get updates from my team',
  'I want updates from Abubakar on specifics on the Ai project',
  'I said Abubakar',
  'He is under my team',
  'This is a fucking mess',
  'Can I setup a checkin from here',
];

const ROSTER = [
  { externalId: 'u-1', displayName: 'Hafsah Jumare', managerExternalId: null, active: true, email: 'hafsah@groundwork.test', phone: null, title: 'Founder', department: null },
  { externalId: 'abu', displayName: 'Abubakar Sambo', managerExternalId: 'u-1', active: true, email: 'abubakar@groundwork.test', phone: '+2348000000001', title: 'Engineer', department: 'Engineering' },
  { externalId: 'kito', displayName: 'Kito Dube', managerExternalId: 'someone-else', active: true, email: 'kito@groundwork.test', phone: null, title: null, department: 'Sales' },
];

const ABUBAKAR = { id: 'abu', name: 'Abubakar' };

/** What Gemini gives back for each of her messages: its own words, and the whole of what the set-up holds. */
const GEMINI: Record<string, any> = {
  'I want to get updates from my team': { reply: 'Happy to set that up. What do you want updates on? Abubakar Sambo reports to you, so tell me if it is him or somebody else as well.' },
  'I want updates from Abubakar on specifics on the Ai project': { reply: 'Got it, updates from Abubakar Sambo on the specifics of the AI project. How often should he check in, every week or every two weeks?', updatesOn: 'the specifics of the AI project', brief: 'Abubakar gives updates on the specifics of the AI project, what moved, what is stuck and what comes next.', people: [ABUBAKAR] },
  'I said Abubakar': { reply: 'Yes, Abubakar Sambo is in it. How often should he check in?', people: [ABUBAKAR] },
  'He is under my team': { reply: 'Yes, he reports to you. How often should he check in?', people: [ABUBAKAR] },
  'This is a fucking mess': { reply: 'Fair enough, let me make it quick. I have updates from Abubakar Sambo on the AI project. I only need to know how often he should check in.', people: [ABUBAKAR] },
  'Can I setup a checkin from here': { reply: 'Yes, right here. I have Abubakar Sambo for updates on the AI project. How often should he check in?' },
  'every week': { reply: '', cadence: 'WEEKLY' },
  'sounds good I guess': { reply: 'Say yes and I will open it.' },
};

function hafsah(engineOn = true) {
  const opened: any[] = [];
  const invited: any[] = [];
  const turns: string[] = [];
  const engine = {
    respond: jest.fn(async () => { throw new Error('no composing here'); }),
    extract: jest.fn(async (prompt: string, h: any[]) => {
      /* Ask's reading of what a message means: her first message wants a check-in set up, as Gemini read it on her phone. */
      if (/^You read one message/.test(prompt)) return String(h[0].content).split('\n')[0] === HER_SIX[0] ? { kind: 'wants', guide: 'set_up_a_check_in' } : { kind: 'other' };
      if (prompt !== CHECK_IN_SETUP_PROMPT) return null;
      const content = String(h[0].content);
      turns.push(content);
      const m = /Their new message: ([\s\S]*)$/.exec(content)?.[1] ?? '';
      return GEMINI[m] ?? { reply: 'Go on.' };
    }),
  };
  const h = askGroundwork({ userId: 'u-1', role: 'MEMBER', engine: engineOn ? engine : undefined, participants: [{ groundId: 'g1', partyType: 'INITIATOR' }] });
  const kept: any[] = [];
  h.prisma.assistantProposal.create = jest.fn(async ({ data }: any) => { const r = { id: `pr${kept.length + 1}`, state: 'PARKED', createdAt: new Date(), ...data }; kept.push(r); return r; });
  h.prisma.assistantProposal.findFirst = jest.fn(async ({ where }: any = {}) => [...kept].reverse().find((r) => r.state === 'PARKED' && (!where?.kind || r.kind === where.kind)) ?? null);
  h.prisma.assistantProposal.update = jest.fn(async ({ where, data }: any) => Object.assign(kept.find((r) => r.id === where.id) ?? {}, data));
  h.prisma.person.findFirst = jest.fn(async () => ({ id: 'p1', externalId: 'u-1', displayName: 'Hafsah Jumare', active: true, linkedUserId: 'u-1' }));
  h.prisma.person.findMany = jest.fn(async ({ where }: any) => (where?.active === false ? [] : ROSTER));
  (h.service as any).truth = { forPerson: async () => ({ person: { externalId: 'u-1' }, sessions: { value: [] } }) };
  (h.service as any).grounds = {
    create: jest.fn(async (_o: string, _u: string, dto: any) => { opened.push(dto); return { id: 'g-new' }; }),
    addParticipant: jest.fn(async (_g: string, _o: string, _u: string, dto: any) => { invited.push(dto); return { id: `pp-${invited.length}` }; }),
    addTheirWhatsAppNumber: jest.fn(async () => ({ said: 'kept' })),
  };
  const say = async (m: string) => textOf(await h.service.respond('org-a', 'p1', m));
  const setUp = () => [...kept].reverse().find((r) => r.kind === CHECK_IN_SETUP_KIND && r.state === 'PARKED')?.payload;
  return { say, setUp, opened, invited, turns, kept, engine };
}

describe('Hafsah sets up a check-in by talking, with her six messages', () => {
  it('she reads a conversation: Abubakar is found on the roster, the AI project is kept, and no sentence of hers is ever a person', async () => {
    const h = hafsah();
    const read: string[] = [];
    for (const m of HER_SIX) {
      read.push(await h.say(m));
      for (const p of h.setUp()?.people ?? []) expect(HER_SIX).not.toContain(p.name);
    }
    expect(read).toEqual([
      'Happy to set that up. What do you want updates on? Abubakar Sambo reports to you, so tell me if it is him or somebody else as well.',
      'Got it, updates from Abubakar Sambo on the specifics of the AI project. How often should he check in, every week or every two weeks?',
      'Yes, Abubakar Sambo is in it. How often should he check in?',
      'Yes, he reports to you. How often should he check in?',
      'Fair enough, let me make it quick. I have updates from Abubakar Sambo on the AI project. I only need to know how often he should check in.',
      'Yes, right here. I have Abubakar Sambo for updates on the AI project. How often should he check in?',
    ]);
    for (const r of read) {
      expect(r).not.toMatch(/I do not know how to reach|What is each person|still open|Reply START/);
    }
    expect(h.setUp()).toEqual(expect.objectContaining({
      updatesOn: 'the specifics of the AI project',
      people: [{ name: 'Abubakar Sambo', email: 'abubakar@groundwork.test', id: 'abu' }],
      asked: 'talking',
    }));
    expect(h.opened).toEqual([]);
    expect(h.invited).toEqual([]);
  });

  it('the model is given the whole conversation and who reports to her, not one answer at a time', async () => {
    const h = hafsah();
    for (const m of HER_SIX.slice(0, 4)) await h.say(m);
    const last = h.turns[h.turns.length - 1];
    expect(last).toContain('- id abu: Abubakar Sambo, Engineer, Engineering, reports to you, has an email address, has a phone number');
    expect(last).toContain('Them: I want updates from Abubakar on specifics on the Ai project');
    expect(last).toContain('Groundwork: Got it, updates from Abubakar Sambo on the specifics of the AI project.');
    expect(last).toContain('Their new message: He is under my team');
    /* Addresses are never sent to the model: it is told only whether there is one. */
    expect(last).not.toContain('abubakar@groundwork.test');
  });

  it('with the model off, none of her sentences becomes a person, and she is told what is still needed', async () => {
    const h = hafsah(false);
    /* With no model, her first sentence is not read as asking for a check-in, so she starts it in so many words. */
    await h.say('Set up a check-in');
    let last = '';
    for (const m of HER_SIX) last = await h.say(m);
    expect(h.setUp()?.people).toEqual([]);
    expect(last).toBe('To open it, I still need to know what you want updates on, who should be in it and how often they should check in.');
    expect(last).not.toMatch(/He is under my team|fucking/);
  });

  it('"Can I setup a checkin from here" carries on: nothing she said is lost, and it is never started again', async () => {
    const h = hafsah();
    for (const m of HER_SIX) await h.say(m);
    expect(h.kept.filter((r) => r.kind === CHECK_IN_SETUP_KIND && r.state === 'PARKED')).toHaveLength(1);
    expect(h.setUp().said.map((s: any) => s.words)).toEqual(HER_SIX);
    expect(h.setUp().updatesOn).toBe('the specifics of the AI project');
  });

  it('even when it reaches the router as asking for a new check-in, the set-up waiting is carried on, not started again', async () => {
    const h = hafsah();
    await h.say(HER_SIX[0]);
    await h.say(HER_SIX[1]);
    /* The model reads "Set up a check-in" as something else here; it goes to the router, which sends it to setting one up. */
    GEMINI['Set up a check-in'] = { reply: 'You are already setting one up with me. How often should Abubakar Sambo check in?', somethingElse: true };
    try {
      expect(await h.say('Set up a check-in')).toBe('You are already setting one up with me. How often should Abubakar Sambo check in?');
    } finally {
      delete GEMINI['Set up a check-in'];
    }
    expect(h.setUp().updatesOn).toBe('the specifics of the AI project');
    expect(h.setUp().people.map((p: any) => p.name)).toEqual(['Abubakar Sambo']);
    expect(h.kept.filter((r) => r.kind === CHECK_IN_SETUP_KIND && r.state === 'PARKED')).toHaveLength(1);
  });

  it('nothing opens without her yes: the whole check-in is said back, anything but a plain yes opens nothing, and the yes opens it at the roster address', async () => {
    const h = hafsah();
    for (const m of HER_SIX) await h.say(m);
    const back = await h.say('every week');
    expect(back).toBe('Here is the check-in I will open. It is called "Updates on the specifics of the AI project", and it asks for updates on the specifics of the AI project. I will run it as a check-in to keep a read on live work. Abubakar Sambo (abubakar@groundwork.test) will be in it, and they will be emailed an invitation. They will read what it is for in these words, "Abubakar gives updates on the specifics of the AI project, what moved, what is stuck and what comes next." They will check in every week. Shall I open it?');
    expect(h.opened).toEqual([]);
    const notYet = await h.say('sounds good I guess');
    expect(notYet).toMatch(/^Here is the check-in I will open\./);
    expect(h.opened).toEqual([]);
    expect(h.invited).toEqual([]);
    expect(await h.say('yes')).toBe('I have opened "Updates on the specifics of the AI project". Abubakar Sambo has been invited.');
    expect(h.opened[0]).toEqual(expect.objectContaining({ label: 'Updates on the specifics of the AI project', cadence: 'WEEKLY', brief: 'Abubakar gives updates on the specifics of the AI project, what moved, what is stuck and what comes next.' }));
    expect(h.invited).toEqual([{ email: 'abubakar@groundwork.test', displayName: 'Abubakar Sambo' }]);
  });

  it('a no at the say-back stops it, and nothing is opened or sent', async () => {
    const h = hafsah();
    for (const m of HER_SIX) await h.say(m);
    await h.say('every week');
    expect(await h.say('no')).toBe('I have stopped setting it up. Nothing was opened and nobody was invited.');
    expect(h.opened).toEqual([]);
    expect(h.invited).toEqual([]);
  });

  /* Found in the real run (24 November): with no brief from the model, "I want updates on the AI project." was under the 40 characters
     GroundsService needs before anybody can be invited, so the check-in opened with nobody in it. What the person reads is a full sentence now. */
  it('what the people in it read about it is a full sentence, long enough that they can be invited, even for the shortest topic', () => {
    const brief = theBriefOf({ updatesOn: 'sales', cadence: 'DAILY', people: [], asked: 'confirm', said: [] });
    expect(brief).toBe('You check in every day with your updates on sales.');
    expect(brief.length).toBeGreaterThanOrEqual(40);
  });
});
