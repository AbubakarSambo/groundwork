import { GroundScenario } from '@prisma/client';
import { AMINA, BARAKA, RUKIA, boardAs, type Setup } from './the-switchboards-sections-harness';

/**
 * WHERE PEOPLE DIFFER, ON A RENEWAL, FOR THE PERSON IT IS ABOUT (the 1 October review, part 1).
 *
 * Rukia is the person reviewed, Baraka a colleague who gave a view, Amina the lead. The report's difference
 * names Rukia's own side, the colleague's, and the lead's, and its evidence quotes the colleague. Read as each
 * person is served it: Rukia reads her own side as it was found, never a colleague's quoted words, and the
 * side that is not shown to her is described by who it is, not as "a colleague" when it is the lead's.
 */
const OPERATIONAL_NOISE = 'operational noise';
const RECORD: Setup = {
  scenario: GroundScenario.CONTRACT_RENEWAL,
  peersVisibleToEachOther: false,
  lines: [{ id: 'l-1', participantId: 'p-baraka', type: 'PROGRESS', text: `The handover talks are ${OPERATIONAL_NOISE} and not a significant issue.`, checkInId: 'c1-p-baraka', recallBased: false, anchoredOrigin: null, dimensionThreadKey: null, confirmedAt: null, anchoredDocumentId: null, disputedAt: null, saidWordForWord: true, createdAt: new Date('2026-09-02T16:00:00Z') }],
  report: {
    releasedAt: new Date('2026-09-23T17:00:00Z'), sharedAs: null, theOpening: null, networkPicture: null,
    sharedPicture: 'All three people have answered.', agreements: [], centralQuestion: null, engagement: {}, findings: [],
    divergences: [{
      topic: 'They disagree on how serious the handover conflict is.',
      atStake: 'If this holds, the cause may go unaddressed.',
      evidence: [
        'Participant B\'s record describes a scheduling conflict that has been raised twice.',
        `Participant A's record describes the same discussions as '${OPERATIONAL_NOISE}' and not a significant issue.`,
      ],
      positions: [
        { participantLabel: 'Participant B', view: 'The handover time moved in March and the trucks still arrive at the old time.' },
        { participantLabel: 'Participant A', view: 'It is a small matter that comes up in passing.' },
        { participantLabel: 'the initiator', view: 'We agreed 98% on-time delivery.' },
      ],
      settledBy: 'Agree on whether the handover conflict is a main cause.',
    }],
    createdAt: new Date('2026-09-20T09:00:00Z'), updatedAt: new Date('2026-09-23T15:02:00Z'),
  },
};
const items = (b: any) => b.divergence?.items ?? [];

describe('Where people differ, on a renewal, as the person reviewed reads it', () => {
  it('Rukia reads no colleague\'s quoted words in the evidence', async () => {
    const b = await boardAs(RECORD, ...RUKIA);
    expect(JSON.stringify(items(b))).not.toContain(OPERATIONAL_NOISE);
    expect(items(b)[0].evidence[0]).toBe('Your record describes a scheduling conflict that has been raised twice.');
    expect(items(b)[0].evidence[1]).toBe('A colleague described this differently.');
  });

  it('Rukia reads her own side as it was found, not the sentence for hiding a colleague', async () => {
    const own = items(await boardAs(RECORD, ...RUKIA))[0].positions.find((p: any) => p.who === 'You');
    expect(own.view).toBe('The handover time moved in March and the trucks still arrive at the old time.');
  });

  it('the colleague\'s side says it is a colleague\'s and the lead\'s says it is the lead\'s', async () => {
    const sides = items(await boardAs(RECORD, ...RUKIA))[0].positions;
    const theColleague = sides.find((p: any) => /colleague/i.test(p.who));
    const theLead = sides.find((p: any) => p.who !== 'You' && !/colleague/i.test(p.who));
    /* Changed 3 October (request 124): no decision has been made on this record, so no decision is said to be below. */
    expect(theColleague.view).toBe("A colleague's own words are not shown to you here. What was found is below.");
    expect(theLead.view).toBe('The words your lead used are not shown to you here. What was found is below.');
    expect(theLead.view).not.toMatch(/colleague/i);
  });

  it('Amina, who runs it, reads every side and every quote as they were found', async () => {
    const b = await boardAs(RECORD, ...AMINA);
    expect(JSON.stringify(items(b))).toContain(OPERATIONAL_NOISE);
    expect(JSON.stringify(items(b))).toContain('It is a small matter that comes up in passing.');
  });

  it('a colleague who gave a view reads what they read before', async () => {
    const b = await boardAs(RECORD, ...BARAKA);
    expect(JSON.stringify(items(b))).toContain('We agreed 98% on-time delivery.');
  });
});
