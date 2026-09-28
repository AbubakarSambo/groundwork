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
});
