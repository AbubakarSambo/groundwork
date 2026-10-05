import { readFileSync } from 'fs';
import { join } from 'path';
import { anInboundHarness } from './a-whatsapp-inbound-harness';
import { WhatsAppController } from './whatsapp.controller';
import { looksLikeARequest, THE_WORDS } from '../public-api/a-whatsapp-message-is-routed';
import { theCheckInIsOpen } from './what-goes-to-a-phone';

/**
 * SWITCHING BETWEEN A CHECK-IN AND ASK GROUNDWORK ON WHATSAPP (survey items 2, 9 and 12; decision 82,
 * items 2 and 5).
 *
 * Ask Groundwork was blocked while any check-in was open, so "I want leave on 20 October" became an
 * answer in the check-in. There was no word to reach Ask Groundwork, none to go from one check-in to
 * another, and a number in two organisations kept its first pick for good.
 */
const SALES = { id: 'ci-1', label: 'Sales team', status: 'IN_PROGRESS' as const };
const PLANNING = { id: 'ci-2', label: 'Company planning', status: 'IN_PROGRESS' as const };

describe('"ask" and "back"', () => {
  it('"ask" moves the conversation to Ask Groundwork, and the person is told how to come back', async () => {
    const h = anInboundHarness({ open: [SALES], thread: { checkInId: 'ci-1' } });
    await h.service.handle('org-1', h.message('ask'), 'ours');
    expect(h.said).toEqual(['You are now talking to Ask Groundwork. Ask me anything about the company, your work or your check-ins. Write "back" to return to your check-in.']);
    expect(h.thread()?.checkInId).toBe('ask:ci-1');
    expect(h.conversation.sendMessage).not.toHaveBeenCalled();
  });

  it('"Ask Groundwork" works the same', async () => {
    const h = anInboundHarness({ open: [SALES], thread: { checkInId: 'ci-1' } });
    await h.service.handle('org-1', h.message('Ask Groundwork'), 'ours');
    expect(h.thread()?.checkInId).toBe('ask:ci-1');
  });

  it('the next message goes to Ask Groundwork through its own entry, not into the check-in', async () => {
    const h = anInboundHarness({ open: [SALES], thread: { checkInId: 'ask:ci-1' } });
    await h.service.handle('org-1', h.message('How many leave days do I have left?'), 'ours');
    expect(h.assistant.respond).toHaveBeenCalledWith('org-1', 'person-1', 'How many leave days do I have left?');
    expect(h.conversation.sendMessage).not.toHaveBeenCalled();
    expect(h.said).toEqual(['Ask Groundwork answered.']);
  });

  it('"back" returns to the check-in they were in', async () => {
    const h = anInboundHarness({ open: [SALES, PLANNING], thread: { checkInId: 'ask:ci-1' } });
    await h.service.handle('org-1', h.message('back'), 'ours');
    expect(h.thread()?.checkInId).toBe('ci-1');
    expect(h.said).toEqual(['You are back in your check-in. Sales team, session 1. Carry on where you left off.']);
  });

  it("so does the check-in's name", async () => {
    const h = anInboundHarness({ open: [SALES, PLANNING], thread: { checkInId: 'ask:ci-1' } });
    await h.service.handle('org-1', h.message('Company planning'), 'ours');
    expect(h.thread()?.checkInId).toBe('ci-2');
  });
});

describe('"switch"', () => {
  it('with two check-ins open, gives the list again', async () => {
    const h = anInboundHarness({ open: [SALES, PLANNING], thread: { checkInId: 'ci-1' } });
    await h.service.handle('org-1', h.message('switch'), 'ours');
    expect(h.said).toEqual(['You have more than one check-in open. Which is this for? Reply with the number.\n1. Sales team, session 1 (started)\n2. Company planning, session 1 (started)']);
    expect(h.conversation.sendMessage).not.toHaveBeenCalled();
  });

  it('with one open, says so plainly', async () => {
    const h = anInboundHarness({ open: [SALES], thread: { checkInId: 'ci-1' } });
    await h.service.handle('org-1', h.message('switch'), 'ours');
    expect(h.said).toEqual(['You have one check-in open, "Sales team". Carry on here, or write "ask" to talk to Ask Groundwork.']);
  });

  it("on Groundwork's number, a number in two organisations chooses again, then sees that organisation's check-ins", async () => {
    const sent: string[] = [];
    const whatsapp: any = {
      isEnabled: jest.fn(async () => true), verifySignature: jest.fn(),
      whichOrganisations: jest.fn(async () => [{ id: 'a', name: 'Acme' }, { id: 'b', name: 'Baridi Appliances' }]),
      sendMessage: jest.fn(async (_to: string, text: string) => { sent.push(text); return { sent: true }; }),
    };
    let kept: any = { phone: '+2348012345678', organizationId: 'a', pickPendingAt: null };
    const prisma: any = { whatsAppOrganisationPick: {
      findUnique: jest.fn(async () => kept),
      update: jest.fn(async (q: any) => { kept = { ...kept, ...q.data }; return kept; }),
      upsert: jest.fn(async () => kept),
    } };
    const inbound: any = { handle: jest.fn(async () => undefined) };
    const c = new WhatsAppController({ get: () => undefined } as any, prisma, whatsapp, inbound);
    const body = (text: string) => ({ rawBody: Buffer.from('{}'), headers: {}, body: { entry: [{ changes: [{ value: { messages: [{ type: 'text', from: '2348012345678', text: { body: text } }] } }] }] } });
    await c.receive(body('switch') as any);
    expect(sent).toEqual(["This number is on more than one organisation's roster. Which is this for? Reply with the number.\n1. Acme\n2. Baridi Appliances"]);
    expect(inbound.handle).not.toHaveBeenCalled();
    await c.receive(body('2') as any);
    expect(kept.organizationId).toBe('b');
    expect(sent[1]).toBe('Baridi Appliances. Carry on. What you write here goes to your check-in there. Write "switch" to choose again.');
    expect(inbound.handle).toHaveBeenCalledWith('b', expect.objectContaining({ entry: expect.any(Array) }), 'ours');
  });
});

describe('the words are said when a check-in starts on WhatsApp', () => {
  it('in one plain sentence, before the first question', async () => {
    const h = anInboundHarness({ open: [{ ...SALES, status: 'NOT_STARTED' }] });
    await h.service.handle('org-1', h.message('hello'), 'ours');
    expect(h.said[0]).toBe(`Sales team, session 1. ${THE_WORDS()}\n\nWhat moved since last time?`);
    expect(THE_WORDS()).toBe('You can write "ask" at any time to talk to Ask Groundwork, "back" to come back to your check-in, and "switch" to choose another check-in.');
  });
});

describe('a leave, hours or spending request said during a check-in', () => {
  it.each([
    ['I want leave on 20 October', 'leave'],
    ['Can I take Friday off as annual leave?', 'leave'],
    ['log 6 hours on Atlas', 'hours'],
    ['I need to spend 12,000 on fuel', 'spending'],
  ])('"%s" is plainly a %s request', (text, kind) => {
    expect(looksLikeARequest(text)).toBe(kind);
  });

  it.each([
    'I was on leave on Monday, so the visit moved.',
    'I spent 12,000 on fuel this week.',
    'We worked 6 hours on the Atlas demo.',
    'Green Mart wants to wait until after December.',
  ])('"%s" is something said to the check-in, and stays there', (text) => {
    expect(looksLikeARequest(text)).toBeNull();
  });

  it('is asked about once, in Hafsah\'s words, and nothing goes into the check-in yet', async () => {
    const h = anInboundHarness({ open: [SALES], thread: { checkInId: 'ci-1' } });
    await h.service.handle('org-1', h.message('I want leave on 20 October'), 'ours');
    expect(h.said).toEqual(['Shall I treat this as a leave request?']);
    expect(h.conversation.sendMessage).not.toHaveBeenCalled();
    expect(h.assistant.respond).not.toHaveBeenCalled();
  });

  it('yes hands it to Ask Groundwork through its own entry, which says it back before anything is sent', async () => {
    const h = anInboundHarness({ open: [SALES], thread: { checkInId: 'ci-1' } });
    await h.service.handle('org-1', h.message('I need to spend 12,000 on fuel'), 'ours');
    expect(h.said).toEqual(['Shall I treat this as a spending request?']);
    await h.service.handle('org-1', h.message('yes'), 'ours');
    expect(h.assistant.respond).toHaveBeenCalledWith('org-1', 'person-1', 'I need to spend 12,000 on fuel');
    expect(h.conversation.sendMessage).not.toHaveBeenCalled();
    expect(h.said[1]).toBe('Ask Groundwork answered.\n\nWrite "back" to return to your check-in.');
    /* The confirmation the person gives next is Ask Groundwork's, not a check-in answer. */
    expect(h.thread()?.checkInId).toBe('ask:ci-1');
  });

  it('no puts it in the check-in, as it would have gone before', async () => {
    const h = anInboundHarness({ open: [SALES], thread: { checkInId: 'ci-1' } });
    await h.service.handle('org-1', h.message('log 6 hours on Atlas'), 'ours');
    expect(h.said).toEqual(['Shall I treat this as hours?']);
    await h.service.handle('org-1', h.message('no'), 'ours');
    expect(h.conversation.sendMessage).toHaveBeenCalledWith('ci-1', 'u-1', 'log 6 hours on Atlas', { door: 'whatsapp' });
    expect(h.assistant.respond).not.toHaveBeenCalled();
  });

  it('anything else is asked again, so only the person\'s answer decides', async () => {
    const h = anInboundHarness({ open: [SALES], thread: { checkInId: 'ci-1' } });
    await h.service.handle('org-1', h.message('I want leave on 20 October'), 'ours');
    await h.service.handle('org-1', h.message('hmm'), 'ours');
    expect(h.said[1]).toBe('Please reply yes or no. Shall I treat this as a leave request?');
    expect(h.conversation.sendMessage).not.toHaveBeenCalled();
  });
});

describe('the opening notice on a one-to-one check-in (survey item 9, decision 82 item 5)', () => {
  it('never says what is said is "released with everybody else\'s", for a performance plan or a probation', () => {
    for (const label of ['Performance plan for Amina', "Kwame's first 90 days"]) {
      expect(theCheckInIsOpen({ firstName: 'Amina', label }).text).not.toMatch(/released|everybody else/i);
    }
    const listener = readFileSync(join(__dirname, '..', 'webhooks', 'webhooks.listener.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(listener).not.toMatch(/released with everybody else/);
  });
});
