import { boardAs } from './the-switchboards-sections-harness';
import { theShortRun, reader, R, pidOf } from './the-short-run-harness';
import { whatTheOwnerSaidOfEachDeal } from './what-the-owner-said-of-each-deal';
import { whatTheBoardAsksOfTheLead } from '../grounds/what-the-board-asks-of-the-lead';
import { theStallRuleAsALine, theStallRuleDeclined, theStallRuleIn } from './the-stall-rule';

/**
 * HAFSAH'S QUALITY PASS OF 18 OCTOBER, ON THE BOARD, AS EACH PERSON READS IT.
 *
 * Built on the short run's record exactly as it stood (gw_sweep_drop3, `__fixtures__/drop-access-short-run.json`), read on Sunday
 * 18 October at 8:09pm, as Grace opened it. Grace Achieng runs it; Kevin Omondi, Mercy Wairimu and Joseph Kariuki check in. Each
 * test reads the lines a person is served and checks them against the record and the findings (quality/findings.md).
 */
const grid = (b: any) => (b.workRecords ?? []).find((s: any) => (s.rows ?? []).some((r: any) => r.kind === 'deal')) ?? { rows: [], groups: [] };
const deal = (b: any, name: string) => grid(b).rows.find((r: any) => r.name === name);

describe('the quality pass of 18 October, as each reader reads the board', () => {
  let grace: any; let mercy: any; let kevin: any; let joseph: any;
  beforeAll(async () => {
    grace = await boardAs(theShortRun(), ...reader('Grace'));
    mercy = await boardAs(theShortRun(), ...reader('Mercy'));
    kevin = await boardAs(theShortRun(), ...reader('Kevin'));
    joseph = await boardAs(theShortRun(), ...reader('Joseph'));
  }, 120_000);

  describe('Q1, B-1 to B-3: how far from 120, and how much is proven', () => {
    it('Grace reads one question about one target, and an answer that names the deals and what proves each', () => {
      expect(grace.headline.question).toBe('Will we reach 120 units sold by 30 October?');
      /* Savannah Cafe is Likely (B-4), so its 6 units follow, as the kit's "and 2 more are likely". */
      expect(grace.headline.answer).toBe('Not yet. 65 of the 120 units are sold. 40 are paid (Kilele Hotel) and 25 are on a signed order (Greenfield Supermarket), which pays on delivery on Friday 16 October. 6 more are likely, which makes 71 of the 120 needed.');
      expect(grace.headline.bars).toHaveLength(1);
    });

    it('new leads are their own line, counting only the customers first named this week: Kilele, Greenfield and Mama Pima were the deals Grace named, and Tuskys Westgate a lead Mercy was following up', () => {
      expect(grace.headline.besides.map((x: any) => x.says)).toEqual(['6 new leads this week, of the 30 you asked for.']);
      const team = grace.objectives.find((o: any) => o.fromTheDeals?.counts === 'units' && !o.ownerParticipantId);
      expect(team.fromTheDeals).toMatchObject({ sold: 65, proven: 40, shown: 25 });
    });

    it('a rep is never served the lead\'s headline counts of other people\'s deals as theirs', () => {
      for (const b of [mercy, kevin, joseph]) expect(JSON.stringify(b.headline ?? null)).not.toContain('you asked for');
    });
  });

  describe('the deals as the record writer keeps them: what each owner said, read with no model (B-5 cause, B-12, B-14, B-15)', () => {
    /* The re-read of gw_sweep_drop3 ran this same rule over every check-in, in order; here it runs over the deals as the model alone left them. */
    const reRead = () => {
      const names = R.participants.map((p: any) => p.user.firstName);
      const items = R.itemsBeforeTheReRead.map((i: any) => ({ ...i, fields: { ...(i.fields ?? {}) } }));
      const done = R.checkIns.filter((c: any) => c.status === 'COMPLETED').sort((a: any, b: any) => String(a.completedAt).localeCompare(String(b.completedAt)));
      for (const c of done) {
        const said = whatTheOwnerSaidOfEachDeal(items.filter((i: any) => i.ownerParticipantId === c.participantId), R.turns.filter((t: any) => t.checkInId === c.id), names);
        for (const [id, w] of said) {
          const i = items.find((x: any) => x.id === id);
          Object.assign(i.fields, w.set);
          if (w.stage) i.stage = w.stage;
        }
      }
      return (name: string) => items.find((i: any) => i.name === name);
    };
    it('a quote said with its amount moves the deal to Quoted; a need said moves it to Need established; never a stage back', () => {
      const at = reRead();
      expect(at('Savannah Cafe')).toMatchObject({ stage: 'Quoted', fields: expect.objectContaining({ Quoted: 'KES 30,000', 'Quote accepted': '2026-10-14', 'Decision maker': 'Jane, the owner', 'Buying date': '2026-10-16' }) });
      expect(at('Ngong Road Minimart')).toMatchObject({ stage: 'Quoted', fields: expect.objectContaining({ Quoted: 'KES 20,000', Contact: 'Ali' }) });
      expect(at('Juja Hardware').stage).toBe('Need established');
      expect(at('Mama Pima Stores').fields['Decision maker']).toBe('Wanjiru, the owner');
      expect(at('Tuskys Westgate').fields['Decision maker']).toBe('Peter');
      expect(at('Greenfield Supermarket').stage).toBe('Won');
      expect(at('Kilele Hotel').stage).toBe('Won');
    });

    it('Grace reads each stage as the record now holds it, and Ngong Road Minimart last spoken of 4 days ago, on 14 October', () => {
      expect(deal(grace, 'Savannah Cafe').stage).toBe('Quoted');
      expect(deal(grace, 'Ngong Road Minimart').stage).toBe('Quoted');
      expect(deal(grace, 'Juja Hardware').stage).toBe('Need established');
      expect(deal(grace, 'Ngong Road Minimart').lastSaidOn).toBe('2026-10-14');
    });
  });

  describe('Q3, B-4 to B-6, B-13, B-14, B-16, R-2 to R-4: which deals close, what each still needs, and from whom', () => {
    it('Savannah Cafe is Likely: need, decision maker and deposit day on record, and Jane said yes to the KES 30,000 quote', () => {
      const likely = grid(grace).groups.find((g: any) => g.group === 'likely');
      expect(likely.rowIds).toEqual([deal(grace, 'Savannah Cafe').id]);
      expect(deal(grace, 'Savannah Cafe').criteriaSays).toBe('Three of the four criteria are on record. The budget the customer stated is not on record yet.');
    });

    it('Grace reads what each deal still needs and who owes it, one line each, from the record', () => {
      const step = (name: string) => deal(grace, name).nextStep;
      expect(step('Mama Pima Stores')).toBe('Answer Wanjiru on KES 12,000 off 10 units, then call her next week.');
      expect(step('Savannah Cafe')).toBe('Jane pays the KES 15,000 deposit on Friday 16 October.');
      expect(step('Tuskys Westgate')).toBe('Joseph\'s samples, promised for Thursday 15 October. Nothing since says they came.');
      expect(step('Juja Hardware')).toBe('Your answer on KES 4,500 a unit, then a buying date from Mr Kariuki.');
      expect(step('Ngong Road Minimart')).toBe('Kevin follows up with Ali on Monday 19 October. The quote of KES 20,000 is sent.');
      expect(step('Kilele Hotel')).toBe('Kevin will schedule the delivery of the 40 units to Kilele Hotel.');
      expect(step('Greenfield Supermarket')).toBe('Delivery on Friday 16 October, and Greenfield Supermarket pays on delivery.');
      for (const old of ['Send the quote, by tomorrow by noon', 'Speak to the owner', 'Pay a KES 15,000 deposit on Friday', 'Follow up with Wanjiru at Mama Pima Stores']) {
        expect(JSON.stringify(grid(grace).rows.map((r: any) => r.nextStep))).not.toContain(old);
      }
    });

    it('each rep reads their own deals\' steps said to them, and the lead\'s answer as Grace\'s', () => {
      expect(deal(joseph, 'Juja Hardware').nextStep).toBe('Grace\'s answer on KES 4,500 a unit, then a buying date from Mr Kariuki.');
      expect(deal(kevin, 'Ngong Road Minimart').nextStep).toBe('You follow up with Ali on Monday 19 October. Your quote of KES 20,000 is sent.');
      expect(deal(mercy, 'Tuskys Westgate').nextStep).toBe('Joseph\'s samples, promised for Thursday 15 October. Nothing since says they came.');
      expect(deal(mercy, 'Mama Mboga Mart').nextStep).toBe('Nothing booked. Rose has your KES 10,000 quote. Ask Rose when Mama Mboga Mart will buy.');
      /* Never a colleague's deal. */
      expect(deal(mercy, 'Juja Hardware')).toBeUndefined();
      expect(deal(joseph, 'Tuskys Westgate')).toBeUndefined();
    });

    it('a price nobody agreed is not a value, and a quote reads as quoted', () => {
      expect(deal(grace, 'Juja Hardware').valueLine).toBe('5 units, KES 22,500 if you agree KES 4,500');
      expect(deal(joseph, 'Juja Hardware').valueLine).toBe('5 units, KES 22,500 if Grace agrees to KES 4,500');
      expect(deal(grace, 'Savannah Cafe').valueLine).toBe('KES 30,000 quoted');
      expect(deal(grace, 'Ngong Road Minimart').valueLine).toBe('KES 20,000 quoted');
    });

    it('the four criteria read the deal\'s own details: Mama Pima Stores, Juja Hardware, Tuskys Westgate, and the won deals', () => {
      const met = (b: any, name: string) => deal(b, name).criteria.filter((c: any) => c.met).map((c: any) => `${c.label}${c.value ? `, ${c.value}` : ''}`);
      expect(met(grace, 'Mama Pima Stores')).toEqual(['Need, 10 units', 'Decision maker, Wanjiru, the owner']);
      expect(met(grace, 'Juja Hardware')).toEqual(['Need, five units if they\'re KES 4,500 each', 'Budget the customer stated, KES 4,500 a unit', 'Decision maker, the owner']);
      expect(met(mercy, 'Tuskys Westgate')).toEqual(['Decision maker, Peter']);
      expect(met(grace, 'Greenfield Supermarket')).toEqual(['Need, 25 units', 'Budget the customer stated, KES 125,000', 'Decision maker, the buyer']);
      expect(met(grace, 'Kilele Hotel')).toEqual(['Need, 40 units', 'Budget the customer stated, KES 200,000']);
    });

    it('the gap paragraph is short and names the deal with no units', () => {
      /* With no stall rule set, Upper Hill Offices is open too (standing decision 4). */
      expect(grace.toCloseTheGap.says).toBe('The deals likely to close hold 6 units. Even if all six here close too, that is 27 units, 28 short. Tuskys Westgate and Upper Hill Offices have no number of units yet.');
    });
  });

  describe('Q2, B-7 to B-9, B-32: what needs Grace today, and what she can do', () => {
    const decisions = (b: any) => ((b.leadActions ?? []) as any[]).filter((a) => a.decision?.question && (a.action?.choices ?? []).length);
    it('the price card names the customer, the units, the price on every other quote, and who waits on whom', () => {
      const price = decisions(grace).find((a) => /Juja Hardware/.test(a.decision.question));
      expect(price.decision.question).toBe('Decide whether Juja Hardware can have 5 units at KES 4,500 each');
      expect(price.decision.why).toBe('That is KES 500 a unit under the KES 5,000 on every other quote, KES 22,500 in all. Joseph asked you on 14 October, and Mr Kariuki is waiting for Joseph to call back.');
      expect(price.action.choices.map((c: any) => c.label)).toEqual(['Yes, agree to it', 'No']);
    });

    it('the discount Grace said she would decide is under What needs you (standing decision 3)', () => {
      const pima = decisions(grace).find((a) => /Mama Pima Stores/.test(a.decision.question));
      expect(pima.decision.question).toBe('Decide whether Mama Pima Stores can have 10 units for KES 38,000, which is KES 12,000 off');
      expect(pima.decision.why).toBe('Wanjiru asked Joseph on 12 October and has had no answer. You said on 12 October that you would decide that day.');
      expect(pima.action.choices[0].route.path).toMatch(/\/board\/deals\/[^/]+\/decide$/);
    });

    it('no stall rule is set, so none is applied: one item asks Grace to set one, and Upper Hill Offices stays open with what Kevin tried (standing decision 4, as changed)', () => {
      expect(grace.atTheStallRule ?? []).toEqual([]);
      expect(grid(grace).groups.map((g: any) => g.group)).not.toContain('cold');
      const upper = deal(grace, 'Upper Hill Offices');
      expect(upper.group).toBe('possible');
      expect(upper.noReplySince).toBe('2026-10-12');
      expect(upper.nextStep).toBe('Paul has not answered three calls from Kevin, on 13 and 14 October.');
      expect(upper.groupSays).toContain('Nobody has heard back from the customer since 12 October.');
      const rule = (grace.leadActions ?? []).find((a: any) => a.id === 'the-stall-rule');
      expect(rule.decision.question).toBe('No stall rule set yet');
      expect(rule.decision.why).toBe('Groundwork suggests dropping a deal after 3 working days with no answer from the customer. Until you set a rule, no deal is marked cold or dropped for going quiet. Upper Hill Offices has not answered since 12 October, which is more than that.');
      expect(rule.action.choices.map((c: any) => c.label)).toEqual(['Yes, 3 working days', 'Not now']);
      expect(rule.action.choices[0].route.path).toMatch(/\/board\/stall-rule\/answer$/);
      expect(JSON.stringify(grace)).not.toMatch(/The stall rule you set|Groundwork's rule is to drop/);
    });

    it('once Grace sets the rule, Upper Hill Offices is at it, said as hers', async () => {
      const set = await boardAs(theShortRun({ contextItems: [{ kind: 'WAY_OF_WORKING', text: theStallRuleAsALine(3) }] }), ...reader('Grace'));
      expect(set.atTheStallRule).toEqual([expect.objectContaining({
        title: 'Paul at Upper Hill Offices has not answered three calls from Kevin, on 13 and 14 October',
        detail: 'Nothing on record says yet what Upper Hill Offices needs. Your stall rule is to drop a deal after 3 working days with no answer.',
        ask: 'Ask Kevin',
      })]);
      expect(deal(set, 'Upper Hill Offices').group).toBe('cold');
      expect((set.leadActions ?? []).some((a: any) => a.id === 'the-stall-rule')).toBe(false);
    });

    it('her not now is kept, and the board stops asking', async () => {
      const no = await boardAs(theShortRun({ contextItems: [{ kind: 'WAY_OF_WORKING', text: theStallRuleDeclined }] }), ...reader('Grace'));
      expect((no.leadActions ?? []).some((a: any) => a.id === 'the-stall-rule')).toBe(false);
      expect(no.atTheStallRule ?? []).toEqual([]);
      expect(theStallRuleIn([{ text: theStallRuleDeclined }])).toEqual({ days: null, declined: true });
      expect(theStallRuleIn([{ text: 'We drop a deal after five working days with no reply.' }])).toEqual({ days: 5, declined: false });
    });

    it('Today counts what the board shows under What needs you, and nothing more', () => {
      const today = whatTheBoardAsksOfTheLead(grace, { id: 'g-1', organizationId: 'org-1', label: 'Sales team, Q4' });
      expect(today.map((n) => n.title)).toEqual([
        'Decide whether Juja Hardware can have 5 units at KES 4,500 each',
        'Decide whether Mama Pima Stores can have 10 units for KES 38,000, which is KES 12,000 off',
        'No stall rule set yet',
      ]);
    });

    it('no rep is asked the lead\'s decisions, or reads the stall card about a colleague', () => {
      for (const b of [mercy, kevin, joseph]) {
        expect(decisions(b)).toEqual([]);
        expect(b.atTheStallRule ?? []).toEqual([]);
        expect(JSON.stringify(b)).not.toContain('KES 38,000');
      }
    });
  });

  describe('Q4, B-10, B-17 to B-20: who is stuck, on what, what was tried, and what would clear it', () => {
    const card = (b: any, name: RegExp) => (b.blockers ?? []).find((x: any) => name.test(String(x.name ?? '')));
    it('Grace reads the samples card in first names, raised three times, with nothing claimed that no document shows', () => {
      const x = card(grace, /samples/);
      expect(x).toMatchObject({
        on: 'Joseph',
        holdingUp: 'Tuskys Westgate. Peter can make a decision once the samples come.',
        timeGiven: 'Joseph said Thursday 15 October. That day has passed, and nothing since says they came.',
        wouldClearIt: 'Joseph brings the samples to Mercy. Then Peter at Tuskys Westgate can make a decision.',
      });
      expect(x.raised.says).toBe('3 times, from 12 to 14 October.');
      /* What was tried, in a full sentence (Q4). */
      expect(x.tried).toBe('Mercy called Joseph on 13 October.');
      expect((mercy.blockers ?? []).find((b: any) => /samples/.test(String(b.name ?? ''))).tried).toBe('You called Joseph on 13 October.');
      expect(x.proof.says).toBe('Nothing on record proves it. It rests on what Mercy and Joseph both said.');
      expect(JSON.stringify(x)).not.toMatch(/A document backs|Joseph Kariuki|Mercy Wairimu|Nobody has said what would clear it/);
    });

    it('Grace reads the price card with the deal it affects, and her yes or no as what would clear it', () => {
      const x = card(grace, /4,500/);
      expect(x).toMatchObject({ on: 'You', holdingUp: 'Juja Hardware, 5 units, KES 22,500.', wouldClearIt: 'Your yes or no. Then Joseph calls Mr Kariuki back for a buying date.' });
      expect(x.raised.says).toBe('Once, on 14 October.');
    });

    it('Joseph reads the same, said to him', () => {
      const x = card(joseph, /4,500/);
      expect(x.wouldClearIt).toBe('Grace\'s yes or no. Then you call Mr Kariuki back for a buying date.');
      expect(card(joseph, /samples/) ?? (joseph.blockers ?? []).find((b: any) => b.on === 'You')).toBeTruthy();
    });
  });

  describe('Q5, Q6, B-21, B-22: what each rep did, and what keeps coming up', () => {
    it('on Sunday, Grace reads each person\'s last check-in line with its day, never "Hasn\'t checked in today"', () => {
      const row = (first: string) => grace.eachPersonToday.find((r: any) => r.who.startsWith(first));
      expect(row('Mercy')).toMatchObject({ line: 'On Wednesday 14 October, Mercy said, “I quoted her KES 10,000 for the two units.”', lastIn: '14 Oct', checkedInToday: false });
      expect(row('Kevin').line).toBe('On Wednesday 14 October, Kevin said, “Savannah Cafe said yes to 6 units.”');
      expect(JSON.stringify(grace.eachPersonToday)).not.toContain('Hasn’t checked in today');
    });

    it('on a weekday nobody has checked in yet, it is "Hasn\'t checked in today", as before', async () => {
      const monday = await boardAs(theShortRun({ clock: { now: new Date('2026-10-19T07:00:00Z'), createdAt: new Date('2026-10-12T07:00:00Z'), endsAt: new Date('2026-10-30T17:00:00Z'), timelineDays: 15, cadence: 'DAILY' } }), ...reader('Grace'));
      expect(monday.eachPersonToday.every((r: any) => r.line === 'Hasn’t checked in today.' && !r.lastIn)).toBe(true);
    });

    it('Joseph\'s samples, promised in each of his three check-ins and still open, keep coming up, as what happened (standing decision 5, as changed)', () => {
      expect(grace.keepsComingUp).toEqual([{ participantId: pidOf('Joseph'), says: 'The samples for Tuskys Westgate, promised three check-ins running, still not done.', yours: false }]);
      expect(grace.eachPersonToday.find((r: any) => r.who.startsWith('Joseph')).keepsComingUp).toBe('The samples for Tuskys Westgate, promised three check-ins running, still not done.');
    });

    it('a colleague never reads what keeps coming up about somebody else, and nobody reads anybody\'s words but the lead', () => {
      for (const b of [mercy, kevin]) expect(b.keepsComingUp ?? []).toEqual([]);
      for (const b of [mercy, kevin, joseph]) expect(JSON.stringify(b.eachPersonToday ?? [])).not.toMatch(/said, “/);
    });
  });

  describe('B-23, B-24, B-30, R-1, R-5: the stage counts, the reports list, when it last changed, and Mercy\'s own board', () => {
    it('a stage nobody reported a deal at shows only how many meet it: never "Qualified 3 said, 0 met"', () => {
      const line = (s: any) => (s.reported == null ? `${s.stage} ${s.met} met` : `${s.stage} ${s.reported} said, ${s.met} met`);
      const stages = grace.reportedAgainstCriteria.stages.map(line);
      expect(stages).not.toContain('Qualified 5 said, 0 met');
      expect(stages.find((x: string) => x.startsWith('Qualified'))).toBeUndefined();
      expect(stages).toContain('Pitched 2 met');
      expect(grid(grace).rows.some((r: any) => 'stagesSaid' in r)).toBe(false);
    });

    it('each day in the reports list says what moved, from the deals', () => {
      expect(grace.whatMovedEachDay).toEqual({
        '2026-10-12': 'Kilele Hotel paid for 40 units.',
        '2026-10-13': 'Greenfield Supermarket signed for 25 units.',
        '2026-10-14': 'Savannah Cafe said yes to 6 units.',
      });
      for (const b of [mercy, kevin, joseph]) expect(b.whatMovedEachDay).toBeUndefined();
    });

    it('the board last changed when the last check-in came in, on 14 October, never when the record was written again', () => {
      expect(grace.lastChangedAt).toBe('2026-10-14T11:09:48.068Z');
    });

    it('Mercy reads the day the reports are for, and her share naming her own deal and when it pays', () => {
      expect(mercy.teamPicture).toEqual({ shared: true, forDay: 'Wednesday 14 October', yourReportFor: '14 October' });
      expect(mercy.yourShare).toEqual([expect.objectContaining({
        says: 'You have sold 25 of your 40 units so far, all to Greenfield Supermarket, on a signed order. Payment is due on delivery on Friday 16 October.',
        whoSees: 'Only you and Grace see your share.',
      })]);
      expect(kevin.yourShare[0].says).toBe('You have sold 40 of your 40 units so far, all to Kilele Hotel, paid.');
      /* Never a colleague's deal in somebody's share. */
      expect(JSON.stringify(mercy.yourShare)).not.toMatch(/Kilele|Savannah/);
      expect(JSON.stringify(kevin.yourShare)).not.toMatch(/Greenfield/);
    });
  });

  describe('B-26 to B-28: where this is heading', () => {
    it('Grace reads the kit\'s one-liners from the deals, and what would settle it', () => {
      const w = grace.whereThisIsHeading;
      expect(w.signals).toEqual([
        { says: 'Forecast: 65 of 120, and 27 more at most from open deals', from: 'From the deals. The 65 sold came from two orders, Kilele Hotel and Greenfield Supermarket.' },
        { says: 'Joseph\'s deals wait on two price answers from you', from: 'From Joseph\'s check-ins.' },
      ]);
      expect(w.whatWouldSettleIt).toEqual(['Whether Savannah Cafe pays its deposit and Greenfield Supermarket pays on delivery on Friday 16 October, and where 28 more units come from.']);
      expect(JSON.stringify(w)).not.toMatch(/Nothing on record says yet what would settle it|is waiting on/);
    });

    it('no pace is carried forward from three sessions and two orders: never "about 215 by session 15"', async () => {
      const team = R.objectives.find((o: any) => o.name === 'Units sold by 30 October').id;
      const counted = await boardAs(theShortRun({ snapshots: [{ objectiveId: team, count: 40, sessionNumber: 1 } as any, { objectiveId: team, count: 65, sessionNumber: 3 } as any] }), ...reader('Grace'));
      expect(JSON.stringify(counted.forecast ?? [])).not.toContain('215');
      expect((counted.forecast ?? []).some((f: any) => f.objectiveId === team)).toBe(false);
    });
  });

  describe('Q6: what to coach each rep this week', () => {
    it('Grace reads one line about each rep\'s work, from their own deals and waits, never a label', () => {
      const line = (first: string) => grace.eachPersonToday.find((r: any) => r.who.startsWith(first)).thisWeek;
      expect(line('Kevin')).toBe('Quoted Savannah Cafe and Ngong Road Minimart before asking the budget.');
      expect(line('Mercy')).toBe('Tuskys Westgate waits on Joseph\'s samples. Mama Mboga Mart has a quote and nothing booked.');
      expect(line('Joseph')).toBe('Wanjiru\'s discount has had no answer since 12 October. No buying date is on record for any of Joseph\'s open deals.');
      expect(JSON.stringify(grace.eachPersonToday)).not.toMatch(/\b(?:PIP|at risk|exit|underperform)/i);
    });
    it('no rep reads it, about anybody', () => {
      for (const b of [mercy, kevin, joseph]) expect(JSON.stringify(b.eachPersonToday ?? [])).not.toContain('thisWeek');
    });
  });
});
