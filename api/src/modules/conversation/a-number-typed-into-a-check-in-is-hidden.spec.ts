import { GroundScenario, PartyType, CheckInStatus } from '@prisma/client';
import { ConversationService } from './conversation.service';
import { ConversationContextService } from './context.service';
import { EntryService } from '../entry/entry.service';
import { HIDDEN, withoutBankDetails } from '../documents/bank-details-are-never-kept';
import { saidWordForWord, theRecordsWordsFor, quotesNotWordForWord } from '../reports/a-quote-is-what-they-said';
import { cleanText } from '../reports/what-the-record-actually-holds';

/**
 * A BANK OR CARD NUMBER TYPED INTO A CHECK-IN, OR INTO THE SETUP CHAT, IS HIDDEN TOO. Decision 35,
 * 27 September 2026: "The same code as for documents hides them, before anything is stored and before
 * any model call. Where a quote shows the message, it says a number was hidden. This is protection,
 * not changing someone's words."
 *
 * A real turn through `sendMessage`, and the setup chat through `EntryService`, with every database
 * write and every model input collected. Neither number is in any of them; the stored turn carries
 * the placeholder; and a record line and a report's quote of it carry the placeholder and still pass
 * the check that a quote is word for word what the record holds.
 */

const ACCOUNT = '0123456789';
const CARD = '4111 1111 1111 1111';
const TYPED = `Harbor Foods paid into our Zenith Bank account number ${ACCOUNT}, and the deposit went on the company card ${CARD} last Friday.`;
const holdsEither = (x: unknown) => { const s = JSON.stringify(x) ?? ''; return s.includes(ACCOUNT) || s.includes(CARD) || s.includes(CARD.replace(/\s/g, '')); };

const WRITES = ['create', 'createMany', 'update', 'updateMany', 'upsert'];
/** A database that answers empty and keeps every write it is asked for. */
function aDatabase(seed: Record<string, any>, writes: unknown[]) {
  const nothing = (m: string) => async () => (m.endsWith('Many') || m === 'groupBy' ? [] : null);
  return new Proxy(seed, {
    get: (target: any, model: string) => {
      if (typeof model !== 'string' || model.startsWith('$')) return target[model] ?? (async (f: any) => (typeof f === 'function' ? f(target) : f));
      return new Proxy(target[model] ?? {}, {
        get: (m: any, method: string) => {
          if (WRITES.includes(method)) return async (args: any) => { writes.push({ [`${model}.${method}`]: args }); return m[method] ? m[method](args) : { id: `${model}-1`, count: 0, ...(args?.data ?? {}) }; };
          return m[method] ?? nothing(method);
        },
      });
    },
  });
}

const anEngine = () => {
  const inputs: unknown[] = [];
  const keep = (...a: unknown[]) => { inputs.push(a); };
  return {
    inputs,
    anthropic: {
      respond: jest.fn(async (...a: unknown[]) => { keep(...a); return 'What did Harbor Foods say about the second invoice?'; }),
      extract: jest.fn(async (...a: unknown[]) => { keep(...a); return null; }),
      respondStream: jest.fn(async (...a: unknown[]) => { keep(...a); return 'What did Harbor Foods say?'; }),
      respondWithMedia: jest.fn(async (...a: unknown[]) => { keep(...a); return ''; }),
    } as any,
  };
};

const NGOZI = {
  id: 'p-ngozi', groundId: 'g1', partyType: PartyType.PARTICIPANT, managingOnly: false, userId: 'u-ngozi',
  roleAsDescribed: 'finance', createdAt: new Date('2026-09-02'), nameGiven: null, email: 'n@x.test', user: { firstName: 'Ngozi', lastName: 'Eke' },
};
const TUNDE = { ...NGOZI, id: 'p-tunde', partyType: PartyType.INITIATOR, userId: 'u-tunde', roleAsDescribed: 'I run Atlas', email: 't@x.test', user: { firstName: 'Tunde', lastName: 'Bakare' } };

function aCheckIn() {
  const ground = {
    id: 'g1', organizationId: 'org1', scenario: GroundScenario.OKR_ALIGNMENT, moment: null, label: 'Atlas delivery',
    mode: 'SHARED', timelineDays: 90, brief: null, startsAt: null, endsAt: null, status: 'ACTIVE', leadRemit: null,
    cadence: null, resolutionState: null, initiatorId: 'u-tunde', peersVisibleToEachOther: true, expectThemToUnblock: true,
    objectives: [], report: null, leadContextNotes: [], participants: [TUNDE, NGOZI],
  };
  return {
    ground: { findUnique: jest.fn(async () => ground), findFirst: jest.fn(async () => ground) },
    checkIn: {
      findUnique: jest.fn(async () => ({
        id: 'ci1', groundId: 'g1', participantId: 'p-ngozi', sessionNumber: 2, status: CheckInStatus.IN_PROGRESS,
        isClarification: false, clarificationTarget: null, isSelfCorrection: false, selfCorrectionTargetSession: null, isFinal: false,
        participant: { ...NGOZI },
      })),
      count: jest.fn(async () => 0), findMany: jest.fn(async () => []), findFirst: jest.fn(async () => null),
    },
    groundParticipant: {
      count: jest.fn(async () => 2),
      findUnique: jest.fn(async () => ({ specificityHistory: [] })),
      findFirst: jest.fn(async () => NGOZI),
      findMany: jest.fn(async () => [TUNDE, NGOZI].map((p) => ({ ...p, checkIns: [] }))),
    },
    conversationTurn: {
      count: jest.fn(async () => 1),
      create: jest.fn(async (args: any) => ({ id: 't1', content: args.data.content })),
      findMany: jest.fn(async () => [{ id: 't0', role: 'PERSON', content: 'The invoice went out on Monday.', createdAt: new Date() }]),
    },
  };
}

describe('a bank or card number typed into a check-in', () => {
  it('a real turn: neither number is written anywhere or given to any model, and the turn keeps the placeholder', async () => {
    const writes: unknown[] = [];
    const prisma: any = aDatabase(aCheckIn(), writes);
    const { anthropic, inputs } = anEngine();
    const context = new ConversationContextService(prisma);
    const promptStore: any = { getActiveContent: jest.fn(async (k: string) => (k === 'system' ? 'SYS' : null)) };
    const nothing: any = { get: () => undefined, emit: jest.fn(() => Promise.resolve()) };
    const service = new ConversationService(prisma, promptStore, anthropic, context, nothing, nothing, nothing, nothing, nothing, nothing);
    await service.sendMessage('ci1', 'u-ngozi', TYPED);
    await new Promise((r) => setTimeout(r, 20));

    expect(inputs.length).toBeGreaterThan(0);
    expect(inputs.filter(holdsEither)).toEqual([]);
    expect(writes.filter(holdsEither)).toEqual([]);
    const theirTurn = writes.map((w: any) => w['conversationTurn.create']?.data).find((d: any) => d?.role === 'PERSON');
    expect(theirTurn.content).toBe(`Harbor Foods paid into our Zenith Bank account number ${HIDDEN.account}, and the deposit went on the company card ${HIDDEN.card} last Friday.`);
  });

  /*
   * THE QUOTE SAYS A NUMBER WAS HIDDEN, AND IS STILL WORD FOR WORD. The turn is kept masked, so the
   * record reader reads the masked turn, a line taken from it carries the placeholder, the line is
   * stamped as their own words against the masked turn, the served line keeps the placeholder (the
   * report's tidy-up takes the reader's bracketed notes out, never this), and a report quoting it
   * passes the check that every quote is a passage of the record.
   */
  it('a record line and a report quote carry the placeholder, and the quote checker accepts it', () => {
    const stored = withoutBankDetails(TYPED);
    const line = `Harbor Foods paid into our Zenith Bank account number ${HIDDEN.account}.`;
    expect(saidWordForWord(line, [stored])).toBe(true);
    expect(cleanText(line)).toBe(line);
    const quoted = `Ngozi said "the deposit went on the company card ${HIDDEN.card} last Friday".`;
    expect(theRecordsWordsFor(`the deposit went on the company card ${HIDDEN.card} last Friday`, [stored])).toBe(`the deposit went on the company card ${HIDDEN.card} last Friday`);
    expect(quotesNotWordForWord(quoted, [stored])).toEqual([]);
    expect(holdsEither([stored, line, quoted])).toBe(false);
  });
});

describe('a bank or card number typed into the setup chat', () => {
  function anEntryService() {
    const writes: unknown[] = [];
    const prisma: any = aDatabase({
      entryDraft: { findUnique: jest.fn(async () => ({ id: 'd1', token: 'tok', payload: {}, consumedAt: null, createdAt: new Date() })), findFirst: jest.fn(async () => ({ id: 'd1', token: 'tok', payload: {}, consumedAt: null, createdAt: new Date() })) },
    }, writes);
    const { anthropic, inputs } = anEngine();
    const service = new EntryService(anthropic, prisma, {} as any, {} as any, {} as any, {} as any, { emit: jest.fn() } as any);
    return { service, writes, inputs };
  }
  const turns = [
    { role: 'assistant' as const, content: 'What is this check-in for?' },
    { role: 'user' as const, content: TYPED },
  ];

  it('the chat and the setup read: no model is given either number', async () => {
    const { service, inputs } = anEntryService();
    await service.chat(turns as any, 'OKR_ALIGNMENT').catch(() => null);
    await service.onboard(turns as any, 'OKR_ALIGNMENT').catch(() => null);
    await service.report(turns as any, 'OKR_ALIGNMENT').catch(() => null);
    await service.faq(TYPED).catch(() => null);
    expect(inputs.length).toBeGreaterThan(0);
    expect(inputs.filter(holdsEither)).toEqual([]);
  });

  it('the draft the setup keeps holds the placeholder, not the number', async () => {
    const { service, writes } = anEntryService();
    await service.patchDraft('tok', { history: turns, brief: TYPED }).catch(() => null);
    expect(writes.length).toBeGreaterThan(0);
    expect(writes.filter(holdsEither)).toEqual([]);
    expect(JSON.stringify(writes)).toContain(HIDDEN.account);
  });
});
