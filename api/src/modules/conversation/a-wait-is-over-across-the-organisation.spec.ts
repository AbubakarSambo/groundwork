import { theWaitsOverAcrossTheOrganisation, clearTheWaitsOverAcrossTheOrganisation, type AWaitIn, type ALineIn, type SomebodyIn } from './a-wait-is-over-across-the-organisation';
import { clearTheWaitsAnEventEnded } from './a-wait-said-done-is-cleared';

/**
 * Muchemi & Co (test org), polish round 15. The waits and lines are word for word what the round-15 record holds.
 *
 * Brian filed the Kasarani Foods v. Tumaini Traders reply on Wednesday 14 October and said so in "Litigation team daily". Njeri raised
 * FN-005 on Friday 16 October and said so there. Wanjiru said on Monday 19 October "Njeri is no longer waiting for the Kasarani reply
 * to be filed." All the same, Wanjiru's Today, weekly letter, morning and fees board kept saying "Brian Otieno is waiting for the
 * e-filing portal to be working", "Njeri Wambui is waiting on the litigation team for internal communication that the FN-005 reply has
 * been filed", "You are waiting on Brian Otieno to file the reply for FN-005" and "Brian Otieno has been waiting on Njeri for the
 * record of what has been paid".
 */
const LIT = 'g-lit';
const FEES = 'g-fees';
const at = (s: string) => new Date(s);
const PEOPLE: SomebodyIn[] = [
  { id: 'lit-wanjiru', groundId: LIT, userId: 'u-wanjiru', partyType: 'INITIATOR', names: ['Wanjiru', 'Muchemi'] },
  { id: 'lit-brian', groundId: LIT, userId: 'u-brian', partyType: 'PARTICIPANT', names: ['Brian', 'Otieno'] },
  { id: 'lit-njeri', groundId: LIT, userId: 'u-njeri', partyType: 'PARTICIPANT', names: ['Njeri', 'Wambui'] },
  { id: 'lit-aisha', groundId: LIT, userId: 'u-aisha', partyType: 'PARTICIPANT', names: ['Aisha', 'Kamau'] },
  { id: 'fees-wanjiru', groundId: FEES, userId: 'u-wanjiru', partyType: 'INITIATOR', names: ['Wanjiru', 'Muchemi'] },
  { id: 'fees-brian', groundId: FEES, userId: 'u-brian', partyType: 'PARTICIPANT', names: ['Brian', 'Otieno'] },
  { id: 'fees-njeri', groundId: FEES, userId: 'u-njeri', partyType: 'PARTICIPANT', names: ['Njeri', 'Wambui'] },
];
const wait = (id: string, groundId: string, from: string, on: string | null, onLabel: string | null, what: string, then: string | null, createdAt: string, source: string): AWaitIn =>
  ({ id, groundId, fromParticipantId: from, onParticipantId: on, onLabel, what, then, createdAt: at(createdAt), sourceCheckInId: source });
const WAITS: AWaitIn[] = [
  wait('portal', LIT, 'lit-brian', null, 'the e-filing portal', 'the e-filing portal to be working', 'file it', '2026-10-13T11:13:00.650Z', 'c-brian-13'),
  wait('portal-2', LIT, 'lit-brian', null, 'the e-filing portal', 'a working e-filing portal', 'file the reply', '2026-10-13T11:13:00.650Z', 'c-brian-13'),
  wait('told', LIT, 'lit-njeri', null, 'the litigation team', 'internal communication that the FN-005 reply has been filed', 'raise the fee note', '2026-10-12T11:20:22.821Z', 'c-njeri-12'),
  wait('told-2', LIT, 'lit-njeri', null, null, 'notification that FN-005 has been filed', 'to raise a fee note', '2026-10-14T11:20:36.291Z', 'c-njeri-14'),
  wait('informed', LIT, 'lit-njeri', null, 'The person who informs them when a reply is filed', 'information that the reply is filed for FN-005', 'raise FN-005', '2026-10-12T07:09:20.893Z', 'c-njeri-12a'),
  wait('which', LIT, 'lit-njeri', null, 'the litigation team', 'to know what was filed and for which client', 'I can raise a fee note for that filing', '2026-10-15T11:19:11.697Z', 'c-njeri-15'),
  wait('fees-reply', FEES, 'fees-wanjiru', 'fees-brian', null, 'the reply for FN-005', null, '2026-10-19T06:02:39.624Z', 'c-wanjiru-fees-19'),
  wait('record', LIT, 'lit-brian', null, 'Njeri', 'the record of what has been paid', null, '2026-10-12T07:04:02.747Z', 'c-brian-12'),
  /* Still waited for: nobody has said the court gave a date, or that the filing confirmation came. */
  wait('hearing', LIT, 'lit-brian', null, 'the court', 'a hearing date', 'I will follow up with the court next week if we haven\'t received anything by then', '2026-10-14T11:13:35.258Z', 'c-brian-14'),
  wait('confirmation', LIT, 'lit-brian', null, 'the e-filing portal', 'the filing confirmation', 'forward the filing confirmation to Njeri', '2026-10-15T11:12:36.236Z', 'c-brian-15'),
  wait('mary', LIT, 'lit-njeri', null, 'Mary', 'confirmation that a reply has been filed', 'raise the fee note', '2026-10-19T06:11:57.663Z', 'c-njeri-19'),
];
const line = (id: string, groundId: string, participantId: string, checkInId: string, text: string, createdAt: string, type = 'PROGRESS'): ALineIn =>
  ({ id, groundId, participantId, checkInId, type, text, createdAt: at(createdAt) });
const LINES: ALineIn[] = [
  line('njeri-recorded', LIT, 'lit-njeri', 'c-njeri-12b', 'I recorded the FN-004 payment today.', '2026-10-12T11:20:14.793Z'),
  line('wanjiru-not-filed', LIT, 'lit-wanjiru', 'c-wanjiru-14', 'The reply in Kasarani Foods has not been filed; I sent Brian\'s draft back with comments yesterday.', '2026-10-14T08:35:13.615Z'),
  line('brian-help', LIT, 'lit-brian', 'c-brian-14', 'A colleague helped me with the e-filing.', '2026-10-14T11:13:24.829Z'),
  line('brian-filed', LIT, 'lit-brian', 'c-brian-14', 'The reply in Kasarani Foods v. Tumaini Traders was filed today.', '2026-10-14T11:13:24.829Z'),
  line('brian-filed-15', LIT, 'lit-brian', 'c-brian-15', 'The reply in Kasarani Foods v Tumaini Traders was filed on 14 October.', '2026-10-15T11:12:20.149Z'),
  line('njeri-paid', LIT, 'lit-njeri', 'c-njeri-16', 'Jamii Clinics paid FN-007, KES 180,000, into the bank today.', '2026-10-16T11:20:00.664Z'),
  line('njeri-raised', LIT, 'lit-njeri', 'c-njeri-16', 'I already raised FN-005 today.', '2026-10-16T11:20:00.664Z'),
  line('njeri-knows', LIT, 'lit-njeri', 'c-njeri-16', 'The Kasarani reply was filed on Wednesday.', '2026-10-16T11:20:00.664Z'),
  line('wanjiru-corrects', FEES, 'fees-wanjiru', 'c-wanjiru-fees-1', 'Njeri is no longer waiting for the Kasarani reply to be filed.', '2026-10-19T06:00:50.617Z'),
];

async function over(asOf: string, waits = WAITS) {
  const lines = LINES.filter((l) => l.createdAt <= at(asOf));
  const ended = await theWaitsOverAcrossTheOrganisation(waits.filter((w) => w.createdAt <= at(asOf)), lines, PEOPLE);
  return new Map(ended.map((e) => [e.id, { on: e.clearedAt.toISOString(), by: LINES.find((l) => l.id === e.lineId)!.text }]));
}

describe("Brian's wait for the e-filing portal (U39)", () => {
  it('is over on Wednesday 14 October, when Brian said the reply he was waiting to file was filed', async () => {
    const o = await over('2026-10-14T18:00:00Z');
    expect(o.get('portal')).toEqual({ on: '2026-10-14T11:13:24.829Z', by: 'The reply in Kasarani Foods v. Tumaini Traders was filed today.' });
    expect(o.get('portal-2')?.on).toBe('2026-10-14T11:13:24.829Z');
  });
  it('is still open on Tuesday evening, when the portal was down and nothing was filed', async () => {
    expect((await over('2026-10-13T18:00:00Z')).has('portal')).toBe(false);
  });
});

describe("Njeri's waits to be told the reply was filed (U38, U44)", () => {
  it('are open until Friday 16 October: Brian saying it in his own check-in did not tell her', async () => {
    const o = await over('2026-10-15T18:00:00Z');
    for (const id of ['told', 'told-2', 'informed', 'which']) expect(o.has(id)).toBe(false);
  });
  it('are over on Friday 16 October, when Njeri said the Kasarani reply was filed and that she raised FN-005', async () => {
    const o = await over('2026-10-16T18:00:00Z');
    expect(o.get('told')).toEqual({ on: '2026-10-16T11:20:00.664Z', by: 'The Kasarani reply was filed on Wednesday.' });
    expect(o.get('told-2')?.on).toBe('2026-10-16T11:20:00.664Z');
    expect(o.get('informed')).toEqual({ on: '2026-10-16T11:20:00.664Z', by: 'I already raised FN-005 today.' });
    expect(o.get('which')?.on).toBe('2026-10-16T11:20:00.664Z');
  });
  it('once Wanjiru says "Njeri is no longer waiting for the Kasarani reply to be filed", it is over even if Njeri had said nothing', async () => {
    const withoutNjeri = LINES.filter((l) => l.participantId !== 'lit-njeri');
    const ended = await theWaitsOverAcrossTheOrganisation(WAITS.filter((w) => w.id === 'told'), withoutNjeri, PEOPLE);
    expect(ended).toEqual([{ id: 'told', clearedAt: at('2026-10-19T06:00:50.617Z'), lineId: 'wanjiru-corrects' }]);
  });
});

describe("Wanjiru's wait in Fee notes for the reply for FN-005 (U40)", () => {
  it('is over the moment she raises it on Monday 19 October: Brian, who holds it, said in Litigation team daily that it was filed', async () => {
    expect((await over('2026-10-19T12:00:00Z')).get('fees-reply')).toEqual({ on: '2026-10-19T06:02:39.624Z', by: 'The reply in Kasarani Foods v. Tumaini Traders was filed today.' });
  });
  it('a line about a different fee note does not end it', async () => {
    const other = [line('other', LIT, 'lit-brian', 'c-brian-x', 'The reply for FN-006 was filed today.', '2026-10-14T11:00:00Z')];
    expect(await theWaitsOverAcrossTheOrganisation(WAITS.filter((w) => w.id === 'fees-reply'), other, PEOPLE)).toEqual([]);
  });
  it('somebody who is not in Fee notes cannot end it from another check-in', async () => {
    const people = PEOPLE.filter((p) => p.id !== 'fees-brian');
    const waits = [{ ...WAITS.find((w) => w.id === 'fees-reply')!, onParticipantId: null, onLabel: 'Brian' }];
    expect(await theWaitsOverAcrossTheOrganisation(waits, LINES, people)).toEqual([]);
  });
});

describe("Brian's wait on Njeri for the record of what has been paid (F4)", () => {
  it('is over on 12 October, when Njeri said "I recorded the FN-004 payment today."', async () => {
    expect((await over('2026-10-12T18:00:00Z')).get('record')).toEqual({ on: '2026-10-12T11:20:14.793Z', by: 'I recorded the FN-004 payment today.' });
  });
});

describe('what nobody has said happened stays open', () => {
  it('the hearing date, the filing confirmation and Njeri\'s new wait on Mary are still waited for on Monday', async () => {
    const o = await over('2026-10-19T12:00:00Z');
    for (const id of ['hearing', 'confirmation', 'mary']) expect(o.has(id)).toBe(false);
  });
  it('a line that says it has not been filed never ends a wait', async () => {
    const not = [line('n', LIT, 'lit-brian', 'c-brian-x', 'The reply in Kasarani Foods v. Tumaini Traders has not been filed yet.', '2026-10-14T11:00:00Z')];
    expect(await theWaitsOverAcrossTheOrganisation(WAITS.filter((w) => ['portal', 'fees-reply'].includes(w.id)), not, PEOPLE)).toEqual([]);
  });
});

describe('clearing them on the record, after a check-in', () => {
  it('writes each one cleared with its day, for the whole organisation, and never reads a check-in about one person', async () => {
    const updates: any[] = [];
    const prisma: any = {
      ground: {
        findUnique: async () => ({ organizationId: 'org-muchemi' }),
        findMany: async () => [{ id: LIT, scenario: 'PULSE_CHECK' }, { id: FEES, scenario: 'NEW_PROJECT' }, { id: 'g-review', scenario: 'PIP' }],
      },
      organization: { findUnique: async () => ({ release1SalesBoardOn: false }) },
      groundDependency: {
        findMany: async ({ where }: any) => { expect(where.groundId.in).toEqual([LIT, FEES]); return WAITS; },
        updateMany: async (a: any) => { updates.push(a); return { count: 1 }; },
      },
      groundParticipant: { findMany: async () => PEOPLE.map((p) => ({ id: p.id, groundId: p.groundId, userId: p.userId, partyType: p.partyType, nameGiven: null, user: { firstName: p.names[0], lastName: p.names[1] } })) },
      recordEntry: { findMany: async () => LINES.map(({ groundId, ...l }) => ({ ...l, participant: { groundId } })) },
    };
    expect(await clearTheWaitsOverAcrossTheOrganisation(prisma, LIT)).toBe(8);
    expect(updates.find((u) => u.where.id === 'portal')).toEqual({ where: { id: 'portal', clearedAt: null }, data: { status: 'CLEARED', clearedAt: at('2026-10-14T11:13:24.829Z') } });
  });
});

describe('a wait for an event that already happened is over when it is raised (U36)', () => {
  it('Wanjiru waits on Brian on Friday morning for the reply to be filed; he said on Wednesday it was filed, so he is never told she is waiting', async () => {
    const updates: any[] = [];
    const w = { id: 'friday', groundId: LIT, fromParticipantId: 'lit-wanjiru', onParticipantId: 'lit-brian', onLabel: null, what: 'the Kasarani Foods v. Tumaini Traders reply to be filed', createdAt: at('2026-10-16T08:37:19.807Z'), sourceCheckInId: 'c-wanjiru-16', status: 'WAITING', clearedAt: null };
    const prisma: any = {
      ground: { findUnique: async () => ({ organizationId: 'org-muchemi' }), findMany: async () => [{ id: LIT, scenario: 'PULSE_CHECK' }] },
      groundDependency: { findMany: async () => [w], updateMany: async (a: any) => { updates.push(a); return { count: 1 }; } },
      recordEntry: { findMany: async () => LINES.filter((l) => l.createdAt < w.createdAt) },
    };
    expect(await clearTheWaitsAnEventEnded(prisma, LIT)).toBe(1);
    expect(updates[0].data).toEqual({ status: 'CLEARED', clearedAt: at('2026-10-16T08:37:19.807Z') });
  });
});
