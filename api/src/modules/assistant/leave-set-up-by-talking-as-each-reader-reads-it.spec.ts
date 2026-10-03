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
  /* Said to Grace, who looks after HR: she is "you", never "Grace". */
  'You look after HR, so you see every leave request on the leave board, when it is asked for and when it is decided.',
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
    expect(hr).toContain('You look after HR, so you see each approved leave request on the leave board.');
    expect(hr).not.toMatch(/Grace/);
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
      'HR is not shown leave requests.',
      'If somebody does not answer, it waits for them. Groundwork does not pass it on by itself.',
      'Shall I set it up like this? Nothing changes until you say yes.',
    ].join(' '));
    await o.says('u-grace', 'yes');
    expect((await o.suites.duties(o.as('u-grace'))).said).toContain('Omar Said looks after finance.');
    expect((await o.suites.workflows(o.as('u-grace'))).suites.find((s) => s.key === 'leave')!.steps).toEqual([['finance', 'admin']]);
  });

  it('Grace, who looks after HR, names herself as the approver and is asked and told as "you"', async () => {
    const o = anOrganisationToSetUp({ suites: { duties: { isOn: false, answers: { departmentHeads: { Operations: 'u-fatuma' }, hr: 'u-grace' } } } });
    const r = await o.talk('u-grace', ['Set up our employee leave process', '21', 'Grace', 'No', 'No', 'Three working days, then an admin']);
    expect(r[2]).toBe('Does anybody approve it after you, for example the head of the person’s team? You can say no.');
    expect(r[4]).toBe("What happens if you don't respond within two working days?");
    expect(r[5]).toBe([
      'Here is how leave requests will work. Leave requests will be switched on.',
      'Each person has 21 days of leave a year.',
      'A leave request goes to you.',
      'You look after HR, so that part comes to you.',
      'HR is not shown leave requests.',
      'If you have not answered after three working days, or are on leave that day, it goes to an admin.',
      'Shall I set it up like this? Nothing changes until you say yes.',
    ].join(' '));
    expect(r.join(' ')).not.toMatch(/Grace/);
  });

  it('the fallback for HR is said only when nobody looks after HR', async () => {
    const nobody = anOrganisationToSetUp();
    const r1 = await nobody.talk('u-grace', ['Set up our employee leave process', '21', 'HR', 'No', 'No', 'It waits', 'Nobody yet']);
    expect(r1[r1.length - 1]).toContain('If nobody is named to look after HR, it goes to an admin instead.');
    const joy = anOrganisationToSetUp({ suites: { duties: { isOn: false, answers: { hr: 'u-miriam' } } } });
    const r2 = await joy.talk('u-grace', ['Set up our employee leave process', '21', 'HR', 'No', 'No', 'It waits']);
    expect(r2[r2.length - 1]).toContain('A leave request goes to Miriam, who looks after HR.');
    expect(r2.join(' ')).not.toContain('If nobody is named to look after HR');
  });

  it('the question after the first approver never offers that same job as its example', async () => {
    const o = anOrganisationToSetUp();
    expect((await o.talk('u-grace', ['Set up our employee leave process', '21', 'The head of their team']))[2])
      .toBe('Does anybody approve it after the head of the team, for example HR? You can say no.');
    /* When every job the example could name already approves it, there is no example. */
    const o2 = anOrganisationToSetUp();
    expect((await o2.talk('u-grace', ['Set up our employee leave process', '21', 'The head of their team, or HR if there is none']))[2])
      .toBe('Does anybody approve it after the head of the team? You can say no.');
  });

  it('when the length of longer leave is said without who approves it, who is asked as a real question', async () => {
    const o = anOrganisationToSetUp();
    const r = await o.talk('u-grace', ['Set up our employee leave process', '21', 'Their manager', 'What about leave longer than 10 working days?']);
    expect(r[3]).toBe('Who approves leave of more than ten working days after the manager?');
    expect(o.writes).toEqual([]);
  });

  it('when who approves longer leave is said without the length, the length is asked', async () => {
    const o = anOrganisationToSetUp();
    const r = await o.talk('u-grace', ['Set up our employee leave process', '21', 'Their manager', 'The head of their team also approves longer leave', '10']);
    expect(r[3]).toBe('How long does leave need to be for that? For example, more than 10 working days.');
    expect(r[4]).toBe('Does HR need to see all requests?');
  });

  it('longer leave said as the first answer: the rest of leave is asked for by its length', async () => {
    const o = anOrganisationToSetUp();
    const r = await o.talk('u-grace', ['Set up our employee leave process', '21', 'Leave of more than 10 days is approved by the head of their team', 'the manager', 'no', 'no', 'it waits', 'nobody yet', 'nobody yet']);
    expect(r[2]).toBe('Who approves leave of up to ten working days?');
    expect(r[8]).toBe([
      'Here is how leave requests will work. Leave requests will be switched on.',
      'Each person has 21 days of leave a year.',
      'A leave request of up to ten working days goes to the person’s manager.',
      'If the person has no manager in Groundwork, it goes to an admin instead.',
      'A leave request of more than ten working days goes to the head of the person’s team.',
      'If nobody is named as the head of the person’s team, it goes to an admin instead.',
      'Fatuma heads Operations.',
      'Nobody is named as the head of Finance and Sales yet, so for people in those teams that part goes to the next person on the list.',
      'HR is not shown leave requests.',
      'If somebody does not answer, it waits for them. Groundwork does not pass it on by itself.',
      'Shall I set it up like this? Nothing changes until you say yes.',
    ].join(' '));
  });

  it('a change before the yes can add, move or drop leave by length, and nothing is written until the yes', async () => {
    const o = anOrganisationToSetUp();
    await o.talk('u-grace', GRACES_ANSWERS);
    const added = await o.says('u-grace', "If it's more than 10 working days, the chief executive also approves");
    expect(added).toBe('I have changed that. Who is the chief executive? You can say nobody yet.');
    const said = await o.says('u-grace', 'nobody yet');
    expect(said).toContain('A leave request of up to ten working days goes to the person’s manager first.');
    expect(said).toContain('When the head of the team has approved it, it goes to the chief executive to approve as well. It is approved only when the chief executive approves it');
    expect(said).toContain('Nobody is named as the chief executive yet, so that part goes to the next person on the list.');
    const longer = await o.says('u-grace', 'make it 15 working days for longer leave');
    expect(longer).toContain('A leave request of more than 15 working days goes to the person’s manager first.');
    const dropped = await o.says('u-grace', 'drop the rule for longer leave');
    expect(dropped).not.toContain('working days goes to');
    expect(o.writes).toEqual([]);
  });

  it('when leave is already on, the days already set are not asked again', async () => {
    const o = anOrganisationToSetUp({ suites: { leave: { isOn: true, answers: { days: 18, approver: 'Their manager' } } } });
    expect(await o.says('u-grace', 'set up leave requests')).toBe('I will ask you a few questions about how leave requests work, one at a time, and I will not set anything until you say yes. Who approves annual leave?');
  });
});

/** Hafsah's own example of decision 85: "If it's more than 10 working days, department head also approves." */
const LONGER_ANSWERS = ['Set up our employee leave process', '21', 'Their manager', "If it's more than 10 working days, the department head also approves", 'Yes', 'It waits', 'Wairimu', 'Omar', 'me'];

const LONGER_SAID = [
  'Each person has 21 days of leave a year.',
  'A leave request of up to ten working days goes to the person’s manager.',
  'If the person has no manager in Groundwork, it goes to an admin instead.',
  'A leave request of more than ten working days goes to the person’s manager first.',
  'When the manager has approved it, it goes to the head of the person’s team to approve as well.',
  'It is approved only when the head of the team approves it, and a no from anybody on the way ends it.',
  'If nobody is named as the head of the person’s team, it goes to an admin instead.',
  'Wairimu heads Finance, Fatuma heads Operations, and Omar heads Sales.',
  /* Said to Grace, who looks after HR: she is "you", never "Grace". */
  'You look after HR, so you see every leave request on the leave board, when it is asked for and when it is decided.',
  'If somebody does not answer, it waits for them. Groundwork does not pass it on by itself.',
].join(' ');

describe('Grace sets up leave by length, as Hafsah said it', () => {
  it('is asked only what is missing, and reads the two lengths said back', async () => {
    const o = anOrganisationToSetUp();
    const r = await o.talk('u-grace', LONGER_ANSWERS);
    expect(r.slice(3)).toEqual([
      'Does HR need to see all requests?',
      "What happens if the manager doesn't respond within two working days?",
      'Who heads Finance? You can say nobody yet.',
      'Who heads Sales? You can say nobody yet.',
      'Who looks after HR? You can say nobody yet.',
      `Here is how leave requests will work. Leave requests will be switched on. ${LONGER_SAID} Shall I set it up like this? Nothing changes until you say yes.`,
    ]);
    expect(o.writes).toEqual([]);
  });

  it('on her yes, the length is kept as a threshold of the leave rules, and she reads back what she agreed to', async () => {
    const o = anOrganisationToSetUp();
    await o.talk('u-grace', LONGER_ANSWERS);
    expect(await o.says('u-grace', 'yes')).toBe(`I have set it up, and leave requests are switched on. ${LONGER_SAID} You can change any of it by telling me, or on the Suites page.`);
    const grace = o.as('u-grace');
    expect((await o.suites.leaveRules(grace)).rules).toEqual({ tellHr: 'every', thresholds: [{ above: 10, steps: [['manager', 'admin'], ['departmentHead', 'admin']] }] });
    expect((await o.suites.workflows(grace)).suites.find((s) => s.key === 'leave')!.steps).toEqual([['manager', 'admin']]);
    expect((await o.assistant.theSetUpAsStored(grace, 'leave')).join(' ')).toBe(LONGER_SAID);
    const history = await o.suites.rulesHistory(grace);
    expect(history.changes[0].details).toContain('This was added. Leave of more than ten working days goes first to the person’s manager, or else an admin, and then to whoever heads their team, or else an admin.');
  });

  it('setting leave up again without a length takes the length away, as the said-back says', async () => {
    const o = anOrganisationToSetUp();
    await o.talk('u-grace', [...LONGER_ANSWERS, 'yes']);
    await o.talk('u-grace', ['Set up our employee leave process', 'Their manager', 'No', 'Yes', 'It waits', 'yes']);
    expect((await o.suites.leaveRules(o.as('u-grace'))).rules).toEqual({ tellHr: 'every' });
  });
});

describe('somebody who is not an admin asks to set up the leave process', () => {
  it.each([['Wairimu, a lead', 'u-wairimu'], ['Miriam, a member', 'u-miriam']])('%s is told plainly that an admin sets it up, and nothing is changed', async (_who, userId) => {
    const o = anOrganisationToSetUp();
    expect(await o.says(userId, 'Set up our employee leave process')).toBe(
      /* Decision 85: an admin or whoever looks after HR sets this up, and nobody is named for HR here. */
      'Only an admin or whoever looks after HR can set up how leave requests work in your organisation, so I have not changed anything. If you would like it set up or changed, you could ask Grace, who is an admin here.',
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
