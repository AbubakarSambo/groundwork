/**
 * LAYERS 2 AND 3 (Hafsah's brief of 31 October 2026, parts 3 and 4). Patterns are counted across a person's assessments, never
 * decided inside one, and each names the check-ins, dates and words it rests on. Each pattern that holds gets one next step at
 * a time; a step moves on only when the next assessment shows it did not work; small steps happen on their own, and every step
 * from a conversation onwards waits for the lead. Nothing is a label on a person.
 */
import { thePatternsAcrossTheAssessments, thePatternsAsTheDetectorReadsThem, type AnAssessmentSeen } from './patterns-across-the-assessments';
import { theInterventionsAfter, THE_STEPS, THE_LADDER_FOR_WORK } from './the-next-step-for-each-pattern';
import { anAssessmentHolding } from '../conversation/an-assessment-for-a-spec';

const item = (words: string, extra: object = {}) => ({ id: `i-${words}`, words, from: [1], whoMaySee: 'the people in this check-in', saidWordForWord: true, ...extra });

function seen(n: number, change: (a: any) => void, who = 'Amani Wekesa', isTheLead = false): AnAssessmentSeen {
  const a: any = anAssessmentHolding();
  a.about = { ...a.about, who, isTheLead, checkInId: `ci-${n}`, sessionNumber: n };
  change(a);
  return { checkInId: `ci-${n}`, sessionNumber: n, on: `2026-11-0${n}T09:00:00.000Z`, assessment: a };
}
const slipped = (n: number) => seen(n, (a) => { a.comparedWithLastTime.promisesDue = [item(`I will call Westgate on day ${n}`, { outcome: 'not kept' })]; });
const kept = (n: number) => seen(n, (a) => { a.comparedWithLastTime.promisesDue = [item(`I will send the quote on day ${n}`, { outcome: 'kept' })]; a.claims = [item('signed note attached', { proof: 'proved' })]; });

describe('a pattern is counted across assessments, never decided inside one', () => {
  it('one assessment with a promise not kept is no pattern at all', () => {
    expect(thePatternsAcrossTheAssessments('p', [slipped(1)])).toEqual([]);
  });

  it('two make it forming, three make it hold, and it names each check-in, its date and the words', () => {
    expect(thePatternsAcrossTheAssessments('p', [slipped(1), slipped(2)])[0]).toMatchObject({ key: 'slipping-promises', state: 'forming' });
    const [p] = thePatternsAcrossTheAssessments('p', [slipped(1), slipped(2), slipped(3)]);
    expect(p).toMatchObject({ key: 'slipping-promises', kind: 'needs work', state: 'holds', saying: 'Promises Amani Wekesa made were not kept, or not mentioned, when they came due.' });
    expect(p.instances).toEqual([1, 2, 3].map((n) => ({ checkInId: `ci-${n}`, sessionNumber: n, on: `2026-11-0${n}T09:00:00.000Z`, words: [`I will call Westgate on day ${n}`] })));
  });

  it('an honest person who keeps promises and proves work is never flagged for slipping, and their strength is seen', () => {
    const found = thePatternsAcrossTheAssessments('p', [kept(1), kept(2), kept(3)]);
    expect(found.map((p) => p.key)).toEqual(['quiet-excellence']);
    expect(found[0].kind).toBe('strength');
  });

  it('reads role, focus, proof, overload and ownership from what each assessment found', () => {
    const many = [1, 2, 3].map((n) => seen(n, (a) => {
      a.roleAgainstGiven = { given: 'Sales rep', playing: 'Runs the warehouse', fits: 'differs' };
      a.roleSignals = [item('I sorted the stock and ran the loading bay')];
      a.areas = [item('stock count', { fitsAPriority: 'no' }), item('loading', { fitsAPriority: 'no' }), item('Westgate', { fitsAPriority: 'yes' })];
      a.claims = [item('done A'), item('done B'), item('done C')];
      a.observations = [item('I am doing three jobs this week', { observed: 'overload' })];
      a.blockers = [item('waiting on Grace', { triedSaid: 'I called her twice' })];
    }));
    const keys = thePatternsAcrossTheAssessments('p', many).map((p) => p.key).sort();
    expect(keys).toEqual(['claims-rarely-proved', 'focus-away-from-the-priorities', 'overload', 'ownership', 'role-differs-from-given']);
  });

  it('the lead\'s bias: she speaks critically of somebody whose own record shows promises kept and work proved', () => {
    const lead = [1, 2, 3].map((n) => seen(n, (a) => { a.people = [item(`Kevin let us down again on day ${n}`, { name: 'Kevin', spokenOf: 'criticism' })]; }, 'Grace Mwangi', true));
    const kevin = { participantId: 'p-kevin', name: 'Kevin Otieno', seen: [kept(1), kept(2), kept(3)] };
    const found = thePatternsAcrossTheAssessments('p-grace', lead, [kevin]);
    expect(found).toEqual([expect.objectContaining({ key: 'the-leads-bias', aboutWhom: 'Kevin Otieno', state: 'holds' })]);
    expect(found[0].saying).toBe("Grace Mwangi speaks critically of Kevin Otieno, while Kevin Otieno's own record shows promises kept and work proved.");
    /* A lead who criticises somebody whose own record does slip is not biased: nothing is found. */
    expect(thePatternsAcrossTheAssessments('p-grace', lead, [{ ...kevin, seen: [slipped(1), slipped(2), slipped(3)] }])).toEqual([]);
  });

  it('reaches the pattern detector as plain lines with the check-ins and words it rests on', () => {
    const text = thePatternsAsTheDetectorReadsThem(thePatternsAcrossTheAssessments('p', [slipped(1), slipped(2), slipped(3)]));
    expect(text).toContain('counted across their check-ins, never from one');
    expect(text).toContain('session 3, 2026-11-03, "I will call Westgate on day 3"');
  });
});

describe('the next step for each pattern', () => {
  const holds = (upTo: number) => thePatternsAcrossTheAssessments('p', [1, 2, 3, 4, 5].slice(0, upTo).map(slipped));

  it('starts at a coaching question for the person, which happens on its own', () => {
    const [step] = theInterventionsAfter([], holds(3), { checkInId: 'ci-3', sessionNumber: 3 });
    expect(step).toMatchObject({ key: 'slipping-promises', rung: 0, step: 'a coaching question', forWhom: 'the person', theLeadDecides: false, state: 'open' });
    expect(step.says).toBe('Which of the things you said you would do since last time is still open, and what day will you finish it?');
  });

  it('moves to the next step only when the next assessment shows it did not work', () => {
    const first = theInterventionsAfter([], holds(3), { checkInId: 'ci-3', sessionNumber: 3 });
    const second = theInterventionsAfter(first, holds(4), { checkInId: 'ci-4', sessionNumber: 4 });
    expect(second).toEqual([expect.objectContaining({ step: 'a clear expectation', rung: 1, followedUp: [{ checkInId: 'ci-4', sessionNumber: 4, worked: false }] })]);
    /* The promise was kept in the next check-in: the step worked and stops there. */
    const better = thePatternsAcrossTheAssessments('p', [slipped(1), slipped(2), slipped(3), kept(4)]);
    expect(theInterventionsAfter(first, better, { checkInId: 'ci-4', sessionNumber: 4 })).toEqual([
      expect.objectContaining({ step: 'a coaching question', state: 'worked', followedUp: [{ checkInId: 'ci-4', sessionNumber: 4, worked: true }] }),
    ]);
  });

  it('a conversation, a deadline, a plan and firing are always the lead\'s decision, and nothing moves past a step waiting for her', () => {
    for (const s of ['a conversation', 'a deadline', 'a plan', 'firing, when there are grounds'] as const) expect(THE_STEPS[s]).toEqual({ forWhom: 'the lead', theLeadDecides: true });
    let steps = theInterventionsAfter([], holds(3), { checkInId: 'ci-3', sessionNumber: 3 });
    steps = theInterventionsAfter(steps, holds(4), { checkInId: 'ci-4', sessionNumber: 4 });
    steps = theInterventionsAfter(steps, holds(5), { checkInId: 'ci-5', sessionNumber: 5 });
    expect(steps[0]).toMatchObject({ step: 'a conversation', state: 'waiting for the lead', theLeadDecides: true });
    const more = [1, 2, 3, 4, 5, 6].map(slipped);
    const later = theInterventionsAfter(steps, thePatternsAcrossTheAssessments('p', more), { checkInId: 'ci-6', sessionNumber: 6 });
    expect(later[0]).toMatchObject({ step: 'a conversation', state: 'waiting for the lead' });
    expect(THE_LADDER_FOR_WORK[THE_LADDER_FOR_WORK.length - 1]).toBe('firing, when there are grounds');
  });

  it('a strength is praise, suggested to the lead once', () => {
    const p = thePatternsAcrossTheAssessments('p', [kept(1), kept(2), kept(3)]);
    const [step] = theInterventionsAfter([], p, { checkInId: 'ci-3', sessionNumber: 3 });
    expect(step).toMatchObject({ step: 'praise', forWhom: 'the lead', theLeadDecides: false });
    expect(step.says).toBe('Thank them for this. Amani Wekesa keeps promises and proves what is done, without making much of it.');
  });

  it('no step says a label about a person', () => {
    const all = theInterventionsAfter([], [
      ...holds(3),
      ...thePatternsAcrossTheAssessments('p2', [kept(1), kept(2), kept(3)]),
    ], { checkInId: 'ci-3', sessionNumber: 3 });
    for (const s of all) expect(s.says).not.toMatch(/\b(PIP|exit|at risk|underperform|weak|poor performer|lazy)\b/i);
  });
});
