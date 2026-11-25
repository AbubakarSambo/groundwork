import { askGroundwork, textOf } from './request-92-harness';
import { askStartersFor } from './ask-name';
import { route } from './the-router-is-deterministic';
import { THE_GUIDE } from './what-the-assistant-can-do';
import { whatTheModelSaid } from './ask-understands-with-the-model';
import { CHECK_IN_SETUP_PROMPT, saidBack, theModelsTurn, whatIsStillMissing } from './a-check-in-set-up-by-talking';

/**
 * ASK AS A GUIDE, AS EACH READER READS IT (Batch S, groups S5 and S6; Hafsah, 19 November 2026).
 *
 * "What can you help me with?" in any words, the first-open list, "How do I...?" with the offer to do it, and a check-in set up by
 * talking, one step at a time. Every answer is read from the one guide in what-the-assistant-can-do.ts. Each test reads the sentences
 * the person reads, for an admin, a lead and a member.
 */

/** A fake model: it reads the message the way the test says, and nothing else. */
function aModelThatReads(reading: (content: string) => any) {
  return { respond: jest.fn(async () => { throw new Error('no composing here'); }), extract: jest.fn(async (prompt: string, h: any[]) => (/You read one message/.test(prompt) ? reading(h[0].content) : null)) };
}

function asReader(role: 'ADMIN' | 'MEMBER', runsOne: boolean, engine?: any) {
  const h = askGroundwork({ userId: 'u-1', role, engine, participants: runsOne ? [{ groundId: 'g1', partyType: 'INITIATOR' }, { groundId: 'g1', partyType: 'PARTICIPANT' }] : [{ groundId: 'g1', partyType: 'PARTICIPANT' }] });
  /* The proposals are kept, so a yes reaches what was asked. */
  const kept: any[] = [];
  h.prisma.assistantProposal.create = jest.fn(async ({ data }: any) => { const r = { id: `pr${kept.length + 1}`, state: 'PARKED', createdAt: new Date(), ...data }; kept.push(r); return r; });
  h.prisma.assistantProposal.findFirst = jest.fn(async () => [...kept].reverse().find((r) => r.state === 'PARKED') ?? null);
  h.prisma.assistantProposal.update = jest.fn(async ({ where, data }: any) => Object.assign(kept.find((r) => r.id === where.id) ?? {}, data));
  h.prisma.person.findMany = jest.fn(async ({ where }: any) => where?.active === false ? [] : [
    { externalId: 'u-1', displayName: 'Grace Achieng', managerExternalId: null, active: true, email: 'grace@baridi.co.ke' },
    { externalId: 'm', displayName: 'Mercy Wairimu', managerExternalId: 'u-1', active: true, email: 'mercy@baridi.co.ke' },
    { externalId: 'k', displayName: 'Kevin Omondi', managerExternalId: 'u-1', active: true, email: 'kevin@baridi.co.ke' },
  ]);
  (h.service as any).truth = { forPerson: async () => ({ person: { externalId: 'u-1' }, sessions: { value: [] } }) };
  const say = async (m: string) => {
    const r: any = await h.service.respond('org-a', 'p1', m);
    return { lane: r.lane, text: textOf(r) };
  };
  return { ...h, say, kept };
}

const ADMIN = { isAGuest: false, takesPartInOne: true, hasOneToUse: true, runsOne: false, isAnAdmin: true, leaveIsOn: true, spendingIsOn: true, contextIsHere: true };
const LEAD = { ...ADMIN, isAnAdmin: false, runsOne: true };
const MEMBER = { ...ADMIN, isAnAdmin: false };

describe('"What can you help me with?", as each reader reads it', () => {
  it('an admin reads what an admin does first, each with an example, and how to ask how', async () => {
    const r = await asReader('ADMIN', false).say('What can you help me with?');
    expect(r.lane).toBe('what_can_you_do');
    expect(r.text).toBe([
      'Here is what I can help you with.',
      'You can set up a check-in. For example, say "Get updates from my team on deals, payments and visits."',
      'You can get a quarterly or an annual report. For example, say "Get me a quarterly report."',
      'You can set up how leave, spending, time sheets or reviews work. For example, say "Set up our leave process."',
      'You can add a document for the whole organisation. For example, say "Add our staff handbook for everyone."',
      'You can connect Slack, Teams or WhatsApp. For example, say "Connect WhatsApp."',
      'You can read the role map. For example, say "Show me the role map."',
      'You can also ask me how to do anything in Groundwork, for example "How do I change my phone number?". I will tell you where it is on screen, and do it for you when I can.',
    ].join('\n\n'));
  });

  it('a lead reads what a lead does first', async () => {
    const r = await asReader('MEMBER', true).say('what can you do');
    expect(r.text.split('\n\n').slice(0, 5)).toEqual([
      'Here is what I can help you with.',
      'You can set up a check-in. For example, say "Get updates from my team on deals, payments and visits."',
      'You can ask how your team is doing. For example, say "How is my team doing?"',
      'You can ask who has not checked in yet. For example, say "Who has not checked in?"',
      'You can add a document or a rule to a check-in you run. For example, say "Add our price list to my check-in."',
    ]);
    expect(r.text).not.toContain('role map');
  });

  it('a member reads their own check-in and their own work, and nothing a lead or an admin does', async () => {
    const r = await asReader('MEMBER', false).say('help');
    expect(r.text).toContain('You can ask what you said you would do. For example, say "What did I say I would do?"');
    expect(r.text).not.toMatch(/quarterly|role map|how your team is doing|Set up our leave/);
    expect(r.text).not.toMatch(/private|between you and me/);
  });

  it('is recognised in other words, by the model, and answered the same', async () => {
    const engine = aModelThatReads((c) => (/good for/.test(c) ? { kind: 'help' } : { kind: 'other' }));
    const r = await asReader('MEMBER', false, engine).say('I am new here, what is this thing good for');
    expect(r.lane).toBe('what_can_you_do');
    expect(r.text).toMatch(/^Here is what I can help you with\./);
  });
});

describe('the first-open list, for each reader', () => {
  it('an admin, a lead and a member each see their own role first, four to six lines, none cut off', () => {
    expect(askStartersFor(ADMIN)).toEqual(['How do I set up a check-in?', 'Get a quarterly report.', 'Set up our leave process.', 'Add a document for the whole organisation.', 'What did I say I would do?', 'What is my check-in for, and who reads it?']);
    expect(askStartersFor(LEAD)).toEqual(['How do I set up a check-in?', 'How is my team doing?', 'Add a document or some context to my check-in.', 'Get a quarterly report.', 'What did I say I would do?', 'What is my check-in for, and who reads it?']);
    expect(askStartersFor(MEMBER)).toEqual(['What did I say I would do?', 'What is my check-in for, and who reads it?', 'When is my next check-in?', "What are the company's priorities right now?", 'Ask for leave.', 'Ask to spend money.']);
  });

  it('the person who looks after HR is offered setting up leave', () => {
    expect(askStartersFor({ ...MEMBER, looksAfterHr: true })[0]).toBe('Set up our leave process.');
  });

  it('every line offered is answered by a lane, never the shrug', () => {
    for (const g of THE_GUIDE) if (g.starter) expect(route(g.starter).lane === 'unplaced' && !/^Ask (for leave|to spend)/.test(g.starter)).toBe(false);
  });
});

describe('"How do I...?"', () => {
  const howTo = (key: string) => aModelThatReads((c) => (/How do I|how do we|How can I/i.test(c) ? (key ? { kind: 'how_to', guide: key } : { kind: 'question' }) : { kind: 'other' }));

  it('a member asking how to change her phone number reads the steps on screen, and no offer, because I cannot do it', async () => {
    const r = await asReader('MEMBER', false, howTo('change_your_phone_number')).say('How do I change my phone number?');
    expect(r.lane).toBe('how_do_i');
    expect(r.text).toBe('Open Settings in the menu. Under You, find Phone number, press Change, type your number and press Save. An admin can change anybody’s number on the People page, by pressing Change beside it.');
  });

  /* Updated 23 November 2026: anyone may add people unless an admin chose "Only admins" (Hafsah, 22 November), so this reader's
     organisation chose it. */
  it('a member asking how to add someone to Groundwork, where an admin chose "Only admins", is told an admin does it', async () => {
    const m = asReader('MEMBER', false, howTo('invite_someone'));
    m.prisma.organization.findUnique = jest.fn(async () => ({ name: 'Baridi', guestsMayJoin: false, whoMayAddPeople: 'ADMINS' }));
    const r = await m.say('How do I add someone to Groundwork?');
    expect(r.text).toBe('Only an admin can invite somebody to your organisation here, so ask one of your admins to do it.');
  });

  it('a member where anyone may add people reads the steps, not that an admin does it (Hafsah, 21 November 2026)', async () => {
    const m = asReader('MEMBER', false, howTo('invite_someone'));
    m.prisma.organization.findUnique = jest.fn(async () => ({ name: 'Baridi', guestsMayJoin: false, whoMayAddPeople: 'ANYONE' }));
    const r = await m.say('How do I add someone to Groundwork?');
    expect(r.text).toBe('Open People in the menu and press Invite a colleague. Paste their email addresses or upload a list, choose their role, and press Send their invitations. If you are not an admin, there is no role to choose, and they join as “Takes part”.');
  });

  /* The steps gained one sentence (Hafsah, 21 November 2026): a member the organisation lets add people reads the same steps, and has no role to choose. */
  it('an admin asking the same reads the People page steps', async () => {
    const r = await asReader('ADMIN', false, howTo('invite_someone')).say('How do I add someone to Groundwork?');
    expect(r.text).toBe('Open People in the menu and press Invite a colleague. Paste their email addresses or upload a list, choose their role, and press Send their invitations. If you are not an admin, there is no role to choose, and they join as “Takes part”.');
  });

  it('a lead asking how to set up a check-in is offered it, and on a yes the setup asks its first question', async () => {
    const l = asReader('MEMBER', true, howTo('set_up_a_check_in'));
    const r = await l.say('How do I set up a check-in?');
    expect(r.text).toBe('Press Start a check-in in the menu. Say what you need updates on and press Continue, answer the questions, and press Invite and finish. Shall I do it for you?');
    /* Changed 24 November 2026: the set-up is led by the model. This fake model reads only "How do I...", so the set-up falls back to saying what it still needs. */
    const yes = await l.say('yes');
    expect(yes.text).toBe('To open it, I still need to know what you want updates on, who should be in it and how often they should check in.');
  });

  it('a no to the offer does nothing', async () => {
    const l = asReader('MEMBER', true, howTo('set_up_a_check_in'));
    await l.say('How do I set up a check-in?');
    expect((await l.say('no')).text).toBe('All right. I have not done anything.');
  });

  it('a question about the organisation’s own rules still goes to what the organisation wrote down', async () => {
    const r = await asReader('MEMBER', false, howTo('')).say('How do we handle expenses?');
    expect(r.lane).toBe('how_we_work');
  });

  it('a how-to the model names from outside the guide is read as a question, and help and how-to are never read without the guide', () => {
    expect(whatTheModelSaid({ kind: 'how_to', guide: 'nothing_like_it' }, new Set(['invite_someone']))?.kind).toBe('question');
    expect(whatTheModelSaid({ kind: 'help' })?.kind).toBe('question');
    expect(whatTheModelSaid({ kind: 'how_to', guide: 'invite_someone' }, new Set(['invite_someone']))).toEqual({ kind: 'how_to', about: null, parts: 1, guide: 'invite_someone' });
  });

  it('every thing Ask says it can do starts its own action on a yes, and never the shrug', async () => {
    for (const g of THE_GUIDE.filter((x) => x.askCanDoIt)) {
      const l = asReader('ADMIN', true);
      const r: any = await (l.service as any).doItForYou('org-a', 'p1', 'u-1', 'u-1', g.key).catch((e: any) => ({ blocks: [{ type: 'text', body: `threw ${e?.message}` }] }));
      expect(r).not.toBeNull();
      expect(textOf(r)).not.toMatch(/I cannot answer that one yet|^threw/);
    }
  });
});

/**
 * Changed 24 November 2026 (Hafsah, after a set-up on her own WhatsApp failed): the set-up was a form that asked what, then who, then how
 * often, in fixed sentences. The model leads it now, so this fake model answers the set-up's prompt as Gemini would, one turn for each thing
 * Grace says. What is still checked is the product's part: who is reached at which address, the say-back word for word, and nothing opened
 * before her yes. The fixed questions and thePeopleIn are gone, so the tests of them now test the same promises on theModelsTurn.
 */
function aSetUpModel(turns: Record<string, any>) {
  return {
    respond: jest.fn(async () => { throw new Error('no composing here'); }),
    extract: jest.fn(async (prompt: string, h: any[]) => {
      if (prompt !== CHECK_IN_SETUP_PROMPT) return null;
      const m = /Their new message: ([\s\S]*)$/.exec(String(h[0].content))?.[1] ?? '';
      return turns[m] ?? { reply: 'Go on.' };
    }),
  };
}

describe('a check-in set up by talking, turn by turn, as Grace the lead reads it', () => {
  const GRACE = aSetUpModel({
    'Set up a check-in': { reply: 'Happy to. What do you want updates on? Mercy Wairimu and Kevin Omondi report to you, if they are the people.' },
    'Deals, payments and visits': { reply: 'Deals, payments and visits it is. Who should be in it?', updatesOn: 'deals, payments and visits' },
    'Mercy\nJuma Otieno juma@baridi.co.ke +254 712 345 678': { reply: 'Mercy Wairimu and Juma Otieno, then. How often should they check in?', people: [{ id: 'm', name: 'Mercy' }, { name: 'Juma Otieno', email: 'juma@baridi.co.ke', phone: '+254 712 345 678' }] },
    'Every week': { reply: '', cadence: 'WEEKLY' },
    'Deals and visits': { reply: 'Who should be in it?', updatesOn: 'deals and visits' },
    'Mercy and Kevin, every two weeks': { reply: '', people: [{ id: 'm', name: 'Mercy' }, { id: 'k', name: 'Kevin' }], cadence: 'FORTNIGHTLY' },
  });

  it('reads what she says in her own words, says it all back, and opens it only on her yes', async () => {
    const created: any[] = [];
    const added: any[] = [];
    const numbers: any[] = [];
    const l = asReader('MEMBER', true, GRACE);
    (l.service as any).grounds = {
      create: jest.fn(async (_o: string, _u: string, dto: any) => { created.push(dto); return { id: 'g-new' }; }),
      addParticipant: jest.fn(async (_g: string, _o: string, _u: string, dto: any) => { added.push(dto); return { id: `pp-${added.length}` }; }),
      addTheirWhatsAppNumber: jest.fn(async (i: any) => { numbers.push(i); return { said: 'kept' }; }),
    };
    l.prisma.person.findFirst = jest.fn(async () => ({ id: 'p1', externalId: 'u-1', displayName: 'Grace Achieng', active: true, linkedUserId: 'u-1' }));

    expect((await l.say('Set up a check-in')).text).toBe('Happy to. What do you want updates on? Mercy Wairimu and Kevin Omondi report to you, if they are the people.');
    expect((await l.say('Deals, payments and visits')).text).toBe('Deals, payments and visits it is. Who should be in it?');
    expect((await l.say('Mercy\nJuma Otieno juma@baridi.co.ke +254 712 345 678')).text).toBe('Mercy Wairimu and Juma Otieno, then. How often should they check in?');
    expect(created).toEqual([]);
    /* Changed 22 November 2026: the situation is said in its card's words (the scenario table), the same words /start uses, since it is now read by the one reading. */
    const back = (await l.say('Every week')).text;
    expect(back).toBe('Here is the check-in I will open. It is called "Updates on deals, payments and visits", and it asks for updates on deals, payments and visits. I will run it as a check-in to keep a read on live work. Mercy Wairimu (mercy@baridi.co.ke) and Juma Otieno (juma@baridi.co.ke, +254 712 345 678) will be in it, and each of them will be emailed an invitation. Each of them will read what it is for in these words, "You check in every week with your updates on deals, payments and visits." They will check in every week. Shall I open it?');
    expect(created).toEqual([]);
    expect((await l.say('yes')).text).toBe('I have opened "Updates on deals, payments and visits". Mercy Wairimu and Juma Otieno have been invited.');
    expect(created[0]).toEqual(expect.objectContaining({ label: 'Updates on deals, payments and visits', scenario: 'PULSE_CHECK', cadence: 'WEEKLY' }));
    expect(added).toEqual([{ email: 'mercy@baridi.co.ke', displayName: 'Mercy Wairimu' }, { email: 'juma@baridi.co.ke', displayName: 'Juma Otieno' }]);
    expect(numbers[0]).toEqual(expect.objectContaining({ participantId: 'pp-2', phone: '+254 712 345 678' }));
  });

  it('a no at the say-back opens nothing and invites nobody', async () => {
    const l = asReader('MEMBER', true, GRACE);
    const create = jest.fn();
    (l.service as any).grounds = { create };
    await l.say('Set up a check-in');
    await l.say('Deals and visits');
    expect((await l.say('Mercy and Kevin, every two weeks')).text).toMatch(/Shall I open it\?$/);
    expect((await l.say('no')).text).toBe('I have stopped setting it up. Nothing was opened and nobody was invited.');
    expect(create).not.toHaveBeenCalled();
  });

  it('somebody given with only a phone number still needs an email, because the invitation goes by email', () => {
    const start = { updatesOn: 'visits', people: [], cadence: 'WEEKLY' as const, asked: 'talking' as const, said: [] };
    const first = theModelsTurn({ reply: 'What is Juma’s email address?', people: [{ name: 'Juma', phone: '+254712345678' }] }, start, [], 'u-1', 'Juma +254712345678')!.so;
    expect(whatIsStillMissing(first)).toEqual(['an email address for Juma']);
    const then = theModelsTurn({ reply: '', people: [{ name: 'Juma', email: 'juma@baridi.co.ke', phone: '+254712345678' }] }, { ...first, said: [{ words: 'Juma +254712345678', asked: null }] }, [], 'u-1', 'juma@baridi.co.ke')!.so;
    expect(then.people).toEqual([{ name: 'Juma', email: 'juma@baridi.co.ke', phone: '+254712345678' }]);
  });

  it('an address or a number the model gives that she never typed is not taken, so the email is still asked for', () => {
    const so = theModelsTurn({ reply: 'Got it.', people: [{ name: 'Wanjiku', email: 'wanjiku@baridi.co.ke', phone: '+254700000000' }] }, { updatesOn: 'visits', people: [], asked: 'talking', said: [] }, [], 'u-1', 'Wanjiku')!.so;
    expect(so.people).toEqual([{ name: 'Wanjiku' }]);
    expect(whatIsStillMissing(so)).toContain('an email address for Wanjiku');
  });

  it('the say-back names every single person, never a count', () => {
    const people = ['A', 'B', 'C', 'D', 'E'].map((n) => ({ name: n, email: `${n.toLowerCase()}@x.co` }));
    const s = saidBack({ updatesOn: 'visits', people, cadence: 'MONTHLY', asked: 'confirm', said: [] });
    expect(s).toContain('A (a@x.co), B (b@x.co), C (c@x.co), D (d@x.co) and E (e@x.co)');
    expect(s).not.toMatch(/others/);
  });
});
