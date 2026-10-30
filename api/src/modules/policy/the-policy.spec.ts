import {
  onlyTheRulesThatHold, whereTheyDisagree, thePolicyBoard, theSetupFromDocuments, whatApprovingWrites, thePolicyAsADocument, type ARule,
} from './the-policy';

/* Hand-written: what the model would answer for Baridi Appliances' documents (no real-model run). */
const THE_HANDBOOK = { rules: [
  { area: 'leave', says: 'Staff get 20 days of paid leave a year', where: 'page 6', measure: 'leave.days', value: '20', appliesTo: 'Leave requests' },
  { area: 'timesheets', says: 'No more than 9 hours a day on any project without approval.', where: 'page 11', exceptionsBy: 'the project’s manager', appliesTo: 'Timesheets', measure: 'time.hoursADay', value: '9' },
  { area: 'norms', says: 'Customers hear back within one working day.', where: 'page 4', exceptionsBy: 'Wairimu', appliesTo: 'Check-ins and the CRM' },
  { area: 'canteen', says: 'Lunch is at one.', where: 'page 2' },
  { area: 'leave', says: 'ok', where: 'page 7' },
] };
const THE_LEAVE_POLICY = { rules: [
  { area: 'leave', says: '21 days of paid leave a year.', where: 'section 2', exceptionsBy: 'Grace', appliesTo: 'Leave requests', measure: 'leave.days', value: '21' },
  { area: 'leave', says: 'Ask at least 5 working days ahead.', where: 'section 3', exceptionsBy: 'your manager', appliesTo: 'Leave requests', measure: 'leave.noticeDays', value: 'five' },
] };
const THE_EXPENSE_POLICY = { rules: [
  { area: 'spending', says: 'Anything over KES 20,000 needs a proforma before it’s approved.', where: 'page 1', exceptionsBy: 'Grace', appliesTo: 'Spending requests', measure: 'spend.quoteAbove', value: '20,000' },
] };

let n = 0;
const kept = (read: ReturnType<typeof onlyTheRulesThatHold>, state: ARule['state'] = 'proposed'): ARule[] => read.map((r) => ({ ...r, id: `r${++n}`, state, changedOn: null }));

describe('Release 9: rules read from documents', () => {
  it('keeps only rules in a known area, said as a full sentence, with a number only where it is one', () => {
    const handbook = onlyTheRulesThatHold(THE_HANDBOOK, 'Staff handbook');
    expect(handbook.map((r) => r.says)).toEqual([
      'Staff get 20 days of paid leave a year.',
      'No more than 9 hours a day on any project without approval.',
      'Customers hear back within one working day.',
    ]);
    expect(handbook[0]).toMatchObject({ document: 'Staff handbook', where: 'page 6', measure: 'leave.days', value: '20' });
    const leave = onlyTheRulesThatHold(THE_LEAVE_POLICY, 'Leave policy');
    /* "five" is not a number the suite can use, so the rule stays on the board with no number. */
    expect(leave[1]).toMatchObject({ says: 'Ask at least 5 working days ahead.', measure: null, value: null });
    expect(onlyTheRulesThatHold(THE_EXPENSE_POLICY, 'Expense policy')[0]).toMatchObject({ measure: 'spend.quoteAbove', value: '20000' });
  });

  it('finds where two documents disagree, and asks which is right in plain sentences', () => {
    const rules = [...kept(onlyTheRulesThatHold(THE_HANDBOOK, 'Staff handbook')), ...kept(onlyTheRulesThatHold(THE_LEAVE_POLICY, 'Leave policy'))];
    const d = whereTheyDisagree(rules);
    expect(d).toHaveLength(1);
    expect(d[0].title).toBe('How many leave days');
    expect(d[0].says).toBe('The staff handbook says 20 days a year (page 6). The leave policy says 21 days a year (section 2). Which is right?');
    expect(d[0].choices.map((c) => c.label)).toEqual(['20', '21']);
    /* Decided: the handbook's is set aside, and nothing disagrees any more. */
    expect(whereTheyDisagree(rules.map((r) => (r.value === '20' ? { ...r, state: 'set aside' as const } : r)))).toEqual([]);
  });
});

describe('Release 9: the setup page, as an admin reads it', () => {
  const rules = [
    ...kept(onlyTheRulesThatHold(THE_HANDBOOK, 'Staff handbook')),
    ...kept(onlyTheRulesThatHold(THE_LEAVE_POLICY, 'Leave policy')),
    ...kept(onlyTheRulesThatHold(THE_EXPENSE_POLICY, 'Expense policy')),
  ];
  const page = theSetupFromDocuments('Ask Baridi', ['Staff handbook', 'Leave policy', 'Expense policy'], rules);

  it('says what was added, what to decide first, and each area with where it came from', () => {
    expect(page.added).toBe('Added the staff handbook, the leave policy and the expense policy.');
    expect(page.decideFirst.map((d) => d.title)).toEqual(['How many leave days']);
    const leave = page.areas.find((a) => a.area === 'leave')!;
    expect(leave.from).toBe('From the staff handbook, page 6 and the leave policy, section 2 and section 3.');
    expect(leave.waitsOn).toBe('It can be approved once you decide how many leave days.');
    expect(page.areas.find((a) => a.area === 'spending')!.waitsOn).toBeNull();
    expect(page.noDocuments).toBe('No documents? The same setup can be done by talking it through in Ask Baridi.');
  });

  it('joins no pieces with a colon anywhere an admin reads', () => {
    expect(JSON.stringify(page)).not.toMatch(/(From|Exceptions|Applies to): /);
  });
});

describe('Release 9: the policy board, as everyone reads it', () => {
  it('shows each applied rule with where it came from, who may make an exception, and what it applies to', () => {
    const applied = kept(onlyTheRulesThatHold(THE_LEAVE_POLICY, 'Leave policy'), 'applied');
    applied[0].changedOn = '2026-10-02';
    const rules = [...applied, ...kept(onlyTheRulesThatHold(THE_HANDBOOK, 'Staff handbook'))];
    const b = thePolicyBoard('Baridi', 'Ask Baridi', rules);
    expect(b.intro).toBe('Every rule Baridi runs on, in one place. Anyone can ask about them in Ask Baridi. Leave, spending and time sheets follow the ones approved here.');
    expect(b.areas.map((a) => a.heading)).toEqual(['Leave']);
    expect(b.areas[0].rules[0]).toMatchObject({ says: '21 days of paid leave a year.', facts: 'From the leave policy, section 2. Grace can make an exception. It applies to leave requests. Changed 2 October.' });
    expect(b.areas[0].rules[1].facts).toBe('From the leave policy, section 3. Your manager can make an exception. It applies to leave requests. Unchanged.');
    /* The handbook's 20 disagrees with the applied 21, so it is under "Not applied until you decide". */
    expect(b.undecided).toEqual([{ title: 'How many leave days', says: 'Two documents disagree. Nothing about how many leave days is applied until it is decided.' }]);
  });

  it('says so plainly when nothing is on it yet', () => {
    expect(thePolicyBoard('Baridi', 'Ask Baridi', []).empty).toBe('No rules are on the board yet. An admin adds them by setting up from Baridi’s documents.');
  });
});

describe('Release 9: what approving writes into the suites', () => {
  it('writes only the settings a rule maps onto exactly', () => {
    const rules = [
      ...kept(onlyTheRulesThatHold({ rules: [{ area: 'leave', says: '21 days of paid leave a year.', measure: 'leave.days', value: '21' }, { area: 'leave', says: 'Ask at least 5 working days ahead.', measure: 'leave.noticeDays', value: '5' }] }, 'Leave policy')),
      ...kept(onlyTheRulesThatHold(THE_EXPENSE_POLICY, 'Expense policy')),
      ...kept(onlyTheRulesThatHold(THE_HANDBOOK, 'Staff handbook')).filter((r) => r.area !== 'leave'),
    ];
    /* The handbook's 9 hours a day becomes a time sheet setting too (Hafsah's decision, 25 October). */
    expect(whatApprovingWrites(rules)).toEqual({ leaveDays: 21, noticeDays: 5, quoteAbove: 20000, mostHoursADay: 9 });
  });

  it('writes nothing from a rule that was set aside', () => {
    const r = kept(onlyTheRulesThatHold({ rules: [{ area: 'leave', says: 'Staff get 20 days of paid leave a year.', measure: 'leave.days', value: '20' }] }, 'Staff handbook'), 'set aside');
    expect(whatApprovingWrites(r)).toEqual({});
  });

  it('gives Ask the applied rules in the board’s own sentences', () => {
    const doc = thePolicyAsADocument('Baridi', kept(onlyTheRulesThatHold(THE_EXPENSE_POLICY, 'Expense policy'), 'applied'));
    expect(doc).toBe('The rules Baridi runs on, as approved on its policy board.\n\nSpending\nAnything over KES 20,000 needs a proforma before it’s approved. From the expense policy, page 1. Grace can make an exception. It applies to spending requests. Unchanged.');
  });
});
