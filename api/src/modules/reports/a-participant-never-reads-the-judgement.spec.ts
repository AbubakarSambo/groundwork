import { whatAParticipantMayRead, onlyTheirOwnFinding, theBoardsJudgementFor, NOT_A_PARTICIPANT_READ } from './the-judgement-is-the-leads';

/**
 * NATHAN ASKED FOR HIS OWN REPORT AND WAS HANDED HIS MANAGER'S.
 *
 * The live run of 25 September 2026 is the fixture. Sixteen of twenty-four scenarios served the
 * participant a `theJudgement` that was character-for-character the lead's, and in the
 * performance-plan scenario it read: "The initiator is about to put Nathan on a formal plan for not
 * hitting a target Nathan does not know exists."
 *
 * This holds the rule at the only place it can be held - the read - and it holds it as BEHAVIOUR.
 * An earlier draft asserted that the serve path named the helper, which stays true if somebody
 * deletes the call and leaves the import.
 */

/** The real shape, trimmed: every key the run showed a participant receiving. */
const AS_SERVED = {
  id: 'r1',
  groundId: 'g1',
  sharedPicture: 'Two people have checked in.',
  agreements: ['Both say the renewals target matters.'],
  centralQuestion: 'What was Nathan actually told?',
  theJudgement: {
    theGap: 'The initiator is about to put Nathan on a formal plan for not hitting a target Nathan does not know exists.',
    whatToDo: [{ move: "Close your two open actions: to 'put Nathan on a formal plan'.", because: '...', startWith: 'the initiator' }],
  },
  theTable: 'FIELD: renewals · standing: THIN · asked 4 · answered 3',
  divergences: [{ topic: 'The renewals target', positions: [{ label: 'the initiator', says: 'eight' }] }],
  leadershipGaps: ['Nothing was written down.'],
  networkPicture: { loadBearing: ['nathan'] },
  inferences: ['The target moved without being said.'],
  arcSignals: { p2: { tier: 'CONCENTRATED_FINISH' } },
  direction: 'Settle the target first.',
  findings: [
    { participantId: 'p-nathan', label: 'participant A', text: 'Nathan reports six renewals.' },
    { participantId: 'p-caroline', label: 'the initiator', text: 'Caroline expects eight and has not said so.' },
  ],
};

const asNathan = { isLead: false, participantId: 'p-nathan' };
const asCaroline = { isLead: true, participantId: null };

describe('a participant never reads the lead’s judgement', () => {
  it('carries no theJudgement at all', () => {
    const out: any = whatAParticipantMayRead(AS_SERVED, asNathan);
    expect(out.theJudgement).toBeUndefined();
    expect('theJudgement' in out).toBe(false);
  });

  it('carries no sentence from the lead’s layer anywhere in it', () => {
    /* The real test, and the one that catches a field added to the report table next year: search
       the whole served object for the words the lead was given. */
    const out = whatAParticipantMayRead(AS_SERVED, asNathan);
    const text = JSON.stringify(out);
    expect(text).not.toContain('formal plan');
    expect(text).not.toContain('Nathan does not know exists');
    expect(text).not.toContain('FIELD:');
    expect(text).not.toContain('standing: THIN');
    expect(text).not.toContain('Caroline expects eight');
  });

  it('drops every field written for the lead, by name', () => {
    const out: any = whatAParticipantMayRead(AS_SERVED, asNathan);
    const stillThere = NOT_A_PARTICIPANT_READ.filter((key) => key in out);
    expect(stillThere).toEqual([]);
  });

  it('keeps theDirection, which is the room’s own account and is narrowed elsewhere', () => {
    /* The stored `direction` column goes; the presented one is re-added per reader further down the
       assembly and is already different for a lead and a participant on a discovery session. */
    const out: any = whatAParticipantMayRead({ ...AS_SERVED, theDirection: { saying: 'Everybody named something different.' } }, asNathan);
    expect(out.direction).toBeUndefined();
    expect(out.theDirection).toEqual({ saying: 'Everybody named something different.' });
  });

  it('keeps the shared picture, because that is what a check-in is for', () => {
    const out: any = whatAParticipantMayRead(AS_SERVED, asNathan);
    expect(out.sharedPicture).toBe('Two people have checked in.');
    expect(out.agreements).toEqual(['Both say the renewals target matters.']);
    expect(out.centralQuestion).toBe('What was Nathan actually told?');
  });

  it('keeps their own finding and loses everybody else’s', () => {
    const out: any = whatAParticipantMayRead(AS_SERVED, asNathan);
    expect(out.findings).toHaveLength(1);
    expect(out.findings[0].participantId).toBe('p-nathan');
  });

  it('gives the lead the whole thing back, untouched', () => {
    const out: any = whatAParticipantMayRead(AS_SERVED, asCaroline);
    expect(out).toEqual(AS_SERVED);
    expect(out.theJudgement.theGap).toContain('formal plan');
  });

  it('does not mutate what it was given', () => {
    const before = JSON.stringify(AS_SERVED);
    whatAParticipantMayRead(AS_SERVED, asNathan);
    expect(JSON.stringify(AS_SERVED)).toBe(before);
  });

  it('a finding that cannot say whose it is goes to nobody', () => {
    expect(onlyTheirOwnFinding([{ text: 'someone said something' }], 'p-nathan')).toEqual([]);
    expect(onlyTheirOwnFinding(AS_SERVED.findings, null)).toEqual([]);
  });
});

describe('and neither does their board', () => {
  it('hands a participant nothing, released or not', () => {
    expect(theBoardsJudgementFor(AS_SERVED, { isLead: false })).toEqual({ theJudgement: null, theTable: null });
  });

  /*
   * CHANGED 26 SEPTEMBER 2026, AND WHAT IT USED TO SAY IS THE REASON. This read "hands the lead
   * both" and pinned `out.theTable` being the stored table. The lead was the one reader nothing
   * protected from it, and what they were handed is the engine's counting sheet:
   *
   *   standing: THIN - only 1 people answered, which is too few to rank
   *   asked 4 · answered 3 · said they cannot 0 · never reached 1
   *
   * Slot names, dotted counts, "1 people", a lower-case sentence, and a standing on how a person's
   * answers were rated - which a lead may never read at all. 400 machine-table words on the lead's
   * board across the twenty-four scenarios. So the table now reaches nobody, and the assertion is
   * the opposite one. See the-table-is-for-the-engine. (Task 1.2, fix 4.)
   */
  it('hands the lead the judgement, and the machine\'s table to nobody', () => {
    const out = theBoardsJudgementFor(AS_SERVED, { isLead: true });
    expect(out.theJudgement).toBe(AS_SERVED.theJudgement);
    expect(out.theTable).toBeNull();
  });

  it('survives a ground with no report yet', () => {
    expect(theBoardsJudgementFor(null, { isLead: true })).toEqual({ theJudgement: null, theTable: null });
    expect(theBoardsJudgementFor(undefined, { isLead: false })).toEqual({ theJudgement: null, theTable: null });
  });
});
