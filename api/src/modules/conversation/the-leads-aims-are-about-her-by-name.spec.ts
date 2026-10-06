import { ConversationService } from './conversation.service';
import { PartyType, TurnRole } from '@prisma/client';
import { EXPECTATION_PROMPT, EXPECTATION_SCHEMA } from './prompt-library';

/**
 * THE LEAD'S AIMS ARE WRITTEN ABOUT HER, BY NAME (review of 1 October 2026, row 113).
 *
 * The run stored "I'm aiming for N120 million disbursed this quarter." (re-a sales), "I stop being
 * invited to every single call." (re-a seniorhire), "The person wants introductions to ..." (run-21
 * advisor) and "... enabling the speaker to focus on business growth" (run-21 cofounder). The
 * extraction read a transcript that said only "PERSON:", so it had no name to write. It is now given
 * the speaker's first name, and told to write each aim as a full sentence about whoever holds it.
 *
 * EXPECTATION_PROMPT is not one of the prompts a stored PromptVersion can replace (it is not in
 * SEED_PROMPTS, and the call reads the constant), so the file is the version that runs.
 */
function run(lead: { firstName: string; lastName: string }) {
  const participants = [
    { id: 'lead', partyType: PartyType.INITIATOR, managingOnly: false, email: 'lead@x.test', roleAsDescribed: null, createdAt: new Date('2026-09-01'), user: lead },
    { id: 'femi', partyType: PartyType.PARTICIPANT, managingOnly: false, email: 'femi@x.test', roleAsDescribed: null, createdAt: new Date('2026-09-02'), user: { firstName: 'Femi', lastName: 'Okonkwo' } },
  ];
  const prisma: any = new Proxy({
    ground: { findUnique: jest.fn(async () => ({ participants, peopleWorkTogether: true })) },
    conversationTurn: { findMany: jest.fn(async () => [{ role: TurnRole.PERSON, content: "I'm aiming for N120 million disbursed this quarter." }]) },
    groundObjective: { count: jest.fn(async () => 0), findMany: jest.fn(async () => [] as any[]), createMany: jest.fn(async () => ({ count: 1 })) },
  }, {
    get(target: any, prop: string) {
      if (!(prop in target) && typeof prop === 'string' && !prop.startsWith('$')) {
        target[prop] = { findMany: jest.fn(async () => []), findFirst: jest.fn(async () => null), findUnique: jest.fn(async () => null), count: jest.fn(async () => 0), create: jest.fn(async (a: any) => a), update: jest.fn(async (a: any) => a), createMany: jest.fn(async () => ({ count: 0 })) };
      }
      return target[prop];
    },
  });
  const anthropic: any = { extract: jest.fn(async () => ({ groundAims: [], expectations: [], promises: [] })) };
  const svc = new ConversationService(prisma, {} as any, anthropic, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any);
  return { svc, anthropic };
}

const whatTheAimsExtractionRead = (anthropic: any): string => {
  const call = anthropic.extract.mock.calls.find((c: any[]) => c[0] === EXPECTATION_PROMPT);
  expect(call).toBeTruthy();
  return call[1][0].content;
};

describe('the extraction of the lead\'s aims is told who is speaking', () => {
  it('Bisi\'s session is read with her name at the top', async () => {
    const { svc, anthropic } = run({ firstName: 'Bisi', lastName: 'Adeyemi' });
    await svc.extractExpectations('c1', 'lead', 'g1');
    expect(whatTheAimsExtractionRead(anthropic).split('\n')[0]).toBe('THE PERSON SPEAKING: Bisi');
  });

  it('Dr Amina Bello is Amina, not Dr', async () => {
    const { svc, anthropic } = run({ firstName: 'Dr Amina', lastName: 'Bello' });
    await svc.extractExpectations('c1', 'lead', 'g1');
    expect(whatTheAimsExtractionRead(anthropic).split('\n')[0]).toBe('THE PERSON SPEAKING: Amina');
  });

  it('and the prompt asks for a full sentence about the person by name, never "I", "the person" or "the speaker"', () => {
    expect(EXPECTATION_PROMPT).toContain('one plain, full sentence about whoever holds it, by name');
    expect(EXPECTATION_PROMPT).toContain('Never "I", "we", "my", "the person" or "the speaker"');
    expect(EXPECTATION_PROMPT).toContain('"120 million naira", not "N120m" or "120000000"');
    expect(JSON.stringify(EXPECTATION_SCHEMA)).toContain('Never \\"I\\", \\"we\\", \\"the person\\" or \\"the speaker\\"');
    /* What it used to ask for, which is how "I'm aiming for N120 million" was stored. */
    expect(EXPECTATION_PROMPT).not.toMatch(/the aim as one plain, full sentence, in their words/);
  });
});
