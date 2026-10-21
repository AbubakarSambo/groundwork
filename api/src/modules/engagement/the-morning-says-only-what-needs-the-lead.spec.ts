import { theDirectMorningFor, theParagraph, theEmailParts, theSubject, asServedOnTheBoard } from './the-direct-morning';
import { theNightRunsDatabase, theNightRunsDatabaseWithRecords, theLeadsBoard, theLeadOf, N } from './the-night-run-bed';
import { theRunAsADatabase, aPersonRecordTable, R2 } from '../board/the-persons-record-bed';
import { rebuildThePersonsRecords } from '../board/the-persons-record-store';

/**
 * THE MORNING SAYS ONLY WHAT NEEDS THE LEAD (Groundwork does the managing, part 2; Hafsah, 21 October 2026), as Grace and Wanjiru read
 * it, from the second night run (gw_night_run2) and each person's record as the run would have kept it. Seven o'clock in Nairobi on
 * Tuesday 20 October. Test data only; no model is called.
 *
 * What the message carries: the target in one line, the decisions only she can make, and the people Groundwork could not move. Honest
 * people (Kevin, Mercy, Njeri) are never the problem in it; Joseph (overstating) and Aisha (payments only said) are, with what Groundwork
 * already tried.
 */
const NOW = new Date('2026-10-20T04:00:00Z');
const morningOf = async (g: 'drop' | 'fees' | 'lit', db: any) => theDirectMorningFor(db, { groundId: N[g].ground.id, leadUserId: theLeadOf(g).userId, board: theLeadsBoard(g), now: NOW });
/** The words of the message: the template's {{2}}, and every line of the email. */
const theMessage = (m: any) => [theParagraph([m], 900).text, ...theEmailParts([m]).flatMap((p) => [p.heading, ...p.lines])].join('\n');

describe('Grace, Drop Access (test), on a normal day', () => {
  let m: any;
  beforeAll(async () => { m = await morningOf('drop', await theNightRunsDatabaseWithRecords('drop', { directMorning: true })); });

  it('reads the target in one line, her decisions, and Joseph, whom Groundwork could not move', () => {
    expect(theParagraph([m], 900).text).toBe('Target: 75 of 120 sold, 47 paid, 45 short, and the open deals cover 40. Needs you today: Juja Hardware wants 5 units at KES 4,500 instead of 5,000, and Joseph is waiting for a yes or no from Management, so get it for Joseph. Peter has been waiting on you since Thursday for a specific area to focus on. Peter is waiting for a list of leads for this week, and nobody has been named to give it, so send it or say who will. Your team: Joseph said 3 times that something was sold or paid, with nothing on file to show it, and took 2 of those back later. Groundwork asked for the proof and has coached Joseph on it since Monday 12 October, and nothing has changed, so call Joseph.');
  });

  it('never names Kevin or Mercy in the message: they backed what they said, so neither is the problem', () => {
    expect(theMessage(m)).not.toMatch(/\bKevin\b|\bMercy\b/);
  });

  it('keeps what is about to close, the credit and the praise on the board, and out of the message', () => {
    const board = asServedOnTheBoard(m).parts.flatMap((p) => p.lines);
    for (const line of ['Ngong Road Minimart pays KES 25,000 for 5 units on delivery tomorrow.', 'Mercy has 2 sales with proof, so tell Mercy well done.', 'Kevin checked in on time 6 days running.']) {
      expect(board).toContain(line);
      expect(theMessage(m)).not.toContain(line);
    }
    expect(theMessage(m)).not.toMatch(/^Closing:|Closing: /m);
  });
});

describe('Grace on a day nothing needs her', () => {
  it('reads one line: the target, and that nothing needs her', async () => {
    /* The same record, with every wait on her answered, and each person's record as it was kept on Monday 12 October in the evening
       (Joseph was coached on proof that evening, and no check-in since had shown whether it worked). */
    const table = aPersonRecordTable();
    await rebuildThePersonsRecords(theRunAsADatabase('drop', { asOf: new Date('2026-10-12T17:00:00Z'), personRecord: table }), R2.drop.ground.id, new Date('2026-10-12T17:00:00Z'));
    const db = theNightRunsDatabase('drop', { directMorning: true });
    db.personRecord = table;
    db.groundDependency.findMany = jest.fn(async () => []);
    const m = await morningOf('drop', db);
    expect(theParagraph([m!], 900).text).toBe('Target: 75 of 120 sold, 47 paid, 45 short, and the open deals cover 40. Nothing needs you today.');
    expect(theSubject('Grace', [m!])).toBe('Grace: 45 short of 120, and nothing needs you today');
    expect(theEmailParts([m!])).toEqual([
      { heading: 'Will we reach 120 units sold by 30 October?', lines: ['75 of 120 sold, 47 paid, 45 short, and the open deals cover 40.'] },
      { heading: 'What needs you today', lines: ['Nothing needs you today.'] },
    ]);
  });
});

describe('Wanjiru, Muchemi & Co (test)', () => {
  it('on fee notes reads what is owed, her decisions, and Aisha, whose payments are only said; never Njeri', async () => {
    const m = await morningOf('fees', await theNightRunsDatabaseWithRecords('fees', { directMorning: true }));
    expect(theParagraph([m!], 900).text).toBe('Target: KES 180,000 is owed on 3 fee notes, and 2 of them have no amount on record. Nothing is paid with proof yet. Needs you today: Nyota Logistics disputes FN-008, saying the contract review was billed twice, and Brian follows it up, so decide whether to correct it. Brian has been waiting on you since 12 October for guidance on how to proceed with the double-billing claim. You marked FN-004 for Kasarani Foods paid, so file the bank slip or the M-Pesa message. Your team: Aisha said 4 times that a client had paid, with nothing on file to show it, and took 1 of those back later. Groundwork asked for the proof and has coached Aisha on it since Monday 12 October, and nothing has changed, so call Aisha.');
    expect(theMessage(m)).not.toMatch(/\bNjeri\b/);
  });

  it('on the litigation team reads David, whose check-ins got worse after coaching; a check-in not made since Friday stays on the board', async () => {
    const m = await morningOf('lit', await theNightRunsDatabaseWithRecords('lit', { directMorning: true }));
    const team = theEmailParts([m!]).find((p) => p.heading === 'Your team today')!;
    expect(team.lines).toEqual(['David did 4 of 5 check-ins, 1 of them on time, and 2 named the item, what changed and the day. Groundwork has coached David on it since Thursday 15 October, and it has got worse, so call David.']);
    expect(asServedOnTheBoard(m!).parts.find((p) => p.key === 'team')!.lines).toContain("Brian hasn't checked in since Friday.");
  });
});

describe('the switches', () => {
  it('with judgements of a person off, no record is read and nobody is named for it: the rest is the same', async () => {
    const m = await morningOf('drop', await theNightRunsDatabaseWithRecords('drop', { directMorning: true, judgements: false }));
    expect(theParagraph([m!], 900).text).toBe('Target: 75 of 120 sold, 47 paid, 45 short, and the open deals cover 40. Needs you today: Juja Hardware wants 5 units at KES 4,500 instead of 5,000, and Joseph is waiting for a yes or no from Management, so get it for Joseph. Peter has been waiting on you since Thursday for a specific area to focus on. Peter is waiting for a list of leads for this week, and nobody has been named to give it, so send it or say who will.');
    expect(theMessage(m)).not.toMatch(/coached|Groundwork asked/);
  });

  it('even with a record kept, judgements off reads none of it', async () => {
    const db = await theNightRunsDatabaseWithRecords('fees', { directMorning: true });
    db.organization.findUnique = jest.fn(async () => ({ ...(N.org as any[]).find((o) => o.id === N.fees.ground.organizationId), directMorningOn: true, personJudgementsOn: false }));
    const m = await morningOf('fees', db);
    expect(theMessage(m)).not.toMatch(/\bAisha said\b|coached/);
  });

  it('with the direct morning off, there is no morning at all, records or not', async () => {
    expect(await morningOf('drop', await theNightRunsDatabaseWithRecords('drop', { directMorning: false }))).toBeNull();
  });
});
