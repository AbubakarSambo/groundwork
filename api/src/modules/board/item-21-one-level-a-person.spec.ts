import { PartyType } from '@prisma/client';
import { boardAs, person, answered, JUMA, type Setup } from './the-switchboards-sections-harness';

/**
 * ITEM 21, THE GOVERNMENT PROGRAMME BOARD: "WHAT EACH LEVEL UNDERSTOOD" HAS ONE LEVEL A PERSON, AND "YOU" FOR THE READER.
 *
 * "The rollout across four branches" (local test database, 927dc43a): Stephen, who runs it and checks in
 * too, read his aims under "You" and then his own words again under "Stephen Nwachukwu": "You said, "My
 * responsibility is to ensure the system is deployed ..."" under his own name.
 */
const line = (id: string, participantId: string, type: string, text: string) => ({
  id, participantId, type, text, checkInId: `c1-${participantId}`, recallBased: true, anchoredOrigin: null, anchoredDocumentId: null,
  confirmedAt: null, documentSays: null, documentSaysId: null, createdAt: new Date('2026-09-16T16:00:00Z'), disputedAt: null,
});
const LINES = [
  line('e-stephen', 'p-stephen', 'INTENT', 'My responsibility is to ensure the system is deployed and available for use in my branch.'),
  line('e-musa', 'p-musa', 'SUCCESS_DEFINITION', 'My understanding was that we were meant to get the new system installed.'),
];
const GOV: Setup = {
  kindOfWork: 'a government programme', initiatorId: 'u-lead', label: 'The rollout across four branches',
  people: [{ ...person('p-stephen', 'u-lead', 'Stephen', 'Nwachukwu', PartyType.INITIATOR), managingOnly: false }, person('p-musa', 'u-musa', 'Musa', 'Ibrahim')],
  checkIns: [answered('p-stephen', 1), answered('p-musa', 1)],
  lines: LINES, turns: LINES.map((l) => ({ checkInId: l.checkInId, content: l.text })),
  objectives: [{ id: 'o-1', groundId: 'g-1', name: 'The system is deployed in all four branches.', target: null, count: 0, prevCount: 0, ownerParticipantId: null, setByParticipantId: 'p-stephen', sortOrder: 0, assumes: [] }],
} as any;

describe('what each level understood, when the lead checks in too', () => {
  it('Stephen reads one level that is his, as "you", with his aims and then his own words', async () => {
    const levels = (await boardAs(GOV, 'u-lead', 'MEMBER')).whatEachLevelUnderstood.levels;
    expect(levels.map((l: any) => [l.participantId, l.who])).toEqual([['p-stephen', 'You'], ['p-musa', 'Musa Ibrahim']]);
    expect(levels[0].said).toEqual([
      'The system is deployed in all four branches.',
      'You said, "My responsibility is to ensure the system is deployed and available for use in my branch."',
    ]);
  });
  it('an admin who only reads reads one level for Stephen, with his name', async () => {
    const levels = (await boardAs(GOV, ...JUMA)).whatEachLevelUnderstood.levels;
    expect(levels.map((l: any) => l.who)).toEqual(['Stephen Nwachukwu', 'Musa Ibrahim']);
  });
  it('Musa, who checks in, is served none of it, as before', async () => {
    expect((await boardAs(GOV, 'u-musa', 'MEMBER')).whatEachLevelUnderstood).toBeUndefined();
  });
});
