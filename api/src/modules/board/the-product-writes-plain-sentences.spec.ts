import { GroundScenario } from '@prisma/client';
import { AMINA, BARAKA, JUMA, RUKIA, SETUP_ADMIN, boardAs, commitment, handoff, answered, type Setup } from './the-switchboards-sections-harness';
import { buildContribution, buildCoverage } from './reads';
import { COHORT_PROBATION, COHORT_TRUTH } from './__fixtures__/cohort-probation';
import * as REAL_RUN from './__fixtures__/real-run.json';
import { whatIsNotPlainIn, everyProductSentence } from '../reports/a-product-sentence-is-plain';

const line = (id: string, participantId: string, text: string, more: Record<string, any> = {}) => ({
  id, participantId, type: 'PROGRESS', text, checkInId: `c1-${participantId}`, recallBased: true, anchoredOrigin: null,
  anchoredDocumentId: null, confirmedAt: null, createdAt: new Date('2026-09-02T16:00:00Z'), disputedAt: null, ...more,
});
const LONG_AGO = new Date(Date.now() - 30 * 86_400_000);
const RICH: Setup = {
  turns: [{ checkInId: 'c1-p-rukia', content: 'I emailed twice.' }, { checkInId: 'c1-p-rukia', content: 'by Friday' }],
  checkIns: [answered('p-rukia', 1), answered('p-rukia', 2, '2026-09-16T16:00:00Z'), answered('p-baraka', 1)],
  commitments: [
    commitment('k-1', 'p-rukia', 'I will send the Westgate quote.'),
    commitment('k-2', 'p-baraka', 'I will call the Kisumu depot.', { whenSaid: 'by Friday' }),
    commitment('k-3', 'p-rukia', 'I will finish the stock count.', { whenSaid: 'this week', saidAgainIn: [2, 3] }),
    commitment('k-4', 'p-amina', 'I will review the pricing.', { status: 'DONE', settledBy: 'SAID', settledAt: new Date('2026-09-09T10:00:00Z') }),
    commitment('k-5', 'p-baraka', 'I will order the freezers.', { status: 'NOT_DONE' }),
  ],
  dependencies: [
    handoff('d-1', 'p-rukia', 'the credit terms', { onLabel: 'Finance', dueSaid: 'by Friday', triedSaid: 'I emailed twice.', sourceCheckInId: 'c1-p-rukia', createdAt: LONG_AGO, updatedAt: LONG_AGO }),
    handoff('d-2', 'p-baraka', 'the depot keys', { onParticipantId: 'p-rukia', status: 'WAITING' }),
    handoff('d-3', 'p-rukia', 'the approval for the second tranche', { createdAt: LONG_AGO, updatedAt: LONG_AGO }),
    handoff('d-4', 'p-baraka', 'the old price list', { status: 'CLEARED', clearedAt: new Date('2026-09-09T09:00:00Z') }),
  ],
  lines: [
    line('e-1', 'p-rukia', 'We paid out KES 90K to the Nyama Choma Palace account.', { recallBased: false, anchoredDocumentId: 'doc-1' }),
    line('e-2', 'p-baraka', 'The Kisumu depot received all twelve crates.', { confirmedAt: new Date('2026-09-04T10:00:00Z') }),
    line('e-3', 'p-baraka', 'I think the freezer order is about right.'),
  ],
  objectives: [
    { id: 'o-team', name: 'Sales', target: 25, count: 21, prevCount: 20, ownerParticipantId: null, sortOrder: 0, assumes: ['Stock arrives within a week of an order.'], createdAt: new Date('2026-09-01T09:00:00Z'), updatedAt: new Date('2026-09-10T09:00:00Z') },
    { id: 'o-rukia', name: 'Rukia’s sales', target: 5, count: 1, prevCount: 4, ownerParticipantId: 'p-rukia', sortOrder: 1, assumes: [], createdAt: new Date('2026-09-01T09:00:00Z'), updatedAt: new Date('2026-09-02T09:00:00Z') },
  ],
  report: {
    releasedAt: new Date('2026-09-23T17:00:00Z'), sharedAs: null, theOpening: 'Both people have checked in.', networkPicture: null,
    sharedPicture: 'Both have checked in.', agreements: ['Both want the depot keys sorted.'],
    divergences: [{ topic: 'Whether a price range counts as a budget', positions: [
      { participantLabel: 'Participant A', view: 'A range is a budget.' }, { participantLabel: 'Participant B', view: 'Only a figure is a budget.' },
    ] }], centralQuestion: null, engagement: {}, findings: [],
    createdAt: new Date('2026-09-20T09:00:00Z'), updatedAt: new Date('2026-09-23T15:02:00Z'),
  },
};
const SETUPS: Record<string, Setup> = {
  'a rich record': RICH,
  'a rich record, people cannot see each other': { ...RICH, peersVisibleToEachOther: false },
  'a rich record, everybody sees targets': { ...RICH, whoSeesTargets: 'EVERYBODY' },
  'an evaluation check-in': { ...RICH, scenario: GroundScenario.PIP, createdByUserId: 'u-setup' },
  'an empty record': { checkIns: [] },
  'only one answered': { checkIns: [answered('p-rukia', 1)] },
};
const READERS = { Amina: AMINA, Rukia: RUKIA, Baraka: BARAKA, Juma: JUMA, 'the admin who set it up': SETUP_ADMIN } as const;

describe('every sentence the board writes is plain, for each reader', () => {
  it('walks every served sentence', async () => {
    const failures: string[] = [];
    let walked = 0;
    for (const [setupName, setup] of Object.entries(SETUPS)) {
      for (const [readerName, reader] of Object.entries(READERS)) {
        const b = await boardAs(setup, reader[0], reader[1]).then((x) => x, () => null);
        if (!b) continue;
        for (const s of everyProductSentence(b)) {
          walked++;
          for (const f of whatIsNotPlainIn(s.text, { whole: s.whole, readerIsLead: reader === AMINA })) failures.push(`${s.path} [${f.rule}] ${JSON.stringify(f.found)}  <= ${s.text.slice(0, 120)}`);
        }
      }
    }
    const unique = [...new Set(failures.map((f) => f.replace(/^board/, '').replace(/\[\d+\]/g, '[]')))];
    console.log(`walked ${walked}\n` + unique.join('\n'));
    expect(walked).toBeGreaterThan(200);
    expect(unique).toEqual([]);
  });
});

describe('every sentence the board reads compose from the record is plain', () => {
  it('walks the contribution and coverage reads of a cohort and of a real run', () => {
    const fixture = (REAL_RUN as any).default ?? REAL_RUN;
    const session = new Map<string, number>(fixture.checkIns.map((c: any) => [c.id, c.sessionNumber]));
    const real: any = {
      participants: fixture.participants.map((p: any) => ({ id: p.id, roleAsDescribed: p.roleAsDescribed ?? null, managingOnly: !!p.managingOnly, detectedFunction: p.detectedFunction ?? null, detectedFunctionConfidence: p.detectedFunctionConfidence ?? null })),
      checkIns: fixture.checkIns.map((c: any) => ({ participantId: c.participantId, sessionNumber: c.sessionNumber, status: c.status })),
      entries: fixture.entries.map((e: any) => ({ participantId: e.participantId, sessionNumber: e.checkInId ? (session.get(e.checkInId) ?? null) : null, text: e.text })),
      mentions: fixture.mentions, dependencies: fixture.dependencies ?? fixture.deps,
    };
    const cohortName = (id: string) => COHORT_TRUTH.find((t) => t.key === id)?.name ?? id;
    const nameOf = (id: string) => `Person ${id.slice(0, 4)}`;
    const failures: string[] = [];
    let walked = 0;
    for (const [input, names] of [[COHORT_PROBATION, cohortName], [real, nameOf]] as const) {
      const board = { contribution: buildContribution(input as any, names), coverage: buildCoverage(input as any, names) };
      for (const s of everyProductSentence(board)) {
        walked++;
        for (const f of whatIsNotPlainIn(s.text, { whole: s.whole })) failures.push(`${s.path.replace(/\[\d+\]/g, '[]')} [${f.rule}] ${JSON.stringify(f.found)}  <= ${s.text.slice(0, 120)}`);
      }
    }
    const unique = [...new Set(failures)];
    console.log(`walked ${walked}\n` + unique.join('\n'));
    expect(walked).toBeGreaterThan(20);
    expect(unique).toEqual([]);
  });
});
