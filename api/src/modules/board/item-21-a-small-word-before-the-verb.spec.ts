import { boardAs, AMINA, RUKIA, JUMA } from './the-switchboards-sections-harness';

/**
 * ITEM 21, THE SUPPORT DESK BOARD: A SMALL WORD BETWEEN "I" AND THE VERB STAYS AS IT IS.
 *
 * "First ninety days managing the team he was on" (local test database, f46133fb): every reader read
 * Daniel's own aim as "Daniel Park stills do about 30 of those a week myself. Daniel Park set this aim."
 * The verb taken to agree with his name was "still", and "myself" was left in a sentence about him.
 */
const OBJECTIVES = [{
  id: 'o-1', groundId: 'g-1', name: 'I still do about 30 of those a week myself.', target: 30, count: 0, prevCount: 0,
  ownerParticipantId: 'p-rukia', setByParticipantId: 'p-rukia', direction: null, isADecisionAboutAPerson: false, sortOrder: 1, addedAtSession: null, assumes: [],
}];
const name = async (reader: readonly [string, string]) => ((await boardAs({ objectives: OBJECTIVES, whoSeesTargets: 'EVERYBODY' } as any, ...reader)).objectives ?? [])[0]?.name;

describe('an aim said with a small word before its verb, as each reader reads it', () => {
  it('Amina, who runs it, reads it with the verb mended and no "myself"', async () => {
    expect(await name(AMINA)).toBe('Rukia Mwangi still does about 30 of those a week. Rukia Mwangi set this aim.');
  });
  it('Rukia, whose aim it is, reads it as hers', async () => {
    const n = await name(RUKIA);
    expect(n).toMatch(/^You still do about 30 of those a week\./);
    expect(n).not.toMatch(/stills|myself/);
  });
  it('Juma, an admin, reads what Amina reads', async () => {
    expect(await name(JUMA)).toBe(await name(AMINA));
  });
});
