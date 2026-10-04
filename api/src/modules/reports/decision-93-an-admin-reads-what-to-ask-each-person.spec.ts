import { serviceFor } from './__fixtures__/sales-team-q3-two-sessions';

/**
 * DECISION 93, ROW 9 (5 October 2026): "what to ask each person" on the board, for an admin.
 * Rukia runs "Sales team, Q3". Juma is an admin of the organisation. The board hands the coaching read the
 * word that Juma has access to the check-in; an admin who has no access (a performance plan he was not
 * given) is handed nothing, and a person who only checks in never reads the list for the others.
 */
async function coachingAs(userId: string, adminReadsIt: boolean) {
  const { svc } = serviceFor('sales');
  return svc.coachingForTheBoard('g1', userId, { adminReadsIt });
}

describe('decision 93, row 9: what to ask each person', () => {
  it('Rukia, who runs it, reads it', async () => {
    const lead = await coachingAs('u-rukia', false);
    expect(lead?.eachPerson).toBeTruthy();
  });

  it('Juma, an admin with access, reads the list for the same people, in his own words, with Rukia named', async () => {
    const lead = await coachingAs('u-rukia', false);
    const admin = await coachingAs('u-juma', true);
    const who = (c: any) => (c?.eachPerson ?? []).map((r: any) => r.participantId);
    /* Juma also reads a row for Rukia herself, who answers too; Rukia reads none for herself. */
    expect(who(admin)).toEqual(expect.arrayContaining(who(lead)));
    expect(who(admin).length).toBeGreaterThan(0);
    expect(admin?.yours).toBeNull();
    const said = JSON.stringify(admin?.eachPerson);
    expect(said).toContain('has been waiting on Rukia Otieno');
    expect(said).not.toContain('waiting on you');
  });

  it('an admin the board did not say has access, and a person who checks in, read none of it', async () => {
    expect(await coachingAs('u-juma', false)).toBeNull();
    const amani = await coachingAs('u-amani', false);
    expect(amani?.eachPerson ?? null).toBeNull();
  });
});
