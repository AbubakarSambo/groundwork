import { boardAs, AMINA, RUKIA, JUMA } from './the-switchboards-sections-harness';

/**
 * ITEM 21, THE TRAINING PROGRAMME BOARD: A NAME AND ITS VERB IS A SENTENCE, NOT A THING THE TEAM WORKS ON.
 *
 * "Engagement Director, first 90 days" (local test database, d4b862f4; the trader training programme kind):
 * every reader read "The team is working on david takes ownership of the top client relationships." The
 * aim "David takes ownership of the top client relationships." was read as a thing counted, because
 * "takes" was not among the verbs that make a sentence, and the name lost its capital.
 */
const OBJECTIVES = [{
  id: 'o-1', groundId: 'g-1', name: 'David takes ownership of the top client relationships.', target: null, count: 0, prevCount: 0,
  ownerParticipantId: null, setByParticipantId: 'p-amina', direction: null, isADecisionAboutAPerson: false, sortOrder: 1, addedAtSession: null, assumes: [],
}];
const name = async (reader: readonly [string, string]) => ((await boardAs({ objectives: OBJECTIVES, whoSeesTargets: 'EVERYBODY' } as any, ...reader)).objectives ?? [])[0]?.name;

describe('an aim that is a sentence about somebody, as each reader reads it', () => {
  it.each([['Amina, who set it', AMINA], ['Rukia, who checks in', RUKIA], ['Juma, an admin', JUMA]])('%s reads it as it was set', async (_w, reader) => {
    expect(await name(reader as readonly [string, string])).toBe('David takes ownership of the top client relationships.');
  });
});
