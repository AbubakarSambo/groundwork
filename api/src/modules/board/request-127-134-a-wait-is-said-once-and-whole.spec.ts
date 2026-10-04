import { boardAs, SALES_RUN, BISI, KWAME, type Setup } from './the-switchboards-sections-harness';
import { theWaitSaid } from './a-wait-said-in-full';
import { oneWaitSaidOnce } from './a-thing-is-not-somebody';

/**
 * Requests 127 and 134: a wait whose holder is the thing waited for, and one wait written two ways.
 *   Amani Wekesa is waiting on the tax view for "the tax view".
 *   Aisha Wanjiku is waiting on the pipeline for a fix for the pipeline. / ... for the pipeline fix.
 */
const wait = (id: string, from: string, label: string | null, what: string, at: string) => ({
  id, groundId: 'g-1', fromParticipantId: from, onParticipantId: null, onLabel: label, what, status: 'WAITING', blockerKind: null,
  escalatedAt: null, triedSaid: null, dueSaid: null, dueOn: null, namedTheThing: true, sourceCheckInId: null, clearedAt: null, then: null,
  createdAt: new Date(at), updatedAt: new Date(at),
});

describe('theWaitSaid', () => {
  it('says what is waited for once when the holder is the thing', () => {
    expect(theWaitSaid('Amani Wekesa', 'is', 'the tax view', '"the tax view"')).toBe('Amani Wekesa is waiting for the tax view, and nobody has been named to provide it.');
    expect(theWaitSaid('Aisha Wanjiku', 'is', 'the pipeline', 'a fix for the pipeline')).toBe('Aisha Wanjiku is waiting for a fix for the pipeline, and nobody has been named to provide it.');
  });
  it('waits for both when the holder is itself a decision', () => {
    expect(theWaitSaid('You', 'are', 'a decision on who owns them', 'owners with dates for the API format and the data structure')).toBe(
      'You are waiting for a decision on who owns them, and for owners with dates for the API format and the data structure.');
  });
  it('keeps a real holder', () => {
    expect(theWaitSaid('Aisha Wanjiku', 'is', 'Zainab Suleiman', 'the price list')).toBe('Aisha Wanjiku is waiting on Zainab Suleiman for the price list.');
    expect(theWaitSaid('Samuel', 'is', 'the provider', 'the sandbox credentials')).toBe('Samuel is waiting on the provider for the sandbox credentials.');
  });
});

describe('one wait written two ways', () => {
  it('is one wait', () => {
    const rows = oneWaitSaidOnce([
      wait('w1', 'p-kwame', 'the pipeline', 'a fix for the pipeline', '2026-09-02T18:00:00Z'),
      wait('w2', 'p-kwame', null, 'the pipeline fix', '2026-09-03T18:00:00Z'),
    ] as any);
    expect(new Set(rows.map((r: any) => r.what)).size).toBe(1);
  });
});

describe('the board, as each reader reads it', () => {
  const S: Setup = { ...SALES_RUN, dependencies: [wait('w1', 'p-kwame', 'the tax view', '"the tax view"', '2026-09-29T09:00:00Z')] as any };
  it('the lead reads the wait whole', async () => {
    const b = JSON.stringify(await boardAs(S, ...BISI));
    expect(b).toMatch(/Kwame Mensah is waiting for the tax view, and nobody has been named to provide it\./);
    expect(b).not.toMatch(/for \\"the tax view\\"/);
    expect(b).toMatch(/What has been tried to get the tax view, which Kwame Mensah is waiting for\?/);
    expect(b).toMatch(/Kwame Mensah has been waiting for the tax view since 29 September/);
  });
  it('the person waiting reads it as you', async () => {
    const b = JSON.stringify(await boardAs(S, ...KWAME));
    expect(b).toMatch(/You are waiting for the tax view, and nobody has been named to provide it\./);
    expect(b).not.toMatch(/waiting on the tax view/);
  });
});

import { aStoredSentenceReadsRight } from '../reports/a-stored-sentence-reads-right';
describe('a stored wait with its holder and its thing as one', () => {
  it('drops the holder', () => {
    expect(aStoredSentenceReadsRight('Aisha Wanjiku is waiting on the pipeline for a fix for the pipeline.')).toBe('Aisha Wanjiku is waiting for a fix for the pipeline.');
    expect(aStoredSentenceReadsRight('Aisha Wanjiku is waiting on the data structure decision for "the data structure decision".')).toBe('Aisha Wanjiku is waiting for the data structure decision.');
  });
  it('keeps a real holder', () => {
    expect(aStoredSentenceReadsRight('Aisha Wanjiku is waiting on the warehouse for the delivery notes.')).toBe('Aisha Wanjiku is waiting on the warehouse for the delivery notes.');
  });
});
