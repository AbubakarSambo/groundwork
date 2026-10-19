import { readFileSync } from 'fs';
import { join } from 'path';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { WhatsAppController } from './whatsapp.controller';
import { WhatsAppForAnOrganisationController } from '../public-api/whatsapp-for-an-organisation.controller';

/**
 * A PERSON ON WHATSAPP IS NEVER ANSWERED WITH NOTHING.
 *
 * A spent balance, a paused ground, an already-complete check-in and a failed model call all throw
 * with a sentence written for the person. Both inbound handlers caught every one of them, logged it,
 * and told the person nothing - which on a phone reads as the product being dead. And the platform
 * handler dropped the first thing a person wrote on a NOT_STARTED check-in. Silence is the one
 * outcome this channel cannot produce.
 */
const inbound = (text: string, from = '+2348000000001') => ({
  rawBody: Buffer.from('{}'),
  headers: {},
  body: { entry: [{ changes: [{ value: { messages: [{ type: 'text', from, text: { body: text } }] } }] }] },
});

/*
 * THE PLATFORM ROUTE IS A DOOR INTO THE ORGANISATION HANDLER, NOT A SECOND HANDLER. It works out which
 * organisation the sender means and hands the body over; everything that used to be tested here about
 * opening, answering and refusing is the organisation handler's, tested below and in its own module.
 */
const platform = (orgs: { id: string; name: string }[], handle: any = async () => undefined, kept: any = null) => {
  const sent: string[] = [];
  const whatsapp: any = {
    isEnabled: jest.fn(async () => true),
    verifySignature: jest.fn(),
    whichOrganisations: jest.fn(async () => orgs),
    sendMessage: jest.fn(async (_to: string, text: string) => { sent.push(text); return { sent: true }; }),
  };
  const picks: any = { findUnique: jest.fn(async () => kept), upsert: jest.fn(async () => ({})), update: jest.fn(async () => ({})) };
  const prisma: any = { whatsAppOrganisationPick: picks };
  const inboundHandler: any = { handle: jest.fn(handle) };
  const c = new WhatsAppController({ get: () => undefined } as any, prisma, whatsapp, inboundHandler);
  return { c, sent, inboundHandler, whatsapp, picks };
};

describe('the platform handler', () => {
  it('hands a message from a number on one roster to the organisation handler, for that organisation', async () => {
    const { c, inboundHandler, sent } = platform([{ id: 'org-1', name: 'Acme' }]);
    await c.receive(inbound('We signed the supplier on Monday.') as any);
    expect(inboundHandler.handle).toHaveBeenCalledWith('org-1', expect.objectContaining({ entry: expect.any(Array) }), 'ours');
    expect(sent).toEqual([]);
  });

  it('a number on no roster is told how to be added, once, and nothing is handled', async () => {
    const { c, inboundHandler, sent } = platform([]);
    await c.receive(inbound('hello') as any);
    expect(inboundHandler.handle).not.toHaveBeenCalled();
    expect(sent).toHaveLength(1);
    expect(sent[0]).toBe('Groundwork does not know this number yet. If you use Groundwork, add this number under Settings, or ask your admin to add it, then write again.');
  });

  it('a number on two rosters is asked which, as a numbered list, and nothing is guessed', async () => {
    const { c, inboundHandler, sent, picks } = platform([{ id: 'a', name: 'Acme' }, { id: 'b', name: 'Bolt' }]);
    await c.receive(inbound('hello') as any);
    expect(inboundHandler.handle).not.toHaveBeenCalled();
    expect(sent[0]).toMatch(/1\. Acme\n2\. Bolt/);
    expect(picks.upsert).toHaveBeenCalled();
  });

  it('a bare number answers the question while it is fresh, and the pick is kept', async () => {
    const { c, inboundHandler, sent, picks } = platform([{ id: 'a', name: 'Acme' }, { id: 'b', name: 'Bolt' }], undefined, { phone: '+2348000000001', organizationId: null, pickPendingAt: new Date() });
    await c.receive(inbound('2') as any);
    expect(picks.update).toHaveBeenCalledWith(expect.objectContaining({ data: { organizationId: 'b', pickPendingAt: null } }));
    expect(sent[0]).toMatch(/^Bolt\./);
    expect(inboundHandler.handle).not.toHaveBeenCalled();
  });

  it('a kept pick routes without asking again', async () => {
    const { c, inboundHandler } = platform([{ id: 'a', name: 'Acme' }, { id: 'b', name: 'Bolt' }], undefined, { phone: '+2348000000001', organizationId: 'b', pickPendingAt: null });
    await c.receive(inbound('More happened.') as any);
    expect(inboundHandler.handle).toHaveBeenCalledWith('b', expect.anything(), 'ours');
  });

  it.each([
    ['a spent balance', () => { throw new ForbiddenException('This check-in is beyond your ten free check-ins. Resubscribe to continue checking in.'); }, /beyond your ten free/],
    ['a paused ground', () => { throw new BadRequestException('This check-in is on hold. Nothing can be added to it until it is resumed.'); }, /on hold/],
    ['a failed model call', () => { throw new Error('model unreachable'); }, /model unreachable/],
  ])('%s escaping the handler still produces exactly one outbound text carrying the refusal’s own sentence', async (_n, handle, says) => {
    const { c, sent } = platform([{ id: 'org-1', name: 'Acme' }], handle);
    await c.receive(inbound('hello') as any);
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatch(says);
  });

  it('only when the refusal itself cannot be sent does it become a log line', async () => {
    const { c, whatsapp } = platform([{ id: 'org-1', name: 'Acme' }], () => { throw new BadRequestException('on hold'); });
    whatsapp.sendMessage = jest.fn(async () => ({ sent: false, error: '500' }));
    (c as any).logger = { error: jest.fn(), warn: jest.fn(), log: jest.fn() };
    await c.receive(inbound('hello') as any);
    expect((c as any).logger.error).toHaveBeenCalledWith(expect.stringMatching(/could not be told/));
  });
});

describe('the organisation handler', () => {
  const SRC = readFileSync(join(__dirname, '../public-api/whatsapp-for-an-organisation.service.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  it('wraps the open-and-answer path in a try whose catch says the sentence, as the finish branch already did', () => {
    const at = SRC.indexOf("const r = await this.conversation.sendMessage(current.id, userId!, text, { door: 'whatsapp' });");
    expect(at).toBeGreaterThan(0);
    /* 700, not 600 (engine test, second run): the open path now also follows today's session when the one asked for had a round
       that had closed, which put the try a few characters further back. Still the one try around the open and the answer. */
    const before = SRC.slice(at - 700, at);
    const after = SRC.slice(at, at + 700);
    expect(before).toMatch(/try \{/);
    expect(after).toMatch(/catch \(e: any\) \{[\s\S]*await say\(/);
  });

  it('retries the report SEND and never re-runs the report', () => {
    const at = SRC.indexOf('private async sendTheReport(');
    const body = SRC.slice(at, SRC.indexOf('private async readLanguageOnce('));
    /* sendOn: the same send, on the number the person last wrote to (survey item 8). */
    /* Changed 18 October (Drop Access run 1, items 22 and 23): a third send, the thank-you when the report has nothing in it yet, which goes inside the 24 hours only. */
    expect(body.match(/this\.whatsapp\.sendOn\(/g)).toHaveLength(3);
    expect(body.match(/this\.reports\.sessionReport\(/g)).toHaveLength(1);
  });

  it('an inbound for an organisation we do not have is acknowledged and SAID, not dropped in silence', async () => {
    const prisma: any = { whatsAppConnection: { findUnique: jest.fn(async () => null) } };
    /* Fourth argument: config, for whether Meta has approved the wording we start with. */
    const c = new WhatsAppForAnOrganisationController(prisma, {} as any, {} as any, { get: () => [] } as any);
    (c as any).logger = { warn: jest.fn(), error: jest.fn(), log: jest.fn() };
    const res = await c.receive('org-nobody', { rawBody: Buffer.from('{}'), headers: {}, body: {} } as any);
    expect(res).toEqual({ received: true });
    expect((c as any).logger.warn).toHaveBeenCalledWith(expect.stringMatching(/unknown organisation org-nobody \(1 since start\)/));
  });
});
