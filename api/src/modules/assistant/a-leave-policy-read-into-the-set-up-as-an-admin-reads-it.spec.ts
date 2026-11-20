import { anOrganisationToSetUp } from './an-organisation-to-set-up-for-specs';

/**
 * A WRITTEN LEAVE POLICY, PASTED INTO THE SET-UP (Hafsah, 20 November 2026): "ask if weekends, public holidays count as leave day ...
 * what about compassion leave, maternity leave, sick leave, how early must someone apply ... how does annual leave accrue ... is this
 * for biological parents or adoptive parents".
 *
 * Grace, the admin of Baridi Appliances, pastes her policy. The model reads it into the set-up's own answers (here a stand-in that
 * answers only what the policy says); the set-up's rules read those, ask only what the policy did not say, one question at a time,
 * say the whole policy back, and write nothing until she says yes.
 */

const POLICY = `Baridi Appliances leave policy.
Annual leave is 21 days a year, built up each month, and the leave year starts in January. Up to 5 unused days can be carried into the next year, and they must be used by the end of March. Annual leave needs two weeks' notice.
Sick leave is 14 days a year, paid, and a doctor's note is needed after 2 days.
Compassionate leave is 5 days each time, paid.
Maternity leave is 3 months, paid, for mothers, including adoptive mothers.
Paternity leave is 2 weeks, paid, for fathers, including adoptive fathers.
Unpaid leave is by agreement with your manager.
People work Monday to Friday. Weekends and public holidays do not count as leave days. We give Kenya's public holidays.
Our Lagos office follows Nigeria's public holidays; Omar Said works from Lagos.
Leave is approved by the person's manager, nobody after them, HR is not told, and if the manager does not answer it waits.`;

/** What the policy says, as the model would write each answer. Only these are given; anything else is left out. */
const WHAT_IT_SAYS: Record<string, string> = {
  days: '21',
  forSome: 'no',
  'policy:kinds': 'annual, sick, compassionate, maternity, paternity, unpaid',
  'kind:annual:notice': '2 weeks',
  'kind:sick:days': '14 a year', 'kind:sick:paid': 'yes', 'kind:sick:whoFor': 'everyone', 'kind:sick:document': "a doctor's note after 2 days",
  'kind:compassionate:days': '5 each time', 'kind:compassionate:paid': 'yes', 'kind:compassionate:whoFor': 'everyone',
  'kind:maternity:days': '3 months each time', 'kind:maternity:paid': 'yes', 'kind:maternity:whoFor': 'mothers', 'kind:maternity:adoptive': 'adoptive parents too',
  'kind:paternity:days': '2 weeks each time', 'kind:paternity:paid': 'yes', 'kind:paternity:whoFor': 'fathers', 'kind:paternity:adoptive': 'adoptive parents too',
  'kind:unpaid:days': 'no set number', 'kind:unpaid:whoFor': 'anyone, by agreement with their manager',
  'policy:week': 'Monday to Friday', 'policy:weekends': 'no', 'policy:holidays': 'no',
  'policy:country': 'Kenya', 'policy:usual': 'yes', 'policy:offices': 'Lagos in Nigeria', 'office:0:people': 'Omar Said',
  'policy:accrual': 'each month', 'policy:yearStarts': 'January', 'policy:carryOver': '5', 'policy:carryExpires': 'March',
  approver: 'their manager', after: 'no', tellHr: 'no', escalate: 'it waits',
};

const theModel = async (_prompt: string, history: { content: string }[], tool: any) => {
  const content = String(history[0]?.content ?? '');
  if (tool?.name === 'the_answers') {
    /* Only the policy answers anything; a short reply ("none") is read by the set-up's rules, as before. */
    if (!/leave policy/i.test(content)) return { answers: [] };
    const keys = [...content.matchAll(/^- (\S+): /gm)].map((m) => m[1]);
    return { answers: keys.filter((k) => WHAT_IT_SAYS[k] !== undefined).map((key) => ({ key, answer: WHAT_IT_SAYS[key] })) };
  }
  if (tool?.name === 'the_holidays') {
    const year = Number(/The year: (\d{4})/.exec(content)?.[1]);
    return /Nigeria/.test(content)
      ? { holidays: [{ name: 'Independence Day', on: `${year}-10-01` }] }
      : { holidays: [{ name: 'Madaraka Day', on: `${year}-06-01` }, { name: 'New Year’s Day', on: `${year}-01-01` }, { name: 'Not a day', on: `${year}-02-30` }] };
  }
  return null;
};

describe('Grace pastes her written leave policy into the set-up', () => {
  it('is asked only what the policy did not say, then hears the whole policy back, and nothing is written before her yes', async () => {
    const o = anOrganisationToSetUp({ extract: theModel });
    const [opening, afterThePolicy, second, third, saidBack] = await o.talk('u-grace', ['Set up our employee leave process', POLICY, 'none', 'none', 'none']);
    expect(opening).toContain('If you have a written policy for leave requests, paste it here and I will set it up from it.');
    expect(opening).toContain('You can also tell me who reports to whom in one message, for example “Amina and Brian report to Joseph”, or paste your whole list of reporting lines.');
    /* The policy did not say how much notice maternity, paternity or unpaid leave needs: only that is asked, one at a time. */
    expect(afterThePolicy).toBe('How many days’ notice does maternity leave need before it starts? You can say none.');
    expect(second).toBe('How many days’ notice does paternity leave need before it starts? You can say none.');
    expect(third).toBe('How many days’ notice does unpaid leave need before it starts? You can say none.');

    for (const line of [
      'Each person has 21 days of annual leave a year.',
      'Annual leave needs two weeks’ notice.',
      'Each person has 14 days of sick leave a year.',
      'Sick leave is paid.',
      'Sick leave needs no notice.',
      'Sick leave of more than two working days needs a doctor\'s note.',
      'Compassionate leave is up to 5 days each time it is taken.',
      'Maternity leave is up to 90 days each time it is taken.',
      'Maternity leave is for mothers.',
      'Adoptive parents can take maternity leave as well as birth parents.',
      'Maternity leave counts every day, weekends and public holidays included.',
      'Paternity leave is up to 14 days each time it is taken.',
      'Adoptive parents can take paternity leave as well as birth parents.',
      'Unpaid leave has no set number of days.',
      'Unpaid leave is for anyone, by agreement with their manager.',
      'People work Monday to Friday.',
      'Saturday and Sunday do not count as leave days.',
      'Public holidays do not count as leave days.',
      'The leave year starts in January.',
      'Annual leave builds up each month, with a twelfth of the year\'s days added at the end of each month.',
      'Up to 5 days of annual leave that are not used can be carried into the next leave year.',
      'Carried-over days must be used by the end of March, or they are lost.',
      'The Lagos office is in Nigeria, and follows its public holidays. Omar Said works from it.',
      'Everybody not tied to an office follows the public holidays of Kenya.',
      /* Changed 20 November 2026: moon holidays are not guessed, and are added on the Suites page when announced. */
      'I drafted these dates, so please check each one before you say yes.',
      'Holidays that follow the moon, such as Eid, are not in this list, because their dates are set when they are announced.',
      'A leave request goes to the person’s manager.',
    ]) expect(saidBack).toContain(line);
    expect(saidBack).toMatch(/The public holidays for Kenya are New Year’s Day on \w+ 1 January and Madaraka Day on \w+ 1 June\./);
    expect(saidBack).toMatch(/The public holidays for the Lagos office are Independence Day on \w+ 1 October\./);
    /* A date the model made up that is not a real day is never said. */
    expect(saidBack).not.toContain('Not a day');
    expect(saidBack).toMatch(/Shall I set it up like this\? Nothing changes until you say yes\.$/);
    expect(o.writes).toEqual([]);
    expect(o.offices).toEqual([]);
    expect(o.holidays).toEqual([]);
  });

  it('on her yes, the whole policy is stored: the types, the calendar, accrual and carry-over, the office, who works there, and the holidays she checked', async () => {
    const o = anOrganisationToSetUp({ extract: theModel });
    await o.talk('u-grace', ['Set up our employee leave process', POLICY, 'none', 'none', 'none']);
    const done = await o.says('u-grace', 'yes');
    expect(done).toMatch(/^I have set it up, and leave requests are switched on\./);
    expect(done).toContain('Maternity leave counts every day, weekends and public holidays included.');
    /* After the yes the dates are no longer a draft to check. */
    expect(done).not.toContain('please check each one');

    const rules = (await o.suites.leaveRules(o.as('u-grace'))).rules;
    expect(rules).toMatchObject({
      kinds: [
        { key: 'annual', name: 'Annual leave', days: 21, noticeDays: 14 },
        { key: 'sick', name: 'Sick leave', days: 14, paid: true, noticeDays: 0, document: "a doctor's note", documentAfterDays: 2 },
        { key: 'compassionate', name: 'Compassionate leave', days: 5, per: 'occasion', paid: true, noticeDays: 0 },
        { key: 'maternity', name: 'Maternity leave', days: 90, per: 'occasion', paid: true, whoFor: 'mothers', adoptive: true, noticeDays: 0, everyDay: true },
        { key: 'paternity', name: 'Paternity leave', days: 14, per: 'occasion', paid: true, whoFor: 'fathers', adoptive: true, noticeDays: 0, everyDay: true },
        { key: 'unpaid', name: 'Unpaid leave', days: null, paid: false, whoFor: 'anyone, by agreement with their manager', noticeDays: 0 },
      ],
      country: 'Kenya', accrual: 'monthly', carryOver: 5, carryExpires: 3,
    });
    /* Monday to Friday, January, and weekends and holidays not counting are what nothing set means, so they are not stored. */
    expect(rules.workingWeek).toBeUndefined();
    expect(rules.yearStarts).toBeUndefined();
    expect(rules.weekendsCount).toBeUndefined();
    expect(rules.holidaysCount).toBeUndefined();

    const places = await o.suites.leavePlaces(o.as('u-grace'));
    expect(places.offices).toEqual([{ id: 'o-1', name: 'Lagos', country: 'Nigeria', people: [{ id: 'u-omar', name: 'Omar Said' }] }]);
    expect(places.holidays.map((h) => [h.office, h.name, h.confirmed])).toEqual(expect.arrayContaining([
      [null, 'New Year’s Day', true], [null, 'Madaraka Day', true], ['Lagos', 'Independence Day', true],
    ]));
    expect(places.said).toContain('The Lagos office is in Nigeria. Omar Said works from it, and follows its public holidays.');
  });

  it('a change after the say-back, in any words, is read by the model and said back again before anything is written', async () => {
    const o = anOrganisationToSetUp({
      extract: async (prompt, history, tool) => {
        if (tool?.name === 'the_answers' && /14 days of sick leave a year is wrong/.test(String(history[0]?.content))) {
          return { answers: [{ key: 'kind:sick:days', answer: '10 a year' }] };
        }
        return theModel(prompt, history as any, tool);
      },
    });
    await o.talk('u-grace', ['Set up our employee leave process', POLICY, 'none', 'none', 'none']);
    const changed = await o.says('u-grace', '14 days of sick leave a year is wrong, it is 10');
    expect(changed).toMatch(/^I have changed that\. /);
    expect(changed).toContain('Each person has 10 days of sick leave a year.');
    expect(o.writes).toEqual([]);
  });
});
