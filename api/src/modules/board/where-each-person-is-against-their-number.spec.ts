import {
  whereEachPersonIs, whyThisRow, behindThePace, whatToAskFor,
  hasANumberADateOrADocument, type PersonRow,
} from './where-each-person-is-against-their-number';

const rep = (over: Partial<PersonRow> = {}): PersonRow => ({
  participantId: 'p1', who: 'Musa', target: 35, count: 10,
  answeredThisRound: true, roundsSoFar: 4, inTheWay: [], thisRoundHasANumberADateOrADocument: true, ...over,
});

describe('where each person is against their number', () => {
  it('puts somebody who has not checked in above everything else', () => {
    const out = whereEachPersonIs([rep(), rep({ participantId: 'p2', who: 'Amina', answeredThisRound: false })], 12);
    expect(out[0].who).toBe('Amina');
    expect(out[0].reason).toBe('has not answered');
    expect(out[0].ask).toBe('Ask Amina to check in.');
  });

  it('then somebody stuck a fortnight who has only asked', () => {
    const r = rep({ inTheWay: [{ what: 'the Sokoto lease', owner: null, days: 21, tried: 'asked-again' }] });
    expect(whyThisRow(r, 12)).toBe('stuck and not chasing');
    /* Changed 27 Sep 2026: this pinned the clipped line "21 days on "...", asked more than once,
       same channel. Ask them to ...". It is now full sentences with his name. */
    expect(whatToAskFor(r)).toBe('Musa has been waiting 21 days on "the Sokoto lease", and so far they have asked about it more than once, the same way each time. Ask Musa to find out who owns this by name. Everything else needs that first.');
  });

  it('and on the board row, the ask does not repeat what the sentence above it already says', () => {
    const [row] = whereEachPersonIs([rep({ inTheWay: [{ what: 'the lease', owner: 'Amina', days: 21, tried: 'asked-once' }] })], 12);
    expect(row.says).toBe('Musa has had something in the way for 21 days, and so far it has only been asked about. Chasing it, or asking someone else, would move it.');
    expect(row.ask).toBe('Ask Musa to speak to Amina rather than write to them.');
    expect(row.ask).not.toMatch(/21 days|asked/);
  });

  it('carries the whole story where the row is there for another reason', () => {
    /* Nothing tried and only five days: not the row's reason, so the ask says what it is about. */
    const [row] = whereEachPersonIs([rep({ inTheWay: [{ what: 'the price list from Kofi', owner: 'Kofi', days: 5, tried: 'nothing' }] })], 12);
    expect(row.reason).toBe('nothing to do');
    expect(row.ask).toBe('Musa has been waiting 5 days on "the price list from Kofi", and nobody has said yet what was tried. Ask Musa to speak to Kofi rather than write to them.');
  });

  it('asks a role, or somebody nobody can name, in a sentence that still reads', () => {
    expect(whatToAskFor(rep({ who: 'Head of Sales', nameIsTheirRole: true, answeredThisRound: false })))
      .toBe('Ask the person listed as Head of Sales to check in.');
    expect(whatToAskFor(rep({ who: 'A teammate', nameIsTheirRole: true, answeredThisRound: false })))
      .toBe('Ask this teammate to check in.');
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

  it('says when the record of this round has nothing in it to count', () => {
    /* A fact about what was written down, read from the record and never from a rating. */
    expect(whyThisRow(rep({ thisRoundHasANumberADateOrADocument: false }), 12)).toBe('nothing to count yet');
  });

  it('reads a number, a date or a document off a line of the record', () => {
    expect(hasANumberADateOrADocument({ text: 'Sent 3 quotes.' })).toBe(true);
    expect(hasANumberADateOrADocument({ text: 'Forty tonnes a week.' })).toBe(true);
    expect(hasANumberADateOrADocument({ text: 'The lease is due in October.' })).toBe(true);
    expect(hasANumberADateOrADocument({ text: 'Should land by Friday.' })).toBe(true);
    expect(hasANumberADateOrADocument({ text: 'It went fine.', anchoredDocumentId: 'd1' })).toBe(true);
    expect(hasANumberADateOrADocument({ text: 'It went fine.', documentSays: 'Two were signed.' })).toBe(true);
    expect(hasANumberADateOrADocument({ text: 'It went fine, we may finish soon.' })).toBe(false);
    expect(hasANumberADateOrADocument({ text: '' })).toBe(false);
  });

  it('puts somebody quietly hitting their number at the bottom, with nothing to do', () => {
    const out = whereEachPersonIs([
      rep({ participantId: 'p1', who: 'Fatima', count: 30 }),
      rep({ participantId: 'p2', who: 'Amina', answeredThisRound: false }),
    ], 12);
    expect(out[out.length - 1].who).toBe('Fatima');
    expect(out[out.length - 1].reason).toBe('nothing to do');
    expect(out[out.length - 1].says).toBe('Fatima has checked in, and nothing here needs you this week.');
  });

  it('orders by name within a reason, so a read does not shuffle and look like movement', () => {
    const out = whereEachPersonIs([
      rep({ participantId: 'b', who: 'Bala', answeredThisRound: false }),
      rep({ participantId: 'a', who: 'Amina', answeredThisRound: false }),
    ], 12);
    expect(out.map((r) => r.who)).toEqual(['Amina', 'Bala']);
  });

  it('says when a name is really a role, because a role reads as a name on a list of people', () => {
    /* Watched on a live board: two rows reading "Head of Sales, West Africa" and "Marketing
       analyst" as though those were people's names. The fallback is right; the silence was not. */
    const out = whereEachPersonIs([rep({ who: 'Head of Sales, West Africa', nameIsTheirRole: true })], 12);
    expect(out[0].nameIsTheirRole).toBe(true);
    /* And an account is not the question: both of the live ones had joined and simply never gave a
       first name, so a flag about joining said "joined" while the row still showed a role. */
    expect(whereEachPersonIs([rep()], 12)[0].nameIsTheirRole).toBe(false);
  });

  it('says what happened for every reason, in full sentences with the name', () => {
    const says = (over: Partial<PersonRow>) => whereEachPersonIs([rep({ who: 'Femi', ...over })], 12)[0].says;
    expect(says({ answeredThisRound: false })).toBe('Femi has not checked in for this round yet.');
    expect(says({ inTheWay: [{ what: 'the lease', owner: null, days: 16, tried: 'asked-once' }] }))
      .toBe('Femi has had something in the way for 16 days, and so far it has only been asked about. Chasing it, or asking someone else, would move it.');
    expect(says({ inTheWay: [{ what: 'the lease', owner: null, days: 16, tried: 'nothing' }] }))
      .toBe('Femi has had something in the way for 16 days, and nobody has said yet what was tried to clear it. Finding out who could clear it, and asking them, would move it.');
    expect(says({ target: 14, count: 2, roundsSoFar: 6 }))
      .toBe('Femi is at 2 of 14, and 6 of the 12 rounds have gone. At this pace, 14 would not be reached by the end.');
    expect(says({ thisRoundHasANumberADateOrADocument: false }))
      .toBe('What Femi said this round has no number, no date and no document with it yet, so there is nothing new to count. A number or a date for what moved would change that.');
    expect(says({})).toBe('Femi has checked in, and nothing here needs you this week.');
  });

  it('still reads where the name is a role, or where nobody can be named', () => {
    const one = (over: Partial<PersonRow>) => whereEachPersonIs([rep(over)], 12)[0].says;
    expect(one({ who: 'Head of Sales', nameIsTheirRole: true, answeredThisRound: false }))
      .toBe('The person listed as Head of Sales has not checked in for this round yet.');
    expect(one({ who: 'Head of Sales', nameIsTheirRole: true, thisRoundHasANumberADateOrADocument: false }))
      .toMatch(/^What the person listed as Head of Sales said this round/);
    expect(one({ who: 'A teammate', nameIsTheirRole: true, answeredThisRound: false }))
      .toBe('A teammate has not checked in for this round yet.');
  });

  it('never says what somebody is, only what has happened and what to ask for', () => {
    const r = rep({ inTheWay: [{ what: 'the lease', owner: null, days: 21, tried: 'asked-once' }] });
    const line = `${whereEachPersonIs([r], 12)[0].says} ${whatToAskFor(r)}`;
    expect(line).not.toMatch(/lazy|excuse|coasting|underperform|poor|not chasing|behind/i);
  });
});
