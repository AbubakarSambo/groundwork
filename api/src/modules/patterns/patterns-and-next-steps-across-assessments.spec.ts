/**
 * LAYERS 2 AND 3 (Hafsah's brief of 31 October 2026, parts 3 and 4; her F2 decisions of 2 November 2026). What the record shows
 * about a person is counted from distinct items of their own across their check-ins, never decided inside one, and each pattern
 * names the check-ins, days and words it rests on. Silence is never a finding: what the record cannot settle becomes the next
 * check-in's question. Each pattern that holds gets one next step at a time; a step moves on only when a later check-in shows it
 * did not work; small steps happen on their own, and every step from a conversation onwards waits for the lead.
 */
import { theRecordAcrossTime, type AnAssessmentSeen } from './patterns-across-the-assessments';
import { theInterventionsAfter, theSmallStepForThePerson, THE_STEPS, THE_LADDER_FOR_WORK } from './the-next-step-for-each-pattern';
import { anAssessmentHolding } from '../conversation/an-assessment-for-a-spec';

const item = (id: string, words: string, extra: object = {}) => ({ id, words, from: [1], whoMaySee: 'the people in this check-in', saidWordForWord: true, ...extra });

function seen(n: number, change: (a: any) => void, who = 'Amani Wekesa'): AnAssessmentSeen {
  const a: any = anAssessmentHolding();
  a.about = { ...a.about, who, checkInId: `ci-${n}`, sessionNumber: n };
  a.comparedWithLastTime = { ...a.comparedWithLastTime, previousCheckInId: n > 1 ? `ci-${n - 1}` : null };
  change(a);
  return { checkInId: `ci-${n}`, sessionNumber: n, on: `2026-11-0${n}T09:00:00.000Z`, assessment: a };
}
/** A promise of their own on the record (`c:<id>`), with what this check-in says happened to it. */
const due = (promise: string, outcome: string, extra: object = {}) => item(`compared.${promise}`, `About ${promise}`, { promise: `call ${promise}`, previousItem: `c:${promise}`, outcome, ...extra });
const slipped = (n: number) => seen(n, (a) => { a.comparedWithLastTime.promisesDue = [due(`client-${n}`, 'not kept')]; });
const record = (xs: AnAssessmentSeen[]) => theRecordAcrossTime('p', xs);
const holds = (xs: AnAssessmentSeen[]) => record(xs).patterns.filter((p) => p.state === 'holds');

describe('what the record shows is counted from distinct items, never from one conversation', () => {
  it('one promised day missed is not a pattern', () => {
    expect(holds([slipped(1)])).toEqual([]);
    expect(record([slipped(1)]).patterns[0]).toMatchObject({ key: 'slipping-promises', state: 'forming' });
  });

  it('two promised days missed, in two check-ins, hold, and name each check-in, day and their words', () => {
    const [p] = holds([slipped(1), slipped(2)]);
    expect(p).toMatchObject({ key: 'slipping-promises', kind: 'needs work', saying: 'Amani has let 2 promised days pass without the work done.' });
    expect(p.instances).toEqual([1, 2].map((n) => ({ checkInId: `ci-${n}`, sessionNumber: n, on: `2026-11-0${n}`, item: `call client-${n}`, words: [`About client-${n}`] })));
  });

  it('the same promise reported as not kept in three check-ins is one item, not three', () => {
    const same = [1, 2, 3].map((n) => seen(n, (a) => { a.comparedWithLastTime.promisesDue = [due('westgate', 'not kept')]; }));
    expect(holds(same)).toEqual([]);
  });

  it('a promise given a new day after its day passed counts as not kept; one still within its day does not', () => {
    const late = [1, 2].map((n) => seen(n, (a) => { a.comparedWithLastTime.promisesDue = [due(`day-${n}`, 'still open', { dayPassed: true })]; }));
    expect(holds(late).map((p) => p.key)).toEqual(['slipping-promises']);
    const inTime = [1, 2].map((n) => seen(n, (a) => { a.comparedWithLastTime.promisesDue = [due(`day-${n}`, 'still open', { dayPassed: false })]; }));
    expect(record(inTime).patterns).toEqual([]);
  });

  it('"not mentioned" is never an instance: it becomes the next check-in\'s question for that person', () => {
    const quiet = [1, 2, 3].map((n) => seen(n, (a) => { a.comparedWithLastTime.promisesDue = [due(`q-${n}`, 'not mentioned')]; }));
    const r = record(quiet);
    expect(r.patterns).toEqual([]);
    expect(r.toAskNextTime).toEqual(['You said you would call q-1. What happened with it?', 'You said you would call q-2. What happened with it?', 'You said you would call q-3. What happened with it?']);
  });

  it('a report with no record id is not counted: the record owns a promise\'s state', () => {
    const noId = [1, 2].map((n) => seen(n, (a) => { a.comparedWithLastTime.promisesDue = [item(`d${n}`, 'I did not ask Grace', { outcome: 'not kept' })]; }));
    expect(record(noId).patterns).toEqual([]);
  });

  it('a missed session in between does not break the run', () => {
    const missed = seen(2, (a) => { a.about.howItEnded = 'missed'; a.comparedWithLastTime.promisesDue = [due('ghost', 'not kept')]; });
    const [p] = holds([slipped(1), missed, slipped(3)]);
    expect(p.instances.map((i) => i.sessionNumber)).toEqual([1, 3]);
  });
});

describe('claims rarely proved counts only claims that needed proof, whose proof was asked for and never came', () => {
  const claim = (id: string, extra: object) => item(id, `I closed ${id}`, { claim: `Closed ${id}`, proof: 'said', needsProof: true, ...extra });

  it('asked and not proved, in two check-ins, holds', () => {
    const xs = [1, 2].map((n) => seen(n, (a) => { a.claims = [claim(`r1.claims.0`, { proofAsked: true })]; }));
    expect(holds(xs).map((p) => p.key)).toEqual(['claims-rarely-proved']);
  });

  it('"I did not do it" sentences and claims nobody asked proof for are not instances; the second becomes a question', () => {
    const xs = [1, 2].map((n) => seen(n, (a) => {
      a.claims = [item('r1.claims.0', "I haven't sent it yet.", { proof: 'said', needsProof: false, proofAsked: true }), claim('r1.claims.1', {})];
    }));
    const r = record(xs);
    expect(r.patterns.map((p) => p.key)).not.toContain('claims-rarely-proved');
    expect(r.toAskNextTime).toContain('You said "I closed r1.claims.1." Can you share something that shows it, such as a document, a photo or a slip?');
  });

  it('proof from a later check-in settles the claim', () => {
    const xs = [
      seen(1, (a) => { a.claims = [claim('r1.claims.0', { proofAsked: true })]; }),
      seen(2, (a) => { a.claims = [claim('r1.claims.0', { proofAsked: true, previousItem: null })]; a.documents = [item('r1.documents.0', 'slip.pdf', { provesItem: 'r1.claims.0' })]; }),
      seen(3, (a) => { a.claims = [claim('r1.claims.0', { proofAsked: true, previousItem: 'r1.claims.0', proof: 'proved' })]; }),
    ];
    expect(record(xs).patterns.map((p) => p.key)).not.toContain('claims-rarely-proved');
  });
});

describe('strengths, load, role and focus', () => {
  it('kept promises and proved work make quiet excellence, with nothing to work on', () => {
    const xs = [1, 2, 3].map((n) => seen(n, (a) => { a.comparedWithLastTime.promisesDue = [due(`k-${n}`, 'kept')]; }));
    const r = holds(xs);
    expect(r.map((p) => [p.key, p.kind, p.saying])).toEqual([['quiet-excellence', 'strength', 'Amani has kept 3 promises.']]);
  });

  it('overload, a wait they acted on, a role that differs and effort away from the priorities', () => {
    const xs = [1, 2, 3].map((n) => seen(n, (a) => {
      a.observations = [item('o', 'I am doing three jobs this week', { observed: 'overload' })];
      a.blockers = [item('r1.blockers.0', `waiting on Grace ${n}`, { what: `the van ${n}`, triedSaid: 'I called her twice' })];
      a.roleAgainstGiven = { given: 'Sales rep', playing: 'Runs the warehouse', fits: 'differs' };
      a.roleSignals = [item('rs', 'I sorted the stock and ran the loading bay')];
      a.areas = [item('a1', 'stock count', { area: 'Stock', fitsAPriority: 'no' }), item('a2', 'Westgate', { area: 'Sales', fitsAPriority: 'yes' }), item('a3', 'van', { area: 'Stock', fitsAPriority: 'no' })];
    }));
    const r = record(xs);
    expect(r.patterns.filter((p) => p.state === 'holds').map((p) => p.key).sort()).toEqual(['focus-away-from-the-priorities', 'overload', 'ownership', 'role-differs-from-given']);
    expect(r.role?.saying).toBe('Amani\'s role is Sales rep. In 3 check-ins, the work Amani described was something else, such as runs the warehouse. For example, Amani said "I sorted the stock and ran the loading bay."');
    expect(r.focus?.saying).toBe('Of the 9 pieces of work Amani talked about that can be set against the team\'s priorities, 3 served a priority and 6 did not. Most of it was about Stock, Sales.');
  });

  it('the same wait carried from one check-in to the next is one wait', () => {
    const xs = [1, 2].map((n) => seen(n, (a) => { a.blockers = [item('r1.blockers.0', 'waiting on Wanjiru', { triedSaid: 'I asked her on Thursday', ...(n > 1 ? { previousItem: 'r1.blockers.0' } : {}) })]; }));
    expect(holds(xs)).toEqual([]);
  });
});

describe('the next step for each pattern', () => {
  const upTo = (n: number) => record([1, 2, 3, 4, 5, 6].slice(0, n).map(slipped)).patterns;
  const run = (from: number, to: number) => {
    let steps: any[] = [];
    for (let n = from; n <= to; n += 1) steps = theInterventionsAfter(steps, upTo(n), { checkInId: `ci-${n}`, sessionNumber: n });
    return steps;
  };

  it('starts at a coaching question for the person, which happens on its own', () => {
    const [step] = run(2, 2);
    expect(step).toMatchObject({ key: 'slipping-promises', rung: 0, step: 'a coaching question', forWhom: 'the person', theLeadDecides: false, state: 'open' });
    expect(step.says).toBe('Which of the things you said you would do since last time is still open, and what day will you finish it?');
    expect(theSmallStepForThePerson([step], 'ci-2', 'p')?.lookingLike).toBe(step.says);
    expect(theSmallStepForThePerson([step], 'ci-2', 'somebody else')).toBeNull();
  });

  it('moves to the next step only when a later check-in shows it did not work, and stops when it did', () => {
    expect(run(2, 3)).toEqual([expect.objectContaining({ step: 'a clear expectation', rung: 1, followedUp: [{ checkInId: 'ci-3', sessionNumber: 3, worked: false }] })]);
    const first = run(2, 2);
    const better = record([slipped(1), slipped(2), seen(3, (a) => { a.comparedWithLastTime.promisesDue = [due('k', 'kept')]; })]).patterns;
    expect(theInterventionsAfter(first, better, { checkInId: 'ci-3', sessionNumber: 3 })).toEqual([
      expect.objectContaining({ step: 'a coaching question', state: 'worked', followedUp: [{ checkInId: 'ci-3', sessionNumber: 3, worked: true }] }),
    ]);
  });

  it('a conversation, a deadline, a plan and firing are always the lead\'s decision, and nothing moves past a step waiting for her', () => {
    for (const s of ['a conversation', 'a deadline', 'a plan', 'firing, when there are grounds'] as const) expect(THE_STEPS[s]).toEqual({ forWhom: 'the lead', theLeadDecides: true });
    expect(run(2, 4)[0]).toMatchObject({ step: 'a conversation', state: 'waiting for the lead', theLeadDecides: true });
    expect(run(2, 6)[0]).toMatchObject({ step: 'a conversation', state: 'waiting for the lead' });
    expect(THE_LADDER_FOR_WORK[THE_LADDER_FOR_WORK.length - 1]).toBe('firing, when there are grounds');
  });

  it('a strength is praise, suggested to the lead once', () => {
    const p = record([1, 2, 3].map((n) => seen(n, (a) => { a.comparedWithLastTime.promisesDue = [due(`k-${n}`, 'kept')]; }))).patterns;
    const [step] = theInterventionsAfter([], p, { checkInId: 'ci-3', sessionNumber: 3 });
    expect(step).toMatchObject({ step: 'praise', forWhom: 'the lead', theLeadDecides: false });
    /* (2 November 2026: each step names the person, never "them".) */
    expect(step.says).toBe('Thank Amani for this. Amani has kept 3 promises.');
  });

  it('too much on never climbs past a conversation with the lead', () => {
    const load = (n: number) => seen(n, (a) => { a.observations = [item('o', `too much ${n}`, { observed: 'overload' })]; });
    let steps: any[] = [];
    for (let n = 2; n <= 5; n += 1) steps = theInterventionsAfter(steps, record([1, 2, 3, 4, 5].slice(0, n).map(load)).patterns, { checkInId: `ci-${n}`, sessionNumber: n });
    expect(steps[0]).toMatchObject({ key: 'overload', step: 'a conversation', state: 'waiting for the lead' });
  });

  it('no step says a label about a person', () => {
    for (const s of run(2, 6)) expect(s.says).not.toMatch(/\b(PIP|exit|at risk|underperform|weak|poor performer|lazy)\b/i);
  });
});
