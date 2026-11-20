import {
  whereEachPersonIs, whyThisRow, behindThePace, whatToAskFor, whatHappened,
  hasANumberADateOrADocument, type PersonRow,
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
    expect(out[0].ask).toBe('Ask Amina to check in.');
  });

  it('then somebody stuck a fortnight who has only asked', () => {
    const r = rep({ inTheWay: [{ what: 'the Sokoto lease', owner: null, days: 21, tried: 'asked-again' }] });
    expect(whyThisRow(r, 12)).toBe('something in the way two weeks');
    /* Changed 27 Sep 2026: this pinned the clipped line "21 days on "...", asked more than once,
       same channel. Ask them to ...". It is now full sentences with his name.
       Changed again 27 Sep 2026: the blocker is no longer in quotation marks, because it is the
       dependency reader's phrase and not Musa's words. See whatToAskFor. */
    /* Changed 5 Oct 2026 (request 134 item 5): Hafsah decided the lead finds the owner, with the person waiting as the reason. */
    expect(whatToAskFor(r)).toBe('Musa has been waiting 21 days on the Sokoto lease, and so far they have asked about it more than once, the same way each time. Find out who owns this, so that Musa is not left waiting.');
  });

  it('never puts a label beside Collins or Amina: no "stuck and not chasing" anywhere in a row (Hafsah, 12 October)', () => {
    const wait = { what: 'the stock from Kisumu', owner: 'Naomi', days: 15, tried: 'asked-once' as const };
    const rows = whereEachPersonIs([rep({ participantId: 'c', who: 'Collins Odhiambo', inTheWay: [wait] }), rep({ participantId: 'a', who: 'Amina Otieno', inTheWay: [wait] })], 12);
    expect(JSON.stringify(rows)).not.toMatch(/not chasing/i);
    expect(rows.find((r) => r.who === 'Collins Odhiambo')!.says).toMatch(/^Collins Odhiambo has had something in the way for 15\sdays, and so far it has only been asked about\./);
    expect(rows.find((r) => r.who === 'Amina Otieno')!.says).toMatch(/^Amina Otieno has had something in the way for 15\sdays, and so far it has only been asked about\./);
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
    /* Changed 2 Oct 2026 (request 115 d): somebody waiting on a colleague is not "nothing to do". */
    expect(row.reason).toBe('waiting on someone');
    expect(row.says).toBe('Musa has checked in, and is waiting on Kofi for the price list from Kofi.');
    /* Changed 27 Sep 2026: no quotation marks round the blocker, which is not his words. */
    expect(row.ask).toBe('Musa has been waiting 5 days on the price list from Kofi, and nobody has said yet what was tried. Ask Musa to speak to Kofi rather than write to them.');
  });

  it('asks a role, or somebody nobody can name, in a sentence that still reads', () => {
    expect(whatToAskFor(rep({ who: 'Head of Sales', nameIsTheirRole: true, answeredThisRound: false })))
      .toBe('Ask the person listed as Head of Sales to check in.');
    /* Request 36: the plain word is "a colleague", as the prototype says, never "teammate". */
    expect(whatToAskFor(rep({ who: 'A colleague', nameIsTheirRole: true, answeredThisRound: false })))
      .toBe('Ask this colleague to check in.');
    expect(whatToAskFor(rep({ who: 'Another colleague', nameIsTheirRole: true, answeredThisRound: false })))
      .toBe('Ask this colleague to check in.');
  });

  it('and says nothing about somebody who actually pushed', () => {
    const r = rep({ inTheWay: [{ what: 'the lease', owner: 'Adeola', days: 30, tried: 'escalated' }] });
    /* Changed 2 Oct 2026 (request 115 d): still waiting, so not "nothing to do"; and still nothing to ask. */
    expect(whyThisRow(r, 12)).toBe('waiting on someone');
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

  it('says "nothing checkable" when nothing they said this round can be checked', () => {
    /* 28 Sep 2026, Hafsah: the prototype's own words, back from "nothing to count yet" (a1747927). */
    expect(whyThisRow(rep({ saidAnythingCheckable: false }), 12)).toBe('nothing checkable');
  });

  it('says how many in a row, and asks for proof where proof was what was missing', () => {
    const row = rep({ saidAnythingCheckable: false, nothingCheckableInARow: 2, roundIsA: 'week', noProof: true });
    expect(whatHappened(row, 'nothing checkable', 12)).toBe('Nothing Musa said this round can be checked yet. This is the second week in a row. A number, a date or a document for what moved would change that.');
    expect(whatToAskFor(row)).toBe('Ask Musa for a photo, a message or a document that shows what moved.');
    expect(whatToAskFor(rep({ saidAnythingCheckable: false }))).toBe('Ask Musa for a number or a date for what moved this round.');
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

  it('decision 53, item 11: a reader who cannot see this target reads only that they checked in', () => {
    const [row] = whereEachPersonIs([rep({ who: 'Fatima', count: 30, targetHiddenFromReader: true })], 12);
    expect(row.reason).toBe('nothing to do');
    expect(row.says).toBe('Fatima has checked in.');
    expect(row.says).not.toMatch(/needs you/);
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
    expect(says({ answeredThisRound: false })).toBe('Femi has not checked in yet.');
    expect(says({ inTheWay: [{ what: 'the lease', owner: null, days: 16, tried: 'asked-once' }] }))
      .toBe('Femi has had something in the way for 16 days, and so far it has only been asked about. Chasing it, or asking someone else, would move it.');
    expect(says({ inTheWay: [{ what: 'the lease', owner: null, days: 16, tried: 'nothing' }] }))
      .toBe('Femi has had something in the way for 16 days, and nobody has said yet what was tried to clear it. Finding out who could clear it, and asking them, would move it.');
    expect(says({ target: 14, count: 2, roundsSoFar: 6 }))
      .toBe('Femi is at 2 of 14, and 6 of the 12 rounds have gone. At this pace, 14 would not be reached by the end.');
    expect(says({ saidAnythingCheckable: false }))
      .toBe('Nothing Femi said this round can be checked yet. A number, a date or a document for what moved would change that.');
    expect(says({})).toBe('Femi has checked in, and nothing here needs you this week.');
  });

  it('still reads where the name is a role, or where nobody can be named', () => {
    const one = (over: Partial<PersonRow>) => whereEachPersonIs([rep(over)], 12)[0].says;
    expect(one({ who: 'Head of Sales', nameIsTheirRole: true, answeredThisRound: false }))
      .toBe('The person listed as Head of Sales has not checked in yet.');
    expect(one({ who: 'Head of Sales', nameIsTheirRole: true, saidAnythingCheckable: false }))
      .toMatch(/^Nothing the person listed as Head of Sales said this round/);
    expect(one({ who: 'A colleague', nameIsTheirRole: true, answeredThisRound: false }))
      .toBe('A colleague has not checked in yet.');
    expect(one({ who: 'Another colleague', nameIsTheirRole: true, answeredThisRound: false }))
      .toBe('Another colleague has not checked in yet.');
  });

  it('never says what somebody is, only what has happened and what to ask for', () => {
    const r = rep({ inTheWay: [{ what: 'the lease', owner: null, days: 21, tried: 'asked-once' }] });
    const line = `${whereEachPersonIs([r], 12)[0].says} ${whatToAskFor(r)}`;
    expect(line).not.toMatch(/lazy|excuse|coasting|underperform|poor|not chasing|behind/i);
  });
});

/* Read live on run-14, 28 September 2026, as the lead. */
describe('the ask reads as something a lead can do', () => {
  const row = (over: Partial<PersonRow> = {}): PersonRow => ({
    participantId: 'p1', who: 'Jide Sanusi', target: null, count: 0,
    answeredThisRound: true, roundsSoFar: 1, inTheWay: [], saidAnythingCheckable: true, ...over,
  });

  it('never asks anyone to speak to a thing', () => {
    const ask = whatToAskFor(row({ inTheWay: [{ what: 'a shared calendar for year-end', owner: 'the handover from the current finance manager', days: 0, tried: 'nothing' }] }));
    expect(ask).not.toMatch(/speak to the handover/);
    /* Changed 5 Oct 2026 (request 134 item 5): the lead is asked to find the owner, not Jide. */
    expect(ask).toContain('Find out who owns this, so that Jide Sanusi is not left waiting.');
    expect(ask).not.toMatch(/Ask Jide Sanusi to find out/);
  });

  it('still asks them to speak to a person, by name or by role', () => {
    expect(whatToAskFor(row({ inTheWay: [{ what: 'the approval', owner: 'Mr Eze', days: 3, tried: 'nothing' }] }))).toContain('speak to Mr Eze rather than write to them');
    expect(whatToAskFor(row({ inTheWay: [{ what: 'the approval', owner: 'the head of credit', days: 3, tried: 'nothing' }] }))).toContain('speak to the head of credit rather than write to them');
  });

  it('says "is waiting" for something that came up today, never "0 days"', () => {
    const ask = whatToAskFor(row({ inTheWay: [{ what: 'credit review', owner: null, days: 0, tried: 'nothing' }] }));
    expect(ask).toMatch(/^Jide Sanusi is waiting on credit review,/);
    expect(ask).not.toMatch(/0 days/);
  });

  it('and a row with something to ask never says nothing here needs you', () => {
    const [r] = whereEachPersonIs([row({ inTheWay: [{ what: 'credit review', owner: null, days: 0, tried: 'nothing' }] })], 12);
    /* Changed 2 Oct 2026 (request 115 d): the reason is the wait, said in full. */
    expect(r.reason).toBe('waiting on someone');
    expect(r.says).toBe('Jide Sanusi has checked in, and is waiting for credit review.');
    expect(r.ask).toBeTruthy();
  });
});
