import { askGroundwork, textOf } from './request-92-harness';
import { whoTheMessageIsFor } from './who-a-message-is-for';
import { theDraftAsChecked } from './a-request-read-by-the-model';

/**
 * BATCH S ROUND 2, IN THE TESTERS' OWN WORDS (docs/browser-tests-20-nov/web.md and whatsapp-and-email.md, 20 November 2026).
 *
 * T1: the values in a request are read by the model into one draft; the rules check it and say it back. T2: who a message is for is
 * decided once. T3: a question Ask answers is answered by its own answer, never the documents. Today is Friday 20 November 2026.
 */

/** A model that reads each message as the test says: the meaning, and the draft of the values in it. */
function aModel(meaning: Record<string, any>, drafts: Record<string, any> = {}) {
  const said = (h: any[]) => String(h[0].content);
  return {
    respond: jest.fn(async () => { throw new Error('no composing here'); }),
    extract: jest.fn(async (prompt: string, h: any[]) => {
      const content = said(h);
      if (/^You read one message/.test(prompt)) { const m = content.split('\n')[0]; return meaning[m] ?? { kind: 'other' }; }
      if (/^Somebody wrote one message/.test(prompt)) { const m = /Their message: (.*)$/m.exec(content)?.[1] ?? ''; return drafts[m] ?? {}; }
      /* Who a message is for: its prompt now opens on any question waiting, a check-in's or a set-up's (20 November 2026), so the pretend model knows it by its new first words. */
      if (/^Somebody's work assistant, Groundwork, is waiting/.test(prompt)) { const m = /Their message: (.*)$/m.exec(content)?.[1] ?? ''; return { for: meaning[m]?.for ?? 'the_check_in' }; }
      return null;
    }),
  };
}

function asSomebody(engine: any, role = 'MEMBER') {
  const h = askGroundwork({ userId: 'u-1', role, engine });
  const kept: any[] = [];
  h.prisma.assistantProposal.create = jest.fn(async ({ data }: any) => { const r = { id: `pr${kept.length + 1}`, state: 'PARKED', createdAt: new Date(), ...data }; kept.push(r); return r; });
  h.prisma.assistantProposal.findFirst = jest.fn(async ({ where }: any) => [...kept].reverse().find((r) => r.state === 'PARKED' && (!where?.id || r.id === where.id)) ?? null);
  h.prisma.assistantProposal.update = jest.fn(async ({ where, data }: any) => Object.assign(kept.find((r) => r.id === where.id) ?? {}, data));
  h.prisma.organizationSuite = { findUnique: jest.fn(async () => ({ isOn: true })), findMany: jest.fn(async () => [{ suite: 'leave' }, { suite: 'spend' }]) };
  const say = async (m: string) => textOf(await h.service.respond('org-a', 'p1', m));
  return { ...h, kept, say, s: h.service as any };
}

beforeAll(() => jest.useFakeTimers({ now: new Date('2026-11-20T09:00:00Z'), doNotFake: ['nextTick', 'setImmediate', 'setTimeout', 'setInterval', 'queueMicrotask', 'clearTimeout', 'clearInterval', 'clearImmediate', 'performance'] }));

describe('T1. the days, the amount and the purpose are read by the model, and checked by the rules', () => {
  it.each([
    ['mon 30 nov to wed 2 dec, family thing', { startsOn: '2026-11-30', endsOn: '2026-12-02' }],
    ['leave mon to wed next week', { startsOn: '2026-11-23', endsOn: '2026-11-25' }],
    ['need leave 1st to 3rd dec', { startsOn: '2026-12-01', endsOn: '2026-12-03' }],
  ])('"%s" reaches the leave say-back with its days, not the canned prompt', async (said, days) => {
    const a = asSomebody(aModel({ [said]: { kind: 'wants', guide: 'ask_for_leave' } }, { [said]: days }));
    const proposed = jest.spyOn(a.s, 'proposeLeave').mockResolvedValue({ lane: 'ask_for_leave', composedBy: 'rules', blocks: [{ type: 'text', body: 'said back' }] });
    expect(await a.say(said)).toBe('said back');
    /* Changed 21 November 2026: the model's draft goes with the days, so the say-back can name the type of leave it read. */
    expect(proposed).toHaveBeenCalledWith('org-a', 'u-1', 'u-1', days, said, expect.anything());
  });

  it('"can i get 3 days off?", with no days, is asked for the days', async () => {
    const said = 'can i get 3 days off?';
    const a = asSomebody(aModel({ [said]: { kind: 'wants', guide: 'ask_for_leave' } }));
    expect(await a.say(said)).toMatch(/^Tell me the first day and the last day you want off in one sentence/);
  });

  it.each([
    ['need 12k for fuel for the nakuru visit tmrw', { amount: 12000, purpose: 'fuel for the Nakuru visit' }],
    ['I need 12,000 shillings for fuel for the Nakuru visit tomorrow', { amount: 12000, currency: 'KES', purpose: 'fuel for the Nakuru visit' }],
    ['i need to claim 7978 for fuel, nakuru trip. receipt coming', { amount: 7978, purpose: 'fuel for the Nakuru trip' }],
  ])('"%s" reaches the spending rules with the amount and a clean purpose', async (said, draft) => {
    const a = asSomebody(aModel({ [said]: { kind: 'wants', guide: 'ask_to_spend' } }, { [said]: draft }));
    a.s.spending = { checkForChat: jest.fn(async () => ({ currency: 'KES' })), mine: jest.fn(async () => ({ requests: [] })) };
    const carried = jest.spyOn(a.s, 'carryOnWithSpending').mockResolvedValue({ lane: 'ask_to_spend', composedBy: 'rules', blocks: [{ type: 'text', body: 'said back' }] });
    expect(await a.say(said)).toBe('said back');
    const [, , , , what] = carried.mock.calls[0] as any[];
    expect(what.amount).toBe(draft.amount);
    expect(what.what).not.toMatch(/receipt coming/);
    expect(what.what.toLowerCase()).toContain('fuel for the nakuru');
  });

  const waiting = [
    { kind: 'leave', ref: 'l-peter', personUserId: 'u-peter', firstName: 'Peter', what: 'leave from 23 to 25 November', thing: "Peter's leave from 23 to 25 November" },
    { kind: 'spend', ref: 's-peter', personUserId: 'u-peter', firstName: 'Peter', what: 'KES 7,978 for fuel', thing: "Peter's request to spend KES 7,978 for fuel" },
  ];

  it('"ok approve peters fuel" goes straight to the say-back for that one request', async () => {
    const said = 'ok approve peters fuel';
    const a = asSomebody(aModel({ [said]: { kind: 'wants', guide: 'approve_a_request' } }, { [said]: { which: 's-peter', decision: 'approve' } }), 'ADMIN');
    jest.spyOn(a.s, 'waitingForYouToDecide').mockResolvedValue(waiting);
    const t = await a.say(said);
    expect(t).toContain('KES 7,978');
    expect(a.kept[a.kept.length - 1].kind).toBe('request_decision');
    expect(a.kept[a.kept.length - 1].payload.request.ref).toBe('s-peter');
  });

  it('"approve it" then "peters leave" is one decision', async () => {
    const a = asSomebody(aModel({}, { 'peters leave': { which: 'l-peter' } }), 'ADMIN');
    jest.spyOn(a.s, 'waitingForYouToDecide').mockResolvedValue(waiting);
    expect(await a.say('approve it')).toMatch(/Which one/);
    const t = await a.say('peters leave');
    expect(t).toContain('23 to 25 November');
    expect(a.kept[a.kept.length - 1].kind).toBe('request_decision');
    expect(a.kept[a.kept.length - 1].payload).toEqual(expect.objectContaining({ outcome: expect.any(String), request: expect.objectContaining({ ref: 'l-peter' }) }));
  });

  it('a value the model gives that does not pass is left out', () => {
    const today = new Date('2026-11-20T09:00:00Z');
    expect(theDraftAsChecked({ startsOn: '2026-12-03', endsOn: '2026-12-01' }, today)).toEqual({});
    expect(theDraftAsChecked({ startsOn: '2026-02-30', endsOn: '2026-03-01' }, today)).toEqual({});
    expect(theDraftAsChecked({ amount: -5, which: 'not-waiting' }, today, [])).toEqual({});
  });
});

describe('T3. a question Ask answers is answered by its own answer', () => {
  it('"whos off next week" reaches who is away, never the documents', async () => {
    const said = 'whos off next week';
    const a = asSomebody(aModel({ [said]: { kind: 'question', guide: 'who_is_away' } }));
    const away = jest.spyOn(a.s, 'whoIsAway').mockResolvedValue({ lane: 'who_is_away', composedBy: 'rules', blocks: [{ type: 'text', body: 'Peter is off from Monday 23 to Wednesday 25 November.' }] });
    expect(await a.say(said)).toBe('Peter is off from Monday 23 to Wednesday 25 November.');
    expect(away).toHaveBeenCalled();
  });

  it('"how many days left" reads the leave suite', async () => {
    const said = 'how many days left';
    const a = asSomebody(aModel({ [said]: { kind: 'question', guide: 'how_many_days_left' } }));
    a.s.leave = { mine: jest.fn(async () => ({ perYear: 25, daysLeft: 21, kinds: [], requests: [] })) };
    expect(await a.say(said)).toContain('21');
  });

  it('"what next" reads what Today reads: an open check-in comes first', async () => {
    const a = asSomebody(aModel({ 'what next': { kind: 'question', guide: 'what_next' } }));
    a.s.whatNeedsYou = { forReader: jest.fn(async () => ({ needs: [{ key: 'k', kind: 'your_turn', title: 'Your next check-in for Sales team, Q4', detail: null, action: { label: 'Start', to: '/checkin/c1' }, groundId: 'g1', organizationId: 'org-a' }] })) };
    expect(await a.say('what next')).toBe('Do this first. Your next check-in for Sales team, Q4.');
  });

  it('"whats stuck" says everything waiting for a lead, from the same source', async () => {
    const a = asSomebody(aModel({ 'whats stuck': { kind: 'question', guide: 'what_is_stuck' } }));
    a.s.whatNeedsYou = { forReader: jest.fn(async () => ({ needs: [
      { key: 'a', kind: 'decide', title: 'Amani asked for leave from 30 November to 2 December.', detail: null, action: { label: 'Look', to: '/suite/queue' }, groundId: '', organizationId: 'org-a' },
      { key: 'b', kind: 'look', title: 'Juma and Neema have not answered yet', detail: null, action: { label: 'Open', to: '/grounds/g1' }, groundId: 'g1', organizationId: 'org-a' },
    ] })) };
    expect(await a.say('whats stuck')).toBe('2 things are waiting for you.\n- Amani asked for leave from 30 November to 2 December.\n- Juma and Neema have not answered yet.');
  });

  it('"Add our staff handbook for everyone." is told what to do with the file, never "You do not need a page for it"', async () => {
    const said = 'Add our staff handbook for everyone.';
    const a = asSomebody(aModel({ [said]: { kind: 'wants', guide: 'a_document_for_everyone' } }), 'ADMIN');
    const t = await a.say(said);
    expect(t).toBe('Press the + beside the message box and choose the file. I will read it and tell you what it holds, and it goes on the Desk for everyone only when you say yes.');
    expect(t).not.toMatch(/You do not need a page/);
  });
});

describe('T2. who a message is for, decided once', () => {
  it('Ask waiting for an answer comes first, then the model, and with no model the check-in keeps it', async () => {
    const model = aModel({ 'what can u do': { for: 'ask' }, 'closed kilele 450k on tues': { for: 'the_check_in' } });
    expect(await whoTheMessageIsFor(model as any, null, { message: 'yes', askIsWaiting: true })).toBe('ask');
    expect(await whoTheMessageIsFor(model as any, null, { message: 'what can u do', askIsWaiting: false, theCheckInAsked: 'What has moved since last week?' })).toBe('ask');
    expect(await whoTheMessageIsFor(model as any, null, { message: 'closed kilele 450k on tues', askIsWaiting: false })).toBe('the_check_in');
    expect(await whoTheMessageIsFor(null, null, { message: 'whats stuck', askIsWaiting: false })).toBe('the_check_in');
  });

  it('the Yes button answers the proposal it is on, even when a newer one waits (W14)', async () => {
    const a = asSomebody(aModel({}));
    const older = await a.prisma.assistantProposal.create({ data: { organizationId: 'org-a', personExternalId: 'u-1', kind: 'do_it_for_you', summary: 'Shall I do it for you?', payload: { key: 'set_up_a_check_in' } } });
    await a.prisma.assistantProposal.create({ data: { organizationId: 'org-a', personExternalId: 'u-1', kind: 'do_it_for_you', summary: 'newer', payload: { key: 'nothing' } } });
    (a.s as any).truth = { forPerson: async () => ({ person: { externalId: 'u-1' }, sessions: { value: [] } }) };
    a.prisma.person.findMany = jest.fn(async () => []);
    const r: any = await a.s.answerAProposal('org-a', 'p1', older.id, 'yes');
    expect(textOf(r)).toMatch(/^What do you want updates on\?/);
    expect(older.state).toBe('ACCEPTED');
  });

  it('"No, nothing is wrong." with nothing waiting is met as agreement, not filed (C27)', async () => {
    const said = 'No, nothing is wrong.';
    const a = asSomebody(aModel({ [said]: { kind: 'agreement' } }));
    expect(await a.say(said)).toBe('Good. Then nothing needs changing.');
  });
});
