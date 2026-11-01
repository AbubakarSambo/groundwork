import { ConversationService } from './conversation.service';
import { theFullerPromise, datesIn } from './the-same-promise-said-more-fully';
import { anAssessmentHolding } from './an-assessment-for-a-spec';

const SHORT = { action: 'I will deliver the Tuskys cookers', when: 'on 9 October', outcome: null };
const WHOLE = { action: 'I will deliver the Tuskys cookers on 9 October and ask for the signed order form that day.', when: '9 October', outcome: null };

async function run(stored: any[], extracted: any[], said: string[]) {
  const rows = stored.map((r, i) => ({ id: `r${i}`, status: 'UNKNOWN', saidAgainIn: [], statedInSession: 1, ...r }));
  const created: any[] = [];
  const updated: any[] = [];
  const fake: any = {
    prisma: {
      /* The promises come from the conversation's assessment now (one source, 1 November 2026), not a call of the writer's own. */
      checkIn: { findUnique: async () => ({ groundId: 'g', sessionNumber: 1, participantId: 'p', sessionReport: anAssessmentHolding({ promises: extracted }), turns: said.map((content) => ({ content })) }) },
      groundCommitment: {
        create: async ({ data }: any) => { created.push(data); return { id: `n${created.length}` }; },
        findMany: async () => rows,
        update: async (a: any) => { updated.push(a); return {}; },
      },
    },
    anthropic: { extract: async () => { throw new Error('the promises are read from the assessment, never a call of their own'); } },
    logger: { log() {}, warn() {} },
  };
  await (ConversationService.prototype as any).writeWhatTheyPromised.call(fake, 'ci');
  return { created, updated };
}
const SAID = ['I will deliver the Tuskys cookers on 9 October and ask for the signed order form that day.'];

describe('the same promise said short and then whole is one row (request 96)', () => {
  it("Amani's case, short first then whole: one row, in the fuller words, with the date", async () => {
    const r = await run([], [SHORT, WHOLE], SAID);
    expect(r.created).toHaveLength(1);
    expect(r.updated).toHaveLength(1);
    expect(r.updated[0].data.text).toBe(WHOLE.action);
    expect(r.updated[0].data.whenSaid).toBe('9 October');
  });
  it("Amani's case, whole first then short: one row, and the short one is not written", async () => {
    const r = await run([], [WHOLE, SHORT], SAID);
    expect(r.created).toHaveLength(1);
    expect(r.created[0].text).toBe(WHOLE.action);
    expect(r.updated).toEqual([]);
  });
  it('the short row already stored in this check-in is updated to the fuller words, and keeps its session', async () => {
    const r = await run([{ text: SHORT.action, whenSaid: 'on 9 October' }], [WHOLE], SAID);
    expect(r.created).toEqual([]);
    expect(r.updated[0].where).toEqual({ id: 'r0' });
    expect(r.updated[0].data.text).toBe(WHOLE.action);
    expect(r.updated[0].data.statedInSession).toBeUndefined();
    expect(r.updated[0].data.saidWordForWord).toBe(true);
  });
  it('two different promises stay two', async () => {
    const r = await run([], [SHORT, { action: 'I will send the van to Mombasa', when: 'on Friday', outcome: null }], SAID);
    expect(r.created).toHaveLength(2);
    expect(r.updated).toEqual([]);
  });
  it('the same words with two different dates stay two', async () => {
    const r = await run([], [{ action: 'I will deliver the Tuskys cookers', when: 'on 9 October', outcome: null }, { action: 'I will deliver the Tuskys cookers on Friday and call them', when: 'Friday', outcome: null }], SAID);
    expect(r.created).toHaveLength(2);
    expect(r.updated).toEqual([]);
  });
  /* Hafsah, 1 October: only a promise said short and whole in the SAME session is one record. Said in
     two different sessions, they stay two records, even when one contains the other. */
  it('a short promise from an earlier session and the whole one now stay two separate records', async () => {
    const r = await run([{ text: SHORT.action, whenSaid: 'on 9 October', statedInSession: 0 }], [WHOLE], SAID);
    expect(r.updated.every((u: any) => !u.data.text)).toBe(true);
    expect(r.created).toHaveLength(1);
    expect(r.created[0].text).toBe(WHOLE.action);
  });

  it('the same words said in a later session are still marked said again', async () => {
    const r = await run([{ text: WHOLE.action, whenSaid: '9 October', statedInSession: 0 }], [WHOLE], SAID);
    expect(r.created).toEqual([]);
    expect(r.updated).toHaveLength(1);
    expect(r.updated[0].data).toEqual({ saidAgainIn: { set: [1] } });
  });
  it('a promise from an earlier check-in is not rewritten', async () => {
    const r = await run([{ text: SHORT.action, whenSaid: 'on 9 October', statedInSession: 0 }], [WHOLE], SAID);
    expect(r.updated.every((u: any) => !u.data.text)).toBe(true);
  });
});

describe('what counts as the same promise at two lengths', () => {
  it('needs three words and the whole of one inside the other', () => {
    expect(theFullerPromise({ text: 'Send the order' }, { text: 'Send the order form to Musa today' })).toBe('incoming');
    expect(theFullerPromise({ text: 'Send the order form to Musa today' }, { text: 'Send the order' })).toBe('existing');
    expect(theFullerPromise({ text: 'Send it' }, { text: 'Send it to Musa' })).toBeNull();
    expect(theFullerPromise({ text: 'Send the order form' }, { text: 'Call the client back' })).toBeNull();
  });
  it('one date written two ways is one date', () => {
    expect([...datesIn({ text: 'on 9th October' })]).toEqual([...datesIn({ text: 'x', when: 'October 9' })]);
  });
});
