import { theRuleFor, theExceptionsSaid, changeForWhom, type ForWhom } from './who-a-rule-is-for';
import { theSetupCheck, type WhatTheCheckReads } from './the-setup-check';
import { whatThisReviewIs } from './what-a-review-is';
import { withTheLimitFor, theSpendRulesOf, theRouteSaid } from './the-spending-rules';
import { overTheAllowanceSaid } from './a-leave-request-as-the-approver-reads-it';
import { THE_LINE_STEP } from './the-approval-steps';
import { theStepsFor } from './who-may-decide';
import { reportingLinesIn, numbersForSomePeopleIn, theNumbersSaid, theLinesSaidBack } from '../assistant/the-role-map-said-in-chat';
import type { APersonHere } from './the-people-and-their-lines';

/**
 * BATCH S (Hafsah, 19 November 2026), S1 to S4, as an admin, a manager and the person read them: the sentences themselves.
 */
const P = (userId: string, name: string, appRole: string, title: string | null, team: string | null, managerUserId: string | null): APersonHere =>
  ({ userId, name, firstName: name.split(' ')[0], appRole, title, team, managerUserId });

const GRACE = P('u-grace', 'Grace Wanjiru', 'ADMIN', 'Chief executive', null, null);
const JOSEPH = P('u-joseph', 'Joseph Kamau', 'LEAD', 'Sales manager', 'Sales', 'u-grace');
const AMINA = P('u-amina', 'Amina Otieno', 'MEMBER', 'Field agent', 'Sales', null);
const BRIAN = P('u-brian', 'Brian Mwangi', 'MEMBER', 'Field agent', 'Sales', 'u-joseph');
const PEOPLE = [GRACE, JOSEPH, AMINA, BRIAN];

describe('S1: one rule, for everyone unless an admin set it for some people', () => {
  const fw: ForWhom = {
    'leave.days': [
      { who: { kind: 'title', value: 'manager' }, value: 25 },
      { who: { kind: 'title', value: 'field agents' }, value: 18 },
      { who: { kind: 'team', value: 'Sales' }, value: 20 },
      { who: { kind: 'person', value: 'u-brian' }, value: 30 },
    ],
  };
  it('the most specific wins: a person, then a team, then a job title', () => {
    expect(theRuleFor(BRIAN, fw, 'leave.days', 21)).toBe(30);
    expect(theRuleFor(AMINA, fw, 'leave.days', 21)).toBe(20);
    expect(theRuleFor(GRACE, fw, 'leave.days', 21)).toBe(21);
    expect(theRuleFor(GRACE, { 'leave.days': [{ who: { kind: 'title', value: 'chief executives' }, value: 28 }] }, 'leave.days', 21)).toBe(28);
  });
  it('a job title "managers" covers "Sales manager", and says who it covers by name', () => {
    const only: ForWhom = { 'leave.days': [{ who: { kind: 'title', value: 'managers' }, value: 25 }, { who: { kind: 'title', value: 'field agents' }, value: 18 }] };
    expect(theExceptionsSaid(only, 'leave.days', PEOPLE)).toEqual([
      'Anyone whose job title is managers has 25 days of leave a year. That is Joseph Kamau today.',
      'Anyone whose job title is field agents has 18 days of leave a year. That is Amina Otieno and Brian Mwangi today.',
    ]);
  });
  it('a number of null takes the exception away, and a number out of range is refused in a sentence', () => {
    const set = changeForWhom({}, { setting: 'time.hoursAWeek', who: { kind: 'team', value: 'Sales' }, value: 45 });
    expect('forWhom' in set && set.forWhom['time.hoursAWeek']).toEqual([{ who: { kind: 'team', value: 'Sales' }, value: 45 }]);
    const gone = changeForWhom((set as any).forWhom, { setting: 'time.hoursAWeek', who: { kind: 'team', value: 'sales' }, value: null });
    expect((gone as any).forWhom).toEqual({});
    expect(changeForWhom({}, { setting: 'leave.days', who: { kind: 'team', value: 'Sales' }, value: 900 })).toEqual({ refused: 'Say who it is for (a job title, an app role, a team or one person) and give a number in the range the setting allows.' });
  });
  it('spending: up to their own limit their manager approves, above it the steps set above the lowest amount', () => {
    const rules = { thresholds: [{ above: 10_000, steps: [[{ named: 'u-grace' }]] as any }, { above: 100_000, steps: [['chiefExecutive']] as any }] };
    const theirs = withTheLimitFor(rules, 2_000);
    expect(theStepsFor('spend', theirs, 1_500)).toEqual([THE_LINE_STEP]);
    expect(theStepsFor('spend', theirs, 5_000)).toEqual([[{ named: 'u-grace' }]]);
    expect(theStepsFor('spend', theirs, 200_000)).toEqual([['chiefExecutive']]);
  });
});

describe('round 2, T6: the seed\'s rule, over KES 100,000 goes to Fatuma', () => {
  it('a limit and a person kept in the spending suite\'s own answers are the steps by amount', () => {
    const rules = theSpendRulesOf({ categories: [{ name: 'Fuel' }] }, { currency: 'KES', limit: 100_000, above: 'u-fatuma' });
    expect(theStepsFor('spend', rules, 120_000)).toEqual([[{ named: 'u-fatuma' }]]);
    expect(theStepsFor('spend', rules, 12_000)).toEqual([THE_LINE_STEP]);
    expect(theRouteSaid(rules, 'KES', { nameOf: (id) => (id === 'u-fatuma' ? 'Fatuma' : null), finance: 'Fatuma' })[0]).toBe('Up to KES 100,000, the person’s manager approves, or else their manager’s manager, or else an admin.');
    expect(theRouteSaid(rules, 'KES', { nameOf: (id) => (id === 'u-fatuma' ? 'Fatuma' : null), finance: 'Fatuma' })[1]).toBe('Over KES 100,000, Fatuma approves.');
  });
  it('steps already set are kept as they are', () => {
    const rules = theSpendRulesOf({ thresholds: [{ above: 50_000, steps: [['finance']] }] }, { limit: 100_000, above: 'u-fatuma' });
    expect(theStepsFor('spend', rules, 60_000)).toEqual([['finance']]);
  });
});

describe('round 2, T9: leave over the allowance is said to the person and to each approver', () => {
  it('in plain sentences', () => {
    expect(overTheAllowanceSaid('you', 30, 18)).toBe('This is 12 working days more than the 18 you have left, so it goes over your allowance. Whoever approves it will see that.');
    expect(overTheAllowanceSaid('Zawadi', 30, 18)).toBe('This is 12 working days more than the 18 Zawadi has left, so it goes over Zawadi’s allowance.');
    expect(overTheAllowanceSaid('Zawadi', 3, 18)).toBeNull();
  });
});

describe('S2: the step every request takes is the manager, then their manager, then an admin', () => {
  it('is said that way to the admin', () => {
    expect(theStepsFor('leave', {})).toEqual([['manager', 'managersManager', 'admin']]);
  });
});

describe('S3: the setup check, in the sentences the Suites page and Ask both read', () => {
  const read = (people: APersonHere[], extra: Partial<WhatTheCheckReads> = {}): WhatTheCheckReads => ({
    people, duties: {}, ask: 'Ask Groundwork',
    rules: { leave: THE_LINE_STEP, time: THE_LINE_STEP, spend: THE_LINE_STEP, reviews: THE_LINE_STEP }, ...extra,
  });
  it('names the people with no manager, says where their requests go, and the step that fixes it', () => {
    const c = theSetupCheck('leave', read(PEOPLE), 'u-grace');
    expect(c.ready).toBe(false);
    expect(c.said).toEqual([
      'Amina Otieno has nobody set as their manager, so their leave requests go to an admin.',
      'To fix it, set who they report to on the People page, or tell Ask Groundwork, for example “Amina reports to Joseph”.',
      'You are the only admin and nobody is set as your manager, so nobody can approve your own leave requests. To fix it, add a second admin on the People page, or set who you report to.',
    ]);
  });
  it('a few names, then how many more', () => {
    const many = [GRACE, JOSEPH, ...['A', 'B', 'C', 'D', 'E', 'F'].map((x, i) => P(`u-${i}`, `${x}lice Person`, 'MEMBER', null, null, null))];
    const c = theSetupCheck('spend', read(many, { people: many }), 'u-joseph');
    expect(c.said[0]).toBe('Alice Person, Blice Person, Clice Person and 3 others have nobody set as their manager, so their requests to spend go to an admin.');
    expect(c.said[2]).toBe('Grace Wanjiru is the only admin and has nobody set as their manager, so nobody can approve Grace’s own requests to spend. To fix it, add a second admin on the People page, or set who Grace reports to.');
  });
  it('teams nobody heads, when a step goes to the head of a team', () => {
    const c = theSetupCheck('leave', read([P('u-a', 'Ann One', 'ADMIN', null, null, null), P('u-b', 'Ben Two', 'ADMIN', null, null, null), { ...BRIAN, managerUserId: 'u-a' }], { rules: { leave: ['departmentHead', 'admin'], time: [], spend: [], reviews: [] } }), 'u-a');
    expect(c.said[0]).toBe('Nobody heads Sales yet, so the step that goes to the head of a team goes to an admin for the people in it.');
  });
  it('says it is ready when nothing is missing', () => {
    const c = theSetupCheck('time', read([GRACE, P('u-x', 'Xena Admin', 'ADMIN', null, null, null), { ...AMINA, managerUserId: 'u-joseph' }, JOSEPH]), 'u-grace');
    expect(c).toEqual({ ready: true, noManager: [], said: ['Everybody has somebody to go to, so hours follow your reporting lines.'] });
  });
});

describe('S4: a review says what it is drawn from, who reads it and what happens next', () => {
  const base = {
    from: new Date('2026-05-03T00:00:00Z'), to: new Date('2026-11-03T00:00:00Z'), hasRecord: true, hasWords: false, hasTheirView: false,
    others: { release7: true, hr: 'Njeri' }, decided: null, appealed: false,
  };
  it('as the person reads it, before it is decided', () => {
    expect(whatThisReviewIs({ ...base, person: { first: 'Amina', reads: true }, writer: { first: 'Joseph', reads: false } })).toEqual([
      'This review is drawn from your check-ins between 3 May 2026 and 3 November 2026, the goals and work you own, what you committed to and how each went, your own view of your work and Joseph’s own words. Hours and leave are never part of it.',
      'You, Joseph, who writes it, Njeri, who looks after HR and an admin who set up or approved one of your check-ins can read it. Nobody else can.',
      'Next, Joseph writes their view and you write your own. Then Joseph decides, with reasons, and you read both.',
    ]);
  });
  it('as the writer reads it, once decided, with the next steps and a date to look again', () => {
    expect(whatThisReviewIs({
      ...base, hasWords: true, hasTheirView: true, others: { release7: false, hr: null },
      person: { first: 'Amina', reads: false }, writer: { first: 'Joseph', reads: true },
      decided: { byFirst: 'Joseph', byReader: true, on: new Date('2026-11-10T09:00:00Z'), nextSteps: 'Amina leads the Kisumu visits, and I join the first two', lookAgainOn: new Date('2027-02-10T00:00:00Z') },
    })).toEqual([
      'This review is drawn from Amina’s check-ins between 3 May 2026 and 3 November 2026, the goals and work Amina owns, what Amina committed to and how each went, Amina’s own view of the work and your own words. Hours and leave are never part of it.',
      'Amina, you, as the one who writes it and every admin can read it. Nobody else can.',
      'You decided it on 10 November 2026.',
      'The next steps are these. Amina leads the Kisumu visits, and I join the first two.',
      'You will look at it again with Amina on 10 February 2027.',
      'Amina can appeal the decision to an admin who did not make it.',
    ]);
  });
});

describe('S6: the role map and numbers for some people, said in Ask', () => {
  it('reads a reporting line and says it back for a yes', () => {
    const lines = reportingLinesIn('Amina reports to Joseph', PEOPLE)!;
    expect(lines).toEqual([{ userId: 'u-amina', toUserId: 'u-joseph' }]);
    expect(theLinesSaidBack(lines, PEOPLE)).toBe('Amina Otieno will report to Joseph Kamau. Their leave requests, hours and requests to spend will then go to that manager first. Shall I save this? Nothing changes until you say yes.');
    expect(reportingLinesIn('Joseph manages Amina and Brian', PEOPLE)).toEqual([{ userId: 'u-amina', toUserId: 'u-joseph' }, { userId: 'u-brian', toUserId: 'u-joseph' }]);
    expect(reportingLinesIn('Who does Amina report to?', PEOPLE)).toBeNull();
    expect(reportingLinesIn('Zawadi reports to Joseph', PEOPLE)).toBeNull();
  });
  it('reads "managers get 25 days, field agents 18" and says who each covers, and what everybody else keeps', () => {
    const said = numbersForSomePeopleIn('Managers get 25 days, field agents 18', PEOPLE)!;
    /* Round 2, T1: each group is kept as the real titles it covers, written as the directory writes them. */
    expect(said).toEqual([
      { setting: 'leave.days', who: { kind: 'title', value: 'Sales manager' }, value: 25 },
      { setting: 'leave.days', who: { kind: 'title', value: 'Field agent' }, value: 18 },
    ]);
    expect(theNumbersSaid(said, {}, PEOPLE, { 'leave.days': 21 }, null)).toBe(
      'Here is what I will set. Anyone whose job title is Sales manager has 25 days of leave a year. That is Joseph Kamau today. Anyone whose job title is Field agent has 18 days of leave a year. That is Amina Otieno and Brian Mwangi today. Everybody else keeps 21 days of leave a year. Shall I set this? Nothing changes until you say yes.',
    );
    expect(numbersForSomePeopleIn('I have 3 days left', PEOPLE)).toBeNull();
  });

  it('reads groups by the meaning the model gave, and keeps a title nobody holds yet for whoever is given it (round 2, T1)', () => {
    const msingi = [P('u-g', 'Grace Njeri', 'ADMIN', 'Managing director', null, null), P('u-w', 'Wairimu Kamau', 'LEAD', 'Head of Sales', 'Sales', 'u-g'), P('u-a', 'Amani Wekesa', 'MEMBER', 'Sales executive', 'Sales', 'u-w')];
    const said = numbersForSomePeopleIn('heads 25 days, sales executives 18, partners 30', msingi, null, { heads: ['Head of Sales'] })!;
    expect(said.map((n) => [n.who.value, n.value])).toEqual([['Head of Sales', 25], ['Sales executive', 18], ['Partner', 30]]);
    expect(theNumbersSaid(said, {}, msingi, { 'leave.days': 21 }, null)).toBe(
      'Here is what I will set. Anyone whose job title is Head of Sales has 25 days of leave a year. That is Wairimu Kamau today. Anyone whose job title is Sales executive has 18 days of leave a year. That is Amani Wekesa today. Anyone whose job title is Partner has 30 days of leave a year. Nobody has this job title yet, so it will apply to whoever is given it. Everybody else keeps 21 days of leave a year. Shall I set this? Nothing changes until you say yes.',
    );
  });
});
