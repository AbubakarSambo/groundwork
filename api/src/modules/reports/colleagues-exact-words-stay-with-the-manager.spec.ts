import { isEvaluationCheckIn, theSubjectOfAnEvaluationCheckIn, viewerIsTheSubjectOfAnEvaluationCheckIn } from './is-this-an-evaluation-check-in';
import { whatEachPersonSaidForTheSubject, whoOwnsWhatForTheSubject, divergenceForTheSubject, withoutColleaguesQuotesForTheSubject, deeplyWithoutColleaguesQuotesForTheSubject } from './colleagues-exact-words-stay-with-the-manager';

/**
 * PART 3, HAFSAH'S RULING, 30 SEPTEMBER 2026: in an evaluation check-in, the person being reviewed
 * reads the facts, and the decision with its reasons - never a colleague's exact words. Those go
 * only to the manager, and an admin reads as the manager does. A colleague who gave a view reads
 * what they read today. This file proves the ONE helper that decides which check-ins these are,
 * and the pure functions that redact colleagues' exact words for the one reader they change for.
 *
 * See colleagues-stays-with-the-manager.spec.ts (reports.service.ts) and
 * a-colleague-stays-with-the-manager-on-the-board.spec.ts (board.service.ts) for the served-output
 * proof, through the real read paths, for the subject, the manager, an admin and a colleague.
 */

describe('isEvaluationCheckIn: the one place a check-in is known to be one', () => {
  it('is true for the three scenarios decision 17 names: a performance plan, a promotion, a renewal', () => {
    expect(isEvaluationCheckIn('PIP' as any)).toBe(true);
    expect(isEvaluationCheckIn('RECOGNITION' as any)).toBe(true);
    expect(isEvaluationCheckIn('CONTRACT_RENEWAL' as any)).toBe(true);
  });

  /* Changed with decision 75, item 25: a probation or a new person's first 90 days (NEW_HIRE) is an evaluation
     check-in, as the prototype shows for Kwame. A new manager's first weeks are still not one. */
  it('is true for a probation or first 90 days, and false for a new manager', () => {
    expect(isEvaluationCheckIn('NEW_HIRE' as any)).toBe(true);
    expect(isEvaluationCheckIn('NEW_MANAGER' as any)).toBe(false);
    expect(isEvaluationCheckIn('NEW_ADVISOR' as any)).toBe(false);
  });

  it('is false for an ordinary team check-in, and for a cohort (which has no single subject)', () => {
    expect(isEvaluationCheckIn('OKR_ALIGNMENT' as any)).toBe(false);
    expect(isEvaluationCheckIn('PULSE_CHECK' as any)).toBe(false);
    expect(isEvaluationCheckIn('COHORT_CHECK' as any)).toBe(false);
  });

  it('is false for no scenario at all', () => {
    expect(isEvaluationCheckIn(null)).toBe(false);
    expect(isEvaluationCheckIn(undefined)).toBe(false);
  });
});

describe('theSubjectOfAnEvaluationCheckIn: the earliest non-lead party, never the lead or a managing-only row', () => {
  const p = (id: string, partyType: string, createdAt: string, managingOnly = false) => ({ id, partyType, createdAt, managingOnly });

  it('is the sole non-lead party on a two-person ground (PIP, a renewal)', () => {
    const participants = [p('lead', 'INITIATOR', '2026-09-01'), p('subject', 'PARTICIPANT', '2026-09-02')];
    expect(theSubjectOfAnEvaluationCheckIn(participants)).toBe('subject');
  });

  it('is the FIRST non-lead party added, where a recognition round later added a colleague to give a view', () => {
    const participants = [
      p('lead', 'INITIATOR', '2026-09-01'),
      p('subject', 'PARTICIPANT', '2026-09-02'),
      p('colleague', 'PARTICIPANT', '2026-09-05'),
    ];
    expect(theSubjectOfAnEvaluationCheckIn(participants)).toBe('subject');
    /* Order in the array does not matter, only createdAt. */
    expect(theSubjectOfAnEvaluationCheckIn([participants[2], participants[0], participants[1]])).toBe('subject');
  });

  it('skips a managing-only row: it gives no account of its own and is never the subject', () => {
    const participants = [
      p('lead', 'INITIATOR', '2026-09-01'),
      p('helper', 'PARTICIPANT', '2026-09-02', true),
      p('subject', 'PARTICIPANT', '2026-09-03'),
    ];
    expect(theSubjectOfAnEvaluationCheckIn(participants)).toBe('subject');
  });

  it('is null with nobody but the lead', () => {
    expect(theSubjectOfAnEvaluationCheckIn([p('lead', 'INITIATOR', '2026-09-01')])).toBeNull();
  });
});

describe('viewerIsTheSubjectOfAnEvaluationCheckIn: false for the lead, an admin, and a colleague; true only for the subject reading their own copy', () => {
  const participants = [
    { id: 'lead', partyType: 'INITIATOR', createdAt: '2026-09-01' },
    { id: 'subject', partyType: 'PARTICIPANT', createdAt: '2026-09-02' },
    { id: 'colleague', partyType: 'PARTICIPANT', createdAt: '2026-09-05' },
  ];

  it('is true for the subject reading a PIP', () => {
    expect(viewerIsTheSubjectOfAnEvaluationCheckIn({
      scenario: 'PIP' as any, isLead: false, viewerParticipantId: 'subject', participants,
    })).toBe(true);
  });

  it('is false for the manager, even though they are not the subject', () => {
    expect(viewerIsTheSubjectOfAnEvaluationCheckIn({
      scenario: 'PIP' as any, isLead: true, viewerParticipantId: 'lead', participants,
    })).toBe(false);
  });

  it('is false for an admin, treated like the manager (morning report, item 4)', () => {
    expect(viewerIsTheSubjectOfAnEvaluationCheckIn({
      scenario: 'PIP' as any, isLead: true, viewerParticipantId: null, participants,
    })).toBe(false);
  });

  it('is false for a colleague who gave a view - only the subject is walled', () => {
    expect(viewerIsTheSubjectOfAnEvaluationCheckIn({
      scenario: 'RECOGNITION' as any, isLead: false, viewerParticipantId: 'colleague', participants,
    })).toBe(false);
  });

  it('is false on an ordinary check-in, even for the non-lead party', () => {
    expect(viewerIsTheSubjectOfAnEvaluationCheckIn({
      scenario: 'OKR_ALIGNMENT' as any, isLead: false, viewerParticipantId: 'subject', participants,
    })).toBe(false);
  });
});

describe('whatEachPersonSaidForTheSubject: colleagues\' lines are taken out; the subject\'s own row is untouched', () => {
  it('keeps the subject\'s own row exactly as given, lines and all', () => {
    const rows = [{ who: 'You', isYou: true, lines: ['Closed 14 tickets this week.'] }];
    expect(whatEachPersonSaidForTheSubject(rows)).toEqual(rows);
  });

  it('drops a colleague\'s lines and says so, when no written sentence exists yet', () => {
    const rows: any[] = [
      { who: 'You', isYou: true, lines: ['Closed 14 tickets this week.'] },
      { who: 'A colleague', isYou: false, lines: ['Ade has been slow to answer two escalations.'], lineMarks: ['said'] },
    ];
    const out = whatEachPersonSaidForTheSubject(rows);
    expect(out[0]).toEqual(rows[0]);
    expect(out[1].lines).toEqual([]);
    expect(out[1]).not.toHaveProperty('lineMarks');
    expect(out[1].saying).toContain('not shown to you here');
    expect(JSON.stringify(out)).not.toContain('escalations');
  });

  it('keeps an already-written sentence, since that is already the facts, in the product\'s own words', () => {
    const rows: any[] = [{ who: 'A colleague', isYou: false, lines: ['Ade has been slow.'], saying: 'Has flagged two escalations as slow to close.' }];
    const out = whatEachPersonSaidForTheSubject(rows);
    expect(out[0].lines).toEqual([]);
    expect(out[0].saying).toBe('Has flagged two escalations as slow to close.');
  });

  it('is a no-op on an empty or missing list', () => {
    expect(whatEachPersonSaidForTheSubject(null)).toEqual([]);
    expect(whatEachPersonSaidForTheSubject([])).toEqual([]);
  });
});

describe('whoOwnsWhatForTheSubject: the subject\'s own row is untouched, a colleague\'s items lose their words, not their shape', () => {
  it('keeps the subject\'s row, and empties only the text on a colleague\'s items', () => {
    const rows = [
      { participantId: 'subject', name: 'You', items: [{ id: 'i1', type: 'COMMITMENT', text: 'Ship the report by Friday.', mark: 'proven' }] },
      { participantId: 'colleague', name: 'A colleague', items: [{ id: 'i2', type: 'COMMITMENT', text: 'Cover for Ade next sprint.', mark: 'said' }] },
    ];
    const out = whoOwnsWhatForTheSubject(rows, 'subject');
    expect(out[0]).toEqual(rows[0]);
    expect(out[1].items[0].text).not.toBe('Cover for Ade next sprint.');
    expect(out[1].items[0].id).toBe('i2');
    expect(out[1].items[0].mark).toBe('said');
  });
});

describe('divergenceForTheSubject: a colleague\'s account of where they stand loses its words; the subject\'s own account does not', () => {
  it('replaces view (and the older position field) on a colleague\'s side, and leaves the subject\'s own side untouched', () => {
    const items = [{
      topic: 'Whether the deadline moved',
      positions: [
        { participantLabel: 'Ade Bello', who: 'Ade Bello', view: 'Says the deadline is still Friday.' },
        { participantLabel: 'A colleague', who: 'A colleague', view: 'Says Ade agreed to push it to Monday.' },
      ],
    }];
    const out = divergenceForTheSubject(items, ['Ade Bello']);
    expect(out[0].positions[0].view).toBe('Says the deadline is still Friday.');
    expect(out[0].positions[1].view).toContain('not shown to you here');
    expect(JSON.stringify(out)).not.toContain('Monday');
  });

  it('with no name given to match against, still leaves nothing unstripped as "theirs" by accident', () => {
    const items = [{ topic: 't', positions: [{ who: 'A colleague', view: 'Says something specific.' }] }];
    const out = divergenceForTheSubject(items);
    expect(out[0].positions[0].view).toContain('not shown to you here');
  });
});

describe('withoutColleaguesQuotesForTheSubject: a quote of a colleague\'s words becomes a fact; the subject\'s own quote stays', () => {
  const subjectRecord = ['Closed 14 support tickets this week and started the new onboarding flow.'];

  it('leaves the subject\'s own quote untouched, character for character', () => {
    const text = 'Ade says "Closed 14 support tickets this week and started the new onboarding flow."';
    expect(withoutColleaguesQuotesForTheSubject(text, subjectRecord)).toBe(text);
  });

  it('takes the quoted passage out of a colleague\'s sentence, replacing the sentence where nothing sensible is left', () => {
    const text = 'Chidi says "Ade has been slow to answer two escalations, and I had to step in on the Kessler account."';
    const out = withoutColleaguesQuotesForTheSubject(text, subjectRecord);
    expect(out).not.toContain('Kessler');
    expect(out).not.toContain('escalations');
    expect(out).toContain('A colleague described this differently.');
  });

  it('keeps a colleague\'s quote out and the subject\'s own quote in, in the same passage', () => {
    const text = 'Ade says "Closed 14 support tickets this week and started the new onboarding flow." Chidi says "Ade has been slow to answer two escalations, and I had to step in on the Kessler account." Both accounts describe the same week.';
    const out = withoutColleaguesQuotesForTheSubject(text, subjectRecord);
    expect(out).toContain('Closed 14 support tickets this week and started the new onboarding flow.');
    expect(out).not.toContain('Kessler');
    expect(out).toContain('Both accounts describe the same week.');
  });

  it('is a no-op on text with no quotes at all', () => {
    const text = 'Nothing quoted here, just a plain sentence.';
    expect(withoutColleaguesQuotesForTheSubject(text, subjectRecord)).toBe(text);
  });

  it('fails closed: a quote that matches nobody\'s given record is still taken out, not left in', () => {
    const text = 'Somebody says "a phrase that matches no record line at all."';
    const out = withoutColleaguesQuotesForTheSubject(text, []);
    expect(out).not.toContain('matches no record line');
  });
});

describe('deeplyWithoutColleaguesQuotesForTheSubject: walks a whole report-shaped value, leaving labels alone', () => {
  const subjectRecord = ['Closed 14 support tickets this week.'];

  it('walks sharedPicture, theOpening, agreements and findings[].text, never a label field', () => {
    const value = {
      sharedPicture: 'Ade says "Closed 14 support tickets this week."',
      theOpening: 'Chidi says "the Kessler account was a mess this week."',
      agreements: ['Chidi says "the Kessler account was a mess this week."'],
      findings: [{ participantId: 'colleague', label: 'Chidi says "the Kessler account was a mess this week."', text: 'Chidi says "the Kessler account was a mess this week."' }],
    };
    const out = deeplyWithoutColleaguesQuotesForTheSubject(value, subjectRecord);
    expect(out.sharedPicture).toContain('Closed 14 support tickets this week.');
    expect(out.theOpening).not.toContain('Kessler');
    expect(out.agreements[0]).not.toContain('Kessler');
    expect(out.findings[0].text).not.toContain('Kessler');
    /* `label` is not prose - left exactly as given, quote marks and all. */
    expect(out.findings[0].label).toContain('Kessler');
  });
});
