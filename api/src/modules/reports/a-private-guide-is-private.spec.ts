import { withoutOtherPeoplesReads } from './own-reads-only';

/**
 * "YOURS ALONE, AND NOT PART OF THE SHARED REPORT. NOBODY ELSE IS SHOWN THIS."
 *
 * That sentence is on the report page above the "Before you talk to them" section. It was not true.
 * `engagement.postReportGuides` is a map of participantId -> that person's private preparation, and the whole
 * map was returned to every reader. Fetching a real report as the LEAD returned the participant's own opening
 * line for the conversation they were about to have with that lead.
 *
 * The page was never at fault - it reads one guide out by id and renders only that. The map rode along inside
 * `engagement`.
 *
 * WHY THE FILTER MISSED IT. `withoutOtherPeoplesReads` is a DENYLIST: it names the keys to remove, and
 * `engagement` carries seventeen. Anything added later is exposed by default. That is also how
 * `pictureConfidence` - a per-person confidence band, keyed by label exactly like `specificitySignal` - got
 * out behind it. The last test here is the one that matters: it fails the day an eighteenth key appears
 * without somebody deciding who may read it.
 */

const GUIDE_A = { openingLine: 'A opens like this', toAcknowledge: 'a', questionToCarry: 'a?' };
const GUIDE_B = { openingLine: 'B opens like this', toAcknowledge: 'b', questionToCarry: 'b?' };

/** Shaped like a real report: every engagement key observed on a live one. */
const report = () => ({
  id: 'r1',
  engagement: {
    note: 'about the report',
    parties: [
      { label: 'the initiator', specificityLabel: 'moderate' },
      { label: 'Renewals owner', specificityLabel: 'high' },
    ],
    coverage: 'moderate',
    docStatus: {},
    recallNotes: [{ label: 'Renewals owner', text: 'theirs' }],
    coverageBand: 'moderate',
    session2Focus: [],
    sessionCounts: { 'the initiator': 1, 'Renewals owner': 1 },
    documentBacked: false,
    postReportGuides: { 'p-a': GUIDE_A, 'p-b': GUIDE_B },
    specificityNotes: [{ label: 'Renewals owner', text: 'theirs' }],
    documentBackedPct: 0,
    pictureConfidence: { 'the initiator': { band: 'partly covered' }, 'Renewals owner': { band: 'covered' } },
    specificityCauses: [],
    specificitySignal: { 'the initiator': 'moderate', 'Renewals owner': 'high' },
    currentBestReading: 'as it stands',
    difficultyDisclosures: false,
    concernFlags: [{ about: 'Renewals owner' }],
  },
  finalSynthesis: { tiers: { 'p-a': 'MIXED', 'p-b': 'MIXED' } },
  leadershipGaps: ['a gap'],
});

const asLead = () => withoutOtherPeoplesReads(report() as any, {
  viewerLabel: 'the initiator', viewerParticipantId: 'p-a', viewerIsLead: true,
});
const asParticipant = () => withoutOtherPeoplesReads(report() as any, {
  viewerLabel: 'Renewals owner', viewerParticipantId: 'p-b', viewerIsLead: false,
});

describe('a private guide is private', () => {
  it('the lead does not receive anybody\'s guide, including their own', () => {
    /* Their own reaches them as the top-level `postReportGuide`, read out by id in get(). */
    expect((asLead().engagement as any).postReportGuides).toBeUndefined();
  });

  it('a participant does not receive anybody\'s guide either', () => {
    expect((asParticipant().engagement as any).postReportGuides).toBeUndefined();
  });

  it('and no guide text survives anywhere in what either of them is sent', () => {
    /* The strongest form: the words themselves must not appear in the payload. */
    for (const view of [asLead(), asParticipant()]) {
      const json = JSON.stringify(view);
      expect(json).not.toContain('A opens like this');
      expect(json).not.toContain('B opens like this');
    }
  });

  it('stripping the guides does not disturb the rest of the report', () => {
    const lead = asLead();
    expect(lead.id).toBe('r1');
    expect((lead.engagement as any).currentBestReading).toBe('as it stands');
    /* This used to pin "a lead still sees everyone's reads". Hafsah's decision, 28 September 2026:
       leads and admins are never sent how anyone's answers were rated. The lead keeps only the
       read of their own answers, like every other reader. */
    expect((lead.engagement as any).specificitySignal).toEqual({ 'the initiator': 'moderate' });
  });

  it('a per-person confidence band is reduced to the reader\'s own', () => {
    const own = (asParticipant().engagement as any).pictureConfidence;
    expect(Object.keys(own)).toEqual(['Renewals owner']);
  });

  it('the existing rules still hold for a participant', () => {
    const e = asParticipant().engagement as any;
    expect(e.concernFlags).toBeUndefined();
    expect(e.specificitySignal).toEqual({ 'Renewals owner': 'high' });
    expect(e.parties.find((p: any) => p.label === 'the initiator').specificityLabel).toBeUndefined();
    expect(e.parties.find((p: any) => p.label === 'Renewals owner').specificityLabel).toBe('high');
    expect((asParticipant() as any).leadershipGaps).toBeUndefined();
  });

  /**
   * THE CANARY. Every key of `engagement` must be a decision somebody made, not a default.
   * If this fails you have added a key: put it in one list or the other and say why.
   */
  it('every engagement key reaching a participant has been decided on', () => {
    const DECIDED_FOR_PARTICIPANTS = [
      // about the report, not about a person
      'note', 'coverage', 'coverageBand', 'docStatus', 'documentBacked', 'documentBackedPct',
      'currentBestReading', 'session2Focus', 'difficultyDisclosures',
      // participation is deliberately shared - see this file's header
      'sessionCounts', 'parties',
      // per-person, reduced to the reader's own
      'specificityNotes', 'recallNotes', 'specificitySignal', 'specificityCauses', 'pictureConfidence',
    ].sort();
    expect(Object.keys(asParticipant().engagement as any).sort()).toEqual(DECIDED_FOR_PARTICIPANTS);
  });
});
