import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * THE PARTS THAT SAY WHAT THE PRODUCT CONCLUDED SAY NAMES TOO. W8-74.
 *
 * `applyNames` substituted six named fields and passed everything else through on
 * `...report`. Two of the things it passed through carry prose a person reads:
 *
 *   engagement.recallNotes[].note   "the initiator was uncertain on key points"
 *   inferences[].text               "the initiator and participant were operating from
 *                                    different definitions of success"
 *
 * So the lead of a twelve-session ground read her own report with her name in one paragraph
 * and "the initiator" in the next - and every INFERENCE, the part that states what the
 * product concluded about people rather than what they said, entirely in placeholders.
 *
 * Verified end to end against the live endpoint before and after: the same sentence went
 * from "the initiator and participant were operating from different definitions of success"
 * to "Hafsah and Abubakar were operating from different definitions of success".
 *
 * THE HALF THAT IS A PRIVACY RULE, not a wording one. `own-reads-only.ts` keeps a person's
 * own quality reads and drops everyone else's by matching `row.label === viewerLabel` on the
 * RAW label. Put a name in `.label` and that comparison stops matching - and it does not
 * fail loudly, it keeps the wrong rows, and the wrong rows are other people's reads. So text
 * is named and label fields are left alone, by key name.
 */
const SRC = readFileSync(join(__dirname, 'reports.service.ts'), 'utf8');
const CODE = SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('what applyNames returns', () => {
  it('names the prose in engagement and inferences', () => {
    expect(CODE).toMatch(/engagement: walkTextOnly\(report\.engagement\)/);
    expect(CODE).toMatch(/inferences: walkTextOnly\(report\.inferences\)/);
  });

  it('and still names the six fields it always did', () => {
    // The fix adds; it must not quietly drop what was working.
    for (const f of ['sharedPicture: t(report.sharedPicture)', 'centralQuestion: t(report.centralQuestion)',
                     'agreements: walk(report.agreements)', 'divergences: walk(report.divergences)',
                     'finalSynthesis: walk(report.finalSynthesis)', 'leadershipGaps: walk(report.leadershipGaps)']) {
      expect(CODE).toContain(f);
    }
  });
});

describe('the label fields the privacy filter matches on', () => {
  it('are excluded by name', () => {
    expect(CODE).toMatch(/const NEVER_NAMED = new Set\(\['label', 'participantLabel'\]\)/);
  });

  it('and the exclusion is actually applied in the walk', () => {
    /**
     * The list existing is not the same as the list being used - a set declared and never
     * consulted is the shape of bug this repo keeps producing.
     */
    expect(CODE).toMatch(/NEVER_NAMED\.has\(k\) \? val : walkTextOnly\(val\)/);
  });

  it('own-reads-only still matches on the raw label, which is why', () => {
    // If this ever stops being true, the exclusion above is no longer load-bearing and the
    // reason written next to it is stale.
    const filter = readFileSync(join(__dirname, 'own-reads-only.ts'), 'utf8');
    expect(filter).toMatch(/r\.label === viewerLabel/);
  });
});
