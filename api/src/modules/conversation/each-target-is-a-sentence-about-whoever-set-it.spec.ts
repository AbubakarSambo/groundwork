import { GroundScenario, PartyType } from '@prisma/client';
import { ConversationService } from './conversation.service';
import { ConversationContextService } from './context.service';
import { theTargetAsASentence } from './each-target-is-a-sentence-about-whoever-set-it';

/**
 * EACH TARGET IS A SENTENCE ABOUT WHOEVER SET IT (decision 69). The sales check-in of the 1 October runs:
 * Bisi runs it, Ngozi and Kwame each hold a number. "I'm aiming for N120 million disbursed this quarter."
 * was Bisi's, and it reached Ngozi's check-in as it was stored. Read through the prompt the product
 * builds, and the brief it serves, for the lead and for Ngozi.
 */

const person = (id: string, first: string, last: string, partyType: PartyType, at: string) => ({
  id, groundId: 'g1', partyType, managingOnly: false, roleAsDescribed: partyType === PartyType.INITIATOR ? 'Head of sales' : 'Relationship manager',
  createdAt: new Date(at), nameGiven: null, email: `${first.toLowerCase()}@example.com`, user: { firstName: first, lastName: last }, userId: `u-${id}`,
});
const BISI = person('p0', 'Bisi', 'Adeyemi', PartyType.INITIATOR, '2026-01-01');
const NGOZI = person('p1', 'Ngozi', 'Eze', PartyType.PARTICIPANT, '2026-01-02');
const KWAME = person('p2', 'Kwame', 'Mensah', PartyType.PARTICIPANT, '2026-01-03');

const target = (id: string, name: string, n: number | null, owner: string | null, setBy: string | null, direction: string | null) =>
  ({ id, name, target: n, count: 0, ownerParticipantId: owner, setByParticipantId: setBy, direction, isADecisionAboutAPerson: false });

/* As stored on the run: the lead's own words, a row that only says what is counted, and each person's number. */
const STORED = [
  target('o1', "I'm aiming for N120 million disbursed this quarter.", 120000000, null, 'p0', 'AIM'),
  target('o2', 'approved facilities', 14, 'p1', 'p1', null),
  target('o3', 'approved facilities', 22, 'p2', 'p2', null),
  target('o4', 'Spending on field visits', 180000, null, 'p0', 'LIMIT'),
];
/* A goal Bisi set for Ngozi and has not told her about (decision 56), and the row the engine wrote from it. */
const UNTOLD_FOR_NGOZI = { participantId: 'p1', text: 'Ngozi should close 17 approved facilities this quarter.', target: 17, awareness: 'NOT_TOLD', authoredBy: 'lead', createdAt: new Date() };
const FROM_THE_UNTOLD_GOAL = target('o5', 'Ngozi needs 17 approved facilities.', 17, 'p1', 'p0', null);

const nothingBack = (method: string) => async () => (String(method).endsWith('Many') || String(method) === 'groupBy' ? [] : null);
const everythingElseEmpty = (seed: Record<string, any>) => new Proxy(seed, {
  get: (t: any, model: string) => new Proxy(t[model] ?? {}, { get: (m: any, method: string) => m[method] ?? nothingBack(method) }),
});

function theCheckIn(objectives: any[], untold: any[] = []) {
  const ground = {
    id: 'g1', organizationId: 'org1', scenario: GroundScenario.OKR_ALIGNMENT, moment: 'STARTING', label: 'Credit sales against this quarter target',
    mode: 'SHARED', timelineDays: 90, cadence: 'FORTNIGHTLY', status: 'ACTIVE', brief: 'Credit sales against this quarter target.',
    initiatorId: 'u-p0', peersVisibleToEachOther: null, whoSeesTargets: 'THEIR_OWN', toldToParticipants: null,
    initiator: { firstName: 'Bisi', lastName: 'Adeyemi' }, objectives, report: null, leadContextNotes: [], participants: [BISI, NGOZI, KWAME],
  };
  const prisma: any = everythingElseEmpty({
    ground: { findUnique: jest.fn(async () => ground), findFirst: jest.fn(async () => ground) },
    groundObjective: { findMany: jest.fn(async () => objectives) },
    personObjective: { findMany: jest.fn(async (a: any) => (a?.where?.awareness === 'NOT_TOLD' || a?.where?.participantId === 'p1' ? untold : [])) },
  });
  const nothing: any = { get: () => undefined };
  const service: any = new ConversationService(
    prisma, { getActiveContent: jest.fn(async (k: string) => (k === 'system' ? 'SYS' : null)) } as any,
    { respond: jest.fn(async () => ''), extract: jest.fn(async () => null) } as any,
    new ConversationContextService(prisma), nothing, nothing, nothing, nothing, nothing, nothing,
  );
  const promptFor = (me: typeof BISI): Promise<string> =>
    service.composeSystemPrompt({ id: 'ci1', groundId: 'g1', participantId: me.id, sessionNumber: 1, participant: { ...me } }, 'We are still waiting on the credit committee.');
  const briefFor = async (me: typeof BISI) =>
    service.briefFor(ground, service.whoIsReadingIt(ground, { participantId: me.id, participant: me }), await service.untoldGoalsOn('g1'));
  return { promptFor, briefFor };
}
const objectivesLine = (prompt: string) => prompt.split('\n').find((l) => l.startsWith('OBJECTIVES:')) ?? '';

describe('what Ngozi\'s check-in is given', () => {
  it('her model reads each target about whoever set it, "you" for her, with numbers she can read', async () => {
    const prompt = await theCheckIn(STORED).promptFor(NGOZI);
    expect(objectivesLine(prompt)).toBe(
      'OBJECTIVES: Each is written as it is said to the person you are talking to, so "you" in them is that person. '
      + 'Bisi is aiming for 120 million naira disbursed this quarter. '
      + 'The team is keeping spending on field visits to no more than 180,000. '
      /* Ngozi set this number herself, so it is hers (decision 75, item 37). */
      + 'Your own aim is 14 approved facilities.',
    );
    expect(prompt).toContain('Theirs, said by them: Your own aim is 14 approved facilities, 0 of 14');
    expect(prompt).toContain('Bisi is aiming for 120 million naira disbursed this quarter, the whole check-in is at 0 of 120 million');
  });

  it('before: the lead\'s own words reached her as if they were hers; now they do not', async () => {
    const prompt = await theCheckIn(STORED).promptFor(NGOZI);
    expect(prompt).not.toContain("I'm aiming for N120 million");
    expect(prompt).not.toContain('(target 120,000,000)');
  });

  it('Kwame\'s own number never reaches her check-in', async () => {
    const prompt = await theCheckIn(STORED).promptFor(NGOZI);
    expect(prompt).not.toMatch(/\b22 approved facilities\b/);
    expect(prompt).not.toContain('Kwame is aiming');
  });

  it('the brief served to her: sentences, only the fields she is shown, never Kwame\'s', async () => {
    const brief = await theCheckIn(STORED).briefFor(NGOZI);
    expect(brief.objectives).toEqual([
      { name: 'Bisi is aiming for 120 million naira disbursed this quarter.', target: 120000000, direction: 'AIM' },
      { name: 'The team is keeping spending on field visits to no more than 180,000.', target: 180000, direction: 'LIMIT' },
      { name: 'Your own aim is 14 approved facilities.', target: 14, direction: null },
    ]);
    expect(JSON.stringify(brief)).not.toMatch(/ownerParticipantId|setByParticipantId|p2|22/);
  });

  it('a goal Bisi has not told her about reaches neither her prompt nor her brief', async () => {
    const c = theCheckIn([...STORED, FROM_THE_UNTOLD_GOAL], [UNTOLD_FOR_NGOZI]);
    const prompt = await c.promptFor(NGOZI);
    expect(prompt).not.toMatch(/\b17\b/);
    const brief = await c.briefFor(NGOZI);
    expect(JSON.stringify(brief)).not.toMatch(/\b17\b/);
  });
});

describe('what Bisi\'s check-in is given', () => {
  it('her model reads her own aim as "you", and each person\'s number by their name', async () => {
    const prompt = await theCheckIn(STORED).promptFor(BISI);
    expect(objectivesLine(prompt)).toBe(
      'OBJECTIVES: Each is written as it is said to the person you are talking to, so "you" in them is that person. '
      + 'You are aiming for 120 million naira disbursed this quarter. '
      + 'Ngozi\'s own aim is 14 approved facilities. '
      + 'Kwame\'s own aim is 22 approved facilities. '
      + 'The team is keeping spending on field visits to no more than 180,000.',
    );
  });

  it('the lead still reads the goal she has not told Ngozi about', async () => {
    const prompt = await theCheckIn([...STORED, FROM_THE_UNTOLD_GOAL], [UNTOLD_FOR_NGOZI]).promptFor(BISI);
    expect(objectivesLine(prompt)).toContain('Ngozi needs 17 approved facilities.');
  });
});

describe('which way a target goes, where the lead said and the sentence does not', () => {
  it('a sentence of the lead\'s with a limit says it is a limit', () => {
    const s = theTargetAsASentence({ name: 'I want visits under budget', target: 50, ownerParticipantId: null, setByParticipantId: 'p0', direction: 'LIMIT' },
      { readerId: 'p1', readerFirstName: 'Ngozi', leadId: 'p0', firstNameOf: (id) => ({ p0: 'Bisi' } as any)[id] ?? null });
    expect(s).toBe('Bisi wants visits under budget. The number 50 is a limit not to go over.');
  });
});
