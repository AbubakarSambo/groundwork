import { GroundScenario } from '@prisma/client';
import { BISI, FEMI, JUMA, KWAME, SALES_RUN, SETUP_ADMIN, boardAs, commitment, type Setup } from './the-switchboards-sections-harness';

/**
 * CONTRADICTIONS, AS EACH READER READS THEM (request 70, the switchboard's "Contradictions": where the
 * record says two different things). Where two people said different things the board already serves
 * `divergence`; this is where one person's own record says two things: a commitment marked done in one
 * session and said again as still to do in a later one. In the sales run Kwame said, in session 1, "I'll
 * be following up with each client directly over the next week to chase down the missing documents.",
 * it was marked done, and he said it again in session 2.
 */
const KWAMES = commitment('k-kwame', 'p-kwame', 'I\'ll be following up with each client directly over the next week to chase down the missing documents.', {
  statedInSession: 1, saidWordForWord: true, status: 'DONE', settledBy: 'SAID', settledInCheckInId: 'c1-p-kwame', saidAgainIn: [2],
});
const WITH_ONE: Setup = { ...SALES_RUN, commitments: [...(SALES_RUN.commitments ?? []).filter((c: any) => c.id !== 'k-kwame'), KWAMES] };
const says = (b: any) => (b.contradictions ?? []).map((c: any) => c.says);
const AS_THE_LEAD_READS_IT = 'Kwame Mensah\'s commitment, "I\'ll be following up with each client directly over the next week to chase down the missing documents", was marked done in check-in 1, and in check-in 2 Kwame Mensah said it again as something still to do.';

describe('Contradictions, as each person reads them', () => {
  it('Bisi, who runs it, reads both things the record says, in one sentence, with the sessions', async () => {
    expect(says(await boardAs(WITH_ONE, ...BISI))).toEqual([AS_THE_LEAD_READS_IT]);
  });

  it('Kwame reads his own, as "you"', async () => {
    expect(says(await boardAs(WITH_ONE, ...KWAME))).toEqual([
      'Your commitment, "I\'ll be following up with each client directly over the next week to chase down the missing documents", was marked done in check-in 1, and in check-in 2 you said it again as something still to do.',
    ]);
  });

  it('where people do not see each other, Femi never reads Kwame\'s', async () => {
    expect((await boardAs({ ...WITH_ONE, peersVisibleToEachOther: false }, ...FEMI)).contradictions).toBeUndefined();
  });

  it('an admin who only reads an ordinary check-in reads what the lead reads', async () => {
    expect(says(await boardAs(WITH_ONE, ...JUMA))).toEqual([AS_THE_LEAD_READS_IT]);
  });

  it('on an evaluation check-in, the admin who set it up reads it, a colleague does not, and an admin with no access reads nothing', async () => {
    const evaluation: Setup = { ...WITH_ONE, scenario: GroundScenario.PIP, createdByUserId: 'u-setup' };
    expect(says(await boardAs(evaluation, ...SETUP_ADMIN))).toEqual([AS_THE_LEAD_READS_IT]);
    expect((await boardAs(evaluation, ...FEMI)).contradictions).toBeUndefined();
    const asJuma = await boardAs(evaluation, ...JUMA).then((b) => b, (e) => e);
    expect(asJuma.contradictions).toBeUndefined();
  });

  it('is found from the day it was settled where the check-in it was settled in is not stored', async () => {
    const byDate = { ...KWAMES, settledInCheckInId: null, settledAt: new Date('2026-09-02T18:00:00Z') };
    expect(says(await boardAs({ ...SALES_RUN, commitments: [byDate] }, ...BISI))).toEqual([AS_THE_LEAD_READS_IT]);
  });

  it('is left out when a commitment was said again only before it was settled, or not at all', async () => {
    expect((await boardAs(SALES_RUN, ...BISI)).contradictions).toBeUndefined();
    const before = { ...KWAMES, settledInCheckInId: 'c2-p-kwame', saidAgainIn: [2] };
    expect((await boardAs({ ...SALES_RUN, commitments: [before] }, ...BISI)).contradictions).toBeUndefined();
  });

  it('no sentence rates or labels a person', async () => {
    expect(JSON.stringify((await boardAs(WITH_ONE, ...BISI)).contradictions)).not.toMatch(/lied|dishonest|inconsistent|unreliable|score|rating|verdict/i);
  });
});
