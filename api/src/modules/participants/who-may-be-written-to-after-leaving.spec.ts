import { aPersonWhoWasRemoved } from './held-for-a-seat';
import { whetherToSend } from '../email/nothing-goes-out-that-was-turned-off';
import { mayReadTheLine, EVERYBODY, THE_LEAD, thePerson } from '../conversation/who-may-read-a-line';

/**
 * Run 7 (22 November): Mary was removed on day 23 and was still mailed "check-in 4 is complete" five times, and her number still reached Ask, which read
 * her own aim back to her. One question now owns "may this address or number still be written to or answered": a person who left every seat, with no live
 * sign-in on the address and no seat still held. Every mail, every WhatsApp message Groundwork starts, and the WhatsApp inbound path ask it.
 */
const mary = { id: 'gp-mary', email: 'mary@taasolar.test', userId: 'u-mary', leftAt: new Date('2026-12-11') };
const db = (over: { users?: any[]; people?: any[]; participants?: any[] } = {}): any => {
  const participants = over.participants ?? [mary];
  const matches = (row: any, where: any) => (where.OR ?? [where]).some((o: any) => (o.email?.in ? o.email.in.includes(String(row.email).toLowerCase()) : o.userId?.in ? o.userId.in.includes(row.userId) : false));
  return {
    groundParticipant: { findFirst: async ({ where }: any) => participants.find((p) => matches(p, where) && (where.leftAt === null ? p.leftAt === null : where.leftAt?.not === null ? p.leftAt !== null : true)) ?? null },
    person: { findMany: async ({ where }: any) => (over.people ?? [{ phone: '+254700200011', email: 'mary@taasolar.test', linkedUserId: 'u-mary' }]).filter((x) => where.phone.in.includes(x.phone)) },
    user: { findMany: async () => [], findFirst: async () => (over.users ?? [])[0] ?? null },
  };
};

describe('somebody who has left is not written to or answered', () => {
  it('is the same person by address and by number', async () => {
    expect(await aPersonWhoWasRemoved(db(), 'mary@taasolar.test')).toBe(true);
    expect(await aPersonWhoWasRemoved(db(), { phone: '+254700200011' })).toBe(true);
    expect(await aPersonWhoWasRemoved(db(), { phone: '+254700999999' })).toBe(false);
  });
  it('is not removed while a live sign-in holds the address, or a seat is still held', async () => {
    expect(await aPersonWhoWasRemoved(db({ users: [{ id: 'u2' }] }), 'mary@taasolar.test')).toBe(false);
    expect(await aPersonWhoWasRemoved(db({ participants: [mary, { ...mary, id: 'other', leftAt: null }] }), 'mary@taasolar.test')).toBe(false);
  });
  it('stops the mail at the one door: a person who left gets nothing, whatever the sender', () => {
    expect(whetherToSend('we decided to send it', { stillHere: false }, 'sendRoundDigest')).toEqual({ send: false, because: 'they have left, or their sign-in was deactivated' });
  });
});

describe('a person\'s own aim reaches only them and the lead', () => {
  const line = { type: 'SUCCESS_DEFINITION', participantId: 'gp-mary', aboutParticipantId: null, standing: null };
  it('is not in what a report for everybody is written from', () => {
    expect(mayReadTheLine(line, EVERYBODY)).toBe(false);
    expect(mayReadTheLine(line, thePerson('gp-sam'))).toBe(false);
  });
  it('is read by the lead and by the person it is', () => {
    expect(mayReadTheLine(line, THE_LEAD)).toBe(true);
    expect(mayReadTheLine(line, thePerson('gp-mary'))).toBe(true);
  });
  it('is read by all where the check-in shows everybody every target', () => {
    expect(mayReadTheLine(line, EVERYBODY, 'EVERYBODY')).toBe(true);
  });
  it('leaves what somebody did, said or promised as it was', () => {
    expect(mayReadTheLine({ ...line, type: 'PROGRESS' }, EVERYBODY)).toBe(true);
  });
});
