import { anOrganisationToSetUp } from './an-organisation-to-set-up-for-specs';

/**
 * DECISION 85, LEAVE: AN ADMIN SETS UP THE LEAVE PROCESS BY TALKING TO ASK GROUNDWORK.
 *
 * Read as what each person is told, through the real AssistantService and the real SuitesService, over
 * one organisation where only Fatuma is named for any job (she heads Operations). Grace is the admin,
 * Wairimu a lead and Miriam a member. Nothing is set until Grace says yes; then it is written through the
 * same SuitesService methods the Suites page uses, and the rules history keeps it as Grace's change.
 */

const OPENING = 'I will ask you a few questions about how leave requests work, one at a time, and I will not set anything until you say yes. How many days of leave does each person have in a year?';

/** Hafsah's example of decision 85, said the way an admin would say it. */
const GRACES_ANSWERS = [
  'Set up our employee leave process',
  '21',
  'Their manager',
  'Yes, the department head approves it too',
  'Yes',
  'It goes to the department head',
  'Wairimu',
  'Omar',
  'me',
];

const THE_RULES_SAID = [
  'Each person has 21 days of leave a year.',
  'A leave request goes to the person’s manager first.',
  'When the manager has approved it, it goes to the head of the person’s team to approve as well.',
  'It is approved only when the head of the team approves it, and a no from anybody on the way ends it.',
  'If the person has no manager in Groundwork, it goes to the head of the person’s team instead.',
  'If nobody is named as the head of the person’s team, it goes to an admin instead.',
  'Wairimu heads Finance, Fatuma heads Operations, and Omar heads Sales.',
  'Grace, who looks after HR, sees every leave request on the leave board, when it is asked for and when it is decided.',
  'If the manager has not answered after two working days, or is on leave that day, it goes to the head of the person’s team.',
  'If the head of the team has not answered after two working days, or is on leave that day, it goes to an admin.',
].join(' ');

const SAID_BACK = `Here is how leave requests will work. Leave requests will be switched on. ${THE_RULES_SAID} Shall I set it up like this? Nothing changes until you say yes.`;

describe('Grace, an admin, sets up the leave process by talking', () => {
  it('is asked only what is missing, one question at a time, in plain words', async () => {
    const o = anOrganisationToSetUp();
    expect(await o.talk('u-grace', GRACES_ANSWERS)).toEqual([
      OPENING,
      'Who approves annual leave?',
      'Does anybody approve it after the manager, for example the head of the person’s team? You can say no.',
      'Does HR need to see all requests?',
      "What happens if the manager doesn't respond within two working days?",
      'Who heads Finance? You can say nobody yet.',
      'Who heads Sales? You can say nobody yet.',
      'Who looks after HR? You can say nobody yet.',
      SAID_BACK,
    ]);
    /* Nothing is written before the yes. */
    expect(o.writes).toEqual([]);
    expect(o.changes).toEqual([]);
  });

  it('on her yes, it is written through the Suites service, and she reads back exactly what she agreed to', async () => {
    const o = anOrganisationToSetUp();
    await o.talk('u-grace', GRACES_ANSWERS);
    const done = await o.says('u-grace', 'yes');
    expect(done).toBe(`I have set it up, and leave requests are switched on. ${THE_RULES_SAID} You can change any of it by telling me, or on the Suites page.`);

    /* What is stored, read through the same service the Suites page reads. */
    const grace = o.as('u-grace');
    const page: any = await o.suites.forReader(grace);
    const leave = page.groups.flatMap((g: any) => g.suites).find((s: any) => s.key === 'leave');
    expect(leave).toMatchObject({ on: true, answers: { days: 21, approver: 'Their manager' } });
    const steps = (await o.suites.workflows(grace)).suites.find((s) => s.key === 'leave')!;
    expect(steps).toMatchObject({ set: true, steps: [['manager', 'departmentHead', 'admin'], ['departmentHead', 'admin']], escalateAfter: 2 });
    expect((await o.suites.leaveRules(grace)).rules).toEqual({ tellHr: 'every' });
    expect((await o.suites.duties(grace)).said).toEqual(['Grace Achieng looks after HR.', 'Wairimu Kamau heads Finance.', 'Fatuma Hassan heads Operations.', 'Omar Said heads Sales.']);

    /* What was said back is what is stored: the same sentences, read again from the store. */
    expect((await o.assistant.theSetUpAsStored(grace, 'leave')).join(' ')).toBe(THE_RULES_SAID);
  });

  it('the rules history keeps every part as Grace’s change', async () => {
    const o = anOrganisationToSetUp();
    await o.talk('u-grace', [...GRACES_ANSWERS, 'yes']);
    expect(o.changes.map((c) => [c.suite, c.changedById])).toEqual([
      ['leave', 'u-grace'], ['duties', 'u-grace'], ['workflows', 'u-grace'], ['leaveRules', 'u-grace'],
    ]);
    const history = await o.suites.rulesHistory(o.as('u-grace'));
    expect(history.changes.map((c) => c.said)).toEqual([
      'Grace changed the leave rules on 3 October.',
      'Grace changed the approval steps on 3 October.',
      'Grace changed who holds each duty on 3 October.',
      'Grace switched on leave requests on 3 October.',
    ]);
  });

  it('a no before the yes changes nothing', async () => {
    const o = anOrganisationToSetUp();
    await o.talk('u-grace', GRACES_ANSWERS);
    expect(await o.says('u-grace', 'no')).toBe('I have not set up leave requests. Nothing has changed.');
    expect(o.writes).toEqual([]);
    expect(o.changes).toEqual([]);
    /* And a yes afterwards is not read as agreeing to it. */
    expect(o.proposals.filter((p) => p.state === 'PARKED')).toEqual([]);
  });

  it('a change before the yes is said back again and changes nothing until the yes', async () => {
    const o = anOrganisationToSetUp();
    await o.talk('u-grace', GRACES_ANSWERS);
    const changed = await o.says('u-grace', 'make it three working days');
    expect(changed).toBe(`I have changed that. ${SAID_BACK.replace(/two working days/g, 'three working days')}`);
    const hr = await o.says('u-grace', 'HR only needs to see the approved ones');
    expect(hr).toContain('Grace, who looks after HR, sees each approved leave request on the leave board.');
    expect(o.writes).toEqual([]);
    expect(await o.says('u-grace', 'yes')).toContain('If the manager has not answered after three working days');
    expect((await o.suites.workflows(o.as('u-grace'))).suites.find((s) => s.key === 'leave')!.escalateAfter).toBe(3);
    expect((await o.suites.leaveRules(o.as('u-grace'))).rules).toEqual({ tellHr: 'approved' });
  });

  it('stopping part way changes nothing', async () => {
    const o = anOrganisationToSetUp();
    await o.talk('u-grace', GRACES_ANSWERS.slice(0, 3));
    expect(await o.says('u-grace', 'stop')).toBe('I have stopped setting up leave requests. Nothing has changed.');
    expect(o.writes).toEqual([]);
  });

  it('a person named for approving is set by the job they hold, and asked about when they hold none', async () => {
    const o = anOrganisationToSetUp();
    const replies = await o.talk('u-grace', ['Set up our employee leave process', '25', 'Omar', 'He looks after finance', 'No', 'No']);
    expect(replies[2]).toBe('I set who approves by their job, not by name, so it keeps working when people change jobs. Which job does Omar do here? For example, does Omar head a team, hold a team’s budget, look after HR, look after finance, or is Omar the chief executive?');
    expect(replies[3]).toBe('Does anybody approve it after Omar, for example the head of the person’s team? You can say no.');
    expect(replies[5]).toBe("What happens if Omar doesn't respond within two working days?");
    const said = await o.says('u-grace', 'It waits');
    expect(said).toBe([
      'Here is how leave requests will work. Leave requests will be switched on.',
      'Each person has 25 days of leave a year.',
      'A leave request goes to Omar, who looks after finance.',
      'If nobody is named to look after finance, it goes to an admin instead.',
      'HR is not shown leave requests.',
      'If somebody does not answer, it waits for them. Groundwork does not pass it on by itself.',
      'Shall I set it up like this? Nothing changes until you say yes.',
    ].join(' '));
    await o.says('u-grace', 'yes');
    expect((await o.suites.duties(o.as('u-grace'))).said).toContain('Omar Said looks after finance.');
    expect((await o.suites.workflows(o.as('u-grace'))).suites.find((s) => s.key === 'leave')!.steps).toEqual([['finance', 'admin']]);
  });

  it('a different approver only for longer leave is said plainly to be something it cannot set yet', async () => {
    const o = anOrganisationToSetUp();
    const r = await o.talk('u-grace', ['Set up our employee leave process', '21', 'Their manager', 'What about leave longer than 10 working days?']);
    expect(r[3]).toBe('I cannot yet set a different approver only for longer leave. I can have somebody approve every leave request after the first person, or nobody. Who should approve it after them, if anybody? You can say no.');
    expect(o.writes).toEqual([]);
  });

  it('when leave is already on, the days already set are not asked again', async () => {
    const o = anOrganisationToSetUp({ suites: { leave: { isOn: true, answers: { days: 18, approver: 'Their manager' } } } });
    expect(await o.says('u-grace', 'set up leave requests')).toBe('I will ask you a few questions about how leave requests work, one at a time, and I will not set anything until you say yes. Who approves annual leave?');
  });
});

describe('somebody who is not an admin asks to set up the leave process', () => {
  it.each([['Wairimu, a lead', 'u-wairimu'], ['Miriam, a member', 'u-miriam']])('%s is told plainly that an admin sets it up, and nothing is changed', async (_who, userId) => {
    const o = anOrganisationToSetUp();
    expect(await o.says(userId, 'Set up our employee leave process')).toBe(
      'Only an admin can set up how leave requests work in your organisation, so I have not changed anything. If you would like it set up or changed, you could ask Grace, who is an admin here.',
    );
    expect(o.proposals).toEqual([]);
    expect(o.writes).toEqual([]);
    /* And a yes afterwards sets nothing. */
    await o.says(userId, 'yes');
    expect(o.writes).toEqual([]);
  });
});

describe('what is not setting up leave', () => {
  it.each(['set up a check-in about our leave process', 'what is our leave policy', 'change my leave to Friday'])('"%s" is not taken', async (m) => {
    const o = anOrganisationToSetUp();
    await o.says('u-grace', m).catch(() => undefined);
    expect(o.proposals.filter((p) => String(p.kind).startsWith('suite_setup'))).toEqual([]);
  });
});
