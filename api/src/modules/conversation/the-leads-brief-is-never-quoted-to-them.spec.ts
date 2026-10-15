import { PartyType, GroundScenario } from '@prisma/client';
import { ConversationService } from './conversation.service';
import { withoutTheLeadsBrief, aSentenceThatQuotesTheBrief, THE_BRIEF_IS_CONTEXT_ONLY } from './the-leads-brief-is-never-quoted-to-them';
import { SentenceGate } from './nothing-invented-reaches-them';
import { buildIntakeBlock } from './prompt-library';
import { theBriefForThePlanner } from './the-plan-for-this-session';
import { whatAParticipantIsToldAboutThis } from '../grounds/what-a-participant-is-told-about-this';
import { whatSomeoneWhoDoesNotRunItReads } from '../grounds/what-someone-who-does-not-run-it-reads';

/**
 * DECISION 75, ITEM 13: THE LEAD'S SETUP BRIEF IS NEVER QUOTED INTO A PARTICIPANT'S CHECK-IN.
 *
 * The review of 1 October read these in participants' turns, on the pip, discovery and realign runs:
 *   "Caroline also wants to know whether expectations were actually set."
 *   "The brief for this check-in, from Julia, highlights that proposals have twice gone out reflecting what we
 *    want to sell, rather than what the prospect asked for."
 * The brief still guides the conversation as context. Checked here for each reader: the participant's saved
 * turn, the participant's streamed turn, the participant's "About this check-in", the prompt, and the lead's own
 * check-in, which is not changed.
 */
const BRIEF =
  'Proposals have twice gone out reflecting what we want to sell, rather than what the prospect asked for. '
  + 'Omar has run the account since March and the renewal is due in November. Ask him whether expectations were actually set.';
const TOLD = 'This check-in is about the renewal of the account you look after, and how the proposals for it have gone.';

describe('the net, sentence by sentence', () => {
  it('cuts a sentence that names the brief, and one that copies six words of it, and keeps the question', () => {
    const reply = 'The brief for this check-in, from Julia, highlights that proposals have twice gone out reflecting what we want to sell. What did the prospect ask for in the last proposal?';
    const r = withoutTheLeadsBrief(reply, BRIEF, [], [], 'Julia');
    expect(r.text).toBe('What did the prospect ask for in the last proposal?');
    expect(r.cut).toHaveLength(1);
    const copied = withoutTheLeadsBrief('Proposals have gone out reflecting what we want to sell. How did the last one go?', BRIEF);
    expect(copied.text).toBe('How did the last one go?');
  });

  it('cuts the lead\'s wish said as the lead\'s, in other words', () => {
    const r = withoutTheLeadsBrief('Caroline also wants to know whether expectations were actually set. How was the brief for the renewal agreed?', BRIEF, [], [], 'Caroline');
    expect(r.cut).toEqual(['Caroline also wants to know whether expectations were actually set.', 'How was the brief for the renewal agreed?']);
  });

  it('leaves the person\'s own words, and what the check-in tells them it is for', () => {
    const theirs = ['Honestly our proposals keep reflecting what we want to sell, not what they asked.'];
    expect(withoutTheLeadsBrief('You said they keep reflecting what we want to sell. What would change that?', BRIEF, theirs).cut).toEqual([]);
    expect(withoutTheLeadsBrief('This check-in is about the renewal of the account you look after. What is due first?', BRIEF, [TOLD]).cut).toEqual([]);
  });

  it('a person whose own work has a brief may be asked about it', () => {
    const quotes = aSentenceThatQuotesTheBrief(BRIEF, ['The client brief changed twice last month.']);
    expect(quotes('What changed in the client brief the second time?')).toBe(false);
  });

  it('is never left empty', () => {
    const r = withoutTheLeadsBrief('The brief says the renewal is due in November.', BRIEF);
    expect(r.text.trim().length).toBeGreaterThan(0);
    expect(r.text).not.toMatch(/brief|November/);
  });

  it('a sentence of the brief is held back while it streams too', () => {
    const gate = new SentenceGate([], null, [], [], aSentenceThatQuotesTheBrief(BRIEF, [], 'Julia'));
    const shown = gate.push('Omar has run the account since March and the renewal is due. ') + gate.push('What is due first? ') + gate.flush();
    expect(shown).toBe('What is due first? ');
  });
});

function saving(opts: { scenario?: string } = {}) {
  const prisma: any = {
    ground: { findUnique: jest.fn(async () => ({ brief: BRIEF, toldToParticipants: TOLD, scenario: opts.scenario ?? GroundScenario.PIP, initiator: { firstName: 'Julia' } })) },
    conversationTurn: { findMany: jest.fn(async () => []) },
    groundObjective: { findMany: jest.fn(async () => []) },
  };
  const s: any = new ConversationService(prisma, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, { get: () => '' } as any);
  jest.spyOn(s.logger, 'warn').mockImplementation(() => undefined);
  return s;
}
const OMAR = { id: 'ci-omar', groundId: 'g1', participantId: 'p-omar', participant: { partyType: PartyType.PARTICIPANT } };
const JULIA = { id: 'ci-julia', groundId: 'g1', participantId: 'p-julia', participant: { partyType: PartyType.INITIATOR } };
const QUOTING = 'Julia wants to know whether expectations were actually set. Proposals have twice gone out reflecting what we want to sell. What did the prospect ask for?';

describe('what each person reads in their own check-in', () => {
  it('Omar, a participant, reads no sentence of the brief and no "Julia wants to know"', async () => {
    const saved: string = await saving().theTurnAsItIsSaved(OMAR, QUOTING);
    expect(saved).toBe('What did the prospect ask for?');
  });

  it('Julia, the lead, reads her own check-in as before', async () => {
    const saved: string = await saving().theTurnAsItIsSaved(JULIA, QUOTING);
    expect(saved).toContain('Proposals have twice gone out reflecting what we want to sell.');
  });

  it('on a team update the lead\'s one line is the question, and is said as it is', async () => {
    const saved: string = await saving({ scenario: 'TEAM_UPDATES' }).theTurnAsItIsSaved(OMAR, 'Proposals have twice gone out reflecting what we want to sell, rather than what the prospect asked for. What happened with yours?');
    expect(saved).toContain('Proposals have twice gone out');
  });
});

describe('"About this check-in", for each reader', () => {
  it('a participant reads the short version the lead confirmed, never the brief, and nothing where there is none', () => {
    expect(whatAParticipantIsToldAboutThis(BRIEF, [], { told: TOLD })).toBe(TOLD);
    expect(whatAParticipantIsToldAboutThis(BRIEF, [], { told: null })).toBeNull();
    expect(whatSomeoneWhoDoesNotRunItReads({ brief: BRIEF, toldToParticipants: null })).toBeNull();
    expect(whatSomeoneWhoDoesNotRunItReads({ brief: BRIEF, toldToParticipants: TOLD })).toBe(TOLD);
  });

  it('on a team update the one line is what everybody is asked, so they read it', () => {
    expect(whatSomeoneWhoDoesNotRunItReads({ brief: 'What did you ship this week?', toldToParticipants: null, scenario: 'TEAM_UPDATES' })).toBe('What did you ship this week?');
  });
});

describe('the model is told the brief is context only', () => {
  const ctx: any = { scenario: GroundScenario.PIP, sessionNumber: 1, adminBrief: BRIEF };
  it('in a participant\'s check-in, and in the plan for it', () => {
    expect(buildIntakeBlock({ ...ctx, partyType: PartyType.PARTICIPANT })).toContain(THE_BRIEF_IS_CONTEXT_ONLY);
    const plan = theBriefForThePlanner({
      scenarioLabel: 'A performance plan', pack: 'MOMENT: a plan.', sessionNumber: 1, sessionsPlanned: 6, stage: 'first', oneTime: false,
      person: { firstName: 'Omar', roleAsDescribed: null, isLead: false }, roleMap: null, leadBrief: BRIEF, recordAlreadyHolds: '', doesNotAddUp: '',
      owed: [], declinedOrAskedTwice: [], earlier: [], patterns: [], coachingStep: null, howTheyAnswer: null,
    } as any);
    expect(plan).toContain(THE_BRIEF_IS_CONTEXT_ONLY);
  });
  it('not in the lead\'s own, where the brief is theirs', () => {
    expect(buildIntakeBlock({ ...ctx, partyType: PartyType.INITIATOR })).not.toContain(THE_BRIEF_IS_CONTEXT_ONLY);
  });
});
