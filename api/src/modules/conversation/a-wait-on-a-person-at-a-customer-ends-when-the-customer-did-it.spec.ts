import { theWaitsSaidDone } from './a-wait-said-done-is-cleared';

/**
 * A WAIT ON A PERSON AT A CUSTOMER ENDS WHEN THE CUSTOMER IS SAID TO HAVE DONE IT (Drop Access, messages test, fourth run). Mercy waited on
 * "Mrs. Njeri" for "the signed order". On Wednesday 14 October she said "Greenfield Supermarket signed the order!", and her week on
 * Thursday still said "You are waiting for "the signed order" from Mrs. Njeri." Mrs. Njeri is Greenfield's contact.
 */
const at = (s: string) => new Date(s);
const SIGNED = { id: 'w-signed', fromParticipantId: 'gp-mercy', onParticipantId: null, onLabel: 'Mrs. Njeri', what: 'the signed order', createdAt: at('2026-10-12T11:06:12.335Z'), sourceCheckInId: 'c-mercy-1' };
const WEDNESDAY = [
  { id: 'l-1', participantId: 'gp-mercy', checkInId: 'c-mercy-2', type: 'PROGRESS', text: 'Greenfield Supermarket signed the order!', createdAt: at('2026-10-14T06:33:09.000Z') },
  { id: 'l-2', participantId: 'gp-mercy', checkInId: 'c-mercy-2', type: 'PROGRESS', text: 'The order was signed yesterday.', createdAt: at('2026-10-14T06:33:09.000Z') },
];
const MERCY = (id: string) => (id === 'gp-mercy' ? ['Mercy', 'Wairimu'] : []);

describe("Mercy's wait on Mrs. Njeri for the signed order", () => {
  it('ends on Wednesday, when she said Greenfield Supermarket, where Mrs. Njeri is, signed the order', () => {
    const cleared = theWaitsSaidDone([SIGNED], WEDNESDAY, MERCY, () => at('2026-10-12T11:06:12.335Z'), (holder) => (/njeri/i.test(holder) ? ['Greenfield Supermarket'] : []));
    expect(cleared.map((c) => [c.id, c.clearedAt.toISOString()])).toEqual([['w-signed', '2026-10-14T06:33:09.000Z']]);
  });
  it('and not where nothing ties Mrs. Njeri to Greenfield', () => {
    expect(theWaitsSaidDone([SIGNED], WEDNESDAY, MERCY, () => at('2026-10-12T11:06:12.335Z'))).toEqual([]);
  });
});

