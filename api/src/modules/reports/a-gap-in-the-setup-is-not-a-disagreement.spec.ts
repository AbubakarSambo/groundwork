import { readFileSync } from 'fs';
import { join } from 'path';
import { LEADERSHIP_PATTERNS, LeadershipPattern, ManagementPole, buildLeadershipPatternBlock } from '../board/coverage';
import { REPORT_SCHEMA, SYNTHESIS_RULES } from './reports.service';
import { withoutOtherPeoplesReads } from './own-reads-only';

/**
 * A GAP IN THE SETUP IS NOT A DISAGREEMENT, AND CALLING IT ONE SENDS THE LEAD TO THE WRONG
 * CONVERSATION.
 *
 * Two people describe the same work differently. Sometimes they disagree. Sometimes nobody ever
 * told them what they were checking in against, and what looks like a disagreement is an absence.
 * The report had no way to say the second thing, so it said the first - and a lead reading it goes
 * and mediates between two people who were never given the same instruction.
 *
 * THE IDEA IS OLD AND THE AIM WAS HALF WRONG. It existed in July as an uncommitted field called
 * `leadCalibrationNote`, wired to no surface, asking the model to blame an AMBIGUOUS brief. It
 * fired zero times across six targeted runs and has zero non-empty rows in the database, and the
 * reason is in the data: 256 of 442 check-ins were opened with NO brief at all. A rule about
 * ambiguity is silent on absence, which is the common case.
 *
 * So this version reads both, and the corpus now says so when there is no brief - the synthesis
 * cannot notice an absence it is never shown.
 */
describe('the setup pattern', () => {
  const spec = LEADERSHIP_PATTERNS.find((p) => p.pattern === LeadershipPattern.SETUP_NEVER_SAID)!;

  it('exists, and is neither of the two management poles', () => {
    expect(spec).toBeDefined();
    /* CONTROL and ABDICATION are about how much somebody holds. This is about a document. */
    expect(spec.pole).toBe(ManagementPole.NEITHER);
  });

  it('is described to the model as covering a brief that is silent AND one that was never written', () => {
    /* The silent-brief half... */
    expect(spec.signature).toMatch(/never named the thing they differ about/i);
    /* ...and the no-brief-at-all half, which is the common one and the one the first version of
       this idea could not see. */
    expect(spec.signature).toMatch(/no brief was written at all/i);
  });

  it('reaches the synthesis, because the prompt block is built from the patterns', () => {
    expect(buildLeadershipPatternBlock()).toContain('SETUP_NEVER_SAID');
  });

  it('is offered to the model as a value it may return', () => {
    const values = (REPORT_SCHEMA as any).input_schema.properties.leadershipGaps.items.properties.pattern.enum;
    expect(values).toContain('SETUP_NEVER_SAID');
  });

  /*
   * The routing rule is what stops this being filed as a divergence, which is where it would be
   * lost: divergences are read by everybody, leadership gaps are read by the lead alone.
   */
  it('has a routing rule that says how to tell it from a real divergence', () => {
    expect(SYNTHESIS_RULES).toContain('14d.');
    expect(SYNTHESIS_RULES).toMatch(/would still exist if that had named the thing they differ about/i);
  });

  it('and the rule forbids writing it as somebody\'s fault', () => {
    const rule = SYNTHESIS_RULES.slice(SYNTHESIS_RULES.indexOf('14d.'));
    expect(rule.slice(0, 1200)).toMatch(/never who failed to pin it/i);
  });
});

/**
 * WHO READS IT. The lead, and nobody else. This is a read of how somebody set up a check-in their
 * own colleagues are answering, and handing that to those colleagues is the one thing it must never
 * do. It inherits the existing strip rather than inventing a second one, and this asserts that the
 * inheritance is real rather than assumed.
 */
describe('and who may read it', () => {
  it('never reaches a participant, because leadershipGaps never do', () => {
    const forAParticipant = withoutOtherPeoplesReads(
      {
        sharedPicture: 'Something everyone can read.',
        leadershipGaps: [
          { pattern: 'SETUP_NEVER_SAID', gap: 'One account describes a target; another describes a different one.', periods: 1 },
        ],
      } as any,
      { viewerLabel: 'Sahar', viewerParticipantId: 'p2', viewerIsLead: false },
    );
    expect((forAParticipant as any).leadershipGaps).toBeUndefined();
    expect((forAParticipant as any).sharedPicture).toBe('Something everyone can read.');
  });
});

/**
 * AND THE CORPUS SAYS WHEN THERE IS NO BRIEF. Without this line the synthesis is shown a brief or
 * shown nothing, and nothing is indistinguishable from a brief it simply did not need - which is
 * exactly how the July version stayed silent on the commonest case.
 */
describe('an absent brief', () => {
  const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const SRC = strip(readFileSync(join(__dirname, 'reports.service.ts'), 'utf8'));

  it('is written into the corpus rather than left out of it', () => {
    const at = SRC.indexOf("INITIATOR'S OPENING BRIEF");
    expect(at).toBeGreaterThan(-1);
    expect(SRC.slice(at, at + 900)).toMatch(/none was written/i);
  });
});
