import { GroundScenario, PartyType, TurnRole } from '@prisma/client';
import { ConversationService } from './conversation.service';
import { ConversationContextService } from './context.service';
import { withTheOneMoreLine } from './a-turn-asks-one-thing';
import { withoutTheGoodbye, withoutWhatWasAlreadySaid, THE_CLOSE_WAS_HELD } from './the-close-is-held-once';
import {
  whereTheCheckInIs,
  theNextStepIsStillOwed,
  theyHaveBeenAsked,
  theCloseQuestionFor,
  whyTheCloseWasHeld,
  THE_CLOSE_WAS_HELD_FOR_THE_NEXT_STEP,
  type WhereTheCheckInIs,
} from './what-they-will-do-is-asked-before-the-end';

/**
 * WHAT THEY WILL DO, AND BY WHEN, IS ASKED BEFORE THE CHECK-IN ENDS. Every conversation here is a live
 * one from the runs of 1 October 2026 (api/journey/all-24/re-c and re-d), word for word.
 */

/* re-d, sales, session 1: Femi Okonkwo. Nine answers, a blocker named at the fifth, never asked what he would do. */
const FEMI: [string, string][] = [
  ['AI', 'This record helps get your goals and numbers down, with an owner and a date on each, so there is something real to track against. What credit sales are you working to achieve this quarter?'],
  ['PERSON', 'I am working to achieve 12 approved facilities this quarter. And I want to disburse N120m.'],
  ['AI', 'What number of approved facilities?'],
  ['PERSON', 'I am working to achieve 12 approved facilities.'],
  ['AI', 'By what date do you expect to meet that target?'],
  ['PERSON', 'I expect to meet that target by the end of the quarter.'],
  ['AI', 'Which day marks the end of the quarter for you?'],
  ['PERSON', "I don't have the exact date in front of me right now."],
  ['AI', 'That happens. You have said 12 approved facilities and N120m disbursed. What is the single biggest thing stopping deals from converting for you right now?'],
  ['PERSON', 'The biggest thing stopping deals from converting is how slow customers are with their documents.'],
  ['AI', 'What happens to the deals that get stuck there - do they time out, do you chase them?'],
  ['PERSON', 'I chase them for the documents.'],
  ['AI', 'And how many sales, not yet closed, have you not had contact with in the last two weeks?'],
  ['PERSON', "I don't have that information right now."],
  ['AI', 'How many sales, not yet closed, have you not spoken to in the last two weeks? It helps to know whether they are still active or have gone cold.'],
  ['PERSON', "I don't have that exact number. I'm always visiting new businesses and following up."],
  ['AI', 'Understood. How many of those facilities are currently in your pipeline?'],
  ['PERSON', 'I have 31 applications in my pipeline.'],
];

/* re-c, seniorhire, session 2: Dr Amina Bello, the lead. The model closed after seven answers without asking what she had decided. */
const AMINA: [string, string][] = [
  ['AI', 'Last time you told us: "We\'ve just hired David. He\'s our new Engagement Director." Today, we are going to look at what has been working. What has David delivered that he committed to?'],
  ['PERSON', "He said he would meet all five clients by day 20, and he did. And he said he'd produce a contact report for each, which he also did."],
  ['AI', 'Now, on client meetings for those top five clients, who is leading them?'],
  ['PERSON', "I am. I've been in all of them so far."],
  ['AI', 'Understood. You said last time that you need to be out of those meetings. What is stopping that from happening?'],
  ['PERSON', "Well, David hasn't suggested that he lead them. So I've just carried on."],
  ['AI', 'That is what David has not suggested. What have you said to David about leading these meetings?'],
  ['PERSON', 'I haven\'t said anything to him directly. I thought it was implicit in "own the relationships."'],
  ['AI', 'What is stopping you from having that conversation with David about leading the client meetings?'],
  ['PERSON', "Nothing really. I just... I haven't gotten around to it. I will, though. I definitely will."],
  ['AI', "Understood. You mentioned you hadn't specifically mentioned renewals to David; have you now?"],
  ['PERSON', "No, I still haven't mentioned renewals to him."],
  ['AI', 'No changes on renewals. Which commercial decisions has David made about the five largest clients?'],
  ['PERSON', "None. He hasn't made any commercial decisions."],
  ['AI', "Understood.\n\nThat's all for today. Below is what I wrote down from your answers. Is anything wrong?"],
];

/* re-d, sales, session 3: Kwame Mensah. He said he would phone each customer, with no day; the model closed there. */
const KWAME_LAST: [string, string][] = [
  ['AI', 'Last time you got three applications approved, disbursed N8 million, and had been in touch with all 22 of your applications. What has happened with those 22 applications since?'],
  ['PERSON', "Yes, that's right. The same three applications have now been approved, for N8 million disbursed. I've also had follow-up conversations with all 22 of my applications."],
  ['AI', "So the N8 million disbursed is still from the same three applications. You've had follow-up conversations with all 22. What was the outcome of those follow-up conversations?"],
  ['PERSON', "Yes, that's correct. The N8 million disbursed is still from those initial three. For the follow-ups, I've confirmed that all 22 applications are still interested and moving forward."],
  ['AI', 'What specific actions have you taken or planned to get those applications from "interested" to approved and disbursed?'],
  ['PERSON', "I've been going through their documentation to make sure everything is complete. I'm also preparing to send some reminders for any outstanding documents they need to submit."],
  ['AI', 'What is the process for chasing those documents?'],
  ['PERSON', "It's usually a follow-up call or an email to remind them about what's missing. If it's something specific, I'll explain what's needed."],
  ['AI', 'What is the single biggest thing stopping those deals from converting?'],
  ['PERSON', 'I think it\'s mostly about getting all the required documents in order from the customers. Once those are complete, the approval process should be smoother.'],
  ['AI', 'What concrete steps have you taken to get those documents from the customers this week?'],
  ['PERSON', "I don't have that document to attach right now. This week, I've sent out reminders to all the customers with incomplete documentation, detailing exactly what they still need to provide."],
  ['AI', 'What are you doing to get responses from those customers who have received the reminders?'],
  ['PERSON', "I'm planning to follow up with a phone call to each of them. Sometimes a direct conversation helps clarify things and get the documents moving."],
  ['AI', 'Who set up that direct line to the customers for you?'],
  ['PERSON', 'I set that up myself. I contact them directly.'],
  ['AI', 'What else has been getting in the way this week, if anything?'],
  ['PERSON', "Nothing else has really been getting in the way this week. It's mostly about getting those documents."],
  ['AI', "You said you will follow up with a phone call to each customer.\n\nThat's all for today. Below is what I wrote down from your answers. Is anything wrong?"],
];

/* re-d, sales, session 2: Femi again. Asked for his own part, he gave it with a day. */
const FEMI_COMMITTED: [string, string][] = [
  ['AI', 'That is the outcome. What is the first thing you do towards it, and when?'],
  ['PERSON', 'I will call them all again today and try to get a date from each one.'],
];

const said = (t: [string, string][], who: 'AI' | 'PERSON') => t.filter(([r]) => r === who).map(([, c]) => c);
const upTo = (t: [string, string][], answers: number) => {
  const out: [string, string][] = [];
  let n = 0;
  for (const turn of t) {
    if (turn[0] === 'PERSON') { if (n === answers) break; n++; }
    out.push(turn);
  }
  return out;
};
const where = (t: [string, string][], over: Partial<WhereTheCheckInIs> = {}): WhereTheCheckInIs => ({
  personTurns: said(t, 'PERSON'), aiTurns: said(t, 'AI'), oneTime: false, isLead: false, notACheckIn: false, askedToFinish: false, ...over,
});

describe('the model is told where the check-in is, while what they will do is still unasked', () => {
  /* Changed 26 October 2026 (polish round 2): a normal day closes from the fifth answer, so the question is owed from the third and asked by the fourth. */
  it('Femi, two answers in: nothing yet, the check-in is still finding out', () => {
    expect(whereTheCheckInIs(where(upTo(FEMI, 2)))).toBe('');
  });

  it('Femi, three answers in, the blocker named and nothing asked about his part: told it is still owed', () => {
    const block = whereTheCheckInIs(where(upTo(FEMI, 3)));
    expect(block).toContain('WHERE THIS CHECK-IN IS. They have given 3 answers. A check-in like this usually closes after about 6, and you have not yet asked them what they will do about what they have told you, and by when.');
    expect(block).toContain('At the latest, it is your next question.');
  });

  it('Femi, seven answers in: told this is the last question, to ask it now, and nothing else', () => {
    const block = whereTheCheckInIs(where(upTo(FEMI, 7)));
    expect(block).toContain('They have given 7 answers.');
    expect(block).toContain('This is the last question you should ask before you close. Ask it now. Make it the one question in this turn. Use words from what they have told you');
    expect(block).toContain('Do not ask anything else in this turn.');
  });

  it('once it has been asked, the model is told nothing more', () => {
    const t = [...upTo(FEMI, 7), ['AI', 'Slow documents are what is in the way. What will you do about this, and by when?'] as [string, string]];
    expect(whereTheCheckInIs(where(t))).toBe('');
  });

  it('once they have said what they will do and when, there is nothing to ask', () => {
    expect(whereTheCheckInIs(where([...upTo(FEMI, 6), ...FEMI_COMMITTED]))).toBe('');
  });

  it('Kwame said what he will do with no day: only the when is asked for', () => {
    const block = whereTheCheckInIs(where(KWAME_LAST.slice(0, -1)));
    expect(block).toContain('you have not yet asked them by when they will do the thing they said they will do');
  });

  it('the lead is asked what she has decided, never homework', () => {
    const block = whereTheCheckInIs(where(AMINA.slice(0, -1), { isLead: true }));
    expect(block).toContain('you have not yet asked them what they have decided to do about what they have told you, and by when');
    expect(block).toContain('They run this check-in, so ask what they have decided');
  });

  it('a one-time session is never told to ask it, however long it runs', () => {
    expect(whereTheCheckInIs(where(FEMI, { oneTime: true }))).toBe('');
  });

  it('a correction, a clarification or a team update is never told to ask it', () => {
    expect(whereTheCheckInIs(where(FEMI, { notACheckIn: true }))).toBe('');
  });

  it('somebody who has asked to finish is not held to it by this', () => {
    expect(whereTheCheckInIs(where(FEMI, { askedToFinish: true }))).toBe('');
  });

  it('the ways the model already asks it all count as asked', () => {
    expect(theyHaveBeenAsked(['That is the outcome. What is the first thing you do towards it, and when?'])).toBe(true);
    expect(theyHaveBeenAsked(['From everything you have said, what have you decided?'])).toBe(true);
    expect(theyHaveBeenAsked(['There is no next session to follow up: what is your own next step now you have this picture?'])).toBe(true);
    expect(theyHaveBeenAsked(said(FEMI, 'AI'))).toBe(false);
  });
});

/* ---- Through the real prompt: Femi's seventh answer, as the product builds the turn. ---- */

const FEMI_ROW = {
  id: 'p1', groundId: 'g1', partyType: PartyType.PARTICIPANT, managingOnly: false, roleAsDescribed: 'Relationship manager',
  createdAt: new Date('2026-01-02'), nameGiven: null, email: 'femi@example.com', user: { firstName: 'Femi', lastName: 'Okonkwo' },
};
const BISI_ROW = {
  id: 'p0', groundId: 'g1', partyType: PartyType.INITIATOR, managingOnly: false, roleAsDescribed: 'Head of sales',
  createdAt: new Date('2026-01-01'), nameGiven: null, email: 'bisi@example.com', user: { firstName: 'Bisi', lastName: 'Adeyemi' },
};
const nothingBack = (method: string) => async () => (String(method).endsWith('Many') || String(method) === 'groupBy' ? [] : null);
const everythingElseAnswersEmpty = (seed: Record<string, any>) => new Proxy(seed, {
  get: (target: any, model: string) => new Proxy(target[model] ?? {}, { get: (m: any, method: string) => m[method] ?? nothingBack(method) }),
});

async function thePromptFor(turnsSoFar: [string, string][], latest: string, cadence = 'FORTNIGHTLY') {
  const theGround = {
    id: 'g1', organizationId: 'org1', scenario: GroundScenario.OKR_ALIGNMENT, moment: 'STARTING', label: 'Credit sales this quarter',
    mode: 'SHARED', timelineDays: 90, cadence, startsAt: null, endsAt: null, status: 'ACTIVE', leadRemit: null, resolutionState: null,
    brief: 'Every relationship manager has a target of approved facilities this quarter.', initiatorId: 'p0',
    peersVisibleToEachOther: null, expectThemToUnblock: true, participantsHearTheLeadsExpectation: true,
    objectives: [], report: null, leadContextNotes: [], participants: [BISI_ROW, FEMI_ROW],
  };
  const prisma: any = everythingElseAnswersEmpty({
    ground: { findUnique: jest.fn(async () => theGround), findFirst: jest.fn(async () => theGround) },
    conversationTurn: {
      findMany: jest.fn(async (args: any) => {
        if (args?.where?.checkInId === 'ci1') {
          const rows = turnsSoFar.map(([role, content]) => ({ role, content, createdAt: new Date() }));
          const filtered = args?.where?.role ? rows.filter((r) => r.role === args.where.role) : rows;
          return args?.orderBy?.createdAt === 'desc' ? [...filtered].reverse().slice(0, args?.take ?? filtered.length) : filtered;
        }
        return [];
      }),
    },
  });
  const nothing: any = { get: () => undefined };
  const service = new ConversationService(
    prisma, { getActiveContent: jest.fn(async (k: string) => (k === 'system' ? 'SYS' : null)) } as any,
    { respond: jest.fn(async () => ''), extract: jest.fn(async () => null) } as any,
    new ConversationContextService(prisma), nothing, nothing, nothing, nothing, nothing, nothing,
  );
  return (service as any).composeSystemPrompt(
    { id: 'ci1', groundId: 'g1', participantId: 'p1', sessionNumber: 1, participant: { ...FEMI_ROW, userId: 'u-p1' } },
    latest,
  ) as Promise<string>;
}

describe('Femi\'s live check-in, through the prompt the product builds', () => {
  it('replying to his seventh answer, the model reads that this is the question to ask now', async () => {
    const sixIn = upTo(FEMI, 6);
    const prompt = await thePromptFor(sixIn, "I don't have that information right now.");
    expect(prompt).toContain('WHERE THIS CHECK-IN IS. They have given 7 answers.');
    expect(prompt).toContain('This is the last question you should ask before you close. Ask it now');
  });

  it('in a one-time session the same turns carry nothing about it', async () => {
    const prompt = await thePromptFor(upTo(FEMI, 6), "I don't have that information right now.", 'ONE_TIME');
    expect(prompt).not.toContain('WHERE THIS CHECK-IN IS.');
  });
});

/* ---- At the close: the model closed without asking. ---- */

function aService(turns: [string, string][], over: { lead?: boolean; cadence?: string; neverAsked?: string[] } = {}) {
  const rows = turns.map(([role, content]) => ({ role: role === 'AI' ? TurnRole.AI : TurnRole.PERSON, content }));
  const prisma: any = {
    checkIn: {
      findUnique: jest.fn(async () => ({
        closeHeldAt: null, participantId: 'p1', startedAt: new Date(0), isClarification: false,
        ground: { cadence: over.cadence ?? 'FORTNIGHTLY', scenario: 'NEW_HIRE' },
        participant: { partyType: over.lead ? 'INITIATOR' : 'PARTICIPANT' },
      })),
      update: jest.fn(async () => ({})),
    },
    conversationTurn: { findMany: jest.fn(async (a: any) => (a?.where?.role ? rows.filter((t) => t.role === a.where.role) : rows)) },
    groundDocument: { count: jest.fn(async () => 0) },
    ground: { findUnique: jest.fn(async () => ({ scenario: 'NEW_HIRE' })) },
  };
  const s = new ConversationService(
    prisma, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any,
    { sendParticipantBlockedNudge: () => Promise.resolve() } as any, { emit: () => Promise.resolve() } as any, { get: () => '' } as any,
  ) as any;
  s.whatThisSessionNeverAsked = jest.fn(async () => over.neverAsked ?? []);
  return { s, prisma };
}

describe('a close the model reached without asking what they will do', () => {
  it('Amina, the lead, closed after seven answers: held once, and asked what she has decided', async () => {
    const { s, prisma } = aService(AMINA, { lead: true, neverAsked: ['what is clear and what is not'] });
    const close = await s.mayClose('c1', false);
    expect(close).toMatchObject({ ready: false, ask: 'I have one more question before we finish. From everything you have said, what have you decided?' });
    expect(prisma.checkIn.update).toHaveBeenCalledWith({ where: { id: 'c1' }, data: { closeHeldAt: expect.any(Date) } });
  });

  it('Kwame said he would phone each customer, with no day: held once, and asked only by when', async () => {
    const { s } = aService(KWAME_LAST);
    const close = await s.mayClose('c1', false);
    /* In his own words since re-e: "By when will you do that?" read with nothing for "that" to point at. */
    expect(close).toMatchObject({ ready: false, ask: 'I have one more question before we finish. By when will you follow up with a phone call to each of them?' });
  });

  it('what Kwame reads is his own words, then the one question', () => {
    expect(theCloseQuestionFor(false, said(KWAME_LAST, 'PERSON'))).toBe('I have one more question before we finish. By when will you follow up with a phone call to each of them?');
  });

  it('a one-time session closes without it', async () => {
    const { s } = aService(KWAME_LAST, { cadence: 'ONE_TIME' });
    const close = await s.mayClose('c1', false);
    expect(close.ask).toBeUndefined();
    expect(close.ready).toBe(true);
  });

  it('once it has been asked, the close is not held for it again', async () => {
    const asked: [string, string][] = [...KWAME_LAST.slice(0, -1), ['AI', 'By when will you do that?'], ['PERSON', 'By Thursday.'], ['AI', "That's all for today."]];
    const { s } = aService(asked);
    const close = await s.mayClose('c1', false);
    expect(close.ask).toBeUndefined();
  });

  it('it is the same one hold: with it already used, the close lands', async () => {
    const { s, prisma } = aService(AMINA, { lead: true });
    prisma.checkIn.findUnique = jest.fn(async () => ({ closeHeldAt: new Date(), participantId: 'p1', startedAt: new Date(0), isClarification: false, ground: { cadence: 'FORTNIGHTLY', scenario: 'NEW_HIRE' }, participant: { partyType: 'INITIATOR' } }));
    const close = await s.mayClose('c1', false);
    expect(close.ask).toBeUndefined();
  });

  it('the rule reads the same at both ends', () => {
    expect(theNextStepIsStillOwed(where(AMINA, { isLead: true }))).toBe(true);
    expect(theNextStepIsStillOwed(where([...FEMI, ...FEMI_COMMITTED]))).toBe(false);
  });
});

/* ---- What the person reads on the held turn, built the way sendMessage builds it. ---- */


/* The question is worded against what is kept above it (re-e: never a bare "that"), as sendMessage does. */
const whatTheyRead = (modelsClose: string, earlierAi: string[], lead: boolean, personTurns: string[]) => {
  const kept = withoutWhatWasAlreadySaid(withoutTheGoodbye(modelsClose), earlierAi);
  return withTheOneMoreLine(kept, theCloseQuestionFor(lead, personTurns, kept));
};

describe('what each reader is shown when the close is held for it', () => {
  it('Amina, the lead, reads one question about her own decision', () => {
    expect(whatTheyRead('Understood. Speak soon.', said(AMINA, 'AI'), true, said(AMINA, 'PERSON')))
      .toBe('Understood.\n\nI have one more question before we finish. From everything you have said, what have you decided?');
  });

  it('Kwame reads his own words, then when', () => {
    expect(whatTheyRead('You said you will follow up with a phone call to each customer. Speak soon.', said(KWAME_LAST, 'AI').slice(0, -1), false, said(KWAME_LAST, 'PERSON')))
      .toBe('You said you will follow up with a phone call to each customer.\n\nI have one more question before we finish. By when will you follow up with a phone call to each of them?');
  });

  it('Femi reads what is in his way, then what he will do about it and by when', () => {
    expect(whatTheyRead('Slow customer documents are what is in your way. Speak soon.', said(FEMI, 'AI'), false, said(FEMI, 'PERSON')))
      .toBe('Slow customer documents are what is in your way.\n\nI have one more question before we finish. What will you do about this, and by when?');
  });
});

describe('on the turn after the hold, the model is told why the close was held', () => {
  it('held for the next step: it is told that, not that it was a date, a number or a document', () => {
    const held = 'Slow customer documents are what is in your way.\n\nI have one more question before we finish. What will you do about this, and by when?';
    expect(whyTheCloseWasHeld([...said(FEMI, 'AI'), held])).toBe(THE_CLOSE_WAS_HELD_FOR_THE_NEXT_STEP);
    expect(THE_CLOSE_WAS_HELD_FOR_THE_NEXT_STEP).toContain('to ask them what they will do about what they told you, and by when');
  });

  it('held for the lead\'s decision: the same', () => {
    expect(whyTheCloseWasHeld(['Understood.\n\nI have one more question before we finish. From everything you have said, what have you decided?'])).toBe(THE_CLOSE_WAS_HELD_FOR_THE_NEXT_STEP);
  });

  it('held for something else: the line it always read', () => {
    expect(whyTheCloseWasHeld(['I have one more question before we finish. Put a date or a number on that, or name where it is written down.'])).toBe(THE_CLOSE_WAS_HELD);
    expect(whyTheCloseWasHeld(['I have one more question before we finish. What do you need from other people?'])).toBe(THE_CLOSE_WAS_HELD);
  });
});
