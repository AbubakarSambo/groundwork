import { whatALineDoesToABill, theEventWaitedFor, type ABillThatWaits } from './a-fee-note-due-on-an-event';

/**
 * NEITHER FEE NOTE FELL DUE WHEN ITS EVENT WAS REPORTED (messages test, 19 October, finding 4).
 *
 * Muchemi & Co. (test). FN-005 for Kasarani Foods (Kasarani Foods v. Tumaini Traders) waits for "the reply is filed"; the third Kasarani Foods
 * fee note, not yet raised, waits "when I get the hearing date". Brian said on 13 October "The reply in Kasarani Foods v. Tumaini Traders was
 * filed today.", and David on 14 October "I learned the hearing date for Kasarani Foods v. Tumaini Traders is November 12." Neither moved:
 * the matter's name between "the reply" and "was filed" was more than four words, "when I get the hearing date" was read as the event "i
 * the", and a date said for the hearing was not read as the hearing date being set. Read with no model, as before.
 */
const FN005: ABillThatWaits = { id: 'b6e17e21-2dbf-42b6-882c-5c98e89ee3df', groundId: 'fees', stage: 'Invoiced', client: 'Kasarani Foods', matter: 'Kasarani Foods v. Tumaini Traders', dueWhen: 'the reply is filed', notDueFrom: [] };
const THIRD: ABillThatWaits = { id: 'fe8b4231-3b93-4dea-ba21-b68eee73724a', groundId: 'fees', stage: 'Not yet raised', client: 'Kasarani Foods', matter: null, dueWhen: 'when I get the hearing date', notDueFrom: [] };
const WAITING = [FN005, THIRD];

describe('the events Muchemi & Co.\'s fee notes wait for are read when they are reported', () => {
  it('"when I get the hearing date" is the hearing date, set', () => {
    expect(theEventWaitedFor('when I get the hearing date')).toEqual({ subject: 'hearing date', participle: 'set' });
  });

  it('Brian, 13 October: FN-005 falls due that day', () => {
    expect(whatALineDoesToABill({ id: 'l-brian', text: 'The reply in Kasarani Foods v. Tumaini Traders was filed today.', saidOn: '2026-10-13' }, FN005, WAITING))
      .toEqual({ does: 'makes it due', day: '2026-10-13' });
  });

  it('David, 14 October: the third Kasarani Foods fee note can be raised from that day', () => {
    expect(whatALineDoesToABill({ id: 'l-david', text: 'I learned the hearing date for Kasarani Foods v. Tumaini Traders is November 12.', saidOn: '2026-10-14' }, THIRD, WAITING))
      .toEqual({ does: 'makes it due', day: '2026-10-14' });
  });

  it('"We are waiting for the court to set a hearing date." does nothing', () => {
    expect(whatALineDoesToABill({ id: 'l-wait', text: 'Nothing else moved on Kasarani Foods v Tumaini Traders today. We are waiting for the court to set a hearing date.', saidOn: '2026-10-14' }, THIRD, WAITING).does).not.toBe('makes it due');
  });

  it('"The reply has been drafted and should be filed this week." does nothing', () => {
    expect(whatALineDoesToABill({ id: 'l-0', text: 'FN-005 for Kasarani Foods is waiting for the reply to be filed in Kasarani Foods v. Tumaini Traders. The reply has been drafted and should be filed this week.', saidOn: '2026-10-12' }, FN005, WAITING).does).not.toBe('makes it due');
  });
});
