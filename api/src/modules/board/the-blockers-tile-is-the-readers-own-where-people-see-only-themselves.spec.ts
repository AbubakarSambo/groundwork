import { boardAs, SALES_RUN, A_RELEASED_REPORT, BISI, NGOZI, FEMI, JUMA, type Setup } from './the-switchboards-sections-harness';

/**
 * THE BLOCKERS TILE NAMES ONLY THE READER'S OWN WAITS WHERE PEOPLE SEE ONLY THEMSELVES (run-25, loans).
 *
 * Sunday, a borrower where borrowers do not see each other, read on his board's quick read "Work is held up by the
 * grinding machine, which waits on the supplier.": Musa's wait. The header above it already said nothing was in
 * his way. Read here on the served board, on the sales run with people kept apart, as each reader: Ngozi waits on
 * Mr. Adebayo, Femi on the customers' bank statements.
 */
const HIDDEN: Setup = { ...SALES_RUN, peersVisibleToEachOther: false, report: A_RELEASED_REPORT, waitsAreReadOnTheirOwn: true };
const blockersTile = async (reader: readonly [string, string]) => (await boardAs(HIDDEN, reader[0], reader[1])).quickRead.find((t: any) => t.label === 'Blockers');

describe('the Blockers tile on the board, where people see only themselves', () => {
  it('Ngozi, with no wait of her own, as Sunday had none, reads that nothing holds her up, never Femi\'s bank statements', async () => {
    const noWaitOfHers: Setup = { ...HIDDEN, dependencies: (HIDDEN.dependencies ?? []).filter((d: any) => d.fromParticipantId !== 'p-ngozi') };
    const t = (await boardAs(noWaitOfHers, ...NGOZI)).quickRead.find((x: any) => x.label === 'Blockers');
    expect(t.value).toBe('None');
    expect(JSON.stringify(t)).not.toMatch(/bank statements/);
  });

  it('Ngozi reads her own wait, never Femi\'s bank statements', async () => {
    const t = await blockersTile(NGOZI);
    expect(JSON.stringify(t)).not.toMatch(/bank statements/);
    expect(t.sub).toMatch(/a date for the credit decision/);
  });

  it('Femi reads his own wait', async () => {
    const t = await blockersTile(FEMI);
    expect(t.sub).toMatch(/bank statements/);
    expect(JSON.stringify(t)).not.toMatch(/credit decision/);
  });

  it('Bisi, who runs it, and Juma, an admin who only reads, read the team\'s waits', async () => {
    /* The one hard blocker, Femi's, which the tile counts. The header names Ngozi's wait, which nobody called blocking,
       so the tile keeps its own (item 21: a count of hard blockers names a hard blocker). */
    expect((await blockersTile(BISI)).sub).toBe('Work is held up by the bank statements.');
    expect((await blockersTile(JUMA)).sub).toBe('Work is held up by the bank statements.');
    expect((await blockersTile(BISI)).value).toBe('1');
  });
});
