import { aStoredSentenceReadsRight, everyStoredSentenceReadsRight } from './a-stored-sentence-reads-right';
import { withoutDashes } from './forensic-voice';
import { overTimeAsServed, overTimeForThisReader } from './what-the-record-shows-over-time';

/**
 * The sentences below are the ones stored on the local check-ins the existing-clients comparison read (the
 * support desk check-in 133ac1 and the three-person check-ins beside it), word for word. They were written
 * with a job title as the person's label and with the engine's old work words. Rows are never rewritten, so
 * they have to read right when they are served.
 */
const STORED_WAIT = 'Support manager. is waiting on the team responsible for the fix for "a fix for the broken export"; nothing on record about escalating it.';
const STORED_GAP = 'Account manager for Meridian. is down as "Account manager for Meridian" and nothing on record says what that covers. What the record holds: 1 check-in on record, 5 lines of what they said, 0 with a name, a number or a date in them, 0 backed by a document.';
const STORED_OWES = 'Data analyst. is waiting on Data engineer. for "access to the production data"; nothing on record about escalating it; this is work Data engineer. owes Data analyst., not the other way round.';

describe('a stored sentence reads right when it is served', () => {
  it('does not start a sentence in lower case after a label that ends in a full stop', () => {
    expect(withoutDashes(STORED_WAIT)).toBe('Support manager is waiting on the team responsible for the fix for "a fix for the broken export". Nothing on record says anybody has chased it since.');
    expect(withoutDashes(STORED_GAP)).toMatch(/^Account manager for Meridian is down as "Account manager for Meridian" and nothing/);
  });

  it('says what happened in plain words, with no escalating, and with the second and third sentences in capitals', () => {
    const out = withoutDashes(STORED_OWES);
    expect(out).toBe('Data analyst is waiting on Data engineer for "access to the production data". Nothing on record says anybody has chased it since. This is work Data engineer owes Data analyst, not the other way round.');
    expect(out).not.toMatch(/escalat/i);
    expect(out).not.toMatch(/[a-z]\. [a-z]/);
  });

  it('never changes words inside quotation marks', () => {
    const theirs = 'Sofia said "the plan is dead. is it?" and nothing on record about escalating it.';
    expect(aStoredSentenceReadsRight(theirs)).toBe('Sofia said "the plan is dead. is it?" and nothing on record says anybody has chased it since.');
  });

  it('leaves an unquoted quotation for the check that reads every line before it is kept', () => {
    const unquoted = 'Whether The three partnerships have had no progress since the sales work began. is still true.';
    expect(aStoredSentenceReadsRight(unquoted)).toBe(unquoted);
  });

  it('keeps a real abbreviation and a normal sentence as they are', () => {
    const fine = 'Ravi wants the cheaper supplier, e.g. the one in Kano, vs the one in Lagos, etc. and a date.';
    expect(aStoredSentenceReadsRight(fine)).toBe(fine);
  });

  it('puts the old words for what a person tried about a wait in plain words', () => {
    expect(aStoredSentenceReadsRight('Asked, and the record shows no escalation. It does not say whether anything happened outside the check-ins.'))
      .toBe('It was asked for, and nothing on record shows it was taken any further. It does not say whether anything happened outside the check-ins.');
    expect(aStoredSentenceReadsRight('Escalated it.')).toBe('It was taken above the person it was with.');
    expect(aStoredSentenceReadsRight('Escalated all 2.')).toBe('All 2 were taken above the person they were with.');
    expect(aStoredSentenceReadsRight('Escalated 1 of 3. The others were asked for and not escalated.'))
      .toBe('1 of 3 was taken above the person it was with. The others were asked for, and nothing more is on record.');
  });
});

describe('the over-time block, as the lead and as the person it is about', () => {
  const stored: any = {
    sessions: 2,
    commitments: [],
    dependencies: [
      { say: STORED_WAIT, from: 'Support manager.', on: 'the team responsible for the fix', what: 'a fix for the broken export', status: 'BLOCKING', fromParticipantId: 'p-1', onParticipantId: null },
    ],
    stillOpen: [STORED_WAIT],
    toSettleFirst: ['1 thing is waiting on somebody outside this check-in, unescalated. Ask what has been tried beyond writing to them.'],
    patterns: [], gaps: [], cannotTellYou: [],
  };

  it('tells the lead that nothing on record says anybody has chased it, not that nothing is on record about escalating it', () => {
    const lead = overTimeAsServed(stored)!;
    const text = JSON.stringify(lead);
    expect(text).not.toMatch(/escalat/i);
    expect(lead.dependencies[0].say).toMatch(/Nothing on record says anybody has chased it since\.$/);
    expect(lead.toSettleFirst[0]).toBe('1 thing is waiting on somebody outside this check-in, and nothing on record says anybody has chased it. Ask what has been tried beyond writing to them.');
  });

  it('tells the person who is waiting the same, in the same words', () => {
    const mine = overTimeForThisReader(stored, { isLead: false, participantId: 'p-1' })!;
    expect(JSON.stringify(mine)).not.toMatch(/escalat/i);
    expect(mine.dependencies[0].say).toMatch(/Nothing on record says anybody has chased it since\.$/);
  });
});

describe('the board, which composes sentences after the names are put in', () => {
  it('reads right for the lead, from the sentences of the local check-in with the co-founder and the cooperatives', () => {
    const board = {
      overTime: { commitments: [{ say: 'In session 1, Co-founder and CTO. Engineering, hiring and - he believes - product. committed to the epics will follow shortly after.' }] },
      timeline: [{ says: 'On 21 September, Lawal said the work was waiting on Microfinance banks. Cooperative leaders. for a system to vet farmers for credit.' }],
      whoOwnsWhat: { items: [{ theirWords: 'He also needs to improve his attitude. be more positive', text: 'You said it.' }] },
    };
    const out = everyStoredSentenceReadsRight(board);
    expect(out.overTime.commitments[0].say).toBe('In session 1, Co-founder and CTO. Engineering, hiring and - he believes - product committed to the epics will follow shortly after.');
    expect(out.timeline[0].says).toBe('On 21 September, Lawal said the work was waiting on Microfinance banks. Cooperative leaders for a system to vet farmers for credit.');
    expect(out.whoOwnsWhat.items[0].theirWords).toBe(board.whoOwnsWhat.items[0].theirWords);
  });
});
