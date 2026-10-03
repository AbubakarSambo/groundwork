import { anOrganisationToSetUp } from './an-organisation-to-set-up-for-specs';

/**
 * DECISION 85, TIME SHEETS: AN ADMIN SETS UP TIME SHEETS BY TALKING TO ASK GROUNDWORK. The clients or
 * projects, who approves each week's hours, the hours asked a week and the cut-off, read through the
 * real AssistantService and the real SuitesService. Nothing is set until Grace, the admin, says yes.
 * Hours stay for billing only (decision 10): nothing here rates how much anybody works.
 */

const GRACES_ANSWERS = ['Set up timesheets', 'Atlas, Kisumu depot and Internal', 'Their manager', 'No', '40', 'Friday at 5pm', 'Nothing, it waits'];

const THE_RULES_SAID = (hours: number) => [
  'People give their hours for Atlas, Kisumu depot and Internal, each week.',
  'A week of hours goes to the person’s manager.',
  'If the person has no manager in Groundwork, it goes to an admin instead.',
  `Each person is asked for ${hours} hours a week.`,
  'The hours for each week are due by Friday at 17:00, Lagos time.',
  'If somebody does not answer, it waits for them. Groundwork does not pass it on by itself.',
].join(' ');

const SAID_BACK = (hours: number) => `Here is how time sheets will work. Time sheets will be switched on. ${THE_RULES_SAID(hours)} Shall I set it up like this? Nothing changes until you say yes.`;

describe('Grace, an admin, sets up time sheets by talking', () => {
  it('is asked only what is missing, one question at a time, in plain words', async () => {
    const o = anOrganisationToSetUp();
    expect(await o.talk('u-grace', GRACES_ANSWERS)).toEqual([
      'I will ask you a few questions about how time sheets work, one at a time, and I will not set anything until you say yes. Which clients or projects do people give their hours for? Write one on each line, or put commas between them.',
      'Who approves each week’s hours?',
      'Does anybody approve the hours after the manager, for example finance? You can say no.',
      'How many hours a week does each person need to give? You can say none.',
      'When are the hours due each week? For example, Friday at 17:00. You can say there is no cut-off.',
      "What happens if the manager doesn't respond within two working days?",
      SAID_BACK(40),
    ]);
    expect(o.writes).toEqual([]);
  });

  it('a change before the yes is said back again; on the yes it is written through the Suites service and read back the same', async () => {
    const o = anOrganisationToSetUp();
    await o.talk('u-grace', GRACES_ANSWERS);
    expect(await o.says('u-grace', 'make it 35 hours a week')).toBe(`I have changed that. ${SAID_BACK(35)}`);
    expect(o.writes).toEqual([]);
    expect(await o.says('u-grace', 'yes')).toBe(`I have set it up, and time sheets are switched on. ${THE_RULES_SAID(35)} You can change any of it by telling me, or on the Suites page.`);
    const grace = o.as('u-grace');
    const page: any = await o.suites.forReader(grace);
    expect(page.groups.flatMap((g: any) => g.suites).find((s: any) => s.key === 'time')).toMatchObject({ on: true, answers: { clients: ['Atlas', 'Kisumu depot', 'Internal'], approver: 'Their manager' } });
    expect((await o.suites.timeRules(grace)).rules).toEqual({ every: 'week', hoursAWeek: 35, cutOff: { day: 'friday', time: '17:00' } });
    expect((await o.suites.workflows(grace)).suites.find((s) => s.key === 'time')).toMatchObject({ set: true, steps: [['manager', 'admin']], escalateAfter: null });
    expect((await o.assistant.theSetUpAsStored(grace, 'time')).join(' ')).toBe(THE_RULES_SAID(35));
    expect((await o.suites.rulesHistory(grace)).changes.map((c) => c.said)).toEqual([
      'Grace changed the time sheet rules on 3 October.',
      'Grace changed the approval steps on 3 October.',
      'Grace switched on time sheets on 3 October.',
    ]);
  });

  it('the question after the first approver never offers that same job as its example', async () => {
    const o = anOrganisationToSetUp();
    expect((await o.talk('u-grace', ['Set up timesheets', 'Atlas', 'Finance']))[2])
      .toBe('Does anybody approve the hours after finance, for example the head of the person’s team? You can say no.');
  });

  it('a no before the yes changes nothing', async () => {
    const o = anOrganisationToSetUp();
    await o.talk('u-grace', GRACES_ANSWERS);
    expect(await o.says('u-grace', 'no')).toBe('I have not set up time sheets. Nothing has changed.');
    expect(o.writes).toEqual([]);
  });

  it('a cut-off with no time is asked again, and nothing is guessed', async () => {
    const o = anOrganisationToSetUp();
    const r = await o.talk('u-grace', [...GRACES_ANSWERS.slice(0, 5), 'Friday']);
    expect(r[5]).toBe('At what time on that day? For example, 17:00.');
  });
});

describe('somebody who is not an admin asks to set up time sheets', () => {
  it.each([['Fatuma, a lead', 'u-fatuma'], ['Kamau, a member', 'u-kamau']])('%s is told plainly that an admin sets it up, and nothing is changed', async (_who, userId) => {
    const o = anOrganisationToSetUp();
    expect(await o.says(userId, 'Set up timesheets')).toBe(
      /* Decision 85: an admin or whoever looks after finance sets this up, and nobody is named for finance here. */
      'Only an admin or whoever looks after finance can set up how time sheets work in your organisation, so I have not changed anything. If you would like it set up or changed, you could ask Grace, who is an admin here.',
    );
    expect(o.proposals).toEqual([]);
    expect(o.writes).toEqual([]);
  });
});
