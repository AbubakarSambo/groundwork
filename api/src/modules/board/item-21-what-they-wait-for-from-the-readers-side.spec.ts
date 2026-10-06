import { boardAs, answered, handoff, A_RELEASED_REPORT, AMINA, RUKIA, JUMA } from './the-switchboards-sections-harness';
import { aThingInTheirOwnWords } from './a-holder-in-their-own-words';

/**
 * ITEM 21, THE ASSET LOANS BOARD: WHAT A PERSON WAITS FOR IS SAID FROM THE READER'S SIDE.
 *
 * "Asset loan cohort, first repayment cycle" (local test database, 65e21dbe): Musa read "You cannot move on
 * the grinding machine I was approved for until it comes from the field officer." and "You are waiting on
 * your organization for this loan cleared from my name." Amaka, who runs it, read "Musa Danjuma is waiting
 * on the field officer for the grinding machine I was approved for".
 */
const setup = {
  checkIns: [answered('p-rukia', 1), answered('p-baraka', 1)],
  dependencies: [handoff('d-1', 'p-rukia', 'the grinding machine I was approved for', { onLabel: 'the field officer', status: 'BLOCKING' })],
};
const texts = async (reader: readonly [string, string]) => JSON.stringify(await boardAs(setup as any, ...reader));

describe('what Rukia waits for, as each reader reads it', () => {
  it('Rukia reads "you were approved for"', async () => {
    const t = await texts(RUKIA);
    expect(t).toContain('the grinding machine you were approved for');
    expect(t).not.toContain('I was approved for');
  });
  it.each([['Amina, who runs it', AMINA], ['Juma, an admin', JUMA]])('%s reads "they were approved for"', async (_w, reader) => {
    const t = await texts(reader as readonly [string, string]);
    expect(t).toContain('Rukia Mwangi is waiting on the field officer for the grinding machine they were approved for.');
    expect(t).not.toContain('I was approved for');
  });
  it('the words', () => {
    expect(aThingInTheirOwnWords('this loan cleared from my name', true)).toBe('this loan cleared from your name');
    expect(aThingInTheirOwnWords('this loan cleared from my name', false)).toBe('this loan cleared from their name');
    expect(aThingInTheirOwnWords('the price list', false)).toBe('the price list');
  });
});

describe('the Blockers tile, on the same wait', () => {
  /* Amaka read "The grinding machine I was approved for. 1 more is holding work up." as if it were a sentence. */
  const onTheTile = { ...setup, report: A_RELEASED_REPORT, waitsAreReadOnTheirOwn: true,
    dependencies: setup.dependencies.map((d: any) => ({ ...d, sourceCheckInId: 'c1-p-rukia' })) };
  it.each([['Amina, who runs it', AMINA], ['Juma, an admin', JUMA]])('%s reads it as a thing held up', async (_w, reader) => {
    const t = ((await boardAs(onTheTile as any, ...(reader as readonly [string, string]))).quickRead ?? []).find((x: any) => x.label === 'Blockers');
    expect(t.sub).toMatch(/^Work is held up by the grinding machine they were approved for/);
  });
  it('Rukia reads it as hers', async () => {
    const t = ((await boardAs(onTheTile as any, ...RUKIA)).quickRead ?? []).find((x: any) => x.label === 'Blockers');
    expect(t.sub).toMatch(/^Work is held up by the grinding machine you were approved for/);
  });
});
