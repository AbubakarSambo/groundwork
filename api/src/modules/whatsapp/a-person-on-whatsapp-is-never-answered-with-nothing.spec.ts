import { readFileSync } from 'fs';
import { join } from 'path';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { CheckInStatus } from '@prisma/client';
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

const platform = (checkIn: any, conversation: { open?: any; sendMessage?: any }) => {
  const sent: string[] = [];
  const whatsapp: any = {
    isEnabled: jest.fn(async () => true),
    verifySignature: jest.fn(),
    findUserByPhoneNumber: jest.fn(async () => ({ id: 'me' })),
    sendMessage: jest.fn(async (_to: string, text: string) => { sent.push(text); return { sent: true }; }),
  };
  const prisma: any = { checkIn: { findFirst: jest.fn(async () => checkIn) } };
  const conv: any = { open: jest.fn(conversation.open ?? (async () => ({ reply: 'Welcome. What has happened since?' }))), sendMessage: jest.fn(conversation.sendMessage ?? (async () => ({ reply: 'Noted.' }))) };
  const c = new WhatsAppController({ get: () => undefined } as any, prisma, whatsapp, conv);
  return { c, sent, conv, whatsapp };
};

describe('the platform handler', () => {
  it.each([
    ['a spent balance', () => { throw new ForbiddenException('This check-in is beyond your ten free check-ins. Resubscribe to continue checking in.'); }, /beyond your ten free/],
    ['a paused ground', () => { throw new BadRequestException('This check-in is on hold. Nothing can be added to it until it is resumed.'); }, /on hold/],
    ['a completed check-in', () => { throw new BadRequestException('This check-in is already complete'); }, /already complete/],
    ['a failed model call', () => { throw new Error('model unreachable'); }, /model unreachable/],
  ])('%s produces exactly one outbound text carrying the refusal’s own sentence', async (_n, sendMessage, says) => {
    const { c, sent } = platform({ id: 'ci', status: CheckInStatus.IN_PROGRESS }, { sendMessage });
    await c.receive(inbound('hello') as any);
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatch(says);
  });

  it('the first message on a NOT_STARTED check-in is opened, then handed in as their turn, and answered once', async () => {
    const { c, sent, conv } = platform({ id: 'ci', status: CheckInStatus.NOT_STARTED }, {});
    await c.receive(inbound('We signed the supplier on Monday.') as any);
    expect(conv.open).toHaveBeenCalledWith('ci', 'me');
    expect(conv.sendMessage).toHaveBeenCalledWith('ci', 'me', 'We signed the supplier on Monday.');
    expect(conv.open.mock.invocationCallOrder[0]).toBeLessThan(conv.sendMessage.mock.invocationCallOrder[0]);
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatch(/Welcome/);
    expect(sent[0]).toMatch(/Noted/);
  });

  it('a message on a session already underway is one send, not two', async () => {
    const { c, sent, conv } = platform({ id: 'ci', status: CheckInStatus.IN_PROGRESS }, {});
    await c.receive(inbound('More happened.') as any);
    expect(conv.open).not.toHaveBeenCalled();
    expect(sent).toEqual(['Noted.']);
  });

  it('only when the refusal itself cannot be sent does it become a log line', async () => {
    const { c, whatsapp } = platform({ id: 'ci', status: CheckInStatus.IN_PROGRESS }, { sendMessage: () => { throw new BadRequestException('on hold'); } });
    whatsapp.sendMessage = jest.fn(async () => ({ sent: false, error: '500' }));
    (c as any).logger = { error: jest.fn(), warn: jest.fn(), log: jest.fn() };
    await c.receive(inbound('hello') as any);
    expect((c as any).logger.error).toHaveBeenCalledWith(expect.stringMatching(/could not be told/));
  });
});

describe('the organisation handler', () => {
  const SRC = readFileSync(join(__dirname, '../public-api/whatsapp-for-an-organisation.service.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  it('wraps the open-and-answer path in a try whose catch says the sentence, as the finish branch already did', () => {
    const at = SRC.indexOf('const r = await this.conversation.sendMessage(current.id, userId!, text);');
    expect(at).toBeGreaterThan(0);
    const before = SRC.slice(at - 600, at);
    const after = SRC.slice(at, at + 700);
    expect(before).toMatch(/try \{/);
    expect(after).toMatch(/catch \(e: any\) \{[\s\S]*await say\(/);
  });

  it('retries the report SEND and never re-runs the report', () => {
    const at = SRC.indexOf('private async sendTheReport(');
    const body = SRC.slice(at, SRC.indexOf('private async readLanguageOnce('));
    expect(body.match(/this\.whatsapp\.sendFor\(/g)).toHaveLength(2);
    expect(body.match(/this\.reports\.sessionReport\(/g)).toHaveLength(1);
  });

  it('an inbound for an organisation we do not have is acknowledged and SAID, not dropped in silence', async () => {
    const prisma: any = { whatsAppConnection: { findUnique: jest.fn(async () => null) } };
    const c = new WhatsAppForAnOrganisationController(prisma, {} as any, {} as any);
    (c as any).logger = { warn: jest.fn(), error: jest.fn(), log: jest.fn() };
    const res = await c.receive('org-nobody', { rawBody: Buffer.from('{}'), headers: {}, body: {} } as any);
    expect(res).toEqual({ received: true });
    expect((c as any).logger.warn).toHaveBeenCalledWith(expect.stringMatching(/unknown organisation org-nobody \(1 since start\)/));
  });
});
