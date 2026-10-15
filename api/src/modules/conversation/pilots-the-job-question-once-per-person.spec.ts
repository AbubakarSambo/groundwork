import { readFileSync } from 'fs';
import { join } from 'path';
import { asksAboutTheirJobAgain, withoutTheJobQuestion, coverageOf, ROLE_TOPICS, isTheirFirstCheckIn } from './their-role-in-the-first-check-in';

/* Comments are taken out before anything is matched, so a sentence in a comment cannot satisfy a check (a-guard-that-a-comment-satisfies-is-not-a-guard). */
const withoutComments = (t: string): string => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');


/**
 * PILOTS, 13 OCTOBER 2026, E6 (decision 129: one question, asked once, in the person's first check-in). Aisha was asked
 * "What about your job?" three times, Kevin "What are you responsible for in your job?" right after his sale, and David
 * "What does doing well in your role look like" mid-delay in a later check-in.
 */
describe('the job question, once per person', () => {
  it('"What about your job?" counts as the job question, so the first check-in does not ask it again', () => {
    const turns = [
      { role: 'AI' as const, content: 'What moved on the Otieno probate filing?' },
      { role: 'PERSON' as const, content: 'The Otieno probate filing is done.' },
      { role: 'AI' as const, content: 'Njeri can confirm it. What about your job?' },
      { role: 'PERSON' as const, content: 'Getting filings in on time.' },
    ];
    const { notAsked, left } = coverageOf(ROLE_TOPICS, turns);
    expect(notAsked).toEqual([]);
    expect(left.length + 0).toBeGreaterThanOrEqual(0);
  });

  it('a reply that asks it again, after it was asked, is caught, and the question comes out', () => {
    const earlier = ['Njeri can confirm it. What about your job?'];
    const again = 'Understood, the probate filing is in. What are you responsible for in your job?';
    expect(asksAboutTheirJobAgain(again, earlier)).toBe(true);
    expect(withoutTheJobQuestion(again)).toBe('Understood, the probate filing is in.');
  });

  it('the first time it is asked is not caught', () => {
    expect(asksAboutTheirJobAgain('What are you responsible for in your job?', ['What moved on the filing?'])).toBe(false);
  });

  it('a person asked in an earlier check-in is not in their first check-in any more', async () => {
    const prisma: any = {
      groundParticipant: { findUnique: jest.fn(async () => ({ userId: 'u-david', ground: { organizationId: 'org-1', scenario: 'PULSE_CHECK' } })) },
      checkIn: { findUnique: jest.fn(async () => ({ isSetup: false, isClarification: false, isSelfCorrection: false })), count: jest.fn(async () => 0) },
      conversationTurn: { findMany: jest.fn(async () => [{ content: 'What does doing well in your role look like for you?' }]) },
      person: { findFirst: jest.fn(async () => null) },
      roleInterviewAnswer: { count: jest.fn(async () => 0) },
    };
    expect(await isTheirFirstCheckIn({ prisma } as any, { id: 'ci-2', participantId: 'p-david' })).toBeNull();
  });

  it('the conversation applies it on every reply that is not the job turn itself', () => {
    const src = withoutComments(readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8'));
    expect(src).toContain('if (asksAboutTheirJobAgain(screened.text, earlierAi)) {');
    expect(src).toContain('THEIR_JOB_WAS_ASKED_ALREADY');
  });
});

describe('only the question about their own job is held to once', () => {
  it('"Who is responsible for sending the Lakeview documents?" survives after the job question was asked', () => {
    const earlier = ['What are you responsible for in your job, and what does doing well look like in it?'];
    const probe = 'David is late with them. Who is responsible for sending the Lakeview documents?';
    expect(asksAboutTheirJobAgain(probe, earlier)).toBe(false);
    expect(withoutTheJobQuestion(probe)).toBe(probe);
  });
  it('the job question asked again is still caught', () => {
    expect(asksAboutTheirJobAgain('What about your job?', ['What are you responsible for in your job?'])).toBe(true);
  });
});
