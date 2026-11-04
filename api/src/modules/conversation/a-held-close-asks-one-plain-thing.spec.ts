import { TurnRole } from '@prisma/client';
import { ConversationService } from './conversation.service';
import { asAQuestion, ONE_MORE_QUESTION } from './the-close-is-held-once';
import { EACH_OWED_THING_ASKED_PLAINLY, theOwedThingAskedPlainly } from './each-owed-thing-asked-plainly';
import { THE_SPINE, WHAT_EACH_SITUATION_ADDS } from './what-every-check-in-owes';
import { KEEP_THE_TEAM_ON_TRACK, CONNECT_GOALS_ACROSS } from './what-a-check-in-owes';

/**
 * THE HELD CLOSES OF RE-E (1 October 2026), replayed on their exact turns, up to the turn that was held.
 * The held turn is replayed as the model wrote it, before the product's question went under it.
 *
 * Since 3 November 2026 (Hafsah: no question limits and no forced close) the product never holds a close with a question of its own:
 * every one of these closes now goes through as the model wrote it.
 */
const RE_E: Record<string, [string, string][]> = require('./__fixtures__/re-e-held-closes.json');

async function replay(key: string) {
  const t = RE_E[key];
  const served = t[t.length - 1][1];
  const modelsClose = served.includes(ONE_MORE_QUESTION) ? served.slice(0, served.indexOf(ONE_MORE_QUESTION)).trim() : served;
  const turns = [...t.slice(0, -1), ['AI', modelsClose]].map(([r, c]) => ({ role: r === 'AI' ? TurnRole.AI : TurnRole.PERSON, content: c }));
  const lead = /Amina|Bisi/.test(key);
  const prisma: any = {
    checkIn: {
      findUnique: jest.fn(async () => ({
        participantId: 'p1', startedAt: new Date(0), isClarification: false, sessionNumber: 2,
        ground: { cadence: 'FORTNIGHTLY', scenario: key.startsWith('sales') ? 'OKR_ALIGNMENT' : 'NEW_HIRE' },
        participant: { partyType: lead ? 'INITIATOR' : 'PARTICIPANT' },
      })),
      update: jest.fn(async () => ({})),
    },
    conversationTurn: { findMany: jest.fn(async (a: any) => (a?.where?.role ? turns.filter((x) => x.role === a.where.role) : turns)) },
    groundDocument: { count: jest.fn(async () => 0) },
  };
  const s: any = new ConversationService(prisma, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, { get: () => '' } as any);
  const close = await s.mayClose('c1', false);
  return { close, served, modelsClose };
}

describe('1. no close is held with a product-written question any more', () => {
  it.each(Object.keys(RE_E).map((k) => [k]))('%s: the close goes through, with nothing added under it', async (key) => {
    const r = await replay(key);
    expect(r.served).toContain(ONE_MORE_QUESTION);
    expect(r.close).toEqual({ ready: true });
  });
});

describe('2. the owed-list questions the model is given are one plain question each', () => {
  it('"how they see it - what is clear, and what is not" is one question', () => {
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
});
