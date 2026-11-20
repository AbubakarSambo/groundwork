import { NOTHING_NEEDS_YOU, theSalesDirectMorning, theMorningSaysOnlyThatNothingNeedsYou, theTargetLines, withNothingNeedsYou } from './the-direct-morning';

/** The lead's morning letter, 17 November end-to-end check: "0 of 30 sold, 30 short of 30" for a team nobody counted, and 42 letters saying nothing needs her. */
describe('the target line of a team nobody has counted a sale for', () => {
  const board = { objectives: [{ name: 'The team sells 30', target: 30, count: 0, ownerParticipantId: null }], workRecords: [] };
  it('says the target and that nothing is counted, never "0 of 30 sold"', () => {
    const t = theTargetLines(board, new Date('2026-10-20T07:00:00Z'), 'Africa/Nairobi');
    expect(t.lines[0].text).toBe('The team target is 30, and nothing is counted against it yet.');
    expect(t.gap).toBeNull();
  });

  /* Run 4, 18 November: every one of 32 letters said "0 of 30 sold, 30 short, and no open deal covers any of it" while Asha, Joel and Sam said 25, 27 and 29. */
  /* Cycle 6, 18 November: what each person said is kept beside the target (saidBy), not as a count on a made-up aim of theirs. */
  const taaSolar = {
    objectives: [
      {
        name: 'The team sells 30 lanterns', target: 30, count: 0, ownerParticipantId: null, fromTheDeals: { counts: 'units', sold: 0, proven: 0, shown: 0, says: '0 sold' },
        saidBy: [
          { participantId: 'p-asha', name: 'Asha Wanjiru', count: 25, said: 'I sold 25 lanterns last week.', atSession: 6 },
          { participantId: 'p-joel', name: 'Joel Otieno', count: 27, said: 'I sold 27 lanterns last week.', atSession: 6 },
          { participantId: 'p-sam', name: 'Sam Kimani', count: 29, said: 'I sold 29 lanterns last week.', atSession: 6 },
        ],
      },
    ],
    workRecords: [],
  };
  it('says what people said and that none of it is proven, when the board counts nothing from deals', () => {
    const t = theTargetLines(taaSolar, new Date('2026-12-14T07:00:00Z'), 'Africa/Nairobi');
    expect(t.lines[0].text).toBe('The team target is 30. Asha said 25, Joel said 27 and Sam said 29, which is 81 between them, and none of it is on a deal yet, so none of it is proven.');
    expect(t.gap).toBeNull();
    expect(t.lines[0].text).not.toMatch(/0 of 30|short|no open deal/);
  });
  /* Run 5, 19 November: the real board had one deal row, a shop named in a check-in with no number of units, so "no deal on record" was false and all 18 letters kept the old line. */
  it('is the same line when the board holds a deal that carries no number of units', () => {
    const real = { ...taaSolar, workRecords: [{ section: 'Deal grid', rows: [{ name: 'Mama Njeri stores', kind: 'deal', group: 'possible', stage: null, fields: { 'Decision maker': 'the owner' } }] }] };
    const t = theTargetLines(real, new Date('2026-12-14T07:00:00Z'), 'Africa/Nairobi');
    expect(t.lines[0].text).toBe('The team target is 30. Asha said 25, Joel said 27 and Sam said 29, which is 81 between them, and none of it is on a deal yet, so none of it is proven.');
    expect(t.gap).toBeNull();
    const bare = theTargetLines({ objectives: [{ name: 'The team sells 30', target: 30, count: 0, ownerParticipantId: null }], workRecords: real.workRecords }, new Date('2026-12-14T07:00:00Z'), 'Africa/Nairobi');
    expect(bare.lines[0].text).toBe('The team target is 30, and nothing is counted against it yet.');
  });
  it('names only those who said a number in the newest round, and never reads a stored count as something said', () => {
    const board = {
      objectives: [{
        name: 'The team sells 30 lanterns', target: 30, count: 0, ownerParticipantId: null,
        saidBy: [
          { participantId: 'p-asha', name: 'Asha Wanjiru', count: 22, said: 'I sold 22.', atSession: 5 },
          { participantId: 'p-joel', name: 'Joel Otieno', count: 27, said: 'I sold 27.', atSession: 6 },
        ],
      }, { name: 'Sell 30 lanterns a week', target: 30, count: 25, ownerParticipantId: 'p-sam', owner: 'Sam Kimani' }],
      workRecords: [],
    };
    expect(theTargetLines(board, new Date('2026-12-14T07:00:00Z'), 'Africa/Nairobi').lines[0].text).toBe('The team target is 30. Joel said 27, and none of it is on a deal yet, so none of it is proven.');
  });
  it('does not put "30 short of 30" in the letter subject', () => {
    const letter = theSalesDirectMorning({
      groundId: 'g', label: 'Taa Solar sales', board: taaSolar, people: [], hers: new Set(), waits: [], deals: [], carried: [], sales: [], lastCheckIn: {}, firstOpened: {}, lines: [],
      now: new Date('2026-12-14T07:00:00Z'), zone: 'Africa/Nairobi',
    } as any);
    expect(letter.subjectAfterTheName).not.toMatch(/short of/);
    expect(JSON.stringify(letter.parts)).toContain('none of it is proven');
  });
});

describe('a morning that only says nothing needs the lead', () => {
  const part = (key: any, lines: any[]) => ({ key, heading: key, lead: '', lines });
  const morning = (parts: any[]) => ({ groundId: 'g', label: 'x', kind: 'sales', parts, subjectAfterTheName: '' } as any);
  it('is not sent', () => {
    const { parts } = withNothingNeedsYou([part('target', [{ text: 'The team target is 30, and nothing is counted against it yet.', rank: 0 }]), part('needsYou', []), part('closing', []), part('team', [{ text: 'Peter has not checked in today.', rank: 10, boardOnly: true }])]);
    expect(parts.find((p) => p.key === 'needsYou')!.lines[0].text).toBe(NOTHING_NEEDS_YOU);
    expect(theMorningSaysOnlyThatNothingNeedsYou(morning(parts))).toBe(true);
  });
  it('is sent when somebody needs her, or something is about to close', () => {
    expect(theMorningSaysOnlyThatNothingNeedsYou(morning([part('needsYou', [{ text: 'Joseph needs your yes.', rank: 1 }])]))).toBe(false);
    expect(theMorningSaysOnlyThatNothingNeedsYou(morning([part('needsYou', [{ text: NOTHING_NEEDS_YOU, rank: 1 }]), part('closing', [{ text: 'Round 3 closes today.', rank: 1 }])]))).toBe(false);
  });

  /* Run 8, 22 November: 21 of 43 letters read "0 of 30 sold, 30 short, and no open deal covers any of it" because a deal held units, while Sam and Asha said 11 and 10. */
  it('says what people said beside the target when a deal holds units but nothing is counted as sold', () => {
    const board = {
      objectives: [{
        name: 'The team sells 30 lanterns', target: 30, count: 0, ownerParticipantId: null, fromTheDeals: { counts: 'units', sold: 0, proven: 0, shown: 0, says: '0 sold' },
        saidBy: [
          { participantId: 'p-sam', name: 'Sam Otieno', count: 11, said: 'I sold 11 this week.', atSession: 6 },
          { participantId: 'p-asha', name: 'Asha Mohamed', count: 10, said: 'I sold 10 this week.', atSession: 6 },
        ],
      }],
      workRecords: [{ section: 'Deal grid', rows: [{ name: 'Mama Njeri stores', kind: 'deal', group: 'possible', stage: null, fields: { Units: '8' } }] }],
    };
    const t = theTargetLines(board, new Date('2026-12-14T07:00:00Z'), 'Africa/Nairobi');
    expect(t.lines[0].text).toBe('The team target is 30. Sam said 11 and Asha said 10, which is 21 between them, and none of it is counted as sold yet, so none of it is proven.');
    expect(t.lines[0].text).not.toMatch(/0 of 30|short|no open deal/);
  });
  it('still says the count, with what people said after it, when something is counted as sold', () => {
    const board = {
      objectives: [{
        name: 'The team sells 30 lanterns', target: 30, count: 5, ownerParticipantId: null, fromTheDeals: { counts: 'units', sold: 5, proven: 5, shown: 5, says: '5 sold' },
        saidBy: [
          { participantId: 'p-sam', name: 'Sam Otieno', count: 11, said: 'I sold 11 this week.', atSession: 6 },
          { participantId: 'p-asha', name: 'Asha Mohamed', count: 10, said: 'I sold 10 this week.', atSession: 6 },
        ],
      }],
      workRecords: [],
    };
    const t = theTargetLines(board, new Date('2026-12-14T07:00:00Z'), 'Africa/Nairobi');
    expect(t.lines[0].text).toMatch(/^5 of 30 sold, 5 paid, 25 short, and no open deal covers any of it\. Sam said 11 and Asha said 10, which is 21 between them\.$/);
  });
});
