import { ConversationService } from './conversation.service';
import { SEED_PROMPTS } from './prompt-library';
import { BLOCKER_TRACE_PROMPT, theChainFrom, theInputKey, theRecordForTheModel, theTraceTheRecordSupports, type HandoffOnRecord } from './where-the-blocker-started';

/**
 * REQUEST 18 (c): WHERE THE BLOCKER STARTED IS BUILT ONCE, WHEN THE RECORD CHANGES, FROM THE RECORD.
 *
 * Westgate Deli's deposit: Sales (Miriam) asked Finance for credit terms, Finance (Grace) has been
 * waiting on Leadership (Amani) for a sign-off. Stored without names.
 */
const at = (d: string) => new Date(`${d}T08:00:00Z`);
const H = (over: Partial<HandoffOnRecord> & { id: string }): HandoffOnRecord => ({
  groundId: 'sales', waitingOnGroundId: null, fromParticipantId: 'p-sales-miriam', onParticipantId: null,
  what: 'credit terms for Westgate Deli', then: 'the deposit can come in before 30 September', triedSaid: null, dueSaid: null, onLabel: 'Finance',
  createdAt: at('2026-09-14'), ...over,
});
const anchor = H({ id: 'h-terms', waitingOnGroundId: 'finance' });
const financeHandoff = H({
  id: 'h-signoff', groundId: 'finance', fromParticipantId: 'p-fin-grace', onParticipantId: 'p-lead-amani', waitingOnGroundId: 'leadership',
  what: 'sign-off for credit terms over 30 days', then: 'the terms for Westgate Deli can go out', onLabel: 'Leadership', createdAt: at('2026-09-16'),
});
const leadershipHandoff = H({
  id: 'h-supplier', groundId: 'leadership', fromParticipantId: 'p-lead-amani', onParticipantId: null,
  what: 'the supplier decision', then: 'the sign-off queue can move', onLabel: 'the board', createdAt: at('2026-09-10'),
});
const open = [anchor, financeHandoff, leadershipHandoff];
const people = [
  { id: 'p-sales-miriam', groundId: 'sales', email: 'miriam@baridi.test', nameGiven: null, user: { firstName: 'Miriam', lastName: 'Wanjiku' } },
  { id: 'p-fin-grace', groundId: 'finance', email: 'grace@baridi.test', nameGiven: null, user: { firstName: 'Grace', lastName: 'Achieng' } },
  { id: 'p-lead-amani', groundId: 'leadership', email: 'amani@baridi.test', nameGiven: null, user: { firstName: 'Amani', lastName: 'Njoroge' } },
];

const good = () => ({
  steps: [
    { kind: 'need', sourceId: 'h-terms', whose: 'raised', text: 'Credit terms for Westgate Deli are needed before 30 September.' },
    { kind: 'approval', sourceId: 'h-signoff', whose: 'holds', text: 'Credit terms over 30 days need a sign-off since August.' },
    { kind: 'priority', sourceId: 'h-supplier', whose: 'raised', text: 'The sign-off queue waits behind the supplier decision.' },
    { kind: 'effect', sourceId: 'h-terms', whose: 'raised', text: 'The deposit for Westgate Deli has not come in.' },
  ],
  whereItStarted: 'the request went to Finance, and the new sign-off rule then queued it behind the supplier decision.',
  decisionNeeded: 'Sign off Westgate Deli’s credit terms this week?',
  decisionOwner: 'person 3',
});

describe('following a blocker through check-ins', () => {
  it('goes from the handoff outwards through the check-ins it waits on, and no further than four', () => {
    const { groundIds, handoffs } = theChainFrom(anchor, open);
    expect(groundIds).toEqual(['sales', 'finance', 'leadership']);
    expect(handoffs.map((h) => h.id)).toEqual(['h-terms', 'h-signoff', 'h-supplier']);
  });

  it('gives the model check-ins and people as tokens, never a name', () => {
    const { groundIds, handoffs } = theChainFrom(anchor, open);
    const { text } = theRecordForTheModel(handoffs, groundIds);
    expect(text).toMatch(/person 1/);
    expect(text).not.toMatch(/Miriam|Grace|Amani|Wanjiku|Achieng|Njoroge|@/);
  });

  it('the same record gives the same key, and a change to it gives a different one', () => {
    const k = theInputKey([anchor, financeHandoff]);
    expect(theInputKey([financeHandoff, anchor])).toBe(k);
    expect(theInputKey([anchor, { ...financeHandoff, what: 'something else entirely' }])).not.toBe(k);
  });
});

describe('every step must come from the record', () => {
  const { groundIds, handoffs } = theChainFrom(anchor, open);
  const { tokens } = theRecordForTheModel(handoffs, groundIds);
  const check = (m: any) => theTraceTheRecordSupports(m, anchor, handoffs, people, tokens);

  it('keeps a chain whose steps all come from handoffs, taking the check-in and the owner from the handoff', () => {
    const t = check(good())!;
    expect(t.steps.map((s) => [s.kind, s.groundId, s.personId])).toEqual([
      ['need', 'sales', 'p-sales-miriam'],
      ['approval', 'finance', 'p-lead-amani'],
      ['priority', 'leadership', 'p-lead-amani'],
      ['effect', 'sales', 'p-sales-miriam'],
    ]);
    expect(t.startGroundId).toBe('sales');
    expect(t.endGroundId).toBe('sales');
    expect(t.whereItStarted).toMatch(/^Where it started: the request went to Finance/);
    expect(t.decisionNeeded).toMatch(/^Decision needed: sign off Westgate Deli/);
    expect(t.decisionOwnerParticipantId).toBe('p-fin-grace'.replace('fin-grace', 'lead-amani'));
  });

  it('refuses a step that cites a handoff that is not on the record', () => {
    const m = good(); m.steps[1].sourceId = 'h-invented';
    expect(check(m)).toBeNull();
  });

  it('refuses a step that says something its handoff does not', () => {
    const m = good(); m.steps[2].text = 'Headquarters froze all spending in August.';
    expect(check(m)).toBeNull();
  });

  it('refuses any sentence that names a person, or a person token, or an address', () => {
    for (const bad of ['Grace asked for the credit terms for Westgate Deli.', 'Person 1 needs the credit terms for Westgate Deli.', 'Ask miriam@baridi.test about the credit terms for Westgate.']) {
      const m = good(); m.steps[0].text = bad;
      expect(check(m)).toBeNull();
    }
    const m = good(); m.whereItStarted = 'Amani queued it behind the supplier decision, for credit terms.';
    expect(check(m)).toBeNull();
  });

  it('refuses a sentence that judges anybody', () => {
    const m = good(); m.steps[1].text = 'Finance was slow to answer the credit terms for Westgate Deli.';
    expect(check(m)).toBeNull();
    const n = good(); n.whereItStarted = 'the credit terms were Finance’s fault, and stayed in the queue.';
    expect(check(n)).toBeNull();
  });

  it('refuses a chain that stays in one check-in, or does not end where the blocker is felt', () => {
    const one = good(); one.steps = [one.steps[0], one.steps[3]];
    expect(check(one)).toBeNull();
    const notEnd = good(); notEnd.steps = notEnd.steps.slice(0, 3);
    expect(check(notEnd)).toBeNull();
  });

  it('gives no owner for the decision when the model names somebody not on the record', () => {
    const m = good(); m.decisionOwner = 'person 9';
    expect(check(m)!.decisionOwnerParticipantId).toBeNull();
  });
});

describe('the instructions that run', () => {
  it('are the stored version, seeded under their own key, and say nobody is named or judged', () => {
    const seed = SEED_PROMPTS.find((p) => p.key === 'blocker_trace');
    expect(seed?.content).toBe(BLOCKER_TRACE_PROMPT);
    expect(BLOCKER_TRACE_PROMPT).toMatch(/NEVER write a person's name/);
    expect(BLOCKER_TRACE_PROMPT).toMatch(/NEVER judge a person/);
  });
});

describe('the trace stored when something new comes in', () => {
  const service = (answer: any, had: any = null) => {
    const stored: any[] = [];
    const extract = jest.fn(async () => answer);
    const prisma: any = {
      groundDependency: {
        findMany: jest.fn(async ({ where }: any) => {
          if (where?.id?.in) return [{ ...anchor, status: 'WAITING', clearedAt: null, ground: { organizationId: 'org-baridi' } }];
          if (where?.waitingOnGroundId) return [];
          return open.map((h) => ({ ...h, status: 'WAITING', clearedAt: null }));
        }),
      },
      groundParticipant: { findMany: async () => people },
      blockerTrace: {
        deleteMany: jest.fn(async () => ({})),
        findUnique: jest.fn(async () => had),
        upsert: jest.fn(async (a: any) => { stored.push(a.create); return a.create; }),
      },
    };
    const svc = Object.create(ConversationService.prototype) as any;
    svc.prisma = prisma;
    svc.anthropic = { extract };
    svc.logger = { log: () => {}, warn: () => {} };
    svc.prompts = { getActive: async () => ({ id: 'pv-7', content: 'the stored instructions' }) };
    return { svc, stored, extract, prisma };
  };

  it('is stored without a single name, with the prompt version that wrote it', async () => {
    const { svc, stored, extract } = service(good());
    await svc.followTheBlockersAcrossCheckIns(['h-terms']);
    expect(stored).toHaveLength(1);
    expect(stored[0].promptVersionId).toBe('pv-7');
    expect((extract.mock.calls as any[][])[0][0]).toBe('the stored instructions');
    expect(JSON.stringify(stored[0])).not.toMatch(/Miriam|Grace|Amani|Wanjiku|Achieng|Njoroge|@baridi/);
    expect(stored[0].steps.every((s: any) => typeof s.groundId === 'string' && 'personId' in s)).toBe(true);
  });

  it('is not built again when the record has not changed', async () => {
    const { svc, extract, prisma } = service(good(), { inputKey: theInputKey(theChainFrom(anchor, open).handoffs) });
    await svc.followTheBlockersAcrossCheckIns(['h-terms']);
    expect(extract).not.toHaveBeenCalled();
    expect(prisma.blockerTrace.upsert).not.toHaveBeenCalled();
  });

  it('stores nothing when the model\'s chain does not hold against the record', async () => {
    const bad = good(); bad.steps[1].sourceId = 'h-invented';
    const { svc, stored, prisma } = service(bad);
    await svc.followTheBlockersAcrossCheckIns(['h-terms']);
    expect(stored).toEqual([]);
    expect(prisma.blockerTrace.deleteMany).toHaveBeenCalled();
  });

  it('is never built by opening anything: the reading side has no model', () => {
    const src = require('fs').readFileSync(require('path').join(__dirname, '../reports/the-blocker-trace.service.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(src).not.toMatch(/anthropic|extract\(|blockerTrace\.(create|upsert|update)/);
  });
});
