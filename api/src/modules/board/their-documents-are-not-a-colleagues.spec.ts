import { boardAs, SALES_RUN, A_RELEASED_REPORT, handoff, BISI, FEMI, NGOZI, JUMA, type Setup } from './the-switchboards-sections-harness';
import { whoseIsIt } from '../grounds/a-blocker-that-says-her-or-his';

/**
 * "THEIR DOCUMENTS" ARE THE CUSTOMERS' (run-25, sales). Femi waited on the customers for "their documents,
 * especially the bank statements". Every reader of the board read "Work is held up by a colleague's documents,
 * especially the bank statements." and, at the top, "A colleague's documents, especially the bank statements": an
 * owner nobody named. "Their" now becomes a colleague's only where the row says a person in the check-in is waited
 * on; otherwise it is said as whoever the row waits on.
 */
const FEMIS_WAIT = handoff('d-femi', 'p-femi', 'their documents, especially the bank statements', { status: 'BLOCKING', onLabel: 'The customers', sourceCheckInId: 'c2-p-femi', createdAt: new Date('2026-09-02T16:00:00Z') });
const RUN: Setup = { ...SALES_RUN, dependencies: [FEMIS_WAIT], report: A_RELEASED_REPORT, waitsAreReadOnTheirOwn: true };
const read = async (reader: readonly [string, string]) => {
  const b = await boardAs(RUN, reader[0], reader[1]);
  return { top: b.howItIsGoing.glance.inTheWay.oldest, tile: b.quickRead?.find((t: any) => t.label === 'Blockers')?.sub ?? null };
};

describe('Femi\'s wait on the customers, as each reader of the sales board reads it', () => {
  it('Bisi, who runs it, reads the customers\' documents, and no colleague\'s', async () => {
    const r = await read(BISI);
    expect(r.top).toBe("the customers' documents, especially the bank statements");
    expect(r.tile).toBe("Work is held up by the customers' documents, especially the bank statements.");
  });

  it('Femi, whose wait it is, reads the same', async () => {
    const r = await read(FEMI);
    expect(r.top).toBe("the customers' documents, especially the bank statements");
    expect(r.tile).toBe("Work is held up by the customers' documents, especially the bank statements.");
  });

  it('Juma, an admin who only reads, reads the same at the top', async () => {
    expect((await read(JUMA)).top).toBe("the customers' documents, especially the bank statements");
  });

  it('nobody reads "a colleague\'s documents"', async () => {
    for (const r of [BISI, FEMI, NGOZI, JUMA] as const) expect(JSON.stringify(await boardAs(RUN, r[0], r[1]))).not.toMatch(/colleague's documents/i);
  });
});

describe('whoseIsIt', () => {
  it('"their" waited on from a person in the check-in is still a colleague\'s, or their name', () => {
    expect(whoseIsIt('their login for the order system', null, { onParticipantId: 'p-omar', onLabel: null })).toBe("A colleague's login for the order system");
    expect(whoseIsIt('their login for the order system', 'Omar', { onParticipantId: 'p-omar' })).toBe("Omar's login for the order system");
  });
  it('"their" with nobody named is left as it was said', () => {
    expect(whoseIsIt('their documents', null, { onParticipantId: null, onLabel: null })).toBe('their documents');
    expect(whoseIsIt('Their documents', null, { onParticipantId: null, onLabel: 'the supplier' })).toBe("The supplier's documents");
  });
  it('"her" and "his" are one person, and read as before', () => {
    expect(whoseIsIt('Her login for the order system', null, { onParticipantId: null, onLabel: 'the supplier' })).toBe("A colleague's login for the order system");
    expect(whoseIsIt('his sign-off')).toBe("A colleague's sign-off");
  });
});
