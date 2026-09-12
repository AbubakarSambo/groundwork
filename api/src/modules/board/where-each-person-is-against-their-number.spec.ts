import {
  whereEachPersonIs, whyThisRow, behindThePace, whatToAskFor,
  WHAT_THE_REASON_MEANS, type PersonRow,
} from './where-each-person-is-against-their-number';

const rep = (over: Partial<PersonRow> = {}): PersonRow => ({
  participantId: 'p1', who: 'Musa', target: 35, count: 10,
  answeredThisRound: true, roundsSoFar: 4, inTheWay: [], saidAnythingCheckable: true, ...over,
});

describe('where each person is against their number', () => {
  it('puts somebody who has not checked in above everything else', () => {
    const out = whereEachPersonIs([rep(), rep({ participantId: 'p2', who: 'Amina', answeredThisRound: false })], 12);
    expect(out[0].who).toBe('Amina');
    expect(out[0].reason).toBe('has not answered');
    expect(out[0].ask).toBe('Ask them to check in.');
  });

  it('then somebody stuck a fortnight who has only asked', () => {
    const r = rep({ inTheWay: [{ what: 'the Sokoto lease', owner: null, days: 21, tried: 'asked-again' }] });
    expect(whyThisRow(r, 12)).toBe('stuck and not chasing');
    expect(whatToAskFor(r)).toContain('21 days');
    expect(whatToAskFor(r)).toContain('Ask them to');
  });

  it('and says nothing about somebody who actually pushed', () => {
    const r = rep({ inTheWay: [{ what: 'the lease', owner: 'Adeola', days: 30, tried: 'escalated' }] });
    expect(whyThisRow(r, 12)).toBe('nothing to do');
    expect(whatToAskFor(r)).toBeNull();
  });

  it('reads behind the pace against the calendar, never against another person', () => {
    /* 4 of 12 rounds gone is a third; 35 x 0.33 x 0.8 is about 9. */
    expect(behindThePace(rep({ count: 4 }), 12)).toBe(true);
    expect(behindThePace(rep({ count: 15 }), 12)).toBe(false);
  });

  it('says nothing about pace where nobody planned a length', () => {
    /* Without a planned run there is no pace to be behind, and guessing one would invent the bar. */
    expect(behindThePace(rep({ count: 0 }), null)).toBe(false);
    expect(behindThePace(rep({ count: 0, roundsSoFar: 0 }), 12)).toBe(false);
  });

  it('says nothing about pace for a target nobody put a number on', () => {
    expect(behindThePace(rep({ target: null, count: 0 }), 12)).toBe(false);
  });

  it('flags a round where nothing said could be checked', () => {
    expect(whyThisRow(rep({ saidAnythingCheckable: false }), 12)).toBe('nothing checkable');
  });

  it('puts somebody quietly hitting their number at the bottom, with nothing to do', () => {
    const out = whereEachPersonIs([
      rep({ participantId: 'p1', who: 'Fatima', count: 30 }),
      rep({ participantId: 'p2', who: 'Amina', answeredThisRound: false }),
    ], 12);
    expect(out[out.length - 1].who).toBe('Fatima');
    expect(out[out.length - 1].reason).toBe('nothing to do');
    expect(WHAT_THE_REASON_MEANS['nothing to do']).toContain('Nothing here needs you');
  });

  it('orders by name within a reason, so a read does not shuffle and look like movement', () => {
    const out = whereEachPersonIs([
      rep({ participantId: 'b', who: 'Bala', answeredThisRound: false }),
      rep({ participantId: 'a', who: 'Amina', answeredThisRound: false }),
    ], 12);
    expect(out.map((r) => r.who)).toEqual(['Amina', 'Bala']);
  });

  it('never says what somebody is, only what has happened and what to ask for', () => {
    const r = rep({ inTheWay: [{ what: 'the lease', owner: null, days: 21, tried: 'asked-once' }] });
    const line = `${whyThisRow(r, 12)} ${whatToAskFor(r)}`;
    expect(line).not.toMatch(/lazy|excuse|coasting|underperform|poor/i);
  });
});
