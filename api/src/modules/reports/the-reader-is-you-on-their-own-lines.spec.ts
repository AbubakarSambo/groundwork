import { makeService, theCohort, KWAMES_OWN_WORDS, KWAMES_OWN_DEFINITION_OF_SUCCESS } from './__fixtures__/a-cohort-for-the-session-report';

/**
 * PRIVACY SWEEP 5 OCTOBER 2026, FINDING 8. Yusuf Garba's own session report called him "Yusuf Garba" beside his own line
 * ("Sometimes the roads are bad. And the weather."). It said "You" for nobody. Read through the real service as the reader, a
 * colleague and the lead.
 */
const whoSaid = (served: any, text: string): string[] =>
  (served.sections ?? []).flatMap((s: any) => s.items ?? []).filter((i: any) => i.text === text).map((i: any) => i.who);

describe('whose line it is, in the session report', () => {
  it('Kwame\'s own line is "You" to Kwame, and nobody else\'s is', async () => {
    const served: any = await makeService(theCohort('OKR_ALIGNMENT')).sessionReport('g1', 1, 'user-kwame', 'org-1');
    expect(whoSaid(served, KWAMES_OWN_WORDS)).toEqual(['You']);
    expect(JSON.stringify(served.sections)).not.toContain('Kwame Mensah');
  });

  it('what Kwame said success is reads "You" beside it too', async () => {
    const served: any = await makeService(theCohort('OKR_ALIGNMENT')).sessionReport('g1', 1, 'user-kwame', 'org-1');
    const mine = (served.againstSuccess?.definitions ?? []).filter((d: any) => d.text === KWAMES_OWN_DEFINITION_OF_SUCCESS);
    expect(mine.map((d: any) => d.who)).toEqual(['You']);
  });

  it('the lead reads Kwame by his name, and the lead\'s own lines as "You"', async () => {
    const served: any = await makeService(theCohort('OKR_ALIGNMENT')).sessionReport('g1', 1, 'user-lead', 'org-1');
    expect(whoSaid(served, KWAMES_OWN_WORDS)).toEqual(['Kwame Mensah']);
    expect(JSON.stringify(served.sections)).toContain('"who":"You"');
  });
});
