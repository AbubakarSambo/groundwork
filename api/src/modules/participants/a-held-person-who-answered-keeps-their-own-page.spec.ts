import { ForbiddenException } from '@nestjs/common';
import { HELD_BUT_KEEPS_WHAT_THEY_SAID, HELD_FOR_A_SEAT, theHeldPersonWhoHasAnswered, whatSomeoneHeldForASeatReads } from './held-for-a-seat';

/**
 * A PERSON HELD FOR A SEAT WHO HAS ALREADY ANSWERED KEEPS THEIR OWN CHECK-IN PAGE (decision 110, B3; user journeys F-21).
 * The page was refused to them whole, where the old code served it. Now it is served narrowed to what is theirs. Somebody held who never
 * answered still reads nothing, and a lookup that fails still refuses.
 */
const prismaFor = (row: any, answered: boolean) => ({
  groundParticipant: { findFirst: jest.fn(async () => row) },
  checkIn: { findFirst: jest.fn(async () => (answered ? { id: 'c3' } : null)) },
}) as any;

describe('whether a held person keeps their page', () => {
  it('somebody with a seat is not narrowed', async () => {
    expect(await theHeldPersonWhoHasAnswered(prismaFor({ id: 'p1', awaitingSeat: false }, true), 'g1', 'u1')).toBe(false);
  });
  it('somebody held who has answered is served their own page, narrowed', async () => {
    expect(await theHeldPersonWhoHasAnswered(prismaFor({ id: 'p1', awaitingSeat: true }, true), 'g1', 'u1')).toBe(true);
  });
  it('somebody held who never answered is refused with the sentence the invitation page gives', async () => {
    await expect(theHeldPersonWhoHasAnswered(prismaFor({ id: 'p1', awaitingSeat: true }, false), 'g1', 'u1')).rejects.toThrow(new ForbiddenException(HELD_FOR_A_SEAT));
  });
  it('a lookup that fails refuses', async () => {
    const p: any = { groundParticipant: { findFirst: jest.fn(async () => { throw new Error('down'); }) } };
    await expect(theHeldPersonWhoHasAnswered(p, 'g1', 'u1')).rejects.toThrow(HELD_FOR_A_SEAT);
  });
});

describe('what the narrowed page holds, and reads', () => {
  const full = {
    id: 'g1', label: 'Sales team, Q4', status: 'ACTIVE', scenario: 'OKR_ALIGNMENT', cadence: 'WEEKLY', timelineDays: 84, organizationId: 'org1',
    participants: [{ id: 'p-lead', userId: 'u-lead', email: 'sahar@x.test' }, { id: 'p-held', userId: 'u-held', email: 'tobi@x.test' }],
    checkIns: [{ id: 'c1', participantId: 'p-lead' }, { id: 'c3', participantId: 'p-held' }],
    report: { sharedPicture: 'All three people agree that Sahar Bello is handing the work to Chidi Okoro.' },
    objectives: [{ id: 'o1', name: 'Close 12 contracts' }], signals: [{ text: 'Chidi Okoro is stuck' }], joinToken: 'secret', brief: 'The lead wrote this.',
  };
  const read = whatSomeoneHeldForASeatReads(full, 'u-held');
  it('is their own row and their own sessions, and nobody else', () => {
    expect(read.participants.map((p: any) => p.id)).toEqual(['p-held']);
    expect(read.checkIns.map((c: any) => c.id)).toEqual(['c3']);
  });
  it('carries no goal, no shared report, no signal, no brief and no join link', () => {
    const wire = JSON.stringify(read);
    for (const leaked of ['Close 12 contracts', 'Sahar', 'Chidi', 'secret', 'The lead wrote this', 'sahar@x.test']) expect(wire).not.toContain(leaked);
    expect(read.report).toBeNull();
  });
  it('tells them in plain sentences why a new session is not open, and that what they said is still theirs', () => {
    expect(read.saying).toBe(HELD_BUT_KEEPS_WHAT_THEY_SAID);
    expect(HELD_BUT_KEEPS_WHAT_THEY_SAID).toBe('There is no seat for you on the plan right now, so you cannot answer a new session yet. What you already said and your own report are still yours to read. You will get your invitation as soon as there is a seat.');
  });
});
