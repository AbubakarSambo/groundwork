/**
 * A LONG MESSAGE IS TAKEN WHOLE, AND ONE TOO LONG IS ASKED FOR AS A DOCUMENT (Hafsah, 3 November 2026: "Accept messages up to about
 * 30,000 characters and record them accurately; beyond that, ask the person to attach it as a document instead.")
 *
 * Every door reads one cap and one sentence: the check-in (app, panel, API), setup's chat and the open link, Ask, and WhatsApp. Email
 * is not a way into a conversation (email/a-message-sent-to-us.ts). The assessment is given the whole message, never a cut piece.
 */
import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import * as fs from 'fs';
import * as path from 'path';
import { AMessageIntoACheckInDto, ATurnDto, A_MESSAGE_MAX, A_MESSAGE_IS_TOO_LONG } from './a-message-into-a-check-in.dto';
import { AQuestionDto } from '../../modules/ask/ask.controller';
import { assessTheConversation } from '../../modules/conversation/assess-the-conversation';

const errorsOf = (cls: any, body: object) => validateSync(plainToInstance(cls, body)).flatMap((e) => Object.values(e.constraints ?? {}));

describe('a message of about 30,000 characters', () => {
  const long = `${'I went through every account this week. '.repeat(800)}`.slice(0, A_MESSAGE_MAX - 8) + 'The end.';

  it('the cap is 30,000 characters', () => {
    expect(A_MESSAGE_MAX).toBe(30_000);
    expect(long.length).toBe(30_000);
  });

  it('is taken by the check-in, by setup\'s chat and by Ask', () => {
    expect(errorsOf(AMessageIntoACheckInDto, { message: long })).toEqual([]);
    expect(errorsOf(ATurnDto, { role: 'user', content: long })).toEqual([]);
    expect(errorsOf(AQuestionDto, { message: long })).toEqual([]);
  });

  it('one character more, and the person reads one plain sentence asking for a document', () => {
    expect(A_MESSAGE_IS_TOO_LONG).toBe('That message is too long for me to take in one go. Please attach it as a document instead, and I will read all of it.');
    expect(errorsOf(AMessageIntoACheckInDto, { message: `${long}x` })).toEqual([A_MESSAGE_IS_TOO_LONG]);
    expect(errorsOf(ATurnDto, { role: 'user', content: `${long}x` })).toEqual([A_MESSAGE_IS_TOO_LONG]);
    expect(errorsOf(AQuestionDto, { message: `${long}x` })).toEqual([A_MESSAGE_IS_TOO_LONG]);
  });

  it('on WhatsApp it is said back to them in the same words', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', '..', 'modules', 'public-api', 'whatsapp-for-an-organisation.service.ts'), 'utf8');
    expect(src).toContain('if (arrived.text.trim()) await say(A_MESSAGE_IS_TOO_LONG);');
  });

  it('and the assessment reads the whole of it, not a cut piece', async () => {
    let given = '';
    const prisma: any = {
      checkIn: {
        findUnique: jest.fn(async () => ({
          id: 'ci', groundId: 'g', participantId: 'p', sessionNumber: 1, startedAt: new Date(), completedAt: new Date(), whatWeHave: null, sessionReport: null,
          turns: [{ id: 't0', role: 'AI', content: 'How did the week go?' }, { id: 't1', role: 'PERSON', content: long }],
          participant: { partyType: 'PARTICIPANT', nameGiven: null, roleAsDescribed: null, user: { firstName: 'Brian', lastName: 'Otieno', jobTitle: null } },
          ground: { label: 'Sales', initiator: { firstName: 'Wanjiru', lastName: 'Kamau' } },
        })),
        findMany: jest.fn(async () => []),
        update: jest.fn(async () => ({})),
      },
      groundObjective: { findMany: jest.fn(async () => []) },
      groundCommitment: { findMany: jest.fn(async () => []) },
      groundParticipant: { findFirst: jest.fn(async () => null) },
    };
    const anthropic: any = { extract: jest.fn(async (_s: string, h: any[]) => { given = h[0].content; return { summary: '', everythingElse: [{ words: 'The end.', from: [1] }], nothingToRecord: [] }; }) };
    await assessTheConversation({ prisma, anthropic, prompts: null, events: null }, 'ci', { howItEnded: 'finished by the person', closedAt: new Date() });
    expect(given).toContain(long);
  });
});
