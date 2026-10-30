import { sendTheLeadsWeeklyLetters } from './the-leads-weekly-letter';
import { theRunRebuiltEachEvening, theRunAsADatabase, aPersonRecordTable, R2, THE_END_OF_THE_RUN } from '../board/the-persons-record-bed';
import { rebuildThePersonsRecords } from '../board/the-persons-record-store';
import { theLeadsBoard } from '../engagement/the-night-run-bed';

/**
 * THE LEAD'S WEEKLY LETTER READS THE RECORD (Groundwork does the managing, part 2; Hafsah, 21 October 2026), as Grace and Wanjiru read
 * it, from the second night run (gw_night_run2) with each person's record as the run would have kept it, for the week to Tuesday 20
 * October in the morning. The same letter, sent at the same time: with the direct morning on it adds where the target stands, what moved
 * with proof, and who needs her with the evidence. Off, it is the letter as it was. Test data only; no model is called.
 */
async function theLetterOf(g: 'drop' | 'fees' | 'lit', o: { directMorning: boolean; judgements?: boolean }) {
  const table = o.judgements === false ? aPersonRecordTable() : await theRunRebuiltEachEvening(g, rebuildThePersonsRecords);
  const db: any = theRunAsADatabase(g, { directMorning: o.directMorning, judgements: o.judgements ?? true, personRecord: table });
  /* As the run's organisations had it: Muchemi & Co's fee notes are a "collect what's owed" check-in, its bills called fee notes. */
  const org = await db.organization.findUnique();
  db.organization.findUnique = jest.fn(async () => ({ ...org, release2CollectionsOn: true, billWord: g === 'drop' ? null : 'fee note' }));
  db.user = { findUnique: jest.fn(async () => ({ email: 'lead@test', deletedAt: null })) };
  db.ground.findMany = jest.fn(async () => [{ ...R2[g].ground }]);
  const sent: any[] = [];
  await sendTheLeadsWeeklyLetters({
    prisma: db, frontendUrl: 'http://localhost:5220',
    email: { sendTheLeadsWeeklyLetter: async (...a: any[]) => { sent.push(a); } },
    everyCheckIn: { anchorIsOn: true, weeklyReport: async () => null },
    board: { get: async () => theLeadsBoard(g) },
  }, THE_END_OF_THE_RUN);
  return { subject: sent[0]?.[1] as string, lines: (sent[0]?.[2] ?? []) as string[] };
}

describe('Grace’s letter, Drop Access (test)', () => {
  it('says where the target stands, what moved with proof, and who needs her, with the evidence', async () => {
    const { lines } = await theLetterOf('drop', { directMorning: true });
    expect(lines).toEqual([
      'Your team is starting to move.',
      'This week, all five people checked in. Five people said what they will do next. Two things people said they would do were done. 16 handoffs are still waiting.',
      'Here is where the target stands. 75 of 120 sold, 47 paid, 45 short, and the open deals cover 40.',
      'Here is what moved this week, with what shows it. On Friday 16 October Mercy said “Mama Rose\'s Kiosk bought one unit today for KES 5,000 cash.” A document Mercy added shows it. On Monday 19 October Kevin said “Jane paid the remaining KES 15,000 balance for the 6 Savannah Cafe units. The M-Pesa confirmation code is RCD8M1LS4W.” The M-Pesa code RCD8M1LS4W shows it. On Monday 19 October Mercy said “We have the signed purchase order.” A document Mercy added shows it. On Monday 19 October Mercy said “It confirms the order for 25 units from Greenfield Supermarket at KES 125,000, and it\'s signed.” A document Mercy added shows it.',
      'Here is who needs you. Joseph said 3 times that something was sold or paid with nothing on file, and took 2 back later. Groundwork asked for the proof and has coached Joseph since Monday 12 October, and nothing has changed, so call Joseph. On Wednesday 14 October Joseph said “Mama Pima paid a deposit.” On Friday 16 October Joseph said “The Mama Pima deposit hasn\'t actually come through yet, she\'s still choosing.” On Monday 12 October Joseph said “That 10-unit deal for Mama Pima is definitely part of my 30-unit target. It\'s basically closed.” On Monday 12 October Joseph said 10 units for Mama Pima Stores, and on Tuesday 13 October Joseph said “Mama Pima is 15 units now, she\'s expanding.”',
    ]);
  });

  it('Kevin and Mercy appear only for what they proved; Joseph is the one who needs her', async () => {
    const { lines } = await theLetterOf('drop', { directMorning: true });
    const needs = lines.find((l) => l.startsWith('Here is who needs you.'))!;
    expect(needs).not.toMatch(/\bKevin\b|\bMercy\b|\bPeter\b/);
    expect(lines.find((l) => l.startsWith('Here is what moved this week, with what shows it.'))).not.toMatch(/Joseph/);
  });

  it('with the direct morning off, the letter is the letter as it was', async () => {
    const { lines, subject } = await theLetterOf('drop', { directMorning: false });
    expect(subject).toBe('2 things people said they would do were done; 16 handoffs are still waiting');
    expect(lines).toEqual([
      'Your team is starting to move.',
      'This week, all five people checked in. Five people said what they will do next. Two things people said they would do were done. 16 handoffs are still waiting.',
    ]);
  });

  it('with judgements of a person off, the target stays and nothing read from a person’s record is said', async () => {
    const { lines } = await theLetterOf('drop', { directMorning: true, judgements: false });
    expect(lines).toContain('Here is where the target stands. 75 of 120 sold, 47 paid, 45 short, and the open deals cover 40.');
    expect(lines.join(' ')).not.toMatch(/Here is who needs you|with what shows it|coached/);
  });
});

describe('Wanjiru’s letters, Muchemi & Co (test)', () => {
  it('on fee notes: what is owed, and Aisha, whose payments are only said, in her own words with the days', async () => {
    const { lines } = await theLetterOf('fees', { directMorning: true });
    expect(lines).toContain(/* Changed 21 October (final real-model check, item 9): FN-004, FN-006 and FN-007 are marked paid only on somebody's word, so they are owed. */
      'Here is where the target stands. KES 850,000 is owed on 6 fee notes, and 2 of them have no amount on record. 3 of them are marked paid on somebody’s word, with no slip or message on file. Nothing is paid with proof yet.');
    expect(lines).toContain('Here is who needs you. Aisha said 4 times that a client had paid with nothing on file, and took 1 back later. Groundwork asked for the proof and has coached Aisha since Monday 12 October, and nothing has changed, so call Aisha. On Monday 19 October Aisha said “FN-006 for Baraka Hardware has been paid.” Nothing on file shows it yet. On Monday 12 October Aisha said “the bursar at Upendo Schools confirmed it\'s sorted.” Nothing on file shows it yet. On Monday 12 October Aisha said “I think they\'ve paid, I believe it went through on Friday.” On Monday 19 October Aisha said “I was mistaken; Jamii Clinics hasn\'t actually paid yet.”');
    expect(lines.join(' ')).not.toMatch(/Here is who needs you.*\bNjeri\b/);
  });

  /*
   * Changed in polish round 15 (a-day-they-checked-in.ts): each working day now counts once, from what happened that day. Read by the day,
   * David's coaching came after his Wednesday check-in and two check-ins since got worse, so the letter names him, with the days as they
   * were: nothing on Tuesday, and Wednesday and Thursday answered after the day each opened. The old reading counted sessions and kept
   * him as Groundwork's to coach after "one check-in since".
   */
  it('on the litigation team, David: his check-ins got worse in the two check-ins since his coaching, so Wanjiru is told, with the days', async () => {
    const { lines } = await theLetterOf('lit', { directMorning: true });
    const said = lines.join(' ');
    expect(said).toMatch(/Here is who needs you\. David did 4 of 6 check-ins, 1 of them on time, and 2 named the item, what changed and the day\. Groundwork has coached David on it since Wednesday 14 October, and it has got worse, so call David\./);
    expect(said).toMatch(/On Tuesday 13 October, the check-in was not done\. On Wednesday 14 October, the check-in was done after the day it opened\./);
    expect(said).not.toMatch(/more than a day after it opened/);
  });
});
