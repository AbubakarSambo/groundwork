import { GroundScenario } from '@prisma/client';
import { BISI, FEMI, JUMA, KWAME, SALES_RUN, SETUP_ADMIN, boardAs, type Setup } from './the-switchboards-sections-harness';

/**
 * OBLIGATIONS, AS EACH READER READS THEM (request 70, the switchboard's "Obligations": what each side
 * promised the other). One side per person, then each party outside the check-in somebody is waiting on,
 * with what that side committed to and what the others are still waiting on it for. Built from the work
 * plan and the open waits, under the same walls, on the sales run's own words.
 */
const sides = (b: any) => (b.obligations ?? []).map((s: any) => s.who);
const side = (b: any, who: string) => (b.obligations ?? []).find((s: any) => s.who === who);
const FEMIS = 'In check-in 2, Femi Okonkwo said, "I will visit a few of them again this week to see if I can collect the statements myself." Nobody has said yet whether it happened.';

describe('Obligations, as each person reads them', () => {
  it('Bisi, who runs it, reads every side, her own as "You", and the party outside the check-in', async () => {
    const b = await boardAs(SALES_RUN, ...BISI);
    expect(sides(b)).toEqual(['You', 'Femi Okonkwo', 'Ngozi Eze', 'Kwame Mensah', 'Mr. Adebayo']);
    expect(side(b, 'You')).toEqual({
      participantId: 'p-bisi', who: 'You',
      promised: ['In check-in 2, you said, "I\'ll follow up directly with the committee members." Nobody has said yet whether it happened.'],
      othersWaitFor: ['Kwame Mensah says the work is waiting on you for the approval of five applications.'],
    });
    expect(side(b, 'Femi Okonkwo').promised).toEqual([FEMIS]);
    expect(side(b, 'Mr. Adebayo')).toEqual({ participantId: null, who: 'Mr. Adebayo', promised: [], othersWaitFor: ['Ngozi Eze is waiting on Mr. Adebayo for a date for the credit decision.'] });
  });

  /*
   * A PERSON WHO CHECKS IN READS ONLY THEIR OWN SIDE (request 105; the prototype's B5, "Only yours"). Before,
   * Femi read every side where people see each other, and the lead's where they do not. A wait he is in on
   * somebody else's side is in his blockers, said to him as his.
   */
  it('Femi, where people see each other, reads only his own side, as "You"', async () => {
    const b = await boardAs(SALES_RUN, ...FEMI);
    expect(sides(b)).toEqual(['You']);
    expect(side(b, 'You').promised[0]).toMatch(/^In check-in 2, you said, "I will visit/);
    expect(JSON.stringify(b.obligations)).not.toMatch(/Bisi|Kwame|Ngozi|Adebayo|committee members/);
  });

  it('where people do not see each other, Femi reads only his own side too, without a wait he is not in', async () => {
    const b = await boardAs({ ...SALES_RUN, peersVisibleToEachOther: false }, ...FEMI);
    expect(sides(b)).toEqual(['You']);
    expect(JSON.stringify(b.obligations)).not.toMatch(/Kwame|Ngozi|Adebayo/);
  });

  it('and Kwame reads the wait on the lead he is in, as "You", among his own blockers', async () => {
    const b = await boardAs({ ...SALES_RUN, peersVisibleToEachOther: false }, ...KWAME);
    expect(side(b, 'Bisi Adeyemi')).toBeUndefined();
    expect(b.blockers.map((x: any) => x.says)).toEqual(['You say the work is waiting on Bisi Adeyemi for the approval of five applications.']);
  });

  it('an admin who only reads an ordinary check-in reads every side, with names', async () => {
    expect(sides(await boardAs(SALES_RUN, ...JUMA))).toEqual(['Bisi Adeyemi', 'Femi Okonkwo', 'Ngozi Eze', 'Kwame Mensah', 'Mr. Adebayo']);
  });

  it('on an evaluation check-in the person reviewed never reads the lead\'s promises or a colleague\'s, the admin who set it up reads all, and an admin with no access reads nothing', async () => {
    const evaluation: Setup = { ...SALES_RUN, scenario: GroundScenario.PIP, createdByUserId: 'u-setup' };
    const asKwame = await boardAs(evaluation, ...KWAME);
    /* A colleague giving a view reads only their own side (request 105). */
    expect(sides(asKwame)).toEqual(['You']);
    expect(JSON.stringify(asKwame.obligations)).not.toMatch(/committee members|Femi|Ngozi/);
    expect(sides(await boardAs(evaluation, ...SETUP_ADMIN))).toHaveLength(5);
    const asJuma = await boardAs(evaluation, ...JUMA).then((b) => b, (e) => e);
    expect(asJuma.obligations).toBeUndefined();
  });

  it('is left out, rather than served empty, when nobody has promised anything and nobody is waiting', async () => {
    expect((await boardAs({ ...SALES_RUN, commitments: [], dependencies: [] }, ...BISI)).obligations).toBeUndefined();
  });

  it('no sentence rates or labels a person', async () => {
    expect(JSON.stringify((await boardAs(SALES_RUN, ...BISI)).obligations)).not.toMatch(/at risk|unreliable|poor|weak|score|rating|verdict|slow|behind/i);
  });
});
