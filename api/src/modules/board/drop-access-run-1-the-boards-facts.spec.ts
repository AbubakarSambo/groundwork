import { boardAs, person, A_RELEASED_REPORT, type Setup } from './the-switchboards-sections-harness';
import { PartyType } from '@prisma/client';
import { onlyRecordsTheLinesSay } from './the-kind-of-work';
import { withOnlyTheNumbersSaid } from './a-deals-value-and-buying-date';
import { theRangeAnswerSaid, theLeadsRangeAnswerIn } from './a-deals-four-criteria';
import { theThingWaitedFor } from './a-wait-said-in-full';
import { theSalesWeek } from '../reports/the-sales-week-in-numbers';
import { whatChangedInTheSalesWeek } from '../reports/what-a-sales-week-shows';
import { theDealWasDropped } from './a-deal-that-was-dropped';
import { cleanText } from '../reports/what-the-record-actually-holds';
import * as RUN from './__fixtures__/drop-access-run-1.json';

/**
 * DROP ACCESS, RELEASE 1'S FIRST TEN-DAY RUN (gw_sweep_drop10, 18 October 2026): THE BOARD'S FACTS, AS EACH PERSON READS THEM.
 *
 * Built on the record exactly as the run left it (`__fixtures__/drop-access-run-1.json`: every line, document, deal, wait, aim,
 * check-in and typed turn), read on the bed's clock of 26 October. Grace Achieng runs it; Kevin Omondi, Mercy Wairimu and Joseph
 * Kariuki check in; Amina Otieno is an admin of the organisation who only reads. Section A of the run's findings, items 1 to 9.
 */
const NOW = new Date('2026-10-26T08:15:00Z');
const R: any = RUN;
const at = (s: any) => (s ? new Date(s) : null);
const userOf = (pid: string) => R.participants.find((p: any) => p.id === pid);
const PEOPLE = R.participants.map((p: any) => person(p.id, p.userId, p.user.firstName, p.user.lastName, p.partyType as PartyType));
const pidOf = (first: string) => R.participants.find((p: any) => p.user.firstName === first).id;
const GRACE = [userOf(pidOf('Grace')).userId, 'MEMBER'] as const;
const KEVIN = [userOf(pidOf('Kevin')).userId, 'MEMBER'] as const;
const MERCY = [userOf(pidOf('Mercy')).userId, 'MEMBER'] as const;
const JOSEPH = [userOf(pidOf('Joseph')).userId, 'MEMBER'] as const;
const AMINA = ['u-amina-admin', 'ADMIN'] as const;

const LINES = R.lines.map((l: any) => ({ ...l, createdAt: at(l.createdAt), confirmedAt: at(l.confirmedAt), disputedAt: null }));
const WAITS = R.dependencies.map((d: any) => ({ ...d, createdAt: at(d.createdAt), updatedAt: at(d.updatedAt), clearedAt: at(d.clearedAt), escalatedAt: at(d.escalatedAt), dueOn: at(d.dueOn) }));
const waitsModel = (waits: any[]) => ({
  findMany: jest.fn(async (args: any) => structuredClone(waits
    .filter((d) => !args?.where?.status?.in || args.where.status.in.includes(d.status))
    .filter((d) => !args?.where?.sourceCheckInId?.in || args.where.sourceCheckInId.in.includes(d.sourceCheckInId)))),
  findFirst: jest.fn(async () => null), findUnique: jest.fn(async () => null), count: jest.fn(async () => 0),
});

function theRun(more: Partial<Setup> = {}, waits = WAITS): Setup {
  return {
    people: PEOPLE,
    initiatorId: GRACE[0],
    kindOfWork: 'sales team',
    releaseOneSalesBoard: true,
    label: R.ground.label,
    clock: { now: NOW, endsAt: new Date('2026-10-30T17:00:00Z') },
    checkIns: R.checkIns.map((c: any) => ({ ...c, completedAt: at(c.completedAt) })),
    lines: LINES,
    recordLines: LINES,
    documents: R.documents.map((d: any) => ({ ...d, createdAt: at(d.createdAt) })),
    items: R.items.map((i: any) => ({ ...i, groundId: 'g-1', createdAt: at(i.createdAt), updatedAt: at(i.updatedAt), dueAt: at(i.dueAt) })),
    dependencies: waits,
    objectives: R.objectives.map((o: any) => ({ ...o, groundId: 'g-1', createdAt: at(o.createdAt), updatedAt: at(o.updatedAt), dueOn: at(o.dueOn) })),
    turns: R.turns.map((t: any) => ({ checkInId: t.checkInId, content: t.content })),
    room: R.room,
    report: { ...A_RELEASED_REPORT, releasedAt: new Date('2026-10-23T17:00:00Z') },
    prismaExtras: { groundDependency: waitsModel(waits) },
    ...more,
  };
}

const grid = (b: any) => (b.workRecords ?? []).find((s: any) => (s.rows ?? []).some((r: any) => r.kind === 'deal') || (s.lost ?? []).length) ?? { rows: [], groups: [] };
const deal = (b: any, name: string) => grid(b).rows.find((r: any) => r.name === name);
const everyString = (v: any, out: string[] = []): string[] => {
  if (typeof v === 'string') out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => everyString(x, out));
  else if (v && typeof v === 'object') Object.entries(v).forEach(([k, x]) => { if (k !== 'participants') everyString(x, out); });
  return out;
};

describe('Drop Access run 1: the board\'s facts, as each person reads them', () => {
  let grace: any; let kevin: any; let mercy: any; let joseph: any; let amina: any;
  beforeAll(async () => {
    grace = await boardAs(theRun(), ...GRACE);
    kevin = await boardAs(theRun(), ...KEVIN);
    mercy = await boardAs(theRun(), ...MERCY);
    joseph = await boardAs(theRun(), ...JOSEPH);
    amina = await boardAs(theRun(), ...AMINA);
  }, 60_000);

  it('A1. Ngong Road Minimart has no payment record and is not "Proof shows it": the only proof on its line is Savannah Cafe\'s M-Pesa message', () => {
    for (const b of [grace, kevin, amina]) {
      const ngong = deal(b, 'Ngong Road Minimart') ?? grid(b).lost?.find((d: any) => d.name === 'Ngong Road Minimart');
      expect(ngong).toBeTruthy();
      if (ngong.mark !== undefined) {
        expect(ngong.paymentRecord).toBe(false);
        expect(ngong.knownSays).not.toBe('Proof shows it.');
      }
    }
    /* Savannah Cafe, Kilele Hotel, Greenfield Supermarket and Tuskys Westgate each have their own payment document. */
    for (const name of ['Savannah Cafe', 'Kilele Hotel', 'Greenfield Supermarket', 'Tuskys Westgate']) expect(deal(grace, name).paymentRecord).toBe(true);
    /* Kasarani Gym: Kevin said Mr. Mwangi paid, and nothing written shows it. */
    expect(deal(grace, 'Kasarani Gym').paymentRecord).toBe(false);
  });

  it('A2. Juja Hardware is worth KES 22,500, five units at KES 4,500, as Joseph said, never KES 180,000', () => {
    for (const b of [grace, joseph, amina]) {
      const juja = deal(b, 'Juja Hardware');
      expect(juja.value).toBe('KES 22,500');
      expect(JSON.stringify(juja)).not.toContain('180,000');
    }
    const gap = grace.toCloseTheGap?.says ?? '';
    expect(gap).not.toMatch(/\b51 units\b/);
  });

  it('A2. the record reader keeps no number the line does not say: "I can ask Grace again." gives Juja Hardware no "Units: 40"', () => {
    const joe = pidOf('Joseph');
    const lines = [
      { id: 'e-271', participantId: joe, text: "I don't know another way to get an answer, or to move Juja Hardware forward without her approval." },
      { id: 'e-272', participantId: joe, text: "I can ask Grace again. I'll do it today." },
      { id: 'e-273', participantId: joe, text: 'My goal is the 40 units Grace expects.' },
    ];
    const kept = onlyRecordsTheLinesSay('sales team' as any, [{ lineId: 'e-272', kind: 'deal', name: 'Juja Hardware', details: [{ label: 'Units', value: '40' }, { label: 'Value', value: 'KES 180,000' }, { label: 'Next step', value: 'ask Grace again' }] }], lines, null, PEOPLE.map((p: any) => ({ id: p.id, firstName: p.user.firstName, lastName: p.user.lastName })), [{ name: 'Juja Hardware', fields: { Contact: 'Mr. Kariuki' }, ownerParticipantId: joe }]);
    expect(kept).toHaveLength(1);
    expect(kept[0].fields).toEqual({ 'Next step': 'ask Grace again' });
    /* Joseph's own line, on 19 October, says five units and KES 22,500: both kept. */
    expect(withOnlyTheNumbersSaid({ Units: 'five', Value: 'KES 22,500' }, ['Mr Kariuki says he has about KES 22,500 for the five units. That\'s KES 4,500 each.'])).toEqual({ Units: 'five', Value: 'KES 22,500' });
  });

  it('A2. a buying date said for a deal is on it: Mercy\'s "Peter said they will buy on the 28th of October" for Tuskys Westgate, and Rose\'s 30 October', () => {
    expect(deal(grace, 'Tuskys Westgate').buyingDate).toBe('2026-10-28');
    expect(deal(grace, 'Mama Mboga Mart').buyingDate).toBe('2026-10-30');
    expect(deal(mercy, 'Mama Mboga Mart').groupSays).toContain('The customer said they will buy on 30 October.');
  });

  it('A3. Mama Pima answered Joseph on 14 and 19 October, so it is not "has not answered since 12 October"', () => {
    for (const b of [grace, joseph]) {
      const pima = deal(b, 'Mama Pima');
      expect(pima.notAnsweringSince).toBeNull();
      expect(pima.group).not.toBe('cold');
      expect(pima.groupSays).not.toContain('has not answered');
      /* "Wanjiru says she won't buy this month." on 19 October is a contact with the customer. */
      expect(pima.contactHistory.map((c: any) => c.on)).toEqual(expect.arrayContaining(['2026-10-14', '2026-10-19']));
    }
    expect(grace.atTheStallRule ?? []).toEqual([]);
  });

  it('A4. Kilele Hotel is "with proof" only on 12 October, the day the M-Pesa message came in; Kevin\'s read is about Kilele Hotel only', () => {
    for (const b of [grace, kevin]) {
      const kilele = deal(b, 'Kilele Hotel');
      const proof = kilele.contactHistory.filter((c: any) => c.how === 'with proof').map((c: any) => c.on);
      expect(proof).toEqual(['2026-10-12']);
      expect(kilele.theirRead.words).toBe('Kilele Hotel bought 40 units.');
      expect(kilele.theirRead.words).not.toContain('Savannah');
    }
    /* Savannah Cafe's deposit came in on 16 October. */
    expect(deal(grace, 'Savannah Cafe').contactHistory.filter((c: any) => c.how === 'with proof').map((c: any) => c.on)).toEqual(['2026-10-16']);
  });

  /*
   * A LOST STAGE (Hafsah, 18 October). This test read each dropped deal as one line at the foot of its group; Hafsah replaced that
   * with a Lost stage and the prototype's "Lost deals, and why", so it now reads the Lost rows: what, whose, when, the reason in the
   * rep's words, what shows it, and what it teaches.
   */
  it('A5. the deals the customer said no to, or the rep gave up, are lost: off the open groups and counts, one row each under Lost', () => {
    const lost = (b: any) => (grid(b).lost ?? []) as any[];
    const row = (b: any, name: string) => lost(b).find((l) => l.name === name);
    expect(lost(grace).map((l) => l.says)).toEqual(expect.arrayContaining([
      'Kamau Electricals was lost, because they already buy from Aqua Pure.',
      'Upper Hill Offices was lost. Kevin said, “I\'ve stopped chasing them. I called three times with no reply, so I\'m moving on.”',
      'The kiosk at Thika Road Mall was lost. Joseph said, “Brian said they are not interested this year.”',
      'Ngong Road Minimart was lost. Kevin said, “Still no reply. I\'m moving on from them.”',
    ]));
    /* Kamau Electricals, from Kevin's own line: "Kamau Electricals said no because they already buy from Aqua Pure." */
    expect(row(grace, 'Kamau Electricals')).toMatchObject({ on: '2026-10-19', reason: 'They already buy from Aqua Pure.', reasonFrom: 'Kevin said it.', lesson: null });
    expect(row(grace, 'Kamau Electricals').owner).toMatch(/Kevin/);
    /* A deal given up after no reply is lost with that reason, in his words. */
    expect(row(grace, 'Upper Hill Offices')).toMatchObject({ reason: 'I\'ve stopped chasing them. I called three times with no reply, so I\'m moving on.', reasonFrom: 'Kevin said it.' });
    for (const name of ['Kamau Electricals', 'Upper Hill Offices', 'the kiosk at Thika Road Mall', 'Ngong Road Minimart']) {
      expect(deal(grace, name)).toBeUndefined();
      expect((grid(grace).groups ?? []).some((g: any) => (g.rowIds ?? []).some((id: string) => id === row(grace, name)?.id))).toBe(false);
      expect((grace.toCloseTheGap?.deals ?? []).map((d: any) => d.name)).not.toContain(name);
    }
    /* No group carries a lost deal at its foot any more. */
    expect((grid(grace).groups ?? []).some((g: any) => 'dropped' in g)).toBe(false);
    /* The stage counts show Lost, after the open stages. */
    const stages = (grace.reportedAgainstCriteria?.stages ?? []) as any[];
    expect(stages[stages.length - 1]).toMatchObject({ stage: 'Lost', reported: 4, lost: true });
    /* Kevin reads his own as "You said it", and only his own: never Joseph's kiosk. */
    expect(row(kevin, 'Upper Hill Offices')).toMatchObject({ reasonFrom: 'You said it.', says: 'Upper Hill Offices was lost. You said, “I\'ve stopped chasing them. I called three times with no reply, so I\'m moving on.”' });
    expect(lost(kevin).map((l) => l.name)).not.toContain('the kiosk at Thika Road Mall');
    expect(lost(kevin).every((l) => l.ownerParticipantId === pidOf('Kevin'))).toBe(true);
    expect(lost(joseph).map((l) => l.name)).toEqual(['the kiosk at Thika Road Mall']);
    expect(lost(mercy)).toEqual([]);
    /* Mama Pima "won't buy this month" is not lost. */
    expect(deal(grace, 'Mama Pima')).toBeTruthy();
  });

  it('A5. the weekly report lists the deals lost that week under "Dropped"', () => {
    const deals = R.items.filter((i: any) => i.kind === 'deal').map((i: any) => {
      const owner = LINES.find((l: any) => l.id === i.sourceEntryId)?.participantId ?? i.ownerParticipantId;
      return { id: i.id, name: i.name, stage: i.stage, ownerParticipantId: owner, fields: i.fields, firstOnRecordAt: new Date(i.createdAt), proven: false, paid: false, stagesKept: [], dropped: theDealWasDropped({ name: i.name, stage: i.stage, ownerParticipantId: owner, fields: i.fields }, LINES, { lastStage: 'Won' }) };
    });
    const week = theSalesWeek(deals as any, ['Contacted', 'Need established', 'Pitched', 'Qualified', 'Quoted', 'Won'], LINES.map((l: any) => ({ text: cleanText(l.text), createdAt: l.createdAt })), new Date('2026-10-19T00:00:00Z'), new Date('2026-10-23T20:00:00Z'));
    const said = whatChangedInTheSalesWeek(week, { whole: true, me: null }, (pid) => (pid ? userOf(pid).user.firstName : 'Somebody'));
    expect(said?.dropped).toEqual(expect.arrayContaining([
      'Kamau Electricals was lost, because they already buy from Aqua Pure.',
      'The kiosk at Thika Road Mall was lost. Joseph said, “Brian said they are not interested this year.”',
      'Ngong Road Minimart was lost. Kevin said, “Still no reply. I\'m moving on from them.”',
    ]));
    expect((week.stalledDeals ?? []).map((d) => d.name)).not.toContain('Ngong Road Minimart');
  });

  it('A6. Grace\'s answer in her own day-10 check-in is her answer: the line is the same one the board\'s Yes keeps', async () => {
    expect(theRangeAnswerSaid("Tuskys Westgate's budget range counts, so Mercy's quote is fine. [INFERRED: this was the person's decision]")).toBe('yes');
    expect(theRangeAnswerSaid("I also need to decide if Tuskys Westgate's budget range counts... I'll get to these today.")).toBeNull();
    const hers = LINES.filter((l: any) => l.participantId === pidOf('Grace')).map((l: any) => ({ text: cleanText(l.text), createdAt: l.createdAt }));
    expect(theLeadsRangeAnswerIn(hers)).toBe('yes');
    /* With the line kept in how we work, as fileTheLeadsRangeAnswer keeps it, the board neither asks her nor says she has not decided. */
    const after = await boardAs(theRun({ contextItems: [{ kind: 'WAY_OF_WORKING', audience: 'EVERYONE', text: 'On whether a price range counts as a budget, the answer is yes.' }] }), ...GRACE);
    const said = everyString(after).join('\n');
    expect(said).not.toContain('Decide whether a price range counts as a budget');
    expect(said).not.toContain('has not decided yet');
    const tuskys = deal(after, 'Tuskys Westgate');
    expect(tuskys.criteria.find((c: any) => c.criterion === 'budget').met).toBe(true);
    const kevinAfter = await boardAs(theRun({ contextItems: [{ kind: 'WAY_OF_WORKING', audience: 'EVERYONE', text: 'On whether a price range counts as a budget, the answer is yes.' }] }), ...KEVIN);
    expect(everyString(kevinAfter).join('\n')).not.toContain('Grace has not decided yet');
  });

  it('A7. Grace reads "approval", never "her approval" about herself, once the waits are written without it', async () => {
    const before = everyString(grace).join('\n');
    expect(before).toContain('waiting on you for her approval');
    const fixed = WAITS.map((w: any) => ({ ...w, what: theThingWaitedFor(w.what, w.onParticipantId) }));
    expect(fixed.find((w: any) => w.id === WAITS.find((x: any) => /^her approval/.test(x.what)).id).what).toBe('approval for the KES 4,500 price for Juja Hardware');
    const after = await boardAs(theRun({}, fixed), ...GRACE);
    /* Joseph's own words, quoted as his ("...without her approval."), stay word for word; no sentence of Groundwork's says it. */
    const JOSEPHS_WORDS = "I don't know another way to get an answer, or to move Juja Hardware forward without her approval.";
    const said = everyString(after).filter((s) => !s.includes(JOSEPHS_WORDS)).join('\n');
    expect(said).not.toMatch(/\bher approval\b/);
    /* The wait itself is still said to her, as hers: "You need to get back to Joseph Kariuki, who is waiting on you for ...". */
    expect(said).toContain('You need to get back to Joseph Kariuki, who is waiting on you for a decision on the KES 4,500 price for Juja Hardware.');
  });

  it('A8. "the M-Pesa message from M-Pesa" is never said', () => {
    const said = everyString(grace).join('\n');
    expect(said).not.toContain('from M-Pesa');
    expect(said).toContain('What has been tried to get the M-Pesa message, which Kevin Omondi is waiting for?');
  });

  it('A9. a rep\'s board names only their own deals, in every section', () => {
    const theirs: Record<string, string[]> = {
      Kevin: ['Greenfield', 'Tuskys', 'Mama Pima', 'Juja', 'Mama Mboga', 'Kawangware', 'Thika'],
      Mercy: ['Kilele', 'Savannah', 'Upper Hill', 'Kamau', 'Ngong Road Minimart', 'Kasarani', 'Lavington', 'Mama Pima', 'Juja', 'Thika'],
      Joseph: ['Kilele', 'Savannah', 'Upper Hill', 'Kamau', 'Ngong Road Minimart', 'Kasarani', 'Lavington', 'Greenfield', 'Tuskys', 'Mama Mboga', 'Kawangware'],
    };
    for (const [who, b] of [['Kevin', kevin], ['Mercy', mercy], ['Joseph', joseph]] as const) {
      const said = everyString(b);
      for (const other of theirs[who]) expect(said.filter((s) => s.includes(other))).toEqual([]);
    }
    /* Their own customers are still there. */
    expect(kevin.whatTheRoomIsAbout.places.map((p: any) => p.name)).toEqual(expect.arrayContaining(['Kasarani Gym', 'Savannah Cafe', 'Kilele Hotel']));
    /* Grace and Amina read every deal. */
    expect(grace.whatTheRoomIsAbout.places.map((p: any) => p.name)).toContain('Tuskys Westgate');
    expect(deal(amina, 'Tuskys Westgate')).toBeTruthy();
  });
});
