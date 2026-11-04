import { BoardService } from './board.service';
import { theCollectionsBoardFor } from './the-collections-board.service';
import { theCollectionsWorld, thePrismaFor, WANJIRU, BRIAN, AISHA, NJERI, HALIMA, MUSA, PETER, ACHIENG } from './__fixtures__/the-collections-record-for-specs';
import { MUCHEMI_NOW, MUCHEMI_FEE_NOTES } from '../grounds/__fixtures__/muchemi-and-co';
import { LENDER_LOANS } from '../grounds/__fixtures__/a-small-lender';

/**
 * THE COLLECTIONS BOARD, AS EACH PERSON READS IT, FROM MUCHEMI & CO (TEST) AND THE SMALL LENDER (TEST) (Release 2, pull request 2
 * of 3). What a person reads, in full sentences, served by the server after its wall: Wanjiru the partner reads every fee note;
 * Brian and Aisha each read only the fee notes they follow up; Njeri, who follows none, reads none; Halima reads every loan; each
 * borrower reads only their own.
 */
const board = (groundId: string, reader: any, world = theCollectionsWorld()) => theCollectionsBoardFor(thePrismaFor(world), groundId, reader, MUCHEMI_NOW);
const everyWord = (b: any) => JSON.stringify(b);

describe('Wanjiru, the partner, reads every fee note', () => {
  it('the headline question and its answer, counted from the fee notes, proof apart from what was said', async () => {
    const b: any = await board(MUCHEMI_FEE_NOTES.id, WANJIRU);
    expect(b.question).toBe('Are the fee notes being paid, and why not where they aren’t?');
    expect(b.answer).toBe('27% of what’s due is paid, on proof. A further KES 120,000 is paid on somebody’s word, with no proof yet. One fee note is behind, but the client is in touch.');
    expect(b.bar).toEqual({ proven: 27, said: 13 });
  });

  it('what needs her: the promise missed, the client not heard from, the dispute, the payment with no proof, the fee note not raised', async () => {
    const b: any = await board(MUCHEMI_FEE_NOTES.id, WANJIRU);
    expect(b.needsYou.rows).toEqual([
      { title: 'Jamii Clinics missed the date they promised to pay by', says: 'Fee note FN-007 for Jamii Clinics, KES 180,000. The client promised to pay by 10 October, and nothing has come in. Aisha follows it up.' },
      { title: 'Upendo Schools has not been heard from', says: 'Fee note FN-009 for Upendo Schools, KES 300,000, fell due on 1 September. Nobody has heard from the client since. Aisha follows it up.' },
      { title: 'Nyota Logistics disputes fee note FN-008', says: 'Fee note FN-008 for Nyota Logistics, KES 90,000. Brian said, “The client says the review was billed twice.” Brian follows it up.' },
      { title: 'Baraka Hardware’s payment has no proof yet', says: 'Aisha says fee note FN-006 for Baraka Hardware is paid. A bank slip, an M-Pesa message or the accounting system’s record would show it.' },
      { title: 'A fee note for Kasarani Foods is not raised yet', says: 'It falls due when the hearing date is set. It is for KES 250,000. Brian follows it up.' },
    ]);
  });

  it('where they stand: each of the seven groups the release plan lists, counted from the rows', async () => {
    const b: any = await board(MUCHEMI_FEE_NOTES.id, WANJIRU);
    expect(b.stand.heading).toBe('Where the fee notes stand');
    expect(b.stand.total).toBe('8 fee notes');
    expect(b.stand.groups.map((g: any) => [g.label, g.count])).toEqual([
      ['Paid', 2], ['Due and on track', 1], ['Behind, but in touch', 1], ['Genuinely blocked', 1], ['Not heard from', 1], ['Due when something happens', 1], ['Not yet raised', 1],
    ]);
    expect(b.stand.groups[0].says).toBe('One with proof, and one on somebody’s word only.');
  });

  it('every fee note and what shows it: paid with proof is filled, paid on Aisha\'s word is ringed, the slip in its own words', async () => {
    const b: any = await board(MUCHEMI_FEE_NOTES.id, WANJIRU);
    expect(b.every.columns).toEqual(['Client and matter', 'Number', 'Amount', 'Who follows up', 'Falls due', 'Payment', 'What’s in the way, in their words', 'Next']);
    const row = (n: string | null) => b.every.rows.find((r: any) => r.number === n);
    expect(row('FN-004')).toMatchObject({ who: 'Kasarani Foods', amount: 'KES 250,000', followsUp: 'Brian', fallsDue: '5 October', payment: { says: 'Paid on 20 October, with proof', mark: 'proven' } });
    expect(row('FN-004').proof).toEqual(['A payment record was added on 20 October. It reads, “Equity Bank remittance advice: KES 250,000 received from Kasarani Foods for FN-004.”']);
    expect(row('FN-006').payment).toEqual({ says: 'Paid, as Aisha said', mark: 'said' });
    expect(row('FN-005').fallsDue).toBe('When the reply is filed');
    expect(row('FN-007')).toMatchObject({ fallsDue: '15 September, 36 days ago', payment: { says: 'Promised for 10 October, and missed' }, inTheWay: '“They say the money is held up at their head office.”', next: 'Call their finance office, by Thursday 22 October.' });
    expect(row(null)).toMatchObject({ who: 'Kasarani Foods', group: 'not-raised', fallsDue: 'When the hearing date is set', next: 'Nothing booked yet.' });
    expect(b.every.foot).toBe('All eight are shown. Each one’s proof is filed on it, from the slips and messages people added.');
  });

  it('the pattern named after three check-ins, follow-up and whether it helped, the systems, and where this is heading', async () => {
    const b: any = await board(MUCHEMI_FEE_NOTES.id, WANJIRU);
    expect(b.patterns.heading).toBe('One client, one kind of work, or how we bill?');
    expect(b.patterns.rows).toEqual([{ title: 'Fee notes wait for events in the matter', says: 'Two fee notes wait for something to happen before they fall due or are raised, said in 4 check-ins.', tag: 'How we bill' }]);
    expect(b.followUp.rows).toEqual([
      { what: 'A written reminder sent', howMany: 'Two fee notes', whatFollowed: 'One paid after it.' },
      { what: 'A call to a named person at the client', howMany: 'Two fee notes', whatFollowed: 'None paid after it yet.' },
      { what: 'A date the client promised to pay by', howMany: 'Two promises', whatFollowed: 'One kept, and one missed.' },
    ]);
    expect(b.systems.says).toBe('Nothing is connected yet. When your accounting system or your bank is connected, what it shows will be here, beside what people said.');
    expect(b.heading.outcomes.map((o: any) => `${o.says}. ${o.more}`)).toEqual([
      'Follow up the fee notes behind. Two fee notes, KES 480,000.',
      'Settle the disputed fee note. One fee note, KES 90,000.',
      'Raise the fee note not yet raised. One fee note, in your own system. Groundwork never raises one.',
      'Ask for proof of what is said to be paid. One fee note, KES 120,000.',
    ]);
    expect(b.heading.whoDecides).toBe('You decide.');
  });

  it('no label on a person anywhere on the board', async () => {
    const words = everyWord(await board(MUCHEMI_FEE_NOTES.id, WANJIRU));
    expect(words).not.toMatch(/\b(?:PIP|at risk|exit|underperform)/i);
  });
});

describe('an associate reads only the fee notes they follow up', () => {
  it('Brian: his four, his own numbers, "you", and never one of Aisha\'s clients', async () => {
    const b: any = await board(MUCHEMI_FEE_NOTES.id, BRIAN);
    expect(b.question).toBe('Are your fee notes being paid, and why not where they aren’t?');
    expect(b.answer).toBe('Of KES 340,000 due on your fee notes, KES 250,000 is paid with proof.');
    expect(b.every.heading).toBe('Your fee notes, and what shows them');
    expect(b.every.rows.map((r: any) => r.number)).toEqual(['FN-008', 'FN-005', null, 'FN-004']);
    expect(b.every.rows.every((r: any) => r.followsUp === 'You')).toBe(true);
    expect(b.needsYou.rows[0]).toEqual({ title: 'Nyota Logistics disputes fee note FN-008', says: 'Fee note FN-008 for Nyota Logistics, KES 90,000. You said, “The client says the review was billed twice.” You follow it up.' });
    const words = everyWord(b);
    for (const theirs of ['Jamii Clinics', 'Upendo Schools', 'Baraka Hardware', 'Aisha', 'FN-007', 'FN-009']) expect(words).not.toContain(theirs);
    /* Where this is heading lays out the outcomes for the person who decides: not his. */
    expect(b.heading).toBeNull();
  });

  it('Brian reads that FN-004 is paid with proof, and not the words of the slip Njeri added', async () => {
    const b: any = await board(MUCHEMI_FEE_NOTES.id, BRIAN);
    const fn004 = b.every.rows.find((r: any) => r.number === 'FN-004');
    expect(fn004.payment).toEqual({ says: 'Paid on 20 October, with proof', mark: 'proven' });
    expect(fn004.proof).toEqual([]);
  });

  it('Aisha: her four, the promise missed and the client not heard from as hers, none of Brian\'s', async () => {
    const b: any = await board(MUCHEMI_FEE_NOTES.id, AISHA);
    expect(b.answer).toBe('Of KES 600,000 due on your fee notes, none is paid with proof yet, and KES 120,000 on your word only. One fee note is behind, but the client is in touch.');
    expect(b.every.rows.map((r: any) => r.number)).toEqual(['FN-007', 'FN-009', 'FN-010', 'FN-006']);
    expect(b.needsYou.rows.map((r: any) => r.title)).toEqual(['Jamii Clinics missed the date they promised to pay by', 'Upendo Schools has not been heard from', 'Baraka Hardware’s payment has no proof yet']);
    expect(b.needsYou.rows[2].says).toBe('You say fee note FN-006 for Baraka Hardware is paid. A bank slip, an M-Pesa message or the accounting system’s record would show it.');
    const words = everyWord(b);
    for (const theirs of ['Nyota Logistics', 'Kasarani Foods', 'Brian', 'FN-004', 'FN-008']) expect(words).not.toContain(theirs);
  });
});

describe('the accounts person, who follows up no fee note, reads none', () => {
  it('Njeri reads that none are hers, and no client, amount or colleague', async () => {
    const b: any = await board(MUCHEMI_FEE_NOTES.id, NJERI);
    expect(b.answer).toBe('No fee note that you follow up is on record yet. Each one shows here once you name it in a check-in.');
    expect(b.every.rows).toEqual([]);
    const words = everyWord(b);
    for (const theirs of ['Kasarani', 'Jamii', 'Nyota', 'Upendo', 'Baraka', 'KES', 'Brian', 'Aisha']) expect(words).not.toContain(theirs);
  });
});

describe('the small lender: the credit lead reads every loan, each borrower only their own', () => {
  it('Halima reads the kit\'s loans board: the cohort question, Peter not heard from, every borrower and what shows it', async () => {
    const b: any = await board(LENDER_LOANS.id, HALIMA);
    expect(b.question).toBe('Is the cohort repaying, and why not where it isn’t?');
    expect(b.answer).toBe('33% of what’s due is repaid, on proof. One borrower is behind, but still in touch.');
    expect(b.needsYou.rows).toEqual([{ title: 'Peter has not checked in since 21 September', says: 'Peter’s loan, KES 12,000, fell due on 28 September. No check-in and no repayment are on record since.' }]);
    expect(b.stand.heading).toBe('Where the cohort stands');
    expect(b.stand.groups.map((g: any) => [g.label, g.count])).toEqual([['Repaid', 1], ['Repaying on time', 0], ['Behind, but in touch', 1], ['Genuinely blocked', 0], ['Not heard from', 1]]);
    expect(b.every.heading).toBe('Every borrower, and what shows it');
    expect(b.every.columns).toEqual(['Borrower', 'Business', 'Sales, 4 weeks', 'Repayment', 'What’s in the way, in their words', 'Next']);
    expect(b.every.rows.map((r: any) => [r.who, r.business, r.sales, r.repayment.says, r.inTheWay, r.next])).toEqual([
      ['Musa', 'Trading', 'Not said yet', '1 week behind', '“Repayment is due before market day.”', 'Pay after market day, by Friday 23 October.'],
      ['Peter', 'Not heard', 'Not said yet', '3 weeks behind', 'Nothing said.', 'Nothing booked yet.'],
      ['Achieng', 'Trading', 'KES 38,000 in four weeks', 'On time', 'Nothing said.', 'Nothing more.'],
    ]);
    expect(b.patterns.heading).toBe('One person, a place, or the model?');
    expect(b.followUp.heading).toBe('Support given, and whether it helped');
    expect(b.systems.says).toBe('Nothing is connected yet. When the repayment system is connected, what it shows will be here, beside what borrowers said.');
  });

  it('Musa reads only his own loan, as "you"', async () => {
    const b: any = await board(LENDER_LOANS.id, MUSA);
    expect(b.question).toBe('Is your loan being repaid, and why not if it isn’t?');
    expect(b.answer).toBe('Your repayment of KES 12,000 fell due on 12 October, and it is not paid yet. You promised to pay by Friday 23 October.');
    expect(b.every.rows).toHaveLength(1);
    expect(b.every.rows[0].who).toBe('You');
    const words = everyWord(b);
    for (const theirs of ['Peter', 'Achieng', 'Halima']) expect(words).not.toContain(theirs);
    expect(b.heading).toBeNull();
  });

  it('Peter, who stopped checking in, reads only his own loan; Achieng reads hers, repaid with proof', async () => {
    const p: any = await board(LENDER_LOANS.id, PETER);
    expect(p.needsYou.rows).toEqual([{ title: 'You have not checked in since 21 September', says: 'Your loan, KES 12,000, fell due on 28 September. No check-in and no repayment are on record since.' }]);
    expect(everyWord(p)).not.toMatch(/Musa|Achieng/);
    const a: any = await board(LENDER_LOANS.id, ACHIENG);
    expect(a.answer).toBe('Your repayment of KES 12,000 is paid, and a repayment record shows it.');
    expect(a.every.rows[0].proof).toEqual(['A payment record was added on 19 October. It reads, “M-Pesa confirmed. KES 12,000 sent to Pesa Ndogo Lenders.”']);
  });
});

describe('the board serves it only where the switchboard picks it, and is unchanged where Release 2 is off', () => {
  const service = (world: any) => Object.assign(Object.create(BoardService.prototype), { prisma: thePrismaFor(world) });

  it('on, with the type confirmed: the board carries the collections board, walled for the reader', async () => {
    const world = theCollectionsWorld();
    const ground = world.grounds.find((g) => g.id === MUCHEMI_FEE_NOTES.id);
    const served = await (service(world) as any).theCollectionsBoardIfPicked(ground, BRIAN, MUCHEMI_NOW);
    expect(served.collections.every.rows.map((r: any) => r.number)).toEqual(['FN-008', 'FN-005', null, 'FN-004']);
  });

  it('off: no collections key at all, for every reader', async () => {
    const world = theCollectionsWorld({ release2On: false });
    for (const g of world.grounds) for (const reader of [WANJIRU, BRIAN, HALIMA, MUSA]) {
      expect(await (service(world) as any).theCollectionsBoardIfPicked(g, reader, MUCHEMI_NOW)).toEqual({});
    }
    expect(await board(MUCHEMI_FEE_NOTES.id, WANJIRU, world)).toBeNull();
  });

  it('on, while the lead has not confirmed the type: today\'s board, as the switchboard picks', async () => {
    const world = theCollectionsWorld({ muchemiTypeConfirmed: false });
    const ground = world.grounds.find((g) => g.id === MUCHEMI_FEE_NOTES.id);
    expect(await (service(world) as any).theCollectionsBoardIfPicked(ground, WANJIRU, MUCHEMI_NOW)).toEqual({});
  });
});

/*
 * PRIVACY: A BORROWER IS NEVER SERVED THE LEAD'S TWO SECTIONS (browser test, 21 October, finding 10; Hafsah's answer of 21 October).
 * "Support given, and whether it helped" and "What the systems show" are about the cohort and the lead's follow-up. They are left off
 * what the server sends a borrower, every borrower, not hidden on the screen; Halima, who runs it, is still served both.
 */
describe('a borrower is never served the lead’s two sections, and the lead still is', () => {
  for (const [name, reader] of [['Musa', MUSA], ['Peter', PETER], ['Achieng', ACHIENG]] as const) {
    it(`${name} is served neither "Support given, and whether it helped" nor "What the systems show"`, async () => {
      const b: any = await board(LENDER_LOANS.id, reader);
      expect(b.followUp).toBeNull();
      expect(b.systems).toBeNull();
      const words = everyWord(b);
      for (const theLeads of ['Support given', 'whether it helped', 'What the systems show', 'repayment system', 'sent a reminder or spoke to a borrower']) expect(words).not.toContain(theLeads);
    });
  }

  it('Halima, who runs it, is served both', async () => {
    const b: any = await board(LENDER_LOANS.id, HALIMA);
    expect(b.followUp.heading).toBe('Support given, and whether it helped');
    expect(b.systems.heading).toBe('What the systems show');
  });
});
