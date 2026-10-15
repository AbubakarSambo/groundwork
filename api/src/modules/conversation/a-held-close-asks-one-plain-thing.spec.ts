import { TurnRole } from '@prisma/client';
import { ConversationService } from './conversation.service';
import { withTheOneMoreLine } from './a-turn-asks-one-thing';
import { withoutTheGoodbye, withoutWhatWasAlreadySaid, asAQuestion, ONE_MORE_QUESTION } from './the-close-is-held-once';
import { theCloseQuestionFor } from './what-they-will-do-is-asked-before-the-end';
import { EACH_OWED_THING_ASKED_PLAINLY, theOwedThingAskedPlainly } from './each-owed-thing-asked-plainly';
import { THE_SPINE, WHAT_EACH_SITUATION_ADDS } from './what-every-check-in-owes';
import { KEEP_THE_TEAM_ON_TRACK, CONNECT_GOALS_ACROSS } from './what-a-check-in-owes';

/**
 * THE HELD CLOSES OF RE-E (1 October 2026), replayed on their exact turns, up to the turn that was held.
 * The held turn is replayed as the model wrote it, before the product's question went under it.
 */
const RE_E: Record<string, [string, string][]> = require('./__fixtures__/re-e-held-closes.json');

async function replay(key: string, neverAsked: string[] = []) {
  const t = RE_E[key];
  const served = t[t.length - 1][1];
  const modelsClose = served.includes(ONE_MORE_QUESTION) ? served.slice(0, served.indexOf(ONE_MORE_QUESTION)).trim() : served;
  const turns = [...t.slice(0, -1), ['AI', modelsClose]].map(([r, c]) => ({ role: r === 'AI' ? TurnRole.AI : TurnRole.PERSON, content: c }));
  const lead = /Amina|Bisi/.test(key);
  const prisma: any = {
    checkIn: {
      findUnique: jest.fn(async () => ({
        closeHeldAt: null, participantId: 'p1', startedAt: new Date(0), isClarification: false,
        ground: { cadence: 'FORTNIGHTLY', scenario: key.startsWith('sales') ? 'OKR_ALIGNMENT' : 'NEW_HIRE' },
        participant: { partyType: lead ? 'INITIATOR' : 'PARTICIPANT' },
      })),
      update: jest.fn(async () => ({})),
    },
    conversationTurn: { findMany: jest.fn(async (a: any) => (a?.where?.role ? turns.filter((x) => x.role === a.where.role) : turns)) },
    groundDocument: { count: jest.fn(async () => 0) },
  };
  const s: any = new ConversationService(prisma, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, { get: () => '' } as any);
  s.whatThisSessionNeverAsked = jest.fn(async () => neverAsked);
  const close = await s.mayClose('c1', false);
  /* What the person reads, built as sendMessage builds it. */
  const kept = withoutWhatWasAlreadySaid(withoutTheGoodbye(modelsClose), turns.filter((x) => x.role === TurnRole.AI).slice(0, -1).map((x) => x.content));
  const ask = close.nextStep ? theCloseQuestionFor(close.nextStep.isLead, close.nextStep.personSaid, kept) : close.ask;
  return { close, served, reads: ask ? withTheOneMoreLine(kept, ask) : null };
}

describe('1. a held question always has a subject', () => {
  it.each([
    ['seniorhire_s2_Tobi', 'I have one more question before we finish. By when will you do that?'],
    ['seniorhire_s4_Tobi', 'Understood.\n\nI have one more question before we finish. By when will you do that?'],
    ['sales_s2_Ngozi', 'You will re-escalate to the head of credit today, asking for a timeline.\n\nI have one more question before we finish. By when will you do that?'],
  ])('%s had already said when; before it read a bare "that", now it closes', async (key, before) => {
    const r = await replay(key);
    expect(r.served).toBe(before);
    expect(r.close.ready).toBe(true);
    expect(r.reads).toBeNull();
  });

  it('Tobi, session 1: under a sentence that says what this is, "What will you do about this, and by when?"', async () => {
    const r = await replay('seniorhire_s1_Tobi', ['how they see it - what is clear, and what is not']);
    expect(r.reads).toBe("You've already produced a health report, prepared a QBR deck, and proactively resolved two issues. Your focus on understanding the accounts through Amina's meetings is clear.\n\nI have one more question before we finish. What will you do about this, and by when?");
  });

  it('where they said what they will do, the question says it back in their own words', () => {
    /* Tobi's own sentence, re-e session 4, before he gave the meeting as the when. */
    expect(theCloseQuestionFor(false, ['I will ask Amina to clarify my role regarding commercial conversations.'], 'Understood.'))
      .toBe('I have one more question before we finish. By when will you ask Amina to clarify your role regarding commercial conversations?');
  });

  it('with nothing above it and nothing they said to name, it asks what is next, never about "this" or "that"', () => {
    expect(theCloseQuestionFor(false, ['Amina arranged those meetings.'], 'Understood.')).toBe('I have one more question before we finish. What will you do next, and by when?');
    expect(theCloseQuestionFor(false, [], '')).toBe('I have one more question before we finish. What will you do next, and by when?');
  });

  it('on none of the re-e closes does a question end on a bare "this" or "that" with nothing before it', async () => {
    for (const key of Object.keys(RE_E)) {
      const { reads } = await replay(key);
      if (!reads) continue;
      const before = reads.slice(0, reads.indexOf(ONE_MORE_QUESTION)).trim();
      if (/\b(?:this|that)[,?]/.test(reads.slice(reads.indexOf(ONE_MORE_QUESTION)))) expect(before.split(/\s+/).length).toBeGreaterThanOrEqual(4);
    }
  });
});

describe('2. the owed-list hold asks one plain question, and not on top of a fresh answer', () => {
  it('Tobi read "How do you see it - what is clear, and what is not?"; it is now one question', () => {
    expect(asAQuestion('how they see it - what is clear, and what is not')).toBe('What is still not clear to you?');
  });

  it('every line on every owed list has one plain question: one question mark, no dash, nothing joined by ", and"', () => {
    const lines = [...THE_SPINE, ...Object.values(WHAT_EACH_SITUATION_ADDS).flat(), ...KEEP_THE_TEAM_ON_TRACK, ...CONNECT_GOALS_ACROSS].map((o) => o.what);
    for (const what of lines) {
      const q = theOwedThingAskedPlainly(what);
      expect([what, q]).toEqual([what, expect.any(String)]);
      expect((q!.match(/\?/g) ?? []).length).toBe(1);
      expect(q).not.toMatch(/ - |, and (?:what|how|who|where|whether)\b/);
    }
    expect(Object.keys(EACH_OWED_THING_ASKED_PLAINLY).length).toBeGreaterThan(60);
  });

  it.each([['sales_s1_Kwame'], ['sales_s1_Femi']])('%s had just said what they will do and when: no "How is it actually going?" on top, it closes', async (key) => {
    const r = await replay(key, ['how it is actually going']);
    expect(r.served).toMatch(/I have one more question before we finish\. How is it actually going\?$/);
    expect(r.close.ready).toBe(true);
    expect(r.reads).toBeNull();
  });

  it('the owed hold still holds for a participant who has not just answered one', async () => {
    const r = await replay('seniorhire_s3_Tobi', ['how it is actually going']);
    expect(r.reads).toBe('You have named what you will do in your next meeting with Amina, and that clarifies an open question.\n\nI have one more question before we finish. How is it actually going?');
  });
});

describe('3. the lead is never held with a participant\'s question', () => {
  it('Amina read "What did you understand you were meant to do?"; she had been asked her decision and answered, so it closes', async () => {
    const r = await replay('seniorhire_s1_Amina', ['what they understood they were meant to do']);
    expect(r.served).toContain('What did you understand you were meant to do?');
    expect(r.close.ready).toBe(true);
    expect(r.reads).toBeNull();
  });

  it('Bisi, the lead, is not held with "Who is responsible for which part of that plan?" on top of her plan', async () => {
    const r = await replay('sales_s2_Bisi', ['who is responsible for which part of that plan']);
    expect(r.served).toContain('Who is responsible for which part of that plan?');
    expect(r.reads).toBeNull();
  });
});
