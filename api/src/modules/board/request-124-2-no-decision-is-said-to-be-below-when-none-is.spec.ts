import { GroundScenario } from '@prisma/client';
import { AMINA, BARAKA, RUKIA, boardAs, type Setup } from './the-switchboards-sections-harness';

/**
 * REQUEST 124, PART 2: "...AND THE DECISION WITH ITS REASONS, ARE BELOW" ONLY WHERE A DECISION HAS BEEN MADE.
 *
 * The person reviewed read "The words your lead used are not shown to you here. What was found, and the decision with
 * its reasons, are below." where no decision had been made and none was below. Read as the person reviewed, the lead
 * and a colleague, on a record with no decision and then on one where the decision has been made.
 */
const base: Setup = {
  scenario: GroundScenario.CONTRACT_RENEWAL,
  peersVisibleToEachOther: false,
  report: {
    releasedAt: new Date('2026-09-23T17:00:00Z'), sharedAs: null, theOpening: null, networkPicture: null,
    sharedPicture: 'All three people have answered.', agreements: [], centralQuestion: null, engagement: {}, findings: [],
    divergences: [{
      topic: 'They disagree on how serious the handover conflict is.',
      atStake: 'If this holds, the cause may go unaddressed.',
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
const decided: Setup = { ...base, endState: 'RENEW', resolvedAt: new Date('2026-09-30T10:00:00Z') };
const said = async (setup: Setup, reader: readonly [string, string]) =>
  ((await boardAs(setup, ...reader)).divergence?.items ?? []).flatMap((d: any) => d.positions.map((p: any) => p.view)) as string[];

describe('request 124 (2): a decision is said to be below only when there is one', () => {
  it('Rukia, with no decision made, reads that what was found is below, and nothing about a decision', async () => {
    const views = await said(base, RUKIA);
    expect(views).toContain("A colleague's own words are not shown to you here. What was found is below.");
    expect(views).toContain('The words your lead used are not shown to you here. What was found is below.');
    expect(views.join(' ')).not.toMatch(/decision/);
  });

  it('Rukia, with a decision made, reads that the decision and its reasons are below', async () => {
    const views = await said(decided, RUKIA);
    expect(views).toContain("A colleague's own words are not shown to you here. What was found, and the decision with its reasons, are below.");
    expect(views).toContain('The words your lead used are not shown to you here. What was found, and the decision with its reasons, are below.');
  });

  it('Amina and the colleague read no such sentence either way', async () => {
    for (const setup of [base, decided]) {
      for (const reader of [AMINA, BARAKA]) expect((await said(setup, reader)).join(' ')).not.toMatch(/not shown to you here/);
    }
  });
});
