import {
  readsAsAProfile,
  whyThisIsNotAContribution,
  contributionRead,
  nameTheTension,
  suggestsAnAnswer,
  type Contribution,
} from './role-clarity-is-not-a-score';

/**
 * WHAT THE JOB IS, NOT WHAT THE PERSON IS. (G20, G36)
 *
 * "Living capability profile" was rejected outright and stays rejected: a
 * persistent score on a person, updated forever, following them between grounds.
 * But a living record of what somebody is HERE TO CONTRIBUTE is role clarity
 * rather than a score, and it is exactly what Abubakar did not have. The two were
 * thrown out together and only one of them deserved it.
 *
 * One question separates them:
 *
 *   "owns the migration and the handover to support"    the job
 *   "strong on delivery, developing on judgement"       the person, forever
 *
 * The first changes when the work changes. The second is a grade.
 *
 * G36 is the same material one step further: name a tension, and stop. Naming is
 * inside the guardrail. Resolving is somebody else's decision being made by a
 * product that has never met the client.
 */

describe('a contribution record is about the work', () => {
  const real = [
    'Owns the migration and the handover to support',
    'Runs the weekly client review and writes the follow-up',
    'The only person who can approve a refund over five hundred',
  ];

  it('accepts descriptions of a job', () => {
    for (const text of real) {
      expect({ text, hit: readsAsAProfile(text) }).toMatchObject({ hit: null });
    }
  });

  const profiles = [
    'Strong on delivery, developing on judgement',
    'Good at client work, needs to improve on planning',
    'Areas for development: stakeholder management',
    'Currently operating at a mid level',
    'Weaknesses around follow-through',
    'High potential',
  ];

  it('refuses descriptions of a person', () => {
    // THE REGRESSION. Every one of these is what a lead in a hurry writes - not
    // maliciously, just because it is the vocabulary the rest of their working
    // life uses. Which is exactly why the check cannot be a guideline.
    for (const text of profiles) {
      expect({ text, hit: readsAsAProfile(text) }).not.toMatchObject({ hit: null });
    }
  });

  it('says why, and asks the question that rescues the thought', () => {
    const why = whyThisIsNotAContribution('Strong on delivery');
    expect(why).toMatch(/describes the person rather than the work/);
    expect(why).toMatch(/What is this person here to do\?/);
  });

  it('and says nothing when there is nothing to say', () => {
    expect(whyThisIsNotAContribution(real[0])).toBeNull();
  });
});

describe('whose description of the job exists', () => {
  const c = (saidBy: Contribution['saidBy']): Contribution =>
    ({ participantId: 'p', text: 'owns the migration', saidBy, lastRestatedAtSession: 1 });

  it('calls both versions existing the useful case, and says why', () => {
    expect(contributionRead(c('the lead'), c('themselves')).line)
      .toMatch(/If those two descriptions differ, that difference is the most useful thing/);
  });

  it('notices when only the lead has said it', () => {
    expect(contributionRead(c('the lead'), null).line).toMatch(/Nobody has checked whether the two match/);
  });

  it('notices when only they have', () => {
    // The quiet one: somebody working hard to a description nobody else holds.
    expect(contributionRead(null, c('themselves')).line)
      .toMatch(/working to a description nobody else holds/);
  });

  it('and calls the empty case the finding', () => {
    // Abubakar's case. "Insufficient data" would send somebody to fill a field
    // in; this says what it means.
    const { state, line } = contributionRead(null, null);
    expect(state).toBe('neither');
    expect(line).toMatch(/usually the finding rather than a gap in the setup/);
  });
});

describe('naming a tension, and stopping there', () => {
  it('names both things and says the record does not settle it', () => {
    const line = nameTheTension({
      one: 'Keeping the queue clear',
      other: 'expecting client ownership in the same quarter',
    });
    expect(line).toMatch(/are in tension/);
    expect(line).toMatch(/both are currently being expected at once/);
  });

  it('quotes whoever settled it rather than agreeing with them', () => {
    // The product reports a decision. It does not endorse one.
    expect(nameTheTension({ one: 'A', other: 'b', settledBy: 'The brief from session 2' }))
      .toMatch(/is the only thing in the record that says which one gives/);
  });

  it('never suggests an answer', () => {
    // THE LINE G36 SITS ON. Everything about this is fine until one sentence
    // suggests which side gives, and that sentence is easy to write by accident
    // because it is what a helpful person says next.
    for (const t of [
      { one: 'A', other: 'b' },
      { one: 'A', other: 'b', settledBy: 'her note in session 3' },
    ]) {
      expect({ t, hit: suggestsAnAnswer(nameTheTension(t)) }).toMatchObject({ hit: null });
    }
  });

  it('and catches the sentences that would', () => {
    for (const line of [
      'You should prioritise ownership here.',
      'We recommend focusing on the queue first.',
      'The right call is probably to drop the second one.',
      'It would be better to pick one.',
    ]) {
      expect({ line, hit: suggestsAnAnswer(line) }).not.toMatchObject({ hit: null });
    }
  });
});
