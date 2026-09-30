import { GroundsService } from './grounds.service';
import { whatWeTookFromThat, type WhatAPasteGives } from './a-dump-is-many-things';

/**
 * REQUEST 92, POINT 1. A SENTENCE MUST NEVER SAY A LINE IS KEPT FOR THE LEAD WHEN EVERYONE READS IT.
 *
 * The paste is written through the real writer, with every kind of line a paste can produce, and the
 * say-back and the confirmation are read as a person reads them. For each kind, the sentence under
 * its heading must agree with the audience the line was really saved with.
 */

const EVERYONE = 'Everyone on this check-in will see these.';
const ONLY_YOU = 'Only you will see these.';

const EVERY_KIND: WhatAPasteGives = {
  success: null,
  teamTargets: [], forPeople: [], dates: [], unmatched: [],
  strategy: ['Lead with the cold chain.'],
  waysOfWorking: ['Every deal has one owner.'],
  notes: ['The Kisumu shops reopen in October.'],
  openDecisions: ['Whether to hire a second driver.'],
  notSettled: ['Whether the depot moves.'],
  aboutPeople: [{ who: 'Amani Wekesa', participantId: 'pA', observation: 'Slow to answer the regional office.' }],
  commitments: [],
  questionsForPeople: [{ who: 'Amani Wekesa', participantId: 'pA', question: 'ask whether the proposal went out', exactQuestion: 'Did the proposal go out?' }],
  betweenPeople: [{ who: ['Amani Wekesa', 'Juma Oloo'], participantIds: ['pA', 'pJ'], issue: 'They both chase the Mombasa account.' }],
};

function serviceThatSaves() {
  const saved: { kind: string; text: string; audience: string }[] = [];
  const prisma: any = {
    ground: { findUnique: async () => ({ initiatorId: 'u1', brief: null }), update: async () => ({}) },
    groundContextItem: { findMany: async () => [], create: jest.fn(async ({ data }: any) => { saved.push({ kind: data.kind, text: data.text, audience: data.audience }); return {}; }) },
    groundCommitment: { findMany: async () => [], create: async () => ({ id: 'c' }) },
    groundObjective: { findMany: async () => [], createMany: async () => ({}) },
    personObjective: { findMany: async () => [], create: async () => ({}) },
    groundParticipant: { findMany: async () => [] },
  };
  const service = new GroundsService(prisma, {} as any, {} as any, {} as any, {} as any, {} as any, { respond: async () => null } as any, { get: () => ({}) } as any);
  return { service, saved };
}

/** The heading a kind's lines sit under in the say-back. */
const SECTION_OF_KIND: Record<string, string> = {
  STRATEGY: 'The strategy, as I read it.',
  WAY_OF_WORKING: 'How this team works',
  DECISION: 'Still to decide.',
  UNSETTLED: 'Not settled',
  NOTE: 'Notes, kept as they are.',
  ABOUT_A_PERSON: 'What you said about each person',
  BETWEEN_PEOPLE: 'Between two people',
};

describe('the paste says who reads each line, and means it', () => {
  it('for every kind a paste can save, the sentence agrees with the audience it was saved with', async () => {
    const { service, saved } = serviceThatSaves();
    await (service as any).writeWhatThePasteGave('g1', EVERY_KIND);
    const sayBack = whatWeTookFromThat(EVERY_KIND, { asking: true })!;
    const confirmation = whatWeTookFromThat(EVERY_KIND)!;
    const kinds = new Set(saved.map((s) => s.kind));
    for (const kind of Object.keys(SECTION_OF_KIND)) expect(kinds.has(kind)).toBe(true);
    for (const text of [sayBack, confirmation]) {
      for (const [kind, heading] of Object.entries(SECTION_OF_KIND)) {
        const sentence = text.split('\n').find((l) => l.includes(heading));
        expect(sentence).toBeDefined();
        const audience = saved.find((s) => s.kind === kind)!.audience;
        expect(sentence).toContain(audience === 'EVERYONE' ? EVERYONE : ONLY_YOU);
        expect(sentence).not.toContain(audience === 'EVERYONE' ? ONLY_YOU : EVERYONE);
      }
    }
  });

  it('says "kept for you" nowhere over a line everyone will read', () => {
    const text = whatWeTookFromThat(EVERY_KIND, { asking: true })!;
    expect(text).not.toMatch(/kept for you/i);
    expect(text).toContain('Still to decide. Everyone on this check-in will see these.');
    expect(text).toContain('Not settled, so nothing here is treated as a fact or a target. Everyone on this check-in will see these.');
    expect(text).toContain('Between two people, so it sits with neither of them alone. Only you will see these.');
  });
});
