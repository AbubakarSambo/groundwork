import { whatIsDueFor, openingOnWhatIsDue } from './what-is-due-for-this-person';

const sessions = [
  { checkInId: 'c1', groundId: 'g1', label: 'Q4 delivery', standing: 'open to you' as const },
  { checkInId: null, groundId: 'g2', label: 'New hire: Ada', standing: 'waiting on you to start' as const },
  { checkInId: 'c3', groundId: 'g3', label: 'Not accepted', standing: 'invitation not accepted' as const },
];

describe('what is due counts only what this person can move', () => {
  it('open check-ins, grounds waiting on them, slipped commitments; never an unaccepted invitation', () => {
    const due = whatIsDueFor({ sessions, sessionNumbers: new Map([['c1', 2]]), leftOpen: new Map([['c1', ['finish the handover note']]]), slippedCommitments: 1 });
    expect(due.count).toBe(3);
    expect(due.checkIns[0]).toMatchObject({ checkInId: 'c1', sessionNumber: 2, leftOpen: ['finish the handover note'] });
    expect(due.toStart).toEqual([{ groundId: 'g2', label: 'New hire: Ada' }]);
  });

  it('is zero when nothing is waiting', () => {
    expect(whatIsDueFor({ sessions: [], sessionNumbers: new Map(), leftOpen: new Map(), slippedCommitments: 0 }).count).toBe(0);
  });
});

describe('the first line leads with the thing that is theirs to move', () => {
  it('names the open check-in, which session it is, what they left open, and offers to start it here', () => {
    const due = whatIsDueFor({ sessions, sessionNumbers: new Map([['c1', 2]]), leftOpen: new Map([['c1', ['finish the handover note']]]), slippedCommitments: 0 });
    const o = openingOnWhatIsDue(due, 'Ada');
    expect(o.source).toBe('session_open');
    expect(o.line).toContain('check-in 2 on "Q4 delivery" is open');
    expect(o.line).toContain('Last time you left this open: "finish the handover note"');
    expect(o.acts).toEqual([{ label: 'Start it', kind: 'open_a_check_in', id: 'c1' }]);
  });

  it('says "your first check-in" for session one', () => {
    const due = whatIsDueFor({ sessions: [sessions[0]], sessionNumbers: new Map(), leftOpen: new Map(), slippedCommitments: 0 });
    expect(openingOnWhatIsDue(due, 'Ada').line).toContain('your first check-in');
  });

  it('says "your first check-in" to somebody added while the team is on session 3', () => {
    const due = whatIsDueFor({ sessions: [sessions[0]], sessionNumbers: new Map([['c1', 3]]), theirFirst: new Set(['c1']), leftOpen: new Map(), slippedCommitments: 0 });
    const line = openingOnWhatIsDue(due, 'Ada').line;
    expect(line).toContain('your first check-in');
    expect(line).not.toContain('check-in 3');
  });

  it('a ground waiting on them to start comes with a chip that reads and confirms it', () => {
    const due = whatIsDueFor({ sessions: [sessions[1]], sessionNumbers: new Map(), leftOpen: new Map(), slippedCommitments: 0 });
    const o = openingOnWhatIsDue(due, 'Ada');
    expect(o.source).toBe('session_to_start');
    expect(o.acts[0]).toMatchObject({ kind: 'confirm_a_check_in', id: 'g2' });
  });
});
