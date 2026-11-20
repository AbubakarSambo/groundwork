import { boardAs, AMINA, RUKIA, BARAKA } from './the-switchboards-sections-harness';
import { theTargetLines } from '../engagement/the-direct-morning';

/**
 * WHAT PEOPLE SAID THEY HAD DONE IS SERVED BY THE SAME RULE AS THEIR SHARE (cycle 6). The lead reads everybody's, and the line she is
 * told says whose number is whose and that none of it is proven. A person reads their own and nobody else's, and a person's own private
 * aim and the number said against it stay with them and the lead.
 */
const row = (id: string, name: string, n: number, owner: string | null, said: any[]) => ({
  id, groundId: 'g-1', name, target: n, count: 0, prevCount: 0, ownerParticipantId: owner, setByParticipantId: owner,
  direction: null, isADecisionAboutAPerson: false, sortOrder: owner ? 1 : 0, addedAtSession: null, assumes: [], suggestedCount: null, suggestedSaid: null, said,
});
const saidBy = (pid: string, count: number) => ({ participantId: pid, count, said: `I sold ${count} lanterns last week.`, sessionNumber: 6 });
const TEAM = row('o-team', 'solar lanterns sold a week', 30, null, [saidBy('p-rukia', 25), saidBy('p-baraka', 27)]);
const RUKIAS_OWN = row('o-rukia', 'I am aiming for 35 lanterns a week', 35, 'p-rukia', [saidBy('p-rukia', 25)]);

const served = async (who: readonly [string, string]) => (await boardAs({ objectives: [TEAM, RUKIAS_OWN] }, who[0], who[1])).objectives as any[];

describe('what people said they had done, as each reader reads the board', () => {
  it('the lead reads each person\'s number, and the target line says what was said and that none of it is proven', async () => {
    const objs = await served(AMINA);
    const said = objs.flatMap((o) => o.saidBy).map((x: any) => `${x.name}:${x.count}`);
    expect(said).toEqual(expect.arrayContaining(['Rukia Mwangi:25', 'Baraka Otieno:27']));
    const t = theTargetLines({ objectives: objs.map((o: any) => ({ ...o, fromTheDeals: o.ownerParticipantId ? null : { counts: 'units', sold: 0, proven: 0, shown: 0, says: '' } })), workRecords: [] }, new Date('2026-12-14T07:00:00Z'), 'Africa/Nairobi');
    expect(t.lines[0].text).toBe('The team target is 30. Rukia said 25 and Baraka said 27, which is 52 between them, and none of it is on a deal yet, so none of it is proven.');
  });
  it('a person reads only their own number, never a colleague\'s', async () => {
    const baraka = await served(BARAKA);
    expect(JSON.stringify(baraka.flatMap((o) => o.saidBy))).toMatch(/Baraka/);
    expect(JSON.stringify(baraka)).not.toMatch(/Rukia|35 lanterns/);
    const t = theTargetLines({ objectives: baraka.map((o: any) => ({ ...o, fromTheDeals: { counts: 'units', sold: 0, proven: 0, shown: 0, says: '' } })), workRecords: [] }, new Date('2026-12-14T07:00:00Z'), 'Africa/Nairobi');
    expect(t.lines[0].text).toBe('The team target is 30. Baraka said 27, and none of it is on a deal yet, so none of it is proven.');
  });
  it('Rukia\'s private aim and what she said against it reach nobody but her and the lead', async () => {
    expect(JSON.stringify(await served(BARAKA))).not.toMatch(/Rukia/);
    expect(JSON.stringify(await served(RUKIA))).toMatch(/35 lanterns/);
  });
});
