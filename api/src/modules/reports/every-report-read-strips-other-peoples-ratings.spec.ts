import { readFileSync } from 'fs';
import { join } from 'path';
import { withoutOtherPeoplesReads } from './own-reads-only';

const SERVICE = readFileSync(join(__dirname, 'reports.service.ts'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

/**
 * A PARTICIPANT WHO HAD ANSWERED READ EVERYONE ELSE'S RATING ON A FORMING REPORT.
 *
 * Screens request 43, 28 September 2026. The released report and the lead's read-before-keep pass
 * both ran `withoutOtherPeoplesReads` before `whatAParticipantMayRead`. The forming report did
 * not, so a participant waiting on the round was served every other person's specificity notes,
 * signal, confidence band and label.
 *
 * Every place that serves a report to a reader goes through both, in that order.
 */
describe('every report read strips other people\'s ratings', () => {
  it('no call to whatAParticipantMayRead skips withoutOtherPeoplesReads', () => {
    const all = SERVICE.match(/whatAParticipantMayRead\(/g) ?? [];
    const wrapped = SERVICE.match(/whatAParticipantMayRead\(withoutOtherPeoplesReads\(/g) ?? [];
    expect(all.length).toBeGreaterThanOrEqual(3);
    expect(wrapped.length).toBe(all.length);
  });

  it('and a participant keeps only their own rating', () => {
    const report = {
      engagement: {
        specificityNotes: [{ label: 'Participant A', note: 'a' }, { label: 'Participant B', note: 'b' }],
        specificitySignal: { 'Participant A': 'HIGH', 'Participant B': 'LOW' },
        pictureConfidence: { 'Participant A': 'firm', 'Participant B': 'thin' },
        parties: [
          { label: 'Participant A', specificityLabel: 'HIGH' },
          { label: 'Participant B', specificityLabel: 'LOW' },
        ],
      },
    };
    const out: any = withoutOtherPeoplesReads(report, { viewerLabel: 'Participant A', viewerParticipantId: 'p-a', viewerIsLead: false });
    expect(JSON.stringify(out.engagement.specificityNotes)).not.toContain('Participant B');
    expect(out.engagement.specificitySignal['Participant B']).toBeUndefined();
    expect(out.engagement.pictureConfidence['Participant B']).toBeUndefined();
    expect(out.engagement.parties[1].specificityLabel).toBeUndefined();
    expect(out.engagement.parties[0].specificityLabel).toBe('HIGH');
  });

  /*
   * Hafsah's decision, 28 September 2026: "leads and admins are never sent how anyone's answers were
   * rated. Ratings may be used inside the engine to build reports, but are never served to any
   * reader." Every reader - the lead, an org admin with no account of their own, a participant -
   * leaves with no rating but, at most, the one on their own answers.
   */
  const RATED = () => ({
    engagement: {
      specificityNotes: [{ label: 'the initiator', note: 'x' }, { label: 'Participant A', note: 'a' }, { label: 'Participant B', note: 'b' }],
      recallNotes: [{ label: 'Participant A', note: 'a' }, { label: 'Participant B', note: 'b' }],
      specificityCauses: [{ label: 'Participant B', cause: 'c', note: 'n' }],
      specificitySignal: { 'the initiator': 'moderate', 'Participant A': 'HIGH', 'Participant B': 'LOW' },
      pictureConfidence: { 'Participant A': 'firm', 'Participant B': 'thin' },
      parties: [
        { label: 'the initiator', specificityLabel: 'moderate', confidence: 'partly covered', contributed: true },
        { label: 'Participant A', specificityLabel: 'HIGH', confidence: 'well covered', contributed: true },
        { label: 'Participant B', specificityLabel: 'LOW', confidence: 'thin', contributed: true },
      ],
      concernFlags: [{ about: 'Participant B' }],
    },
    finalSynthesis: { tiers: { 'p-lead': 'MIXED', 'p-a': 'STRONG', 'p-b': 'WEAK' } },
  });
  const READERS = [
    { who: 'the lead', viewerLabel: 'the initiator', viewerParticipantId: 'p-lead', viewerIsLead: true },
    { who: 'an org admin', viewerLabel: null, viewerParticipantId: null, viewerIsLead: true },
    { who: 'a participant', viewerLabel: 'Participant A', viewerParticipantId: 'p-a', viewerIsLead: false },
  ];
  const others = (label: string | null) => ['the initiator', 'Participant A', 'Participant B'].filter((l) => l !== label);
  const idOf: Record<string, string> = { 'the initiator': 'p-lead', 'Participant A': 'p-a', 'Participant B': 'p-b' };

  it.each(READERS)('no reader is sent anybody else\'s rating: $who', ({ viewerLabel, viewerParticipantId, viewerIsLead }) => {
    const out: any = withoutOtherPeoplesReads(RATED(), { viewerLabel, viewerParticipantId, viewerIsLead });
    const e = out.engagement;
    for (const label of others(viewerLabel)) {
      for (const k of ['specificityNotes', 'recallNotes', 'specificityCauses']) {
        expect((e[k] ?? []).some((r: any) => r.label === label)).toBe(false);
      }
      expect(e.specificitySignal?.[label]).toBeUndefined();
      expect(e.pictureConfidence?.[label]).toBeUndefined();
      expect(e.parties.find((p: any) => p.label === label).specificityLabel).toBeUndefined();
      /* Screens request 52: the per-person confidence band on the same row is a rating too. */
      expect(e.parties.find((p: any) => p.label === label).confidence).toBeUndefined();
      expect(out.finalSynthesis.tiers[idOf[label]]).toBeUndefined();
    }
    /* Participation is not a rating and stays for everybody. */
    expect(e.parties.every((p: any) => p.contributed === true)).toBe(true);
  });

  /*
   * B-110. concernFlags is a list of sentences about named people that says how thin or generic their
   * answers were ("significantly fewer and less specific entries than others"). The lead's report
   * carried it. CLAUDE.md: leads never see how a person's answers were rated, and decision 43 lets a
   * lead read only the plain forms (the sentence in the report, the pattern, one level for the whole
   * report, "Nothing checkable" beside a name). So no reader is sent it, the lead and an org admin included.
   */
  it.each(READERS)('nobody is sent a sentence about how a named person\'s answers were rated: $who', ({ viewerLabel, viewerParticipantId, viewerIsLead }) => {
    const input: any = RATED();
    input.engagement.concernFlags = [
      { label: 'Participant B', observation: "This person's record contains significantly fewer and less specific entries than others on the same ground." },
    ];
    const out: any = withoutOtherPeoplesReads(input, { viewerLabel, viewerParticipantId, viewerIsLead });
    expect(out.engagement.concernFlags).toBeUndefined();
    expect(JSON.stringify(out)).not.toContain('less specific entries');
  });

  it('an org admin with no account of their own is sent no rating at all', () => {
    const out: any = withoutOtherPeoplesReads(RATED(), { viewerLabel: null, viewerParticipantId: null, viewerIsLead: true });
    expect(out.engagement.specificitySignal).toEqual({});
    expect(out.engagement.pictureConfidence).toEqual({});
    expect(out.engagement.specificityNotes).toEqual([]);
    expect(out.finalSynthesis.tiers).toEqual({});
  });

  it('releasing a report sends back when it was released, never the stored row', () => {
    const CONTROLLER = readFileSync(join(__dirname, 'reports.controller.ts'), 'utf8');
    const at = CONTROLLER.indexOf("@Post('release')");
    const block = CONTROLLER.slice(at, CONTROLLER.indexOf('\n  }\n', at));
    expect(block).toContain('return { groundId, releasedAt:');
    expect(block).not.toMatch(/return this\.reports\.release\(/);
  });
});
