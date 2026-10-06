import { boardAs } from './the-switchboards-sections-harness';
import { review5, REVIEW_5_OBJECTIVES, RUKIA_RUNS_IT, AMANI, BARAKA_M, NEEMA, JUMA_READS, GRACE_SET_IT_UP } from './__fixtures__/sales-board-review-5';
import { theDayKeptApart, anAimAsASentence } from './an-aim-is-a-sentence-about-somebody';
import { theDayTheyMeant } from '../grounds/when-a-handoff-is-due';

/**
 * SCREENS REQUEST 117 (11): A PERSON'S OWN AIM, SAID PLAINLY, WITH ITS NAME AND ITS DAY KEPT APART.
 *
 * Rukia read "Amani Wekesa set an aim of 3 shops in Kilimani by 20 December for their own work." It now reads
 * "Amani Wekesa's own aim is 3 shops in Kilimani by 20 December.", and Amani reads "Your own aim is 3 shops in
 * Kilimani by 20 December." No pronoun is guessed. A new aim keeps "3 shops in Kilimani" as its name and 20
 * December as its date; one stored before, with the day in its name, reads the same.
 */
const SPLIT = REVIEW_5_OBJECTIVES.map((o) => (o.id === 'o-amani' ? { ...o, name: '3 shops in Kilimani', dueOn: new Date('2026-12-20T00:00:00Z') } : o));
const aimOf = (b: any) => (b.objectives ?? []).find((o: any) => o.id === 'o-amani');

describe('request 117 (11): a person\'s own aim', () => {
  for (const [how, objectives] of [['stored with the day in its name', REVIEW_5_OBJECTIVES], ['stored with its day apart', SPLIT]] as const) {
    describe(how, () => {
      it.each([['Rukia, who runs it', RUKIA_RUNS_IT], ['Grace, the admin who set it up', GRACE_SET_IT_UP]])('%s reads it as Amani\'s own aim', async (_who, reader) => {
        const b = await boardAs(review5({ objectives }), reader[0], reader[1]);
        expect(aimOf(b).name).toBe("Amani Wekesa's own aim is 3 shops in Kilimani by 20 December.");
      });

      it('Amani reads it as her own', async () => {
        for (const peersVisibleToEachOther of [true, false]) {
          const b = await boardAs(review5({ objectives, peersVisibleToEachOther }), ...AMANI);
          expect(aimOf(b).name).toBe('Your own aim is 3 shops in Kilimani by 20 December.');
          expect(JSON.stringify(b)).not.toMatch(/for their own work|set an aim of/);
        }
      });

      it.each([['Baraka', BARAKA_M], ['Neema', NEEMA], ['Juma, an admin who only reads', JUMA_READS]])('%s reads it, where sent, as Amani\'s own aim, and never where people do not see each other', async (_who, reader) => {
        const seen = await boardAs(review5({ objectives }), reader[0], reader[1]);
        if (aimOf(seen)) expect(aimOf(seen).name).toBe("Amani Wekesa's own aim is 3 shops in Kilimani by 20 December.");
        const walled = await boardAs(review5({ objectives, peersVisibleToEachOther: false }), reader[0], reader[1]);
        if (reader !== JUMA_READS) expect(aimOf(walled)).toBeUndefined();
      });
    });
  }

  it('nobody reads "for their own work" anywhere on the board', async () => {
    for (const reader of [RUKIA_RUNS_IT, AMANI, BARAKA_M, NEEMA, JUMA_READS, GRACE_SET_IT_UP]) {
      expect(JSON.stringify(await boardAs(review5(), reader[0], reader[1]))).not.toMatch(/for their own work/);
    }
  });

  it('a new aim keeps the thing counted as its name, and the day apart', () => {
    const day = (said: string) => theDayTheyMeant(said, new Date('2026-09-26T10:00:00Z'));
    const kept = theDayKeptApart('3 shops in Kilimani by 20 December', day);
    expect(kept.name).toBe('3 shops in Kilimani');
    expect(kept.dueOn?.toISOString().slice(0, 10)).toBe('2026-12-20');
    expect(theDayKeptApart('Visits to Karen by bike', day)).toEqual({ name: 'Visits to Karen by bike', dueOn: null });
  });

  it('a limit and an aim with no thing to name stay plain', () => {
    expect(anAimAsASentence('Spending on fuel', { speaker: 'Participant A', holder: 'Participant A', target: 500, direction: 'LIMIT', setByTheHolder: true }))
      .toBe("Participant A is keeping spending on fuel to no more than 500. Participant A set this limit.");
  });
});
