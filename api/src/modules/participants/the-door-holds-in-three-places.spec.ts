/**
 * THE GATE IS ONLY A GATE IF IT HOLDS IN ALL THREE PLACES.
 *
 * Adding an address to a check-in used to make it a MEMBER of the inviting organisation the moment
 * they accepted, with no approval and nobody asked - and because a seat is any active user, it went
 * onto the bill at the same time. The queue that replaces this has three halves and losing any one
 * of them makes the other two decoration:
 *
 *   the seat      somebody waiting is not billed for and holds no cap
 *   the check-in  they cannot open one or answer one until an admin says yes
 *   the account   it is still created, because they need one to write their own account
 *
 * Driven against the running system before this was written (journey/hundred):
 *
 *   added by an ADMIN            open their check-in: 201   (they are the approver, no queue)
 *   added by a MEMBER            accept: 201, admin told: yes
 *                                open: 403 "cannot start until an admin ... approves"
 *                                answer without opening: 403
 *                                the admin's queue: 1 waiting, named, with who added them
 *   approved                     open: 201
 *   answered twice               400
 *   left in the queue            waiting_flag: t, request PENDING,
 *                                org seats (billed): 2, waiting and unbilled: 1
 */
import { readFileSync } from 'fs';
import { join } from 'path';

const strip = (p: string) =>
  readFileSync(join(__dirname, p), 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '');

describe('the seat', () => {
  const seats = strip('../../common/seats.ts');

  it('does not count somebody waiting at the door', () => {
    expect(seats).toMatch(/awaitingOrgApproval: false/);
  });

  it('and it is still ONE definition, which is the whole point of that file', () => {
    /* Two seat predicates is the bug that file was written to end. If a second one appears, the
       queue protects the bill on one screen and not the other. */
    expect((seats.match(/export const SEAT_WHERE/g) || []).length).toBe(1);
  });
});

describe('the check-in', () => {
  const conversation = strip('../conversation/conversation.service.ts');

  it('is refused while they wait', () => {
    expect(conversation).toMatch(/awaitingOrgApproval[\s\S]{0,200}CANNOT_CHECK_IN_YET/);
  });

  it('and the refusal sits in the SHARED loader, not on one entry point', () => {
    /*
     * open, send a message, complete, attach a document and correct a record all go through
     * loadOwnedCheckIn. A gate on `open` alone is a gate somebody walks around by pressing the
     * next button - measured: answering without opening returned 403 only because it is here.
     */
    const loader = conversation.slice(conversation.indexOf('private async loadOwnedCheckIn'));
    expect(loader).toMatch(/awaitingOrgApproval/);
    expect(loader).toMatch(/CANNOT_CHECK_IN_YET/);
  });
});

describe('the account', () => {
  const participants = strip('./participants.service.ts');

  it('is still created, because they need one to write their own account of things', () => {
    expect(participants).toMatch(/user = await tx\.user\.create\(/);
  });

  it('and the queue row is written in the same transaction as the acceptance', () => {
    /* Outside it, a failure between the two leaves somebody admitted with nobody asked - which is
       the exact state this whole change exists to remove. */
    const tx = participants.slice(
      participants.indexOf('await this.prisma.$transaction'),
      participants.indexOf('// Send a password setup link'),
    );
    expect(tx).toMatch(/membershipRequest\.upsert/);
  });

  it('decides whether to queue BEFORE the account exists', () => {
    /* Once the user row exists its own organisationId answers "is this their org?" with yes, and
       the question can never be asked again. That is how this went unnoticed for so long. */
    expect(participants.indexOf('const wait = needsApproval(')).toBeLessThan(
      participants.indexOf('user = await tx.user.create('),
    );
  });

  it('and tells the admins after the transaction, never inside it', () => {
    expect(participants.indexOf('tellTheAdminsSomebodyIsWaiting')).toBeGreaterThan(
      participants.indexOf('membershipRequest.upsert'),
    );
  });
});
