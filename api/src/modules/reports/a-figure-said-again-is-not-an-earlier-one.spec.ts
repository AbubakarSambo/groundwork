import { factsAbout } from './the-facts-about-a-person';

/**
 * A FIGURE SAID AGAIN IN THE LATEST SESSION IS NOT AN EARLIER ONE (engine test, Drop Access, Kevin).
 *
 * Kevin said "Kilele Hotel bought 40 units" in sessions 2, 3, 4 and 6, and in session 6 also "Savannah Cafe paid the deposit for the
 * 6 units". The team report said "Kevin Omondi first reported 40 units sold, but their latest update is on a 6-unit sale, and the
 * 40-unit sale is no longer mentioned." The facts the report is written from are read here as the model receives them.
 */
const line = (session: number, text: string) => ({ text, type: 'PROGRESS', session, week: '2026-10-12' });
const kevin = {
  participantId: 'p-kevin', label: 'Kevin Omondi', isLead: false, targets: [],
  said: [
    line(2, 'Kilele Hotel bought 40 units, KES 200,000, paid by M-Pesa.'),
    line(3, 'Kilele Hotel bought 40 units, KES 200,000. It is a done deal.'),
    line(4, 'Kilele Hotel bought 40 units.'),
    line(6, 'Savannah Cafe paid the deposit for the 6 units.'),
    line(6, 'Kilele Hotel bought 40 units, paid by M-Pesa, code QJK4TL2MX9.'),
  ],
};

describe("Kevin's facts, for the team report", () => {
  it('do not give the 40 units as an earlier figure he no longer says', () => {
    const f: any = factsAbout(kevin as any, 6);
    expect(f.anEarlierFigureTheyGave ?? null).toBeNull();
  });
  it('but a figure that really changed is still given as earlier: 40 then 30 for Kilele', () => {
    const changed = { ...kevin, said: [line(4, 'Kilele Hotel bought 40 units.'), line(6, 'Kilele Hotel took 30 units in the end.')] };
    expect((factsAbout(changed as any, 6) as any).anEarlierFigureTheyGave).toContain('40 units');
  });
});
