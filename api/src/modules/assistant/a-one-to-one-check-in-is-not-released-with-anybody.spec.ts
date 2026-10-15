import { whatItTakesToStart } from './what-it-takes-to-start';
import { whatIsWorthSayingWhenYouArrive } from './what-is-worth-saying-when-you-arrive';
import { whatIsTrueFor } from './what-is-true-for-this-person';
import { WhatIsTrueService } from './what-is-true.service';
import { whatIsDueFor, openingOnWhatIsDue } from '../embed/what-is-due-for-this-person';

/**
 * "RELEASED WITH EVERYBODY ELSE'S" ONLY WHERE THERE IS SOMEBODY ELSE (decision 82, item 5).
 *
 * Amina is on a performance plan, a check-in about her alone. Ask Groundwork's "start my check-in",
 * Ask Groundwork's arrival line, and the embedded panel's due line all told her that what she says
 * "is released with everybody else's, not before", which is not true: there is nobody else. The
 * WhatsApp opening notice already says only how long it takes. Miriam is in the sales team's
 * check-in, where it is true, and reads what she read before. Read as each of them reads it.
 */

const PIP = { checkInId: 'ci-pip', groundId: 'g-pip', label: 'Performance plan for Amina', standing: 'open to you' as const, aboutOnePerson: true };
const SALES = { checkInId: 'ci-sales', groundId: 'g-sales', label: 'the sales team', standing: 'open to you' as const, aboutOnePerson: false };
const truth = (session: any) => whatIsTrueFor({ person: { externalId: 'x', displayName: null }, objectives: [], commitments: [], sessions: [session], decisions: [] });

describe('Amina, on her performance plan', () => {
  it('asks Ask Groundwork to start her check-in', () => {
    expect(whatItTakesToStart({ toStart: [], open: [PIP], notAccepted: [] }).line).toBe('Your check-in on "Performance plan for Amina" is open. It takes about ten minutes.');
  });
  it('opens Ask Groundwork', () => {
    expect(whatIsWorthSayingWhenYouArrive(truth(PIP), 'Amina').line).toBe('Amina - your check-in on "Performance plan for Amina" is open. It takes about ten minutes.');
  });
  it('opens the panel embedded in her own system', () => {
    const due = whatIsDueFor({ sessions: [PIP], sessionNumbers: new Map([['ci-pip', 2]]), leftOpen: new Map(), slippedCommitments: 0 });
    expect(openingOnWhatIsDue(due, 'Amina').line).toBe('Amina, check-in 2 on "Performance plan for Amina" is open. It takes about ten minutes.');
  });
});

describe('Miriam, in the sales team, reads what she read before', () => {
  it('in all three places', () => {
    expect(whatItTakesToStart({ toStart: [], open: [SALES], notAccepted: [] }).line).toBe("Your check-in on \"the sales team\" is open. It takes about ten minutes, and what you say is released with everybody else's, not before.");
    expect(whatIsWorthSayingWhenYouArrive(truth(SALES), 'Miriam').line).toBe("Miriam - your check-in on \"the sales team\" is open. About ten minutes, and what you say is released with everybody else's, not before.");
    const due = whatIsDueFor({ sessions: [SALES], sessionNumbers: new Map([['ci-sales', 1]]), leftOpen: new Map(), slippedCommitments: 0 });
    expect(openingOnWhatIsDue(due, 'Miriam').line).toBe("Miriam, your first check-in on \"the sales team\" is open. About ten minutes, and what you say is released with everybody else's, not before.");
  });
});

describe('which check-ins are about one person is read from the check-in itself', () => {
  it('a performance plan is, a team check-in is not', async () => {
    const prisma: any = {
      person: { findFirst: jest.fn(async () => ({ externalId: 'x-amina', displayName: 'Amina', email: 'amina@example.com', linkedUserId: 'u-amina' })) },
      subject: { findMany: jest.fn(async () => []) },
      commitment: { findMany: jest.fn(async () => []) },
      knowledgeCard: { findMany: jest.fn(async () => []) },
      ground: { findMany: jest.fn(async () => []) },
      checkIn: {
        findMany: jest.fn(async () => [
          { id: 'ci-pip', status: 'IN_PROGRESS', availableFrom: null, participant: { userId: 'u-amina', ground: { id: 'g-pip', label: 'Performance plan for Amina', scenario: 'PIP' } } },
          { id: 'ci-sales', status: 'NOT_STARTED', availableFrom: null, participant: { userId: 'u-amina', ground: { id: 'g-sales', label: 'the sales team', scenario: 'REALIGN_TEAM' } } },
        ]),
      },
    };
    const t = await new WhatIsTrueService(prisma).forPerson('org-1', 'p-amina');
    expect(t!.sessions.value.map((s) => [s.label, s.aboutOnePerson])).toEqual([['Performance plan for Amina', true], ['the sales team', false]]);
  });
});
