import { BoardService } from './board.service';
import {
  LeadershipPattern,
  LEADERSHIP_PATTERNS,
  ManagementPole,
  buildLeadershipPatternBlock,
} from './coverage';
import { BOARD_FORBIDDEN, BOARD_WHITELIST, pickBoardSafeReportFields } from './board-families';
import { REPORT_SCHEMA, SYNTHESIS_RULES } from '../reports/reports.service';

/**
 * GW-MGR-ALIGN tripwires.
 *
 * Leadership gaps are the MANAGEMENT role map's own failure patterns, detected
 * by the report synthesis. Two things this must never become:
 *
 *  1. WORD MATCHING. The synthesis is given each pattern's SIGNATURE - what the
 *     two accounts would have to show - not phrases to look for. Matching
 *     "clearly" against "not sure" fires on the wrong thing and misses the
 *     politely-worded version, which is the common one.
 *
 *  2. ONE BLURRED "MANAGEMENT GAP". The map's root failure has two OPPOSITE
 *     poles: CONTROL (holds on to everything, nobody else can own) and
 *     ABDICATION (holds nobody, things slip). Telling someone who over-controls
 *     to "hold people more" makes it worse, and so does the reverse. Every
 *     pattern must carry its pole.
 *
 * Plus the discipline that governs every other negative read: a pattern needs
 * more than one period, and nothing is ever attributed or quoted.
 */

function boardOnly() {
  return new BoardService({} as any) as any;
}

const gap = (over: Record<string, any> = {}) => ({
  pattern: LeadershipPattern.WORK_NOT_HANDED_OVER,
  gap: 'One account is largely hands-on work that sits in another party\'s remit; that party\'s account is thin on the same work.',
  note: 'The team cannot own what is still being done for them.',
  periods: 3,
  ...over,
});

describe('GW-MGR-ALIGN-01: the patterns come from the role map, with both poles', () => {
  it('carries both poles of the management root failure (tripwire)', () => {
    const poles = new Set(LEADERSHIP_PATTERNS.map((p) => p.pole));
    // Losing a pole is how this read becomes useless: the same advice would be
    // given to someone who over-controls and someone who abdicates.
    expect(poles.has(ManagementPole.CONTROL)).toBe(true);
    expect(poles.has(ManagementPole.ABDICATION)).toBe(true);
  });

  it('every pattern states a signature, so the synthesis looks for a pattern not a phrase', () => {
    for (const p of LEADERSHIP_PATTERNS) {
      expect(p.signature.length).toBeGreaterThan(40);
      expect(p.label).toBeTruthy();
      expect(p.why).toBeTruthy();
    }
  });

  it('the prompt block is generated FROM the map, so the two cannot drift apart (tripwire)', () => {
    const block = buildLeadershipPatternBlock();
    for (const p of LEADERSHIP_PATTERNS) {
      expect(block).toContain(p.pattern);
      expect(block).toContain(p.pole);
      expect(block).toContain(p.signature);
    }
  });

  it('the schema offers exactly the map\'s patterns and nothing invented', () => {
    const field = (REPORT_SCHEMA as any).input_schema.properties.leadershipGaps;
    expect(field.items.properties.pattern.enum.sort()).toEqual(
      LEADERSHIP_PATTERNS.map((p) => p.pattern).sort(),
    );
  });
});

describe('GW-MGR-ALIGN-02: the instruction forbids quoting and requires a pattern', () => {
  it('tells the model not to quote or name', () => {
    expect(SYNTHESIS_RULES).toMatch(/NEVER quote either side/);
    expect(SYNTHESIS_RULES).toMatch(/NEVER name who said what/);
    expect(SYNTHESIS_RULES).toMatch(/NEVER say which is right/);
  });

  it('tells the model one period is not a pattern', () => {
    expect(SYNTHESIS_RULES).toMatch(/MORE THAN ONE period/);
    expect(SYNTHESIS_RULES).toMatch(/one session showing something is not a pattern/i);
  });

  it('tells the model never to blur the two poles', () => {
    expect(SYNTHESIS_RULES).toMatch(/CONTROL/);
    expect(SYNTHESIS_RULES).toMatch(/ABDICATION/);
    expect(SYNTHESIS_RULES).toMatch(/never blur them together/i);
  });
});

describe('GW-MGR-ALIGN-03: the board shapes, it does not detect', () => {
  it('resolves the pattern to its pole and label from the map', () => {
    const reads = boardOnly().buildManagerAlignment({ leadershipGaps: [gap()] });
    expect(reads).toHaveLength(1);
    expect(reads[0].pattern).toBe(LeadershipPattern.WORK_NOT_HANDED_OVER);
    expect(reads[0].pole).toBe(ManagementPole.CONTROL);
    expect(reads[0].label).toBe('Doing work the team should own');
  });

  it('never attributes the gap to a person (tripwire)', () => {
    const reads = boardOnly().buildManagerAlignment({ leadershipGaps: [gap()] });
    expect(reads[0].managerName).toBeNull();
    expect(reads[0].managerParticipantId).toBe('');
  });

  it('drops a single-period gap, because one period is not a pattern (tripwire)', () => {
    expect(boardOnly().buildManagerAlignment({ leadershipGaps: [gap({ periods: 1 })] })).toEqual([]);
    expect(boardOnly().buildManagerAlignment({ leadershipGaps: [gap({ periods: 0 })] })).toEqual([]);
    expect(boardOnly().buildManagerAlignment({ leadershipGaps: [gap({ periods: undefined })] })).toEqual([]);
  });

  it('drops a pattern name it does not recognise rather than rendering a bare string', () => {
    const reads = boardOnly().buildManagerAlignment({
      leadershipGaps: [gap({ pattern: 'MADE_UP_PATTERN' }), gap()],
    });
    expect(reads).toHaveLength(1);
  });

  it('produces nothing when synthesis found no pattern', () => {
    expect(boardOnly().buildManagerAlignment({ leadershipGaps: [] })).toEqual([]);
    expect(boardOnly().buildManagerAlignment({})).toEqual([]);
    expect(boardOnly().buildManagerAlignment(null)).toEqual([]);
  });

  it('falls back to the map\'s own reason when the model gives no note', () => {
    const reads = boardOnly().buildManagerAlignment({ leadershipGaps: [gap({ note: undefined })] });
    expect(reads[0].note).toContain('cannot own what is still being done for them');
  });
});

describe('GW-MGR-ALIGN-04: whitelist placement is deliberate', () => {
  it('leadershipGaps may cross to the board, because it is a gap and not an account', () => {
    expect(BOARD_WHITELIST as readonly string[]).toContain('leadershipGaps');
  });

  it('the lead-only reads still may not', () => {
    const safe = pickBoardSafeReportFields({
      leadershipGaps: [gap()],
      arcSignals: { p1: {} },
      finalSynthesis: {},
      inferences: [],
    });
    expect(safe).toHaveProperty('leadershipGaps');
    for (const forbidden of BOARD_FORBIDDEN) {
      expect(safe).not.toHaveProperty(forbidden);
    }
  });
});

describe('GW-MGR-ALIGN-05: the no-quote rule is ENFORCED, not merely requested', () => {
  // Against the real 12-session transcripts the model kept slipping a two-word
  // quote into the gap text even with an explicit prohibition. A prompt is a
  // request; this property must not depend on one. Preferring a false negative
  // over a leak is the documented bias.
  it('drops a gap containing any quotation, even two words (tripwire)', () => {
    const reads = boardOnly().buildManagerAlignment({
      leadershipGaps: [gap({ gap: "One account describes being 'spread too thin' and not converting." })],
    });
    expect(reads).toEqual([]);
  });

  it('drops a gap that identifies which party said it', () => {
    for (const bad of ['party A described it differently', 'the lead never mentions it', 'the manager did not raise it']) {
      expect(boardOnly().buildManagerAlignment({ leadershipGaps: [gap({ gap: bad })] })).toEqual([]);
    }
  });

  it('keeps a properly written gap', () => {
    const reads = boardOnly().buildManagerAlignment({
      leadershipGaps: [gap({ gap: 'One account describes a conversation as still to be had; another describes tension nobody addressed.' })],
    });
    expect(reads).toHaveLength(1);
  });
});
