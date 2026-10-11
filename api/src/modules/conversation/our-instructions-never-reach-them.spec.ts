import { PartyType } from '@prisma/client';
import { ConversationService } from './conversation.service';
import { withoutOurInstructions, theInstructionSentences } from './our-instructions-never-reach-them';
import { landThisOneInstead } from './four-questions-in-a-row';
import { THE_THREE_THINGS, THEY_JUST_PUSHED_BACK } from './the-last-thing-it-reads-is-the-thing-it-must-not-miss';
import { whereTheCheckInIs } from './what-they-will-do-is-asked-before-the-end';
import { ASK_ONE_THING } from './a-turn-asks-one-thing';

/**
 * OUR INSTRUCTIONS TO THE MODEL NEVER REACH THE PERSON. Tobi's turn is exact, as he read it (re-e,
 * seniorhire, session 3); the prompt is built from the blocks the product actually sends.
 */
const TOBI_READ =
  "Understood. Your last three turns all ended by asking them something. This one should not. Say the single thing you noticed in what they just told you, and stop there. They will keep going, and what comes next is usually the part they were not going to volunteer. You will do that in our next scheduled meeting.\n\nWhat else should I know?";
const TOBI_SAID = ['I will do that in our next scheduled meeting.'];
const TOBI_ASKED_BEFORE = [
  'What do you need to understand or access to deliver on your mandate?',
  'You have named what you will do in your next meeting with Amina, and that clarifies an open question.\n\nI have one more question before we finish. By when will you do that?',
];

/* A prompt as the turn is given it: the engine, the rhythm block, the last three things, and where the check-in is. */
const NEXT_STEP_BLOCK = whereTheCheckInIs({
  personTurns: ['a', 'b', 'c', 'd', 'e', 'The committee has not replied to me.'], aiTurns: [], oneTime: false, isLead: false, notACheckIn: false, askedToFinish: false,
});
const PROMPT = ['SYS: You run a check-in. Ask "What will you do about this, and by when?" before you close.', landThisOneInstead(), NEXT_STEP_BLOCK, THE_THREE_THINGS, THEY_JUST_PUSHED_BACK].join('\n\n');

describe('a sentence that copies our instructions is cut where every reply is saved', () => {
  it('Tobi: the rhythm block is cut, his own words and the question stay', () => {
    const r = withoutOurInstructions(TOBI_READ, PROMPT, TOBI_SAID, TOBI_ASKED_BEFORE);
    expect(r.text).toBe('Understood. You will do that in our next scheduled meeting.\n\nWhat else should I know?');
    expect(r.cut).toEqual([
      'Your last three turns all ended by asking them something.',
      'This one should not.',
      'Say the single thing you noticed in what they just told you, and stop there.',
      'They will keep going, and what comes next is usually the part they were not going to volunteer.',
    ]);
  });

  it('re-c: the same block in the model\'s own "you" is cut too', () => {
    const r = withoutOurInstructions('Your last three turns all ended by asking you something. You have 19 applications in.', PROMPT);
    expect(r.text).toBe('You have 19 applications in.');
  });

  it('another block echoed: the next-step note is cut', () => {
    expect(NEXT_STEP_BLOCK).toContain('If they say there is nothing to do yet, that is a real answer.');
    const r = withoutOurInstructions('Thank you. If they say there is nothing to do yet, that is a real answer. What happens next with the committee?', PROMPT);
    expect(r.text).toBe('Thank you. What happens next with the committee?');
  });

  it('and the pushback block', () => {
    const r = withoutOurInstructions('Their last message is pushback on the questions themselves. Fair enough. Where are the files now?', PROMPT);
    expect(r.text).toBe('Fair enough. Where are the files now?');
  });

  it('never left empty: a reply that was only our instruction becomes a plain question not yet asked', () => {
    const r = withoutOurInstructions('Say the single thing you noticed in what they just told you, and stop there.', PROMPT, [], ['Understood. What else should I know?']);
    expect(r.text).toBe('What would you like to add about that?');
  });
});

describe('what is not a copy is left alone', () => {
  it('a question the prompt gives the model to ask, and anything in its quotation marks', () => {
    expect(theInstructionSentences('Ask "What will you do about this, and by when?" before you close.').join(' ')).not.toContain('What will you do');
    expect(withoutOurInstructions('What will you do about this, and by when?', PROMPT).cut).toEqual([]);
  });

  it('a line taught to say in the model\'s own voice, that is not about the conversation', () => {
    const prompt = 'PURPOSE: This is a one-off read, and nobody is tracking what you say against a plan afterwards.';
    expect(withoutOurInstructions('This is a one-off read, and nobody is tracking what you say against a plan afterwards. Where would you expand first?', prompt).cut).toEqual([]);
  });

  it('their own words are theirs, even where an instruction happens to share them', () => {
    const prompt = 'Note: they will keep going and what comes next matters.';
    const said = ['They will keep going and what comes next matters to me.'];
    expect(withoutOurInstructions('You said they will keep going and what comes next matters.', prompt, said).cut).toEqual([]);
  });
});

describe('through the step every reply is saved by', () => {
  it('Tobi\'s turn, saved, loses the rhythm block, and the cut is logged', async () => {
    const prisma: any = {
      ground: { findUnique: jest.fn(async () => null) },
      conversationTurn: {
        findMany: jest.fn(async (a: any) => (a?.where?.role === 'PERSON' ? TOBI_SAID.map((content) => ({ content })) : a?.where?.role === 'AI' ? TOBI_ASKED_BEFORE.map((content) => ({ content })) : [])),
      },
      groundObjective: { findMany: jest.fn(async () => []) },
    };
    const s: any = new ConversationService(prisma, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, { get: () => '' } as any);
    s.promptForThisTurn.set('ci-tobi', PROMPT);
    const warn = jest.spyOn(s.logger, 'warn').mockImplementation(() => undefined);
    const saved: string = await s.theTurnAsItIsSaved({ id: 'ci-tobi', groundId: 'g1', participantId: 'p-tobi', participant: { partyType: PartyType.PARTICIPANT } }, TOBI_READ);
    expect(saved).not.toMatch(/last three turns|single thing you noticed|They will keep going|This one should not/);
    expect(saved).toContain('You will do that in our next scheduled meeting.');
    expect(warn.mock.calls.map((c) => String(c[0])).filter((m) => m.includes('copied our instructions'))).toHaveLength(4);
  });
});

describe('a reply asked for again is read against the instruction it was asked again with', () => {
  const saving = () => {
    const prisma: any = {
      ground: { findUnique: jest.fn(async () => null) },
      conversationTurn: { findMany: jest.fn(async () => []) },
      groundObjective: { findMany: jest.fn(async () => []) },
    };
    const s: any = new ConversationService(prisma, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, { get: () => '' } as any);
    jest.spyOn(s.logger, 'warn').mockImplementation(() => undefined);
    return s;
  };
  /* ASK_ONE_THING, the retry for a reply with two questions, copied into the second reply. */
  const ECHO = 'A person answers the last thing they are asked, so the first question gets lost. Which of the two clients matters more to you this month?';
  const who = { id: 'ci-1', groundId: 'g1', participantId: 'p1', participant: { partyType: PartyType.PARTICIPANT } };

  it('before the retry is kept, the turn\'s own prompt does not hold that sentence, so it would go out', async () => {
    const s = saving();
    s.setThePromptForThisTurn('ci-1', PROMPT);
    expect(await s.theTurnAsItIsSaved(who, ECHO)).toContain('A person answers the last thing they are asked');
  });

  it('once the retry goes out through the product, the copied sentence is cut and the question stays', async () => {
    const s = saving();
    s.setThePromptForThisTurn('ci-1', PROMPT);
    s.keptForTheLeakCheck('ci-1', `${PROMPT}\n\n${ASK_ONE_THING}`);
    expect(await s.theTurnAsItIsSaved(who, ECHO)).toBe('Which of the two clients matters more to you this month?');
  });

  it('a new turn starts the list again', () => {
    const s = saving();
    s.setThePromptForThisTurn('ci-1', PROMPT);
    s.keptForTheLeakCheck('ci-1', `${PROMPT}\n\n${ASK_ONE_THING}`);
    s.setThePromptForThisTurn('ci-1', PROMPT);
    expect(s.retryInstructionsForThisTurn.get('ci-1')).toBeUndefined();
  });

  it('every retry in the service goes to the model through it', () => {
    const src = require('fs').readFileSync(require('path').join(__dirname, 'conversation.service.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    expect(src).not.toMatch(/\.respond\(`\$\{fullSystem\}/);
    expect((src.match(/\.respond\(this\.keptForTheLeakCheck\(/g) ?? []).length).toBe(18);
  });
});

describe('the note a reply is asked for again with is cut, whatever voice it copies', () => {
  /* Exactly as Wairimu, the lead, read it (final evaluation, profile 1, week 1, her first session). */
  const WAIRIMU_READ =
    'Still thinking about Brian, no decision yet. Let it go and ask about something else that matters here. Do not rephrase it and do not explain why you wanted it. If it genuinely matters and nobody has answered it, it belongs in the report as still open, not in a fourth question.\n\nWhat else is on your mind this week?';
  const lead = { id: 'ci-wairimu', groundId: 'g1', participantId: 'p-wairimu', participant: { partyType: PartyType.INITIATOR } };
  const saving = () => {
    const prisma: any = {
      ground: { findUnique: jest.fn(async () => null) },
      conversationTurn: { findMany: jest.fn(async (a: any) => (a?.where?.role === 'PERSON' ? [{ content: 'Still thinking about Brian, no decision yet.' }] : [])) },
      groundObjective: { findMany: jest.fn(async () => []) },
    };
    const s: any = new ConversationService(prisma, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, { get: () => '' } as any);
    jest.spyOn(s.logger, 'warn').mockImplementation(() => undefined);
    return s;
  };

  it('saved, the lead reads her own words back and the question, and none of our note', async () => {
    const s = saving();
    s.setThePromptForThisTurn('ci-wairimu', PROMPT);
    const saved: string = await s.theTurnAsItIsSaved(lead, WAIRIMU_READ);
    expect(saved).not.toMatch(/Let it go|Do not rephrase|fourth question|belongs in the report/);
    expect(saved).toBe('Still thinking about Brian, no decision yet.\n\nWhat else is on your mind this week?');
  });

  it('and it is cut even where the retry went out by a path that did not keep it', async () => {
    const s = saving();
    const saved: string = await s.theTurnAsItIsSaved(lead, WAIRIMU_READ);
    expect(saved).not.toMatch(/Let it go|Do not rephrase|fourth question/);
  });

  it('the function alone: a note copied in any voice is cut', () => {
    const { ASKED_IT_TWICE_ALREADY } = jest.requireActual('./asked-twice-and-told-no-twice');
    const r = withoutOurInstructions(WAIRIMU_READ, '', ['Still thinking about Brian, no decision yet.'], [], [ASKED_IT_TWICE_ALREADY]);
    expect(r.cut).toHaveLength(3);
  });
});
