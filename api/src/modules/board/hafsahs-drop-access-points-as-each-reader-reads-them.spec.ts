import { boardAs, SALES_RUN, BISI, FEMI, KWAME, JUMA, answered, type Setup } from './the-switchboards-sections-harness';
import { aBuyingDateSaid, withTheValueWorkedOut, aLineIsAbout } from './a-deals-value-and-buying-date';
import { eachTargetOnce, isOnlyATargetSaidAgainOrWhereWorkStands } from './a-target-said-again-is-that-target';
import { theirLine } from './each-persons-line-today';
import { onlyRecordsTheLinesSay } from './the-kind-of-work';

/**
 * HAFSAH'S POINTS OF 17 OCTOBER ON THE DROP ACCESS BOARDS, AS EACH READER READS THEM (points 5, 6, 7, 9, 10 and 11).
 *
 * The same record as Drop Access, in the sales run's people: Bisi runs it (Grace), Femi and Kwame check in (Kevin and Mercy;
 * Kwame also holds Joseph's Juja Hardware and Mama Pima), Juma is an admin who only reads. Read with Release 1's sales board on,
 * and off, where every reader reads the board as it was.
 */
const NOW = new Date('2026-10-15T17:00:00Z');
const at = (s: string) => new Date(s);
const item = (id: string, name: string, more: Record<string, any> = {}) => ({
  id, groundId: 'g-1', kind: 'deal', name, stage: null, ownerParticipantId: null, dueAt: null, fields: null, sourceEntryId: null,
  addedByUserId: null, createdAt: at('2026-10-12T15:00:00Z'), updatedAt: at('2026-10-12T15:00:00Z'), ...more,
});
const line = (id: string, participantId: string, text: string, createdAt: string, more: Record<string, any> = {}) => ({
  id, participantId, type: 'PROGRESS', text, recallBased: true, createdAt: at(createdAt), disputedAt: null, ...more,
});
const LINES = [
  line('e-juja', 'p-kwame', 'Grace hasn\'t answered me about the KES 4,500 price for Juja Hardware yet.', '2026-10-15T15:07:00Z', { type: 'WORRY', checkInId: 'c4-p-kwame' }),
  line('e-juja-met', 'p-kwame', 'I met Mr. Kariuki from Juja Hardware.', '2026-10-15T15:07:00Z', { checkInId: 'c4-p-kwame' }),
  line('e-pima', 'p-kwame', 'I need an answer about the KES 12,000 discount for Mama Pima.', '2026-10-12T15:06:00Z'),
  line('e-pima2', 'p-kwame', 'Mama Pima Stores is still deciding.', '2026-10-13T15:06:00Z'),
  line('e-mboga', 'p-kwame', 'I have the lead from Mama Mboga Mart. Rose wants two units.', '2026-10-14T15:05:00Z'),
  line('e-rose', 'p-kwame', 'Rose said she will buy the two units at the end of the month, on October 30th.', '2026-10-15T15:05:00Z', { type: 'COMMITMENT', checkInId: 'c4-p-kwame' }),
  line('e-savannah', 'p-femi', 'Jane from Savannah Cafe wants 6 units, and I sent her a quote for KES 30,000.', '2026-10-13T15:03:00Z'),
  line('e-kamau', 'p-femi', 'Kamau Electricals said no.', '2026-10-13T15:03:00Z'),
  line('e-femi-target', 'p-femi', 'My target is still 120 units', '2026-10-13T15:03:00Z', { type: 'SUCCESS_DEFINITION', checkInId: 'c4-p-femi' }),
];
const objective = (id: string, name: string, target: number, owner: string | null, createdAt: string) => ({
  id, groundId: 'g-1', name, target, count: 0, prevCount: 0, ownerParticipantId: owner, setByParticipantId: null,
  direction: null, isADecisionAboutAPerson: false, sortOrder: 0, addedAtSession: null, assumes: [], suggestedCount: null, suggestedSaid: null,
  dueOn: at('2026-10-30T17:00:00Z'), createdAt: at(createdAt),
});
const run = (on: boolean): Setup => ({
  ...SALES_RUN,
  kindOfWork: 'sales team',
  releaseOneSalesBoard: on,
  clock: { now: NOW, endsAt: at('2026-10-30T17:00:00Z') },
  checkIns: [
    answered('p-femi', 4, '2026-10-15T15:03:00Z'), answered('p-kwame', 4, '2026-10-15T15:07:00Z'), answered('p-ngozi', 3, '2026-10-14T15:00:00Z'),
    { id: 'c5-p-kwame', participantId: 'p-kwame', sessionNumber: 5, status: 'IN_PROGRESS', isSetup: false, completedAt: null },
  ],
  lines: LINES,
  recordLines: LINES,
  items: [
    item('w-juja', 'Juja Hardware', { stage: 'Pitched', ownerParticipantId: 'p-kwame', sourceEntryId: 'e-juja', fields: { Value: 'KES 4,500', Contact: 'the assistant' } }),
    item('w-pima', 'Mama Pima Stores', { stage: 'Contacted', ownerParticipantId: 'p-kwame', sourceEntryId: 'e-pima2', fields: { Value: 'KES 12,000', Contact: 'Wanjiru' } }),
    item('w-mboga', 'Mama Mboga Mart', { stage: 'Contacted', ownerParticipantId: 'p-kwame', sourceEntryId: 'e-mboga', fields: { Units: 'two', Contact: 'Rose', 'Buying date': '2026-10-30' } }),
    item('w-savannah', 'Savannah Cafe', { stage: 'Quoted', ownerParticipantId: 'p-femi', sourceEntryId: 'e-savannah', fields: { Units: '6', Value: 'KES 30,000', Contact: 'Jane' } }),
    item('w-kamau', 'Kamau Electricals', { stage: null, ownerParticipantId: 'p-femi', sourceEntryId: 'e-kamau', fields: {} }),
  ],
  objectives: [
    objective('o-team', 'Units sold by 30 October', 120, null, '2026-10-12T07:00:00Z'),
    objective('o-femi', 'units sold by 30 October', 40, 'p-femi', '2026-10-12T07:00:01Z'),
    objective('o-kwame', 'units sold by 30 October', 40, 'p-kwame', '2026-10-12T07:00:02Z'),
    objective('o-team-again', 'The team is aiming to sell 120 water dispensers', 120, null, '2026-10-12T15:00:00Z'),
    objective('o-kwame-again', 'Sell 40 units', 40, 'p-kwame', '2026-10-12T15:00:01Z'),
    objective('o-kwame-leads', 'Open 10 new leads weekly', 10, 'p-kwame', '2026-10-12T15:00:02Z'),
    objective('o-femi-120', 'My target is actually 120 units', 120, 'p-femi', '2026-10-13T15:03:00Z'),
  ],
  report: {
    releasedAt: at('2026-10-15T17:00:00Z'), sharedAs: null, theOpening: 'Everybody has checked in.', networkPicture: null, sharedPicture: 'Everybody has checked in.',
    agreements: [], centralQuestion: null, engagement: {}, findings: [], createdAt: at('2026-10-12T09:00:00Z'), updatedAt: at('2026-10-15T17:00:00Z'),
    divergences: [
      {
        topic: 'You stated each team member is responsible for selling 40 units, but a team member states their individual target is 120 units.',
        positions: [
          { participantLabel: 'the initiator', view: 'Each of the sales participants is responsible for selling 40 units.' },
          { participantLabel: 'Femi Okonkwo', view: 'My sales target is 120 units.' },
        ],
      },
      {
        topic: 'You expect each team member to open 10 new leads weekly.',
        positions: [
          { participantLabel: 'the initiator', view: 'Each person is expected to open 10 new leads every week.' },
          { participantLabel: 'Kwame Mensah', view: 'I have not planned for generating new leads yet.' },
        ],
      },
    ],
  },
});
const deal = (b: any, name: string) => (b.workRecords ?? []).flatMap((s: any) => s.rows ?? []).find((r: any) => r.name === name);
const sent = (b: any) => JSON.stringify(b);

describe('with Release 1\'s sales board on', () => {
  it('point 5: Bisi reads no value for a deal whose only amount is a price for one unit or a discount, and the price and discount under their own names', async () => {
    const b = await boardAs(run(true), ...BISI);
    expect(deal(b, 'Juja Hardware').value).toBeNull();
    expect(deal(b, 'Juja Hardware').valueSays).toBe('Nobody has said what this deal is worth yet.');
    expect(deal(b, 'Juja Hardware').fields).toEqual({ Contact: 'the assistant', 'Price each': 'KES 4,500' });
    expect(deal(b, 'Mama Pima Stores').value).toBeNull();
    expect(deal(b, 'Mama Pima Stores').fields).toEqual({ Contact: 'Wanjiru', Discount: 'KES 12,000' });
    /* A whole amount stays the value. */
    expect(deal(b, 'Savannah Cafe').value).toBe('KES 30,000');
  });

  it('point 6: Mama Mboga Mart reads the customer\'s buying date, and Bisi and Kwame read the same deal state', async () => {
    const lead = await boardAs(run(true), ...BISI);
    const rep = await boardAs(run(true), ...KWAME);
    const l = deal(lead, 'Mama Mboga Mart');
    const r = deal(rep, 'Mama Mboga Mart');
    expect(l.buyingDate).toBe('2026-10-30');
    expect(l.groupSays).toContain('The customer said they will buy on 30 October.');
    /* The line naming only Rose is a contact with the customer. */
    expect(l.lastSaidOn).toBe('2026-10-15');
    for (const k of ['stage', 'group', 'groupSays', 'buyingDate', 'value', 'nextStep', 'lastSaidOn']) expect(r[k]).toEqual(l[k]);
    /* The buying date is not served as a raw detail. */
    expect(l.fields['Buying date']).toBeUndefined();
    const group = (b: any) => (b.workRecords ?? []).flatMap((s: any) => s.groups ?? []).find((g: any) => g.group === 'possible');
    /* Since Needs Hafsah 7 (17 October), Possible is the kit's "Moving, but missing a criterion or recent contact". */
    expect(group(lead).reason).toBe('Each of these is moving, but is missing a criterion, a buying date on or before 30 October, or word about it in the last week.');
  });

  /*
   * Changed for Drop Access run 1, A5 (18 October): "Kamau Electricals said no." now drops the deal, so it is no longer an open row
   * to read a stage from. The same deal, spoken of without a no ("I visited Kamau Electricals on Ngong Road."), still reads
   * Contacted; and said with its no, it is said once as dropped.
   */
  it('point 7: a deal spoken of with no stage said reads Contacted, for Bisi and for Femi, and nobody reads "No stage said yet"', async () => {
    const visited = LINES.map((l) => (l.id === 'e-kamau' ? { ...l, text: 'I visited Kamau Electricals on Ngong Road.' } : l));
    for (const reader of [BISI, FEMI] as const) {
      const b = await boardAs({ ...run(true), lines: visited, recordLines: visited }, reader[0], reader[1]);
      expect(deal(b, 'Kamau Electricals').stage).toBe('Contacted');
      expect(sent(b)).not.toContain('No stage said yet');
      const saidNo = await boardAs(run(true), reader[0], reader[1]);
      expect(deal(saidNo, 'Kamau Electricals')).toBeUndefined();
      expect(sent(saidNo)).not.toContain('No stage said yet');
    }
  });

  it('point 9: Bisi reads each target once, and no difference between her 40 each and the team\'s 120, nor about the leads Kwame has not planned', async () => {
    const b = await boardAs(run(true), ...BISI);
    const ids = (b.objectives ?? []).map((o: any) => o.id);
    expect(ids).toEqual(expect.arrayContaining(['o-team', 'o-femi', 'o-kwame', 'o-kwame-leads']));
    for (const gone of ['o-team-again', 'o-kwame-again', 'o-femi-120']) expect(ids).not.toContain(gone);
    expect(sent(b)).not.toContain('water dispensers');
    expect(sent(b)).not.toContain('see this differently');
    expect((b.openIssues?.issues ?? []).map((i: any) => i.title).join(' ')).not.toContain('differently');
    expect((b.whereThisIsHeading?.signals ?? []).map((s: any) => s.says).join(' ')).not.toContain('said different things');
    expect(b.divergence?.items ?? []).toEqual([]);
    expect(JSON.stringify(b.divergence?.stillOpen ?? [])).not.toContain('120 units');
    expect(JSON.stringify(b.quickRead ?? [])).not.toContain('individual target');
  });

  it('point 11: Kwame reads one aim per target in his share, and Femi\'s own 40, never the team\'s 120 as his', async () => {
    const kwame = await boardAs(run(true), ...KWAME);
    expect((kwame.yourShare ?? []).map((s: any) => s.objectiveId)).toEqual(['o-kwame', 'o-kwame-leads']);
    const femi = await boardAs(run(true), ...FEMI);
    expect((femi.objectives ?? []).filter((o: any) => o.ownerParticipantId === 'p-femi').map((o: any) => o.target)).toEqual([40]);
  });

  it('point 10: Bisi reads each person\'s line from today\'s check-in, and the kit\'s words for one who has not checked in today', async () => {
    const b = await boardAs(run(true), ...BISI);
    const today = new Map((b.eachPersonToday ?? []).map((r: any) => [r.participantId, r]));
    /* Worded as said, by name (Hafsah, 4 November 2026): his word, never a fact the board states. */
    expect((today.get('p-kwame') as any).line).toBe('Kwame said, “I met Mr. Kariuki from Juja Hardware.”');
    expect((today.get('p-kwame') as any).checkedInToday).toBe(true);
    expect((today.get('p-ngozi') as any).line).toBe('Hasn’t checked in today.');
    expect((today.get('p-ngozi') as any).checkedInToday).toBe(false);
    expect(JSON.stringify(b.eachPersonToday)).not.toContain('has not checked in yet');
  });

  it('point 10: Juma, an admin who only reads, reads that they checked in, never their words', async () => {
    const b = await boardAs(run(true), ...JUMA);
    for (const r of (b.eachPersonToday ?? []) as any[]) expect(['Checked in today.', 'Hasn’t checked in today.']).toContain(r.line);
  });

  it('a rep is never served the team today', async () => {
    const b = await boardAs(run(true), ...KWAME);
    expect(b.eachPersonToday).toBeUndefined();
  });
});

describe('with Release 1\'s sales board off, every reader reads the board as it was', () => {
  it('Bisi reads the stored value, no buying date, every aim and the old team row', async () => {
    const b = await boardAs(run(false), ...BISI);
    expect(deal(b, 'Juja Hardware').value).toBe('KES 4,500');
    expect(deal(b, 'Mama Mboga Mart').buyingDate).toBeUndefined();
    expect(deal(b, 'Kamau Electricals').stage).toBeNull();
    expect((b.objectives ?? []).map((o: any) => o.id)).toContain('o-team-again');
    expect(sent(b)).not.toContain('Hasn’t checked in today.');
  });
});

describe('the rules, on their own', () => {
  it('reads a buying date only where the customer will buy', () => {
    expect(aBuyingDateSaid('Rose said she will buy the two units at the end of the month, on October 30th.', at('2026-10-15T15:00:00Z'))).toBe('2026-10-30');
    expect(aBuyingDateSaid('She wants to order at the end of the month.', at('2026-10-15T15:00:00Z'))).toBe('2026-10-31');
    expect(aBuyingDateSaid('I will send Peter the quote for 30 units by Friday.', at('2026-10-15T15:00:00Z'))).toBeNull();
    expect(aBuyingDateSaid('I will buy samples on 20 October.', at('2026-10-15T15:00:00Z'))).toBeNull();
  });

  it('works the value out as units times the price of one unit, and keeps a whole amount', () => {
    expect(withTheValueWorkedOut({ Units: '10', Value: 'KES 4,500' }, ['I pitched them at KES 4,500 a unit for 10 units.'])).toEqual({ Units: '10', 'Price each': 'KES 4,500', Value: 'KES 45,000' });
    expect(withTheValueWorkedOut({ Units: '25', Value: 'KES 125,000' }, ['Greenfield Supermarket ordered 25 units, which comes to 125,000 shillings.'])).toEqual({ Units: '25', Value: 'KES 125,000' });
    expect(withTheValueWorkedOut({ Value: 'KES 12,000' }, ['I need an answer about the KES 12,000 discount for Mama Pima.'])).toEqual({ Discount: 'KES 12,000' });
  });

  it('a line naming only the person at the customer is about the deal; "the assistant" names nobody', () => {
    expect(aLineIsAbout('Rose said she will buy on October 30th.', { name: 'Mama Mboga Mart', fields: { Contact: 'Rose' } })).toBe(true);
    expect(aLineIsAbout('I spoke to the assistant.', { name: 'Juja Hardware', fields: { Contact: 'the assistant' } })).toBe(false);
  });

  it('the writer keeps a deal the model gives for a line naming only its contact, with the buying date, and the value as the whole', () => {
    const kept = onlyRecordsTheLinesSay('sales team', [
      { lineId: 'l1', kind: 'deal', name: 'Mama Mboga Mart', details: [{ label: 'Buying date', value: '2026-10-30' }] },
      { lineId: 'l2', kind: 'deal', name: 'Juja Hardware', details: [{ label: 'Value', value: 'KES 4,500' }] },
    ], [
      { id: 'l1', text: 'Rose said she will buy the two units at the end of the month, on October 30th.', participantId: 'p-m' },
      { id: 'l2', text: 'Grace hasn\'t answered me about the KES 4,500 price for Juja Hardware yet.', participantId: 'p-j' },
    ], null, [], [{ name: 'Mama Mboga Mart', fields: { Contact: 'Rose' }, ownerParticipantId: 'p-m' }]);
    expect(kept.find((k) => k.name === 'Mama Mboga Mart')?.fields).toEqual({ 'Buying date': '2026-10-30' });
    expect(kept.find((k) => k.name === 'Juja Hardware')?.fields).toEqual({ 'Price each': 'KES 4,500' });
  });

  it('a target said again with the same number and thing counted is that target; another number is its own', () => {
    const team = { id: 't', name: 'Units sold by 30 October', target: 120, ownerParticipantId: null, createdAt: '2026-10-12T07:00:00Z' };
    const leads = { id: 'l', name: 'New leads this week', target: 30, ownerParticipantId: null, createdAt: '2026-10-12T07:00:00Z' };
    const said = { id: 's', name: 'hit my target of 120 by the end of October', target: 120, ownerParticipantId: 'p-j', createdAt: '2026-10-15T07:00:00Z' };
    const money = { id: 'm', name: 'KES 120 in sales', target: 120, ownerParticipantId: 'p-j', createdAt: '2026-10-15T07:00:00Z' };
    expect(eachTargetOnce([team, leads, said, money]).map((o) => o.id)).toEqual(['t', 'l', 'm']);
  });

  /*
   * HAFSAH, 18 OCTOBER, CONFIRMED: "I have not planned it yet" is where the work stands, not a different view. Joseph's own words
   * beside Grace's 10 new leads a week are never served as a difference, to Grace or to Joseph, and a real view on the number is.
   */
  it('"I have not planned it yet" is where the work stands, never a different view, as Bisi and Kwame read the board', async () => {
    for (const b of [await boardAs(run(true), ...BISI), await boardAs(run(true), ...KWAME)]) {
      expect(sent(b)).not.toContain('I have not planned for generating new leads yet.');
      expect(sent(b)).not.toContain('You expect each team member to open 10 new leads weekly.');
    }
    const lead = { participantLabel: 'the initiator', view: 'Each person is expected to open 10 new leads every week.' };
    for (const said of ['I have not planned for generating new leads yet.', "I haven't planned it yet.", 'We have not started on it yet.']) {
      expect(isOnlyATargetSaidAgainOrWhereWorkStands([lead, { participantLabel: 'Kwame Mensah', view: said }], () => [10])).toBe(true);
    }
    expect(isOnlyATargetSaidAgainOrWhereWorkStands([lead, { participantLabel: 'Kwame Mensah', view: 'Ten new leads a week is too many for my area; five is what I can do.' }], () => [10])).toBe(false);
  });

  it('a real difference of views stays', () => {
    expect(isOnlyATargetSaidAgainOrWhereWorkStands([
      { participantLabel: 'the initiator', view: 'A price range counts as a budget.' },
      { participantLabel: 'Femi', view: 'A price range is not a budget.' },
    ], () => [120])).toBe(false);
  });

  it('their line is what moved on a deal they named', () => {
    expect(theirLine([
      { text: 'I have the M-Pesa message.', type: 'PROGRESS', createdAt: NOW },
      { text: 'I visited Kasarani Gym today; Faith confirmed they need 3 units.', type: 'PROGRESS', createdAt: NOW },
    ], ['Kasarani Gym'])).toBe('I visited Kasarani Gym today; Faith confirmed they need 3 units.');
  });
});
