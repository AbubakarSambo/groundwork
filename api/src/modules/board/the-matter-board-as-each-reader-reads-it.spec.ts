import { theMatterBoardFor } from './the-matter-board.service';
import { theCollectionsBoardFor } from './the-collections-board.service';
import { fileTheFeeNotesDueOnAnEvent } from './a-fee-note-due-on-an-event';
import { aParticipantsOwnBoard } from './a-participants-board-is-their-own';
import { aPluralName } from './the-matter-board';
import {
  theWorldWithTheLitigationDaily, thePrismaFor, LIT_WANJIRU, LIT_BRIAN, LIT_AISHA, LIT_DAVID, WANJIRU, BRIAN, AISHA, NJERI,
} from './__fixtures__/the-collections-record-for-specs';
import { MUCHEMI_NOW, MUCHEMI_LITIGATION, MUCHEMI_THE_NEAR_MISS } from '../grounds/__fixtures__/muchemi-and-co';

/**
 * THE MATTER BOARD, AND THE FEE NOTES THAT FELL DUE ON AN EVENT, AS EACH PERSON READS THEM (Release 2, pull request 3 of 3), from
 * Muchemi & Co (test): Wanjiru the partner runs the litigation daily and the fee notes; Brian and Aisha, the associates, check in to
 * both; David, the paralegal, is in the litigation daily only. What each reads, in full sentences, served by the server after its
 * wall. The litigation daily's lines are read for events in the order they were said, as the board listener reads them.
 */
async function theWeekRead(upTo = 3, opts: { release2On?: boolean } = {}) {
  const world = theWorldWithTheLitigationDaily(opts);
  const prisma = thePrismaFor(world);
  const done = world.checkIns.filter((c: any) => c.groundId === MUCHEMI_LITIGATION.id && c.sessionNumber <= upTo).sort((a: any, b: any) => a.sessionNumber - b.sessionNumber);
  for (const c of done) await fileTheFeeNotesDueOnAnEvent({ prisma }, { groundId: MUCHEMI_LITIGATION.id, checkInId: c.id });
  return { world, prisma };
}
const matterBoard = async (reader: any, upTo = 3, opts: { release2On?: boolean } = {}) => {
  const { prisma } = await theWeekRead(upTo, opts);
  return theMatterBoardFor(prisma, MUCHEMI_LITIGATION.id, reader, MUCHEMI_NOW) as Promise<any>;
};
const words = (b: unknown) => JSON.stringify(b);

describe('Wanjiru, the partner, reads every matter the check-in names, with one line for each matter\'s fees', () => {
  it('the two matters, where each stands, and each matter\'s fees', async () => {
    const b = await matterBoard(LIT_WANJIRU);
    expect(b.intro).toBe('Two matters are on record in this check-in, Kasarani Foods v. Tumaini Traders and Jamii Clinics employment claim.');
    expect(b.question).toBe('Where the matters stand');
    /* Each deadline says who has it, in the morning's own words, and each wait since when (boards audit M3, 30 October: both were left out). */
    expect(b.matters.map((m: any) => [m.name, m.stands, m.fees])).toEqual([
      [
        'Kasarani Foods v. Tumaini Traders',
        'The hearing in Kasarani Foods v. Tumaini Traders is due on Thursday 12 November, and David has it. Nothing is in the way that has not been cleared.',
        'There are three fee notes on this matter, for KES 750,000 in all. FN-004 is paid, with proof. FN-005 fell due on 20 October, when the reply was filed. The fee note not raised yet fell due on 21 October, when the hearing date was set.',
      ],
      [
        'Jamii Clinics employment claim',
        'The witness statements for the Jamii Clinics employment claim are due on Friday 30 October, and Aisha has it. Aisha has been waiting on Jamii Clinics since 19 October for the last witness statement.',
        'There is one fee note on this matter, for KES 180,000. FN-007 was promised for 10 October, and the date passed.',
      ],
    ]);
    expect(b.feesNote).toBe('Each matter’s fees are read from the fee notes check-in.');
  });

  it('what she needs to decide, and what changed this week and what it changed, each line marked by how it is known', async () => {
    const b = await matterBoard(LIT_WANJIRU);
    expect(b.decide).toEqual({ heading: 'What you need to decide', rows: [], empty: 'Nothing is waiting for a decision yet.' });
    expect(b.changed.heading).toBe('What changed this week, and what it changed');
    const brian = b.changed.rows.find((r: any) => r.id === 'e-lit-brian-2');
    expect(brian).toEqual({ id: 'e-lit-brian-2', who: 'Brian', matter: 'Kasarani Foods v. Tumaini Traders', said: '“In Kasarani Foods v. Tumaini Traders, the reply was filed on 20 October.”', mark: 'said', markSays: 'Said in a check-in, with no document yet', itChanged: 'It made fee note FN-005 due on 20 October.' });
    expect(b.changed.rows.find((r: any) => r.id === 'e-lit-david-3').itChanged).toBe('It made the fee note for Kasarani Foods that is not raised yet due on 21 October.');
    /* The near miss is shown as said, and changed nothing. */
    expect(b.changed.rows.find((r: any) => r.id === 'e-lit-david-2')).toMatchObject({ said: `“${MUCHEMI_THE_NEAR_MISS.replace(/\.$/, '')}.”`, itChanged: null });
    expect(b.changed.legend.map((l: any) => l.says)).toEqual(['A document shows it', 'Said in a check-in, with no document yet']);
  });

  it('a decision the board already serves her is drawn under What you need to decide', async () => {
    const { prisma } = await theWeekRead();
    const b: any = await theMatterBoardFor(prisma, MUCHEMI_LITIGATION.id, LIT_WANJIRU, MUCHEMI_NOW, { decisions: [{ question: 'Do we ask the court for more time on the witness statements?', why: 'Only two of the three are in.' }] });
    expect(b.decide.rows).toEqual([{ question: 'Do we ask the court for more time on the witness statements?', why: 'Only two of the three are in.' }]);
  });
});

describe('an associate reads only the matters they spoke of, their own lines, and only the fee notes they follow up', () => {
  it('Brian: Kasarani Foods, his three fee notes as his, his own lines as "you", and nothing of Jamii Clinics or David', async () => {
    const b = await matterBoard(LIT_BRIAN);
    expect(b.intro).toBe('You have spoken about one matter in this check-in, Kasarani Foods v. Tumaini Traders.');
    expect(b.matters.map((m: any) => [m.name, m.stands, m.fees])).toEqual([[
      'Kasarani Foods v. Tumaini Traders',
      'No deadline of yours is on record for this matter yet. Nothing is in your way on this matter that has not been cleared.',
      'You follow up three fee notes on this matter, for KES 750,000 in all. FN-004 is paid, with proof. FN-005 fell due on 20 October, when the reply was filed. The fee note not raised yet fell due on 21 October, when the hearing date was set.',
    ]]);
    expect(b.decide).toBeNull();
    expect(b.changed.rows.map((r: any) => [r.who, r.id])).toEqual([['You', 'e-lit-brian-2'], ['You', 'e-lit-brian-1']]);
    for (const theirs of ['Jamii', 'David', 'Aisha', 'mention date', 'hearing date is set', 'FN-007']) expect(words(b)).not.toContain(theirs);
    expect(b.feesNote).toBe('Each matter’s fees are read from the fee notes check-in, and you read only the fee notes you follow up.');
  });

  it('Aisha: Jamii Clinics, her one fee note, her own deadline and wait; nothing of Kasarani Foods', async () => {
    const b = await matterBoard(LIT_AISHA);
    expect(b.matters.map((m: any) => [m.name, m.stands, m.fees])).toEqual([[
      'Jamii Clinics employment claim',
      'The witness statements for the Jamii Clinics employment claim are due on Friday 30 October, and you have it. You have been waiting on Jamii Clinics since 19 October for the last witness statement.',
      'You follow up one fee note on this matter, for KES 180,000. FN-007 was promised for 10 October, and the date passed.',
    ]]);
    for (const theirs of ['Kasarani', 'Brian', 'David', 'FN-004', 'FN-005', '750,000']) expect(words(b)).not.toContain(theirs);
  });
});

describe('the paralegal, in the litigation daily only, never reads a fee amount', () => {
  it('David: the two matters he spoke of, his own lines and deadline, and that the fees are not shown to him; no amount, no fee note number, nobody else', async () => {
    const b = await matterBoard(LIT_DAVID);
    expect(b.intro).toBe('You have spoken about two matters in this check-in, Kasarani Foods v. Tumaini Traders and Jamii Clinics employment claim.');
    expect(b.matters.map((m: any) => [m.name, m.stands, m.fees])).toEqual([
      ['Kasarani Foods v. Tumaini Traders', 'The hearing in Kasarani Foods v. Tumaini Traders is due on Thursday 12 November, and you have it. Nothing is in your way on this matter that has not been cleared.', 'You do not follow up a fee note on this matter, so its fees are not shown to you.'],
      ['Jamii Clinics employment claim', 'No deadline of yours is on record for this matter yet. Nothing is in your way on this matter that has not been cleared.', 'You do not follow up a fee note on this matter, so its fees are not shown to you.'],
    ]);
    expect(b.changed.rows.every((r: any) => r.who === 'You')).toBe(true);
    expect(b.changed.rows.every((r: any) => r.itChanged === null)).toBe(true);
    for (const never of ['KES', 'FN-', '250,000', 'paid', 'promised', 'Brian', 'Aisha', 'Wanjiru']) expect(words(b)).not.toContain(never);
  });

  it('nobody outside the check-in reads anything of it', async () => {
    const b = await matterBoard({ runsIt: false, participantId: null, userId: 'u-njeri' });
    expect(b.matters).toEqual([]);
    expect(b.changed.rows).toEqual([]);
    expect(words(b)).not.toMatch(/KES|FN-|Kasarani|Jamii/);
  });

  it('the participant\'s board keeps the matter board and the collections board exactly as walled at their own read, and nothing else new', () => {
    const served = { matter: { intro: 'mine' }, collections: { answer: 'mine' }, somethingNew: { secret: true }, groundId: 'g' };
    const out = aParticipantsOwnBoard(served, { meId: 'l-david', released: false, hasOwnReport: true });
    expect(out.matter).toEqual({ intro: 'mine' });
    expect(out.collections).toEqual({ answer: 'mine' });
    expect(out.somethingNew).toBeUndefined();
  });
});

describe('the fee notes that fell due on an event, on the collections board, as each person reads them', () => {
  it('Wanjiru reads both under What needs you, with the line that said it, in its own words', async () => {
    const { prisma } = await theWeekRead();
    const b: any = await theCollectionsBoardFor(prisma, 'g-muchemi-fee-notes', WANJIRU, MUCHEMI_NOW);
    expect(b.needsYou.rows).toContainEqual({
      title: 'Fee note FN-005 for Kasarani Foods fell due on 20 October',
      says: 'It falls due when the reply is filed. Brian said in Litigation team daily on 20 October, “In Kasarani Foods v. Tumaini Traders, the reply was filed on 20 October.” It is for KES 250,000, and nothing is paid yet. Brian follows it up.',
    });
    expect(b.needsYou.rows).toContainEqual({
      title: 'A fee note for Kasarani Foods fell due on 21 October, and it is not raised yet',
      says: 'It falls due when the hearing date is set. David said in Litigation team daily on 21 October, “In Kasarani Foods v. Tumaini Traders, the hearing date is set, for 12 November.” It is for KES 250,000. Brian follows it up.',
    });
    expect(b.every.rows.find((r: any) => r.number === 'FN-005')).toMatchObject({ group: 'on-track', fallsDue: '20 October, yesterday, when the reply was filed' });
    expect(b.stand.groups.find((g: any) => g.group === 'on-event')).toMatchObject({ count: 0, says: 'None at the moment.' });
    expect(b.needsYou.toConfirm).toBeUndefined();
  });

  it('after Tuesday, the near miss is listed for Wanjiru to confirm, with Yes and No, and nothing has changed on the fee note', async () => {
    const { prisma, world } = await theWeekRead(2);
    const b: any = await theCollectionsBoardFor(prisma, 'g-muchemi-fee-notes', WANJIRU, MUCHEMI_NOW);
    expect(b.needsYou.toConfirm).toEqual([{
      id: 'w-kasarani-3:e-lit-david-2',
      title: 'Did the fee note for Kasarani Foods that is not raised yet fall due on 20 October?',
      says: 'It falls due when the hearing date is set. David said in Litigation team daily on 20 October, “Kasarani Foods: the mention date is set for 3 November.” Groundwork cannot tell whether this is the same event, so nothing has changed.',
      choices: [
        { label: 'Yes, it is due', route: { method: 'POST', path: '/grounds/g-muchemi-fee-notes/board/due-on-an-event/answer', body: { itemId: 'w-kasarani-3', lineId: 'e-lit-david-2', yes: true } } },
        { label: 'No, it is not', route: { method: 'POST', path: '/grounds/g-muchemi-fee-notes/board/due-on-an-event/answer', body: { itemId: 'w-kasarani-3', lineId: 'e-lit-david-2', yes: false } } },
      ],
    }]);
    expect(world.items.find((i: any) => i.id === 'w-kasarani-3').fields['Falls due']).toBeUndefined();
    expect(b.every.rows.find((r: any) => r.group === 'not-raised').fallsDue).toBe('When the hearing date is set');
  });

  it('Brian reads his two as "you", is never asked to confirm, and reads David\'s words because he is in the litigation daily too', async () => {
    const { prisma } = await theWeekRead(2);
    const b2: any = await theCollectionsBoardFor(prisma, 'g-muchemi-fee-notes', BRIAN, MUCHEMI_NOW);
    expect(b2.needsYou.toConfirm).toBeUndefined();
    const { prisma: p3 } = await theWeekRead(3);
    const b: any = await theCollectionsBoardFor(p3, 'g-muchemi-fee-notes', BRIAN, MUCHEMI_NOW);
    expect(b.needsYou.rows[0]).toEqual({
      title: 'Fee note FN-005 for Kasarani Foods fell due on 20 October',
      says: 'It falls due when the reply is filed. You said in Litigation team daily on 20 October, “In Kasarani Foods v. Tumaini Traders, the reply was filed on 20 October.” It is for KES 250,000, and nothing is paid yet. You follow it up.',
    });
  });

  it('Aisha and Njeri read none of it: not their fee notes', async () => {
    const { prisma } = await theWeekRead();
    for (const reader of [AISHA, NJERI]) {
      const b: any = await theCollectionsBoardFor(prisma, 'g-muchemi-fee-notes', reader, MUCHEMI_NOW);
      expect(words(b)).not.toMatch(/Kasarani|Litigation team daily|reply was filed|hearing date/);
    }
  });

  it('a reader of the fee note who is not in the litigation daily reads that it was reported there, never the words or who said them', async () => {
    const { prisma, world } = await theWeekRead();
    /* Brian, as if he were not in the litigation daily. */
    world.grounds.find((g: any) => g.id === MUCHEMI_LITIGATION.id).participants = world.grounds.find((g: any) => g.id === MUCHEMI_LITIGATION.id).participants.filter((p: any) => p.userId !== 'u-brian');
    const b: any = await theCollectionsBoardFor(prisma, 'g-muchemi-fee-notes', BRIAN, MUCHEMI_NOW);
    expect(b.needsYou.rows[0].says).toBe('It falls due when the reply is filed. Litigation team daily reported it on 20 October. It is for KES 250,000, and nothing is paid yet. You follow it up.');
    expect(words(b)).not.toContain('David');
  });
});

describe('with Release 2 off, nothing changes', () => {
  it('the matter board is not served to anybody, and no fee note moved', async () => {
    for (const reader of [LIT_WANJIRU, LIT_BRIAN, LIT_AISHA, LIT_DAVID]) expect(await matterBoard(reader, 3, { release2On: false })).toBeNull();
    const { world } = await theWeekRead(3, { release2On: false });
    expect(world.items.find((i: any) => i.id === 'w-fn005').fields['Falls due']).toBeUndefined();
  });
});

describe('a deadline\'s name read as one thing or many', () => {
  it('reads "statements" as many and "hearing" or "process" as one', () => {
    expect(aPluralName('The witness statements for the Jamii Clinics employment claim')).toBe(true);
    expect(aPluralName('The hearing in Kasarani Foods v. Tumaini Traders')).toBe(false);
    expect(aPluralName('The address for service')).toBe(false);
  });
});
