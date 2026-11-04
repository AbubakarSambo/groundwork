import { ForbiddenException } from '@nestjs/common';
import { R2, theRunRebuiltEachEvening, theRunAsADatabase, thePersonOf, theLeadOfTheRun, THE_END_OF_THE_RUN } from './the-persons-record-bed';
import { rebuildThePersonsRecords } from './the-persons-record-store';
import { readMyWork } from './my-work';

/**
 * MY WORK CARRIES THE PERSON'S RECORD AND THE COACHING GROUNDWORK GAVE THEM, AS EACH READER IS SERVED IT (Groundwork does the managing,
 * part 1), from the second night run (Muchemi & Co (test), "Fee notes" and "Litigation team daily").
 *
 *  - Aisha reads her own record in Fee notes, and one line for her other check-in in the organisation.
 *  - Wanjiru, who runs it, reads Aisha's record in Fee notes, as a manager would, and nothing of Aisha's other check-ins: a person's
 *    load across check-ins is private, always.
 *  - Njeri may not open Aisha's page at all, and her own page carries nothing of Aisha's.
 *  - With the direct morning off, or judgements of a person off, the page is served exactly as before, with no record on it.
 */
const FEES = R2.fees.ground.id;
const AISHA = thePersonOf('fees', 'Aisha');
const NJERI = thePersonOf('fees', 'Njeri');
const WANJIRU = theLeadOfTheRun('fees');

async function theTable() {
  const table = await theRunRebuiltEachEvening('fees', rebuildThePersonsRecords);
  await theRunRebuiltEachEvening('lit', rebuildThePersonsRecords, table);
  return table;
}
const myWork = async (opts: { directMorning: boolean; judgements?: boolean }, userId: string, personId: string | null = null, table?: any) =>
  readMyWork(theRunAsADatabase('fees', { ...opts, personRecord: table ?? await theTable(), others: ['lit'] }), null, { groundId: FEES, userId, personId }, THE_END_OF_THE_RUN) as Promise<any>;

describe('with the direct morning on', () => {
  it('Aisha reads her own record, her coaching, and one line for her other check-in', async () => {
    const page = await myWork({ directMorning: true }, AISHA.userId);
    expect(page.view).toBe('self');
    expect(page.record.heading).toBe('Your record in Fee notes');
    expect(page.record.parts[0]).toMatchObject({ heading: 'What you said and what shows it', says: 'You said four times that something was sold, paid or signed. None of them has proof on file, and you took one back later.' });
    expect(page.record.coaching[0].said).toMatch(/^After your check-in on Monday 12 October, Groundwork told you “Add the photo, slip or link when you say something is done\./);
    expect(page.record.acrossYourCheckIns.heading).toBe('In your other check-ins');
    expect(page.record.acrossYourCheckIns.lines).toHaveLength(1);
    expect(page.record.acrossYourCheckIns.lines[0]).toMatch(/^In Litigation team daily, /);
  });

  it('Wanjiru, who runs it, reads Aisha’s record in Fee notes by name, and nothing of her other check-ins', async () => {
    const page = await myWork({ directMorning: true }, WANJIRU, AISHA.participantId);
    expect(page.view).toBe('lead');
    expect(page.record.heading).toBe('Aisha’s record in Fee notes');
    expect(page.record.parts[0].says).toBe('Aisha said four times that something was sold, paid or signed. None of them has proof on file, and Aisha took one back later.');
    expect(page.record.parts[0].evidence).toContain('On Monday 19 October Aisha said “FN-006 for Baraka Hardware has been paid.” Nothing on file shows it yet.');
    expect(page.record.acrossYourCheckIns).toBeUndefined();
    expect(JSON.stringify(page)).not.toContain('Litigation team daily');
  });

  it('Njeri may not open Aisha’s page, and her own carries nothing of Aisha’s', async () => {
    const table = await theTable();
    await expect(myWork({ directMorning: true }, NJERI.userId, AISHA.participantId, table)).rejects.toBeInstanceOf(ForbiddenException);
    const own = await myWork({ directMorning: true }, NJERI.userId, null, table);
    expect(own.record.heading).toBe('Your record in Fee notes');
    expect(JSON.stringify(own.record)).not.toMatch(/Baraka Hardware|Jamii|Upendo|Aisha/);
  });
});

describe('judgements of a person', () => {
  it('where judgements of a person are off, no record', async () => {
    expect((await myWork({ directMorning: true, judgements: false }, AISHA.userId)).record).toBeUndefined();
  });
});
