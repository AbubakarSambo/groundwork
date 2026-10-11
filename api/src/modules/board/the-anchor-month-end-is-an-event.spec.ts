import { GroundScenario, PartyType } from '@prisma/client';
import { person, answered, commitment, handoff, boardAs, AMINA, RUKIA, JUMA, type Setup } from './the-switchboards-sections-harness';
import { endTheMonthsThatHaveEnded } from './the-anchor-month-end-event';
import { endStatesFor, theEndingSaid, isValidEndState } from '../resolution/end-states';

/**
 * DECISION 114: THE MONTH BOARD'S WEEKS, "WHAT IS MOVING", "WHAT IS STILL IN THE WAY" AND THE END-OF-MONTH READ ARE ORDINARY BOARD SECTIONS,
 * named by the switchboard for the anchor's scenario and served to the lead alone. The old fields (theMonthBoard, theEndOfMonthRead) are still served and say the same.
 */
const lead = { ...person('p-amina', 'u-amina', 'Amina', 'Wanjiru', PartyType.INITIATOR), managingOnly: false };
const PEOPLE = [
  lead,
  person('p-rukia', 'u-rukia', 'Rukia', 'Mwangi'),
  person('p-baraka', 'u-baraka', 'Baraka', 'Otieno'),
  person('p-zawadi', 'u-zawadi', 'Zawadi', 'Njeri'),
  person('p-ibrahim', 'u-ibrahim', 'Ibrahim', 'Said'),
];
const OPENED = new Date('2026-09-08T08:00:00Z');
const HER_WORDS = 'Everyone is delivering their own piece but nobody seems to understand what it takes to keep this company moving.';

function anchor(opts: { on?: boolean; startedFrom?: string | null; completedOn?: string; status?: string; words?: string | null } = {}): Setup {
  const { on = true, startedFrom = 'anchor', completedOn = '2026-10-07T10:00:00Z', status, words = HER_WORDS } = opts;
  const checkIns = [
    ...['p-amina', 'p-rukia', 'p-baraka'].map((id) => ({ ...answered(id, 1, completedOn), availableFrom: OPENED })),
    ...['p-zawadi', 'p-ibrahim'].map((id) => ({ id: `c1-${id}`, participantId: id, sessionNumber: 1, status: 'NOT_STARTED', isSetup: false, completedAt: null, availableFrom: OPENED })),
  ];
  const commitments = [
    commitment('k1', 'p-rukia', 'I will send the deck to the client.', { status: 'DONE', settledAt: new Date(completedOn) }),
    commitment('k2', 'p-baraka', 'I will call the supplier.'),
  ];
  const dependencies = [
    handoff('d1', 'p-baraka', 'the sales deck', { onParticipantId: 'p-rukia', status: 'WAITING' }),
    handoff('d2', 'p-zawadi', 'the price list', { onParticipantId: 'p-rukia', status: 'CLEARED' }),
  ];
  return {
    scenario: GroundScenario.HELP_TEAM_UNDERSTAND, people: PEOPLE, checkIns, commitments, dependencies, groundRow: { startedFrom, startsAt: OPENED, ...(status ? { status } : {}) },
    prismaExtras: {
      platformSetting: { findUnique: jest.fn(async () => (on ? { value: { on: true } } : { value: { on: false } })) },
      groundDependency: { findMany: jest.fn(async () => dependencies) },
      recommendation: { findMany: jest.fn(async () => []) },
      conversationTurn: { findMany: jest.fn(async (a: any) => (a?.where?.role === 'PERSON' && a?.where?.checkIn?.groundId && words ? [{ content: words }] : [])) },
      groundParticipant: {
        findMany: jest.fn(async (a: any) => {
          if (a?.where?.id?.in) return PEOPLE.filter((p) => a.where.id.in.includes(p.id)).map((p) => ({ id: p.id, lastNudgedAt: null }));
          return PEOPLE.map((p) => ({ ...p, checkIns: checkIns.filter((c) => c.participantId === p.id && c.status === 'COMPLETED').map((c) => ({ status: c.status })) }));
        }),
        findUnique: jest.fn(async () => null), findFirst: jest.fn(async () => null), count: jest.fn(async () => 0), aggregate: jest.fn(async () => ({})),
      },
    },
  };
}


const EARLY = '2026-09-15T10:00:00Z';
const withTheEvent = (at: string, because = 'time', more: Record<string, any> = {}) => ({ ...anchor({ completedOn: EARLY, ...more }), groundRow: { startedFrom: 'anchor', startsAt: OPENED, groundAuditLog: { anchorMonthEnded: { at, because } }, ...(more.status ? { status: more.status } : {}) } }) as Setup;

describe('the anchor month end is an event written once, decision 121 item 2', () => {
  it('without the event, a month with nothing new in it shows no end of the month', async () => {
    const b: any = await boardAs(anchor({ completedOn: EARLY }), ...AMINA);
    expect('theEndOfTheMonth' in b).toBe(false);
  });

  it('with the event written, Amina reads the end of the month, and the board changed when the month ended', async () => {
    const b: any = await boardAs(withTheEvent('2026-10-07T03:30:00.000Z'), ...AMINA);
    expect(b.theEndOfTheMonth.heading).toBe('You wanted your team to understand...');
    expect(b.theEndOfTheMonth.yourOwnWords).toContain(HER_WORDS);
    expect(b.theEndOfTheMonth.continueOptions.map((o: any) => o.label)).toContain('Continue Groundwork for the team');
    expect(b.lastChangedAt).toBe('2026-10-07T03:30:00.000Z');
  });

  it('a check-in that stalled in its second week shows the end of the month too', async () => {
    const b: any = await boardAs(withTheEvent('2026-09-20T03:30:00.000Z', 'stalled', { status: 'STALLED' }), ...AMINA);
    expect(b.theEndOfTheMonth.yourOwnWords).toContain(HER_WORDS);
  });

  it('Rukia and an admin who only reads are not served it, event or not', async () => {
    for (const who of [RUKIA, JUMA]) {
      const b: any = await boardAs(withTheEvent('2026-10-07T03:30:00.000Z'), who[0] as string, who[1] as string);
      expect('theEndOfTheMonth' in b).toBe(false);
      expect('theEndOfMonthRead' in b).toBe(false);
    }
  });

  describe('the sweep', () => {
    const NOW = new Date('2026-10-07T03:30:00Z');
    const prisma = (rows: any[]) => ({ ground: { findMany: jest.fn(async () => rows), update: jest.fn(async () => ({})) } });
    it('writes it once for a month that is over, keeps what the log already held, and not again', async () => {
      const p = prisma([{ id: 'g1', status: 'ACTIVE', startsAt: OPENED, createdAt: OPENED, groundAuditLog: { contextNotes: ['a'] } }]);
      expect((await endTheMonthsThatHaveEnded(p, NOW)).ended).toEqual(['g1']);
      const written = (p.ground.update.mock.calls[0] as any[])[0];
      expect(written.data.groundAuditLog.contextNotes).toEqual(['a']);
      expect(written.data.groundAuditLog.anchorMonthEnded).toEqual({ at: NOW.toISOString(), because: 'time' });
      const again = prisma([{ id: 'g1', status: 'ACTIVE', startsAt: OPENED, createdAt: OPENED, groundAuditLog: written.data.groundAuditLog }]);
      expect((await endTheMonthsThatHaveEnded(again, NOW)).ended).toEqual([]);
      expect(again.ground.update).not.toHaveBeenCalled();
    });
    it('writes it for a stalled check-in at once, and leaves a month still running alone', async () => {
      const p = prisma([
        { id: 'stalled', status: 'STALLED', startsAt: new Date('2026-09-30T00:00:00Z'), createdAt: new Date('2026-09-30T00:00:00Z'), groundAuditLog: null },
        { id: 'running', status: 'ACTIVE', startsAt: new Date('2026-09-30T00:00:00Z'), createdAt: new Date('2026-09-30T00:00:00Z'), groundAuditLog: null },
      ]);
      expect((await endTheMonthsThatHaveEnded(p, NOW)).ended).toEqual(['stalled']);
      expect((p.ground.update.mock.calls[0] as any[])[0].data.groundAuditLog.anchorMonthEnded.because).toBe('stalled');
    });
  });

  describe('the ending, offered at /grounds/:id/end', () => {
    it('is the anchor\'s own, in full sentences, and not the project\'s', () => {
      const labels = endStatesFor(GroundScenario.HELP_TEAM_UNDERSTAND).map((o) => o.label);
      expect(labels).toEqual([
        'The check-in keeps running, so the team keeps being asked.',
        'The check-ins Groundwork recommended are started.',
        'The suites that fit the work the team is already doing are turned on.',
        'Groundwork carries on for the team.',
        'The check-in ends here, and what the month found stays in the record.',
      ]);
      expect(labels.join(' ')).not.toMatch(/project/i);
      expect(endStatesFor(GroundScenario.NEW_PROJECT).map((o) => o.label)).toContain('The project is complete.');
      expect(isValidEndState(GroundScenario.HELP_TEAM_UNDERSTAND, 'STOP')).toBe(false);
    });
    it('still reads an ending chosen before, with the words it had', () => {
      expect(theEndingSaid(GroundScenario.HELP_TEAM_UNDERSTAND, 'STOP')).toBe('The project stops.');
    });
  });
});
