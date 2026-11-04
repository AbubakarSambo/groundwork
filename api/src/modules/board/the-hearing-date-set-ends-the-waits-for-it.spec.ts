import { fileTheFeeNotesDueOnAnEvent, theWaitsThisEventEnds } from './a-fee-note-due-on-an-event';
import { theWorldWithTheLitigationDaily, thePrismaFor } from './__fixtures__/the-collections-record-for-specs';
import { MUCHEMI_LITIGATION, MUCHEMI_LITIGATION_SESSIONS, MUCHEMI_FEE_NOTES } from '../grounds/__fixtures__/muchemi-and-co';
import { theirWeekInWords } from '../engagement/the-participants-week';

/**
 * THE HEARING DATE, SET IN ONE CHECK-IN, ENDS THE WAITS FOR IT IN THE OTHERS (Hafsah, 19 October, point 4; messages test after the
 * fixes, findings 11 and 13).
 *
 * Muchemi & Co. (test). Njeri, in "Fee notes" on Monday 12 October: "I'll raise the next Kasarani Foods fee note when the hearing date
 * is set." The record kept her wait for "the hearing date to be set". David, in "Litigation team daily" on Wednesday 14 October: "The
 * hearing date is set for 12 November." The fee note was made due, but on Thursday Njeri's "Your week" still said "You are waiting for
 * "the hearing date to be set"", and the Fee notes board still told Wanjiru "You need to find out who can provide the hearing date to be
 * set that Njeri Wambui is waiting for, because nobody has been named yet." Read here on the specs' Muchemi world, where David's line is
 * "In Kasarani Foods v. Tumaini Traders, the hearing date is set, for 12 November."
 */
const MONDAY = new Date('2026-10-12T06:43:33.407Z');
const waits = () => [
  { id: 'w-njeri-hearing', groundId: MUCHEMI_FEE_NOTES.id, what: 'the hearing date to be set', status: 'WAITING', clearedAt: null as Date | null, createdAt: MONDAY },
  { id: 'w-njeri-fn006', groundId: MUCHEMI_FEE_NOTES.id, what: 'the KES 120,000 from Baraka Hardware for FN-006', status: 'WAITING', clearedAt: null as Date | null, createdAt: MONDAY },
  { id: 'w-lit-kasarani', groundId: MUCHEMI_LITIGATION.id, what: 'a hearing date for Kasarani Foods v. Tumaini Traders', status: 'WAITING', clearedAt: null as Date | null, createdAt: MONDAY },
  { id: 'w-lit-jamii', groundId: MUCHEMI_LITIGATION.id, what: 'a hearing date for the Jamii Clinics employment claim', status: 'WAITING', clearedAt: null as Date | null, createdAt: MONDAY },
];

async function theWeekOfTheHearingDate() {
  const world = theWorldWithTheLitigationDaily();
  const prisma = thePrismaFor(world);
  const rows = waits();
  prisma.groundDependency.findMany = jest.fn(async () => rows.filter((w) => !w.clearedAt));
  prisma.groundDependency.updateMany = jest.fn(async ({ where, data }: any) => { for (const w of rows) if (where.id.in.includes(w.id) && !w.clearedAt) Object.assign(w, data); return { count: where.id.in.length }; });
  for (const [, n] of MUCHEMI_LITIGATION_SESSIONS) {
    for (const c of world.checkIns.filter((x: any) => x.groundId === MUCHEMI_LITIGATION.id && x.sessionNumber === n)) {
      await fileTheFeeNotesDueOnAnEvent({ prisma }, { groundId: MUCHEMI_LITIGATION.id, checkInId: c.id });
    }
  }
  return rows;
}

describe('the hearing date set ends the waits for it', () => {
  it('Njeri\'s wait in "Fee notes" ends on the day David said it, and so does the litigation wait that names the matter', async () => {
    const rows = await theWeekOfTheHearingDate();
    const by = (id: string) => rows.find((w) => w.id === id)!;
    expect(by('w-njeri-hearing').status).toBe('CLEARED');
    expect(by('w-lit-kasarani').status).toBe('CLEARED');
    /* Never a wait for another matter's hearing, and never a payment. */
    expect(by('w-lit-jamii').status).toBe('WAITING');
    expect(by('w-njeri-fn006').status).toBe('WAITING');
  });

  it('so Njeri\'s "Your week" no longer says she is waiting for the hearing date to be set', async () => {
    const rows = await theWeekOfTheHearingDate();
    const open = rows.filter((w) => w.groundId === MUCHEMI_FEE_NOTES.id && !w.clearedAt).map((w) => ({ what: w.what, from: null }));
    const lines = theirWeekInWords('Njeri', { kept: null, open: [], waitingOnYou: [], waitingOn: open } as any)!.lines;
    expect(lines.join(' ')).not.toContain('the hearing date to be set');
    expect(lines).toContain('You are waiting for "the KES 120,000 from Baraka Hardware for FN-006".');
  });

  it('a wait said after the line, or in a check-in with two fee notes waiting for a hearing date, is not ended', () => {
    const ev = { subject: 'hearing date', participle: 'set' };
    const at = new Date('2026-10-14T08:06:33Z');
    const later = [{ id: 'later', groundId: MUCHEMI_FEE_NOTES.id, what: 'the hearing date to be set', createdAt: new Date('2026-10-15T08:00:00Z') }];
    expect(theWaitsThisEventEnds(later, ev, { groundId: MUCHEMI_FEE_NOTES.id, client: 'Kasarani Foods', matter: 'Kasarani Foods v. Tumaini Traders', theOnlyOneWaitingHere: true }, at)).toEqual([]);
    const two = [{ id: 'njeri', groundId: MUCHEMI_FEE_NOTES.id, what: 'the hearing date to be set', createdAt: MONDAY }];
    expect(theWaitsThisEventEnds(two, ev, { groundId: MUCHEMI_FEE_NOTES.id, client: 'Kasarani Foods', matter: 'Kasarani Foods v. Tumaini Traders', theOnlyOneWaitingHere: false }, at)).toEqual([]);
  });
});
