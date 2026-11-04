import { anOrganisationToSetUp } from './an-organisation-to-set-up-for-specs';

/**
 * DECISION 85, SPENDING: AN ADMIN SETS UP HOW REQUESTS TO SPEND ARE APPROVED BY TALKING TO ASK
 * GROUNDWORK. Approvers by amount and by rule ("up to a limit, the manager and then finance; above it,
 * the head of the team and then the chief executive"), read through the real AssistantService and the
 * real SuitesService. Nothing is set until Grace, the admin, says yes.
 */

const GRACES_ANSWERS = [
  'Set up our spending approvals',
  'Shillings',
  'The manager',
  'Then finance',
  '20,000',
  'The department head, then the CEO',
  'It goes to an admin after three days',
  'Omar',
  'Omar',
  'Wairimu',
  'Grace',
];

const THE_RULES_SAID = [
  'People ask to spend in KES.',
  'A request to spend of up to KES 20,000 goes to the person’s manager first.',
  'When the manager has approved it, it goes to Omar, who looks after finance, to approve as well.',
  'It is approved only when Omar approves it, and a no from anybody on the way ends it.',
  'If the person has no manager in Groundwork, it goes to an admin instead.',
  'A request to spend of more than KES 20,000 goes to the head of the person’s team first.',
  'When the head of the team has approved it, it goes to you to approve as well.',
  'It is approved only when you approve it, and a no from anybody on the way ends it.',
  'If nobody is named as the head of the person’s team, it goes to an admin instead.',
  'Omar heads Finance, Fatuma heads Operations, and Wairimu heads Sales.',
  'You are the chief executive, so that part comes to you.',
  'If the manager has not answered after three working days, or is on leave that day, it goes to an admin.',
  'If Omar has not answered after three working days, or is on leave that day, it goes to an admin.',
  'If the head of the team has not answered after three working days, or is on leave that day, it goes to an admin.',
  'If you have not answered after three working days, or are on leave that day, it goes to an admin.',
].join(' ');

const SAID_BACK = `Here is how spending requests will work. Spending requests will be switched on. ${THE_RULES_SAID} Shall I set it up like this? Nothing changes until you say yes.`;

describe('Grace, an admin, sets up spending approvals by talking', () => {
  it('is asked only what is missing, one question at a time, in plain words', async () => {
    const o = anOrganisationToSetUp();
    expect(await o.talk('u-grace', GRACES_ANSWERS)).toEqual([
      'I will ask you a few questions about how spending requests work, one at a time, and I will not set anything until you say yes. Which currency do people spend in?',
      'Who approves a request to spend?',
      'Does anybody approve it after the manager, for example finance? You can say no.',
      'Up to what amount does a request go this way? Above that amount, somebody else approves it.',
      'Who approves anything above KES 20,000?',
      "What happens if the manager doesn't respond within two working days?",
      'Who looks after finance? You can say nobody yet.',
      'Who heads Finance? You can say nobody yet.',
      'Who heads Sales? You can say nobody yet.',
      'Who is the chief executive? You can say nobody yet.',
      SAID_BACK,
    ]);
    expect(o.writes).toEqual([]);
  });

  it('on her yes, it is written through the Suites service, and she reads back exactly what she agreed to', async () => {
    const o = anOrganisationToSetUp();
    await o.talk('u-grace', GRACES_ANSWERS);
    expect(await o.says('u-grace', 'yes')).toBe(`I have set it up, and spending requests are switched on. ${THE_RULES_SAID} You can change any of it by telling me, or on the Suites page.`);
    const grace = o.as('u-grace');
    const page: any = await o.suites.forReader(grace);
    /* Who approves is written once, as the steps by amount (Hafsah's plan of 2 November, step 0): for any amount the manager and then
       finance, and over 20,000 the head and then the chief executive. The settings card reads its limit from them; only the days stay
       in the workflows. */
    const card = page.groups.flatMap((g: any) => g.suites).find((s: any) => s.key === 'spend');
    expect(card).toMatchObject({ on: true, answers: { currency: 'KES', limit: 20000 } });
    expect(card.answers.above).toBeUndefined();
    expect((await o.suites.spendRules(grace)).rules.thresholds).toEqual([
      { above: 0, steps: [['manager', 'admin'], ['finance', 'admin']] },
      { above: 20000, steps: [['departmentHead', 'admin'], ['chiefExecutive', 'admin']] },
    ]);
    expect((await o.suites.workflows(grace)).suites.find((s) => s.key === 'spend')).toMatchObject({ set: true, escalateAfter: 3 });
    expect((await o.suites.duties(grace)).said).toEqual(['Omar Said looks after finance.', 'Grace Achieng is the chief executive.', 'Omar Said heads Finance.', 'Fatuma Hassan heads Operations.', 'Wairimu Kamau heads Sales.']);
    expect((await o.assistant.theSetUpAsStored(grace, 'spend')).join(' ')).toBe(THE_RULES_SAID);
    /* The steps by amount are their own change in the history (the spending rules), written once, after the suite is switched on. */
    expect(o.changes.map((c) => [c.suite, c.changedById])).toEqual([['spend', 'u-grace'], ['spendRules', 'u-grace'], ['duties', 'u-grace'], ['workflows', 'u-grace']]);
    expect((await o.suites.rulesHistory(grace)).changes.map((c) => c.said)).toEqual([
      'Grace changed the approval steps on 3 October.',
      'Grace changed who holds each duty on 3 October.',
      'Grace changed the spending rules on 3 October.',
      'Grace switched on spending and budgets on 3 October.',
    ]);
  });

  it('each reader reads themselves as "you" and everybody else by name', async () => {
    const o = anOrganisationToSetUp();
    await o.talk('u-grace', GRACES_ANSWERS);
    await o.says('u-grace', 'yes');
    /* Grace, the chief executive, is "you" to herself; Omar is named. */
    const toGrace = (await o.assistant.theSetUpAsStored(o.as('u-grace'), 'spend')).join(' ');
    expect(toGrace).not.toMatch(/Grace/);
    expect(toGrace).toContain('it goes to Omar, who looks after finance, to approve as well.');
    /* Omar, who looks after finance, is "you" to himself; Grace is named. */
    const toOmar = (await o.assistant.theSetUpAsStored(o.as('u-omar'), 'spend')).join(' ');
    expect(toOmar).not.toMatch(/Omar/);
    expect(toOmar).toContain('When the manager has approved it, it goes to you to approve as well. It is approved only when you approve it,');
    expect(toOmar).toContain('You head Finance, Fatuma heads Operations, and Wairimu heads Sales.');
    expect(toOmar).toContain('You look after finance, so that part comes to you.');
    expect(toOmar).toContain('If you have not answered after three working days, or are on leave that day, it goes to an admin.');
    expect(toOmar).toContain('it goes to Grace, the chief executive, to approve as well. It is approved only when Grace approves it,');
    expect(toOmar).toContain('If Grace has not answered after three working days, or is on leave that day, it goes to an admin.');
  });

  it('the question after the first approver never offers that same job as its example', async () => {
    const o = anOrganisationToSetUp();
    expect((await o.talk('u-grace', ['Set up our spending approvals', 'Shillings', 'Finance']))[2])
      .toBe('Does anybody approve it after finance, for example the head of the person’s team? You can say no.');
  });

  it('a no before the yes changes nothing', async () => {
    const o = anOrganisationToSetUp();
    await o.talk('u-grace', GRACES_ANSWERS);
    expect(await o.says('u-grace', 'no')).toBe('I have not set up spending requests. Nothing has changed.');
    expect(o.writes).toEqual([]);
    expect(o.changes).toEqual([]);
  });

  it('a change before the yes is said back again, and only what the said-back names is kept', async () => {
    const o = anOrganisationToSetUp();
    await o.talk('u-grace', GRACES_ANSWERS);
    const limit = await o.says('u-grace', 'make the limit 50,000');
    expect(limit).toBe(`I have changed that. ${SAID_BACK.replace(/20,000/g, '50,000')}`);
    const above = await o.says('u-grace', 'anything above that is approved by finance');
    expect(above).toContain('A request to spend of more than KES 50,000 goes to Omar, who looks after finance.');
    expect(above).not.toContain('heads');
    expect(o.writes).toEqual([]);
    await o.says('u-grace', 'yes');
    const grace = o.as('u-grace');
    expect((await o.suites.spendRules(grace)).rules.thresholds?.find((t) => t.above === 50000)?.steps).toEqual([['finance', 'admin']]);
    /* The heads Grace named on the way are no longer used, so they are not kept. */
    expect((await o.suites.duties(grace)).said).toEqual(['Omar Said looks after finance.', 'Fatuma Hassan heads Operations.']);
    expect(await o.assistant.theSetUpAsStored(grace, 'spend')).toContain('A request to spend of more than KES 50,000 goes to Omar, who looks after finance.');
  });
});

describe('somebody who is not an admin asks to set up spending', () => {
  it.each([['Wairimu, a lead', 'u-wairimu'], ['Omar, a member', 'u-omar']])('%s is told plainly that an admin sets it up, and nothing is changed', async (_who, userId) => {
    const o = anOrganisationToSetUp();
    expect(await o.says(userId, 'Set up our expenses process')).toBe(
      /* Decision 85: an admin or whoever looks after finance sets this up, and nobody is named for finance here. */
      'Only an admin or whoever looks after finance can set up how spending requests work in your organisation, so I have not changed anything. If you would like it set up or changed, you could ask Grace, who is an admin here.',
    );
    expect(o.proposals).toEqual([]);
    expect(o.writes).toEqual([]);
  });
});
