import { GroundScenario } from '@prisma/client';
import { boardAs, SALES_RUN, BISI, FEMI, NGOZI, KWAME, JUMA, SETUP_ADMIN, handoff, answered, type Setup } from './the-switchboards-sections-harness';

/**
 * REQUEST 105, THE GLANCE: THE BOARD'S HEADER NEVER NAMES A COLLEAGUE'S WAIT TO A READER WHO MAY NOT READ
 * THAT COLLEAGUE (the more private choice). On the sales run (re-f), with Femi's wait for the bank
 * statements as the oldest thing in the way. Where people see only themselves, and on an evaluation check-in
 * for anybody who does not run it, the header counts and names only the reader's own waits. Whoever runs
 * it reads the whole team's, as before.
 */
const RUN: Setup = {
  ...SALES_RUN,
  dependencies: [
    handoff('d-femi', 'p-femi', 'the bank statements', { status: 'BLOCKING', onLabel: 'the customers', createdAt: new Date('2026-09-01T09:00:00Z') }),
    handoff('d-ngozi', 'p-ngozi', 'a date for the credit decision', { onLabel: 'Mr. Adebayo', status: 'WAITING', createdAt: new Date('2026-09-10T09:00:00Z') }),
    handoff('d-kwame', 'p-kwame', 'the approval of five applications', { onParticipantId: 'p-bisi', status: 'WAITING', createdAt: new Date('2026-09-16T09:00:00Z') }),
  ],
};
const HIDDEN: Setup = { ...RUN, peersVisibleToEachOther: false };
const PIP: Setup = { ...RUN, scenario: GroundScenario.PIP, createdByUserId: 'u-setup' };
const inTheWay = async (setup: Setup, reader: readonly [string, string]) => (await boardAs(setup, reader[0], reader[1])).howItIsGoing.glance.inTheWay;

describe('where people see only themselves', () => {
  it('Bisi, who runs it, reads the whole team, with Femi\'s wait as the oldest', async () => {
    expect(await inTheWay(HIDDEN, BISI)).toMatchObject({ count: 3, oldest: 'the bank statements' });
  });
  it('Juma, an admin who only reads, reads the same', async () => {
    expect(await inTheWay(HIDDEN, JUMA)).toMatchObject({ count: 3, oldest: 'the bank statements' });
  });
  it('Ngozi reads only her own wait, never Femi\'s', async () => {
    expect(await inTheWay(HIDDEN, NGOZI)).toMatchObject({ count: 1, oldest: 'a date for the credit decision' });
    const b = await boardAs(HIDDEN, ...NGOZI);
    expect(JSON.stringify(b)).not.toMatch(/bank statements|five applications/);
  });
  it('Kwame reads only his own wait on Bisi', async () => {
    expect(await inTheWay(HIDDEN, KWAME)).toMatchObject({ count: 1, oldest: 'the approval of five applications' });
  });
  it('nobody walled is told who else has not answered; the counts stay', async () => {
    const kwameHasNot: Setup = { ...HIDDEN, checkIns: [answered('p-femi', 1), answered('p-ngozi', 1), { ...answered('p-kwame', 1), status: 'NOT_STARTED', completedAt: null }] };
    expect((await boardAs(kwameHasNot, ...BISI)).howItIsGoing.glance.progress).toMatchObject({ answeredThisRound: 2, ofPeople: 4, waitingOn: ['Bisi Adeyemi', 'Kwame Mensah'] });
    expect((await boardAs(kwameHasNot, ...NGOZI)).howItIsGoing.glance.progress).toMatchObject({ answeredThisRound: 2, ofPeople: 4, waitingOn: [] });
  });
});

describe('on an evaluation check-in (Femi is the person reviewed)', () => {
  it('Femi reads only his own wait, never a colleague\'s', async () => {
    const pipWithNgoziOldest: Setup = { ...PIP, dependencies: [RUN.dependencies![1], { ...RUN.dependencies![0], createdAt: new Date('2026-09-12T09:00:00Z') }, RUN.dependencies![2]] };
    expect(await inTheWay(pipWithNgoziOldest, BISI)).toMatchObject({ count: 3, oldest: 'a date for the credit decision' });
    expect(await inTheWay(pipWithNgoziOldest, FEMI)).toMatchObject({ count: 1, oldest: 'the bank statements' });
  });
  it('Kwame, a colleague giving a view, reads only his own wait, never Femi\'s', async () => {
    expect(await inTheWay(PIP, KWAME)).toMatchObject({ count: 1, oldest: 'the approval of five applications' });
  });
  it('the admin who set it up reads the whole team', async () => {
    expect(await inTheWay(PIP, SETUP_ADMIN)).toMatchObject({ count: 3, oldest: 'the bank statements' });
  });
  it('an admin without access is not served the board at all', async () => {
    await expect(boardAs(PIP, ...JUMA)).rejects.toThrow();
  });
});

/*
 * DECISION 75, ITEM 46: where people see each other, a participant's one line is narrowed to their own waits too,
 * to match their own board. This used to expect Ngozi to read the team's count and Femi's wait; Hafsah decided
 * on 2 October that it is narrowed. Whoever runs it, and an admin who only reads, still read the whole team's.
 */
describe('where people see each other on an ordinary check-in', () => {
  it('Ngozi, a participant, reads only her own wait, never Femi\'s', async () => {
    const got = await inTheWay(RUN, NGOZI);
    expect(got).toMatchObject({ count: 1, oldest: 'a date for the credit decision' });
    expect(JSON.stringify(got)).not.toContain('bank statements');
  });
  it('Kwame reads only his own wait on Bisi', async () => {
    expect(await inTheWay(RUN, KWAME)).toMatchObject({ count: 1, oldest: 'the approval of five applications' });
  });
  it('Bisi, who runs it, and Juma, an admin who only reads, read the whole team, with Femi\'s wait as the oldest', async () => {
    expect(await inTheWay(RUN, BISI)).toMatchObject({ count: 3, oldest: 'the bank statements' });
    expect(await inTheWay(RUN, JUMA)).toMatchObject({ count: 3, oldest: 'the bank statements' });
  });
});
