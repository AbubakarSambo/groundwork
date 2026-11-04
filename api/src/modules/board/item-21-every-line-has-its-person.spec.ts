import { boardAs, answered, handoff, AMINA, RUKIA, JUMA } from './the-switchboards-sections-harness';
import { whatToProbe } from '../reports/what-to-probe';

/**
 * ITEM 21, THE DISTRIBUTION OPERATIONS BOARD: EVERY LINE HAS ITS PERSON IN IT.
 *
 * "Whether to renew the logistics contract" (local test database, a5168f94): Kwabena, who runs it, read
 * "Blessing Okafor also named 1 thing the work was waiting on." with nothing before the "also", and,
 * under what to recognise in Blessing, "Named a problem out loud rather than reporting everything as
 * fine." with nobody in it.
 */
const setup = {
  checkIns: [answered('p-rukia', 1), answered('p-baraka', 1)],
  dependencies: [handoff('d-1', 'p-rukia', "the partner's truck schedule", { onLabel: 'the logistics partner', status: 'BLOCKING' })],
};

describe('how busy or moving, as each reader reads it', () => {
  it('Amina, who runs it, reads the wait without an "also" before nothing', async () => {
    const rows = (await boardAs(setup as any, ...AMINA)).busyOrMoving.eachPerson;
    expect(rows.find((r: any) => r.participantId === 'p-rukia').says).toBe('Rukia Mwangi named 1 thing the work was waiting on, across 1 answered session.');
  });
  it.each([['Rukia, who checks in', RUKIA], ['Juma, an admin', JUMA]])('%s reads no "also" before nothing either', async (_w, reader) => {
    const b = await boardAs(setup as any, ...(reader as readonly [string, string]));
    expect(JSON.stringify(b.busyOrMoving ?? null)).not.toMatch(/\balso named/);
  });
});

describe('what to recognise, for whoever runs it', () => {
  const probe = (more: Partial<Parameters<typeof whatToProbe>[0]>) => whatToProbe({
    who: 'Blessing Okafor', participantId: 'p-blessing', role: 'Warehouse manager', answeredThisSession: true,
    waitingOn: [{ what: "the partner's truck schedule", who: 'the logistics partner', daysOld: 2, escalated: false, since: '1 October' }],
    holdingUp: [], concrete: [], documentsAttached: 0, sessionNumber: 1, totalSessions: 1, scenario: 'CONTRACT_RENEWAL', ...more,
  });
  it('says who named the problem', () => {
    expect(probe({}).encourage).toEqual(['Blessing Okafor named a problem out loud rather than reporting everything as fine.']);
  });
  it('and who attached a document', () => {
    expect(probe({ documentsAttached: 2 }).encourage).toEqual(['Blessing Okafor attached 2 documents, so their side can be checked rather than taken on trust.']);
  });
});
