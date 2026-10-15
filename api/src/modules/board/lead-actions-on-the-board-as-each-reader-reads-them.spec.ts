import { GroundScenario } from '@prisma/client';
import { BISI, FEMI, JUMA, KWAME, SALES_RUN, SETUP_ADMIN, boardAs, type Setup } from './the-switchboards-sections-harness';

/**
 * LEAD ACTIONS, AS EACH READER READS THEM (request 70, the switchboard's "Lead actions": what the lead
 * needs to do). From the record only, on the sales run: somebody waiting on the lead, a wait nobody was
 * named to provide, a goal the lead has not told the person about, and what the lead committed to that
 * nobody has said happened. Only for whoever runs the check-in: a participant never reads the lead's list.
 */
const says = (b: any) => (b.leadActions ?? []).map((a: any) => a.says);
const WITH_AN_UNTOLD_GOAL: Setup = {
  ...SALES_RUN,
  personObjectives: [{ participantId: 'p-kwame', text: 'Kwame gets 14 approved facilities this quarter.', awareness: 'NOT_TOLD', authoredBy: 'lead', createdAt: new Date('2026-09-01T09:00:00Z') }],
};

describe('Lead actions, as each person reads them', () => {
  it('Bisi, who runs it, reads what she needs to do, as "you", each with the facts behind it', async () => {
    const b = await boardAs(WITH_AN_UNTOLD_GOAL, ...BISI);
    expect(says(b)).toEqual([
      'You need to get back to Kwame Mensah, who is waiting on you for the approval of five applications.',
      'You need to find out who can provide the bank statements that Femi Okonkwo is waiting for, because nobody has been named yet.',
      'You need to talk Kwame Mensah through a goal you set for this work, because Kwame Mensah has not been told about it yet.',
      'In session 2, you said, "I\'ll follow up directly with the committee members." Nobody has said yet whether it happened.',
    ]);
    expect(b.leadActions[0].because).toBe('It was first said on 16 September. Nobody has said what has been tried. No time has been given for it.');
    /* The goal's own words and number stay with the lead's goals, not on this list. */
    expect(JSON.stringify(b.leadActions)).not.toContain('14 approved');
  });

  it('the admin who set it up reads the same list with Bisi named, and never the goal Bisi has not told Kwame about', async () => {
    const b = await boardAs({ ...WITH_AN_UNTOLD_GOAL, createdByUserId: 'u-setup' }, ...SETUP_ADMIN);
    expect(says(b)[0]).toBe('Bisi Adeyemi needs to get back to Kwame Mensah, who is waiting on Bisi Adeyemi for the approval of five applications.');
    expect(says(b).join(' ')).not.toMatch(/goal/);
  });

  it('an admin who only reads an ordinary check-in reads it with Bisi named, without the untold goal', async () => {
    const b = await boardAs(WITH_AN_UNTOLD_GOAL, ...JUMA);
    expect(says(b)).toHaveLength(3);
    expect(says(b)[1]).toBe('Bisi Adeyemi needs to find out who can provide the bank statements that Femi Okonkwo is waiting for, because nobody has been named yet.');
  });

  it('a participant reads no lead actions at all, not even the one about them', async () => {
    expect((await boardAs(WITH_AN_UNTOLD_GOAL, ...KWAME)).leadActions).toBeUndefined();
    expect((await boardAs(WITH_AN_UNTOLD_GOAL, ...FEMI)).leadActions).toBeUndefined();
  });

  it('on an evaluation check-in, an admin with no access reads nothing, and the person reviewed reads no lead actions', async () => {
    const evaluation: Setup = { ...WITH_AN_UNTOLD_GOAL, scenario: GroundScenario.PIP, createdByUserId: 'u-bisi' };
    const asJuma = await boardAs(evaluation, ...JUMA).then((b) => b, (e) => e);
    expect(asJuma.leadActions).toBeUndefined();
    expect((await boardAs(evaluation, ...KWAME)).leadActions).toBeUndefined();
    expect(says(await boardAs(evaluation, ...BISI))).toHaveLength(4);
  });

  it('is left out, rather than served empty, when the record holds nothing for the lead to do', async () => {
    expect((await boardAs({ ...SALES_RUN, commitments: [], dependencies: [] }, ...BISI)).leadActions).toBeUndefined();
  });

  it('no sentence rates or labels a person', async () => {
    const all = JSON.stringify((await boardAs(WITH_AN_UNTOLD_GOAL, ...BISI)).leadActions);
    expect(all).not.toMatch(/at risk|unreliable|poor|weak|score|rating|verdict|slow|behind|underperform/i);
  });
});
