import { ForbiddenException } from '@nestjs/common';
import { BoardService } from './board.service';
import {
  theEventWaitedFor, whatALineSaysOfTheEvent, whatALineDoesToABill, fileTheFeeNotesDueOnAnEvent, theBillAfterTheLeadsAnswer,
  DUE_ON_AN_EVENT, MAY_BE_DUE, NOT_DUE_FROM, type ABillThatWaits,
} from './a-fee-note-due-on-an-event';
import { theWorldWithTheLitigationDaily, thePrismaFor } from './__fixtures__/the-collections-record-for-specs';
import {
  MUCHEMI_LITIGATION, MUCHEMI_LITIGATION_SESSIONS, MUCHEMI_THE_REPLY_WAS_FILED, MUCHEMI_THE_HEARING_DATE_IS_SET, MUCHEMI_THE_NEAR_MISS,
} from '../grounds/__fixtures__/muchemi-and-co';

/**
 * A FEE NOTE DUE ON AN EVENT (Release 2, pull request 3 of 3), read from Muchemi & Co (test)'s litigation daily, with no model: the
 * reply filed on 20 October makes FN-005 due that day, the hearing date set on 21 October makes the third Kasarani Foods fee note
 * (not raised yet) due that day, and David's "the mention date is set" comes close and changes nothing; it waits for Wanjiru to
 * confirm. With Release 2 off, nothing is read and nothing is written.
 */
const readSession = async (world: any, n: number, prisma = thePrismaFor(world)) => {
  for (const c of world.checkIns.filter((x: any) => x.groundId === MUCHEMI_LITIGATION.id && x.sessionNumber === n)) {
    await fileTheFeeNotesDueOnAnEvent({ prisma }, { groundId: MUCHEMI_LITIGATION.id, checkInId: c.id });
  }
  return prisma;
};
const item = (world: any, id: string) => world.items.find((i: any) => i.id === id);

describe('the event a fee note waits for, read from its own words', () => {
  it('"the reply is filed" is the reply, filed; "the hearing date is set" is the hearing date, set', () => {
    expect(theEventWaitedFor('the reply is filed')).toEqual({ subject: 'reply', participle: 'filed' });
    expect(theEventWaitedFor('When the hearing date is set.')).toEqual({ subject: 'hearing date', participle: 'set' });
    expect(theEventWaitedFor('on instruction')).toBeNull();
  });

  it('a line says it happened only in so many words, and not when it will, should, has not, or waits until it does', () => {
    const reply = { subject: 'reply', participle: 'filed' };
    const said = (t: string) => whatALineSaysOfTheEvent(t, reply, '2026-10-20');
    expect(said(MUCHEMI_THE_REPLY_WAS_FILED)).toEqual({ happened: true, touches: true, day: '2026-10-20' });
    expect(said('The reply has been filed.').happened).toBe(true);
    expect(said('We filed the reply this morning.').happened).toBe(true);
    expect(said('The reply was filed on 16 October.').day).toBe('2026-10-16');
    for (const t of ['The reply will be filed on Friday.', 'The reply is not filed yet.', 'FN-005 waits until the reply is filed.', 'The reply should be filed tomorrow.', 'The reply is drafted.']) {
      expect(said(t).happened).toBe(false);
    }
    expect(whatALineSaysOfTheEvent(MUCHEMI_THE_HEARING_DATE_IS_SET, { subject: 'hearing date', participle: 'set' }, '2026-10-21')).toEqual({ happened: true, touches: true, day: null });
  });

  it('the near miss: "the mention date is set" comes close to "the hearing date is set" and is not it', () => {
    const r = whatALineSaysOfTheEvent(MUCHEMI_THE_NEAR_MISS, { subject: 'hearing date', participle: 'set' }, '2026-10-20');
    expect(r).toEqual({ happened: false, touches: true, day: null });
  });

  it('the matter must be named: the event with only the client named, where the client has two matters waiting for it, is asked about', () => {
    const a: ABillThatWaits = { id: 'a', groundId: 'g', stage: 'Invoiced', client: 'Kasarani Foods', matter: 'Kasarani Foods v. Tumaini Traders', dueWhen: 'the reply is filed', notDueFrom: [] };
    const b: ABillThatWaits = { ...a, id: 'b', matter: 'Kasarani Foods lease' };
    const line = { id: 'l1', text: 'For Kasarani Foods, the reply was filed.', saidOn: '2026-10-20' };
    expect(whatALineDoesToABill(line, a, [a, b])).toEqual({ does: 'may make it due', day: '2026-10-20' });
    expect(whatALineDoesToABill(line, a, [a])).toEqual({ does: 'makes it due', day: '2026-10-20' });
    expect(whatALineDoesToABill({ ...line, text: 'The reply was filed.' }, a, [a])).toEqual({ does: 'may make it due', day: '2026-10-20' });
    expect(whatALineDoesToABill({ ...line, text: 'In Baraka Hardware lease, the reply was filed.' }, a, [a, { ...a, id: 'c', client: 'Baraka Hardware', matter: 'Baraka Hardware lease' }])).toEqual({ does: 'nothing' });
    expect(whatALineDoesToABill(line, { ...a, notDueFrom: ['l1'] }, [a])).toEqual({ does: 'nothing' });
  });
});

describe('Muchemi & Co (test): the litigation daily makes two fee notes due, and the near miss changes nothing', () => {
  it('Monday: "the reply is drafted" changes nothing', async () => {
    const world = theWorldWithTheLitigationDaily();
    const prisma = await readSession(world, 1);
    expect(prisma.workItem.update).not.toHaveBeenCalled();
    expect(item(world, 'w-fn005').fields['Falls due']).toBeUndefined();
  });

  it('Tuesday: the reply filed on 20 October makes FN-005 due that day, with the line as its source; the mention date is kept for Wanjiru to confirm', async () => {
    const world = theWorldWithTheLitigationDaily();
    await readSession(world, 1);
    await readSession(world, 2);
    const fn005 = item(world, 'w-fn005');
    expect(fn005.stage).toBe('Due');
    expect(fn005.fields['Falls due']).toBe('2026-10-20');
    expect(fn005.dueAt.toISOString()).toBe('2026-10-20T00:00:00.000Z');
    expect(fn005.fields[DUE_ON_AN_EVENT]).toMatchObject({ lineId: 'e-lit-brian-2', groundId: MUCHEMI_LITIGATION.id, label: 'Litigation team daily', saidBy: 'l-brian', text: MUCHEMI_THE_REPLY_WAS_FILED, day: '2026-10-20' });
    const third = item(world, 'w-kasarani-3');
    expect(third.fields['Falls due']).toBeUndefined();
    expect(third.stage).toBe('Not yet raised');
    expect(third.fields[MAY_BE_DUE]).toEqual([expect.objectContaining({ lineId: 'e-lit-david-2', text: MUCHEMI_THE_NEAR_MISS, day: '2026-10-20' })]);
    /* Nothing else moved. */
    for (const id of ['w-fn004', 'w-fn006', 'w-fn007', 'w-fn008', 'w-fn009', 'w-fn010']) expect(item(world, id).fields[DUE_ON_AN_EVENT]).toBeUndefined();
  });

  it('Wednesday: the hearing date set makes the third Kasarani Foods fee note due on 21 October; it stays not raised, and the near miss is no longer asked', async () => {
    const world = theWorldWithTheLitigationDaily();
    for (const [, n] of MUCHEMI_LITIGATION_SESSIONS) await readSession(world, n);
    const third = item(world, 'w-kasarani-3');
    expect(third.fields['Falls due']).toBe('2026-10-21');
    expect(third.stage).toBe('Not yet raised');
    expect(third.fields[DUE_ON_AN_EVENT]).toMatchObject({ lineId: 'e-lit-david-3', saidBy: 'l-david', text: MUCHEMI_THE_HEARING_DATE_IS_SET, day: '2026-10-21' });
    expect(third.fields[MAY_BE_DUE]).toBeUndefined();
  });

  it('reading the same check-in twice writes nothing more', async () => {
    const world = theWorldWithTheLitigationDaily();
    for (const [, n] of MUCHEMI_LITIGATION_SESSIONS) await readSession(world, n);
    const before = JSON.stringify(world.items);
    const prisma = await readSession(world, 2);
    await readSession(world, 3, prisma);
    expect(JSON.stringify(world.items)).toBe(before);
  });
});

describe('with Release 2 off, nothing is read and nothing is written', () => {
  it('every session of the litigation daily leaves every fee note as it was', async () => {
    const world = theWorldWithTheLitigationDaily({ release2On: false });
    const before = JSON.stringify(world.items);
    for (const [, n] of MUCHEMI_LITIGATION_SESSIONS) {
      const prisma = await readSession(world, n);
      expect(prisma.workItem.update).not.toHaveBeenCalled();
    }
    expect(JSON.stringify(world.items)).toBe(before);
  });

  it('a fee notes check-in, or any check-in that is not a legal matter, is not read for events at all', async () => {
    const world = theWorldWithTheLitigationDaily();
    const prisma = thePrismaFor(world);
    expect(await fileTheFeeNotesDueOnAnEvent({ prisma }, { groundId: 'g-muchemi-fee-notes', checkInId: 'c-brian-3' })).toBeNull();
  });
});

describe('the lead answers a line that came close', () => {
  const close = { stage: 'Not yet raised', fields: { 'Due when': 'the hearing date is set', [MAY_BE_DUE]: [{ lineId: 'e-lit-david-2', groundId: 'g', label: 'Litigation team daily', saidBy: 'l-david', text: MUCHEMI_THE_NEAR_MISS, at: '2026-10-20T09:30:00.000Z', day: '2026-10-20' }] } };

  it('her no keeps the line as answered, so it is not asked again, and nothing else changes', () => {
    const after = theBillAfterTheLeadsAnswer(close, 'e-lit-david-2', false)!;
    expect(after.fields[MAY_BE_DUE]).toBeUndefined();
    expect(after.fields[NOT_DUE_FROM]).toEqual(['e-lit-david-2']);
    expect(after.fields['Falls due']).toBeUndefined();
    expect(after.stage).toBe('Not yet raised');
  });

  it('her yes makes it due that day, marked as confirmed by her', () => {
    const after = theBillAfterTheLeadsAnswer(close, 'e-lit-david-2', true)!;
    expect(after.fields['Falls due']).toBe('2026-10-20');
    expect((after.fields[DUE_ON_AN_EVENT] as any).confirmedBy).toBe('the lead');
  });

  it('only Wanjiru, the lead of the fee notes check-in, may answer: Brian is refused at the server', async () => {
    const world = theWorldWithTheLitigationDaily();
    await readSession(world, 1);
    await readSession(world, 2);
    const service: any = Object.assign(Object.create(BoardService.prototype), { prisma: thePrismaFor(world) });
    await expect(service.answerADueOnAnEvent('g-muchemi-fee-notes', 'u-brian', 'w-kasarani-3', 'e-lit-david-2', true)).rejects.toBeInstanceOf(ForbiddenException);
    const said = await service.answerADueOnAnEvent('g-muchemi-fee-notes', 'u-wanjiru', 'w-kasarani-3', 'e-lit-david-2', false);
    expect(said.saidBack).toBe('Nothing has changed, and you will not be asked about that line again.');
    expect(item(world, 'w-kasarani-3').fields[NOT_DUE_FROM]).toEqual(['e-lit-david-2']);
  });
});
