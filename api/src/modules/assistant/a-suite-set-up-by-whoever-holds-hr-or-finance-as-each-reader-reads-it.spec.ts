import { anOrganisationToSetUp, theOpening, theSaidBack } from './an-organisation-to-set-up-for-specs';
import { THE_POLICY, THE_POLICY_ASKED, THE_POLICY_RULES } from './the-leave-policy-asked-for-specs';

/**
 * DECISION 85: "The company/admin/HR/finance lead sets up the rules once." Whoever holds the HR duty sets
 * up leave and performance reviews by talking to Ask Groundwork; whoever holds the finance duty sets up
 * spending and time sheets. An admin sets up all of them, as before. Who holds each duty is still named
 * by an admin only.
 *
 * Read as each person is told it, through the real AssistantService and SuitesService. Baridi
 * Appliances, 3 October 2026: Grace is the admin. Miriam, a member, looks after HR. Omar, a member,
 * looks after finance. Fatuma heads Operations. Wairimu is a lead with no duty.
 */

const DUTIES = { duties: { isOn: false, answers: { departmentHeads: { Operations: 'u-fatuma' }, hr: 'u-miriam', finance: 'u-omar' } } };

const MIRIAMS_RULES = [
  'Each person has 21 days of leave a year.',
  /* The leave policy's questions (Hafsah, 20 November 2026), answered and said back. */
  ...THE_POLICY_RULES,
  'A leave request of up to ten working days goes to the person’s manager.',
  'If the person has no manager in Groundwork, it goes to an admin instead.',
  'A leave request of more than ten working days goes to the person’s manager first.',
  'When the manager has approved it, it goes to the head of the person’s team to approve as well.',
  'It is approved only when the head of the team approves it, and a no from anybody on the way ends it.',
  'If nobody is named as the head of the person’s team, it goes to an admin instead.',
  'Fatuma heads Operations.',
  'Nobody is named as the head of Finance and Sales yet, so for people in those teams that part goes to the next person on the list.',
  'Only an admin can name who holds each job.',
  /* Said to Miriam, who looks after HR: she is "you", never "Miriam". */
  'You look after HR, so you see every leave request on the leave board, when it is asked for and when it is decided.',
  'If somebody does not answer, it waits for them. Groundwork does not pass it on by itself.',
];
const MIRIAMS_SAID = MIRIAMS_RULES.join(' ');

describe('Miriam, who looks after HR, sets up the leave process', () => {
  it('is asked only what is missing, never who holds a job, and reads it said back', async () => {
    const o = anOrganisationToSetUp({ suites: DUTIES });
    const r = await o.talk('u-miriam', ['Set up our employee leave process', '21', 'Their manager', "If it's more than 10 working days, the department head also approves", 'Yes', 'It waits', ...THE_POLICY]);
    expect(r).toEqual([
      /* Changed 20 November 2026: the opening offers to work from a written policy, and the say-back lists one rule a line (Hafsah's screenshots). */
      theOpening('leave requests', 'How many days of leave does each person have in a year?'),
      'Who approves annual leave?',
      'Does anybody approve it after the manager, for example the head of the person’s team? You can say no.',
      'Does HR need to see all requests?',
      "What happens if the manager doesn't respond within two working days?",
      ...THE_POLICY_ASKED,
      theSaidBack('Here is how leave requests will work. Leave requests will be switched on.', MIRIAMS_RULES),
    ]);
    expect(o.writes).toEqual([]);
  });

  it('on her yes it is written as her change, and who holds each duty is not touched', async () => {
    const o = anOrganisationToSetUp({ suites: DUTIES });
    await o.talk('u-miriam', ['Set up our employee leave process', '21', 'Their manager', "If it's more than 10 working days, the department head also approves", 'Yes', 'It waits', ...THE_POLICY]);
    expect(await o.says('u-miriam', 'yes')).toBe(`I have set it up, and leave requests are switched on. ${MIRIAMS_SAID} You can change any of it by telling me, or on the Suites page.`);
    expect(o.changes.map((c) => [c.suite, c.changedById])).toEqual([['leave', 'u-miriam'], ['workflows', 'u-miriam'], ['leaveRules', 'u-miriam']]);
    expect(o.writes).not.toContain('duties');
    expect((await o.suites.rulesHistory(o.as('u-grace'))).changes.map((c) => c.said)).toEqual([
      'Miriam changed the leave rules on 3 October.',
      'Miriam changed the approval steps on 3 October.',
      'Miriam switched on leave requests on 3 October.',
    ]);
  });

  it('Grace, the admin, reads Miriam by name where Miriam reads "you"', async () => {
    const o = anOrganisationToSetUp({ suites: DUTIES });
    await o.talk('u-miriam', ['Set up our employee leave process', '21', 'Their manager', "If it's more than 10 working days, the department head also approves", 'Yes', 'It waits', ...THE_POLICY, 'yes']);
    const toMiriam = (await o.assistant.theSetUpAsStored(o.as('u-miriam'), 'leave')).join(' ');
    expect(toMiriam).toBe(MIRIAMS_SAID);
    expect(toMiriam).not.toMatch(/Miriam/);
    const toGrace = (await o.assistant.theSetUpAsStored(o.as('u-grace'), 'leave')).join(' ');
    expect(toGrace).toContain('Miriam, who looks after HR, sees every leave request on the leave board, when it is asked for and when it is decided.');
    expect(toGrace).not.toContain('You look after HR');
  });

  it('naming a person who holds no job is answered plainly: only an admin says who holds each job', async () => {
    const o = anOrganisationToSetUp({ suites: DUTIES });
    const r = await o.talk('u-miriam', ['Set up our employee leave process', '21', 'Kamau']);
    expect(r[2]).toBe('I set who approves by their job, not by name, so it keeps working when people change jobs. Kamau holds no job in Groundwork yet, and only an admin can say who holds each job. Who should approve it instead? For example, “the person’s manager”, “the head of their team”, “HR”, “finance” or “an admin”.');
    /* Naming a person who holds a job works by that job. */
    /* The example is never the job that already approves it first. */
    expect(await o.says('u-miriam', 'Fatuma')).toBe('Does anybody approve it after the head of the team, for example HR? You can say no.');
  });

  it('sets up performance reviews too', async () => {
    const o = anOrganisationToSetUp({ suites: DUTIES });
    await o.talk('u-miriam', ['Set up performance reviews', 'every 12 months', 'their manager']);
    expect(await o.says('u-miriam', 'yes')).toContain('I have set it up, and performance reviews are switched on.');
  });

  it('asking to set up spending is told who may', async () => {
    const o = anOrganisationToSetUp({ suites: DUTIES });
    expect(await o.says('u-miriam', 'Set up our expenses process')).toBe(
      'Only an admin or Omar, who looks after finance, can set up how spending requests work in your organisation, so I have not changed anything. If you would like it set up or changed, you could ask Omar, or Grace, who is an admin here.',
    );
    expect(o.writes).toEqual([]);
  });
});

describe('Omar, who looks after finance, sets up time sheets', () => {
  it('is asked what is missing, and on his yes it is written as his change', async () => {
    const o = anOrganisationToSetUp({ suites: DUTIES });
    const r = await o.talk('u-omar', ['Set up timesheets', 'Atlas, Internal', 'Their manager', 'No', '40', 'Friday at 17:00', 'It waits']);
    /* Changed 20 November 2026: the opening offers to work from a written policy, and the say-back lists one rule a line (Hafsah's screenshots). */
    expect(r[r.length - 1]).toBe(theSaidBack('Here is how time sheets will work. Time sheets will be switched on.', [
      'People give their hours for Atlas and Internal, each week.',
      'A week of hours goes to the person’s manager.',
      'If the person has no manager in Groundwork, it goes to an admin instead.',
      'Each person is asked for 40 hours a week.',
      'The hours for each week are due by Friday at 17:00, Lagos time.',
      'If somebody does not answer, it waits for them. Groundwork does not pass it on by itself.',
    ]));
    await o.says('u-omar', 'yes');
    expect(o.changes.map((c) => [c.suite, c.changedById])).toEqual([['time', 'u-omar'], ['workflows', 'u-omar'], ['timeRules', 'u-omar']]);
  });

  it('asking to set up leave is told who may', async () => {
    const o = anOrganisationToSetUp({ suites: DUTIES });
    expect(await o.says('u-omar', 'Set up our employee leave process')).toBe(
      'Only an admin or Miriam, who looks after HR, can set up how leave requests work in your organisation, so I have not changed anything. If you would like it set up or changed, you could ask Miriam, or Grace, who is an admin here.',
    );
  });
});

describe('Wairimu, a lead with no duty', () => {
  it.each([
    ['Set up our employee leave process', 'Only an admin or Miriam, who looks after HR, can set up how leave requests work in your organisation, so I have not changed anything. If you would like it set up or changed, you could ask Miriam, or Grace, who is an admin here.'],
    ['Set up timesheets', 'Only an admin or Omar, who looks after finance, can set up how time sheets work in your organisation, so I have not changed anything. If you would like it set up or changed, you could ask Omar, or Grace, who is an admin here.'],
  ])('"%s" is answered with who may, and nothing is parked or changed', async (asked, told) => {
    const o = anOrganisationToSetUp({ suites: DUTIES });
    expect(await o.says('u-wairimu', asked)).toBe(told);
    expect(o.proposals).toEqual([]);
    expect(o.writes).toEqual([]);
  });
});

describe('a duty that changes part way', () => {
  it('when Miriam stops looking after HR before her yes, the yes sets nothing', async () => {
    const o = anOrganisationToSetUp({ suites: DUTIES });
    await o.talk('u-miriam', ['Set up performance reviews', 'every 12 months', 'their manager']);
    o.rows.duties.answers = { departmentHeads: { Operations: 'u-fatuma' } };
    expect(await o.says('u-miriam', 'yes')).toBe(
      'Only an admin or whoever looks after HR can set up how performance reviews work in your organisation, so I have not changed anything. If you would like it set up or changed, you could ask Grace, who is an admin here.',
    );
    expect(o.writes).toEqual([]);
  });
});
