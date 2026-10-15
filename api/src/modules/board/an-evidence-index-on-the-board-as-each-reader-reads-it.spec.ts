import { GroundScenario } from '@prisma/client';
import { AMINA, BARAKA, JUMA, RUKIA, SETUP_ADMIN, boardAs, answered, type Setup } from './the-switchboards-sections-harness';

/**
 * THE EVIDENCE INDEX, AS EACH READER READS IT (request 70, the switchboard's "Evidence index").
 *
 * Every line on the record that something backs: a document the person added themselves, or the colleague
 * who received the work saying it arrived. Each is the person's own line, word for word, with what backs
 * it said in one sentence, and each is read only by those who may read that person's words.
 */
const line = (id: string, participantId: string, text: string, more: Record<string, any> = {}) => ({
  id, participantId, type: 'PROGRESS', text, checkInId: `c1-${participantId}`, recallBased: true, anchoredOrigin: null,
  anchoredDocumentId: null, confirmedAt: null, createdAt: new Date('2026-09-02T16:00:00Z'), disputedAt: null, ...more,
});
const RECORD: Setup = {
  checkIns: [answered('p-rukia', 1), answered('p-baraka', 1)],
  lines: [
    line('e-1', 'p-rukia', 'We paid out KES 90K to the Nyama Choma Palace account.', { recallBased: false, anchoredDocumentId: 'doc-1' }),
    line('e-2', 'p-baraka', 'The Kisumu depot received all twelve crates.', { confirmedAt: new Date('2026-09-04T10:00:00Z') }),
    line('e-3', 'p-baraka', 'I think the freezer order is about right.'),
  ],
};
const said = (b: any) => (b.evidenceIndex ?? []).map((e: any) => `${e.who}: ${e.said} ${e.backedBy}`);

describe('The evidence index, as each person reads it', () => {
  it('Amina reads every backed line, word for word, and a line nothing backs is not there', async () => {
    const b = await boardAs(RECORD, ...AMINA);
    expect(b.evidenceIndex).toEqual([
      { id: 'e-1', participantId: 'p-rukia', who: 'Rukia Mwangi', said: 'We paid out KES 90K to the Nyama Choma Palace account.', backedBy: 'A document Rukia Mwangi added shows this.', sessionNumber: 1 },
      { id: 'e-2', participantId: 'p-baraka', who: 'Baraka Otieno', said: 'The Kisumu depot received all twelve crates.', backedBy: 'The colleague who received this work confirmed it.', sessionNumber: 1 },
    ]);
  });

  it('Rukia, where people do not see each other, reads only her own backed line', async () => {
    const b = await boardAs({ ...RECORD, peersVisibleToEachOther: false }, ...RUKIA);
    expect(said(b)).toEqual(['You: We paid out KES 90K to the Nyama Choma Palace account. A document you added shows this.']);
  });

  it('Baraka, where people do not see each other, reads none of Rukia\'s words', async () => {
    const b = await boardAs({ ...RECORD, peersVisibleToEachOther: false }, ...BARAKA);
    expect(JSON.stringify(b.evidenceIndex)).not.toMatch(/Rukia|Nyama|KES/);
    expect(b.evidenceIndex).toHaveLength(1);
  });

  it('an admin who only reads an ordinary check-in reads both', async () => {
    expect((await boardAs(RECORD, ...JUMA)).evidenceIndex).toHaveLength(2);
  });

  it('on an evaluation check-in the person reads their own, the admin who set it up reads all, another admin reads no board', async () => {
    const evaluation: Setup = { ...RECORD, scenario: GroundScenario.PIP, createdByUserId: 'u-setup' };
    expect((await boardAs(evaluation, ...RUKIA)).evidenceIndex).toHaveLength(1);
    expect((await boardAs(evaluation, ...SETUP_ADMIN)).evidenceIndex).toHaveLength(2);
    expect((await boardAs(evaluation, ...JUMA).then((b) => b, (e) => e)).evidenceIndex).toBeUndefined();
  });

  it('a line somebody disputed is not in it, and nothing is served when nothing is backed', async () => {
    const none: Setup = { checkIns: RECORD.checkIns, lines: [line('e-3', 'p-baraka', 'I think the freezer order is about right.')] };
    expect((await boardAs(none, ...AMINA)).evidenceIndex).toBeUndefined();
  });
});
