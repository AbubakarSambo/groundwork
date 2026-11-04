import { theOpenSession } from '../engagement/heres-what-is-new';

/**
 * ASK READS THE CHECK-IN'S ONE COUNT, AND "WHERE DO WE STAND" IS ABOUT THE WORK (rounds 5 and 6).
 *
 * The family business owner asked "Where do we stand on stock and deliveries?" three times and read "No role is recorded for you here,
 * so there is nothing set up for you to work through": the model sent it to the lane described as "where they are up to", which is the
 * person's own starting checklist. The mobile cinema lead asked about Aisha's and David's check-ins and was answered about his own: what
 * Ask checked his words against held only his own check-ins. Ask now reads the one count, by name, for a check-in the lead runs.
 */
/* The lanes' descriptions this commit also pinned are gone: wip/assessment deleted the menu of lanes (Hafsah, 1 November), and a
   question no rule places, "Where do we stand on stock and deliveries?" among them, is answered by the model from the record. */
describe('the open session, as Ask reads it', () => {
  const at = new Date('2026-11-01T06:00:00Z');
  const person = (id: string, userId: string, firstName: string, partyType = 'PARTICIPANT') => ({ id, userId, partyType, managingOnly: false, nameGiven: null, invitedAt: at, inviteTokenExpiresAt: null, acceptedAt: at, user: { firstName, lastName: null, awaitingOrgApproval: false } });
  const JUMA = person('p-juma', 'u-juma', 'Juma', 'INITIATOR');
  const AISHA = person('p-aisha', 'u-aisha', 'Aisha');
  const DAVID = person('p-david', 'u-david', 'David');
  const prisma: any = {
    checkIn: { findMany: jest.fn(async () => [
      { status: 'COMPLETED', sessionNumber: 1, isSetup: false, availableFrom: at, startedAt: at, completedAt: at, closedReason: null, turns: [{ id: 't' }], participant: JUMA },
      { status: 'IN_PROGRESS', sessionNumber: 1, isSetup: false, availableFrom: at, startedAt: at, completedAt: null, closedReason: null, turns: [{ id: 't' }], participant: AISHA },
      { status: 'IN_PROGRESS', sessionNumber: 1, isSetup: false, availableFrom: at, startedAt: at, completedAt: null, closedReason: null, turns: [{ id: 't' }], participant: DAVID },
    ]) },
    ground: { findUnique: jest.fn(async () => ({ organizationId: 'org', scenario: 'NEW_PROJECT', timelineDays: null, cadence: 'DAILY', runsUntilEnded: true })) },
    groundParticipant: { findMany: jest.fn(async () => []) },
    organizationMembership: { findMany: jest.fn(async () => []) },
    user: { findMany: jest.fn(async () => []) },
    platformSetting: { findUnique: jest.fn(async () => null) },
  };

  it('says the count by name, with the lead as you, so a lead asking about Aisha and David is told where they are', async () => {
    const stood = await theOpenSession(prisma, 'g-cinema', 'u-juma');
    /* Changed 3 November: since df0ff233a the count names only who is missing, once ("2 of 4 have checked in; Peter and Mary haven't
       joined yet"); who has checked in is the rest of the count and is not named again. */
    expect(stood?.says).toBe('1 of 3 has checked in; Aisha and David have started and not finished yet.');
  });
});
