import { BoardService } from './board.service';
import { LeadershipDimension } from './coverage';
import { BOARD_FORBIDDEN, BOARD_WHITELIST, pickBoardSafeReportFields } from './board-families';
import { REPORT_SCHEMA, SYNTHESIS_RULES } from '../reports/reports.service';

/**
 * GW-MGR-ALIGN tripwires.
 *
 * Leadership gaps are produced by the REPORT SYNTHESIS, not by the board. The
 * model already sees every party's labeled evidence and already produces
 * divergences without quoting anyone, so this rides on that instead of matching
 * phrases like "clearly" against "not sure" - which would fire on the wrong
 * thing and miss the politely-worded version, which is the common one.
 *
 * What must hold:
 *  1. The synthesis is INSTRUCTED never to quote either side, never to name who
 *     said what, and never to say which is right.
 *  2. The board only SHAPES what synthesis produced. It adds no detection, and
 *     it does not attribute the gap to a person.
 *  3. leadershipGaps is on the board whitelist deliberately - it is a gap, not an
 *     account - while the raw accounts and lead-only reads stay off it.
 */

function boardOnly() {
  return new BoardService({} as any) as any;
}

describe('GW-MGR-ALIGN-01: the synthesis is instructed to produce a gap, never a quote', () => {
  it('the schema offers only the four leadership dimensions', () => {
    const field = (REPORT_SCHEMA as any).input_schema.properties.leadershipGaps;
    expect(field).toBeDefined();
    expect(field.items.properties.dimension.enum.sort()).toEqual(
      ['ACCOUNTABILITY', 'CLARITY_OF_OWNERSHIP', 'CREDIT', 'UNADDRESSED_TENSION'],
    );
  });

  it('the schema tells the model not to quote or name (tripwire)', () => {
    const gapDesc = (REPORT_SCHEMA as any).input_schema.properties.leadershipGaps.items.properties.gap.description;
    expect(gapDesc).toMatch(/never quote/i);
    expect(gapDesc).toMatch(/never name who said what/i);
  });

  it('the synthesis rules carry the same instruction, so a schema-only edit cannot silently drop it', () => {
    expect(SYNTHESIS_RULES).toContain('SURFACE LEADERSHIP GAPS AS GAPS, NEVER AS QUOTES');
    expect(SYNTHESIS_RULES).toMatch(/NEVER quote either side/);
    expect(SYNTHESIS_RULES).toMatch(/NEVER name who said what/);
    expect(SYNTHESIS_RULES).toMatch(/NEVER say which is right/);
  });
});

describe('GW-MGR-ALIGN-02: the board shapes, it does not detect', () => {
  it('passes through what synthesis produced', () => {
    const reads = boardOnly().buildManagerAlignment({
      leadershipGaps: [
        {
          dimension: 'CLARITY_OF_OWNERSHIP',
          gap: 'One account describes ownership being set clearly; another describes still being unsure what they own.',
          note: 'Something can be set clearly and still not land.',
        },
      ],
    });
    expect(reads).toHaveLength(1);
    expect(reads[0].dimension).toBe(LeadershipDimension.CLARITY_OF_OWNERSHIP);
  });

  it('never attributes the gap to a person (tripwire)', () => {
    const reads = boardOnly().buildManagerAlignment({
      leadershipGaps: [{ dimension: 'ACCOUNTABILITY', gap: 'a gap', note: 'a note' }],
    });
    // The gap is BETWEEN two accounts. Naming whose it is would undo the point.
    expect(reads[0].managerName).toBeNull();
    expect(reads[0].managerParticipantId).toBe('');
  });

  it('produces nothing when synthesis found no gap', () => {
    expect(boardOnly().buildManagerAlignment({ leadershipGaps: [] })).toEqual([]);
    expect(boardOnly().buildManagerAlignment({})).toEqual([]);
    expect(boardOnly().buildManagerAlignment(null)).toEqual([]);
  });

  it('drops a malformed entry rather than rendering half of it', () => {
    const reads = boardOnly().buildManagerAlignment({
      leadershipGaps: [{ dimension: 'ACCOUNTABILITY' }, { gap: 'no dimension' }, { dimension: 'CREDIT', gap: 'ok' }],
    });
    expect(reads).toHaveLength(1);
    expect(reads[0].dimension).toBe('CREDIT');
  });
});

describe('GW-MGR-ALIGN-03: whitelist placement is deliberate', () => {
  it('leadershipGaps may cross to the board, because it is a gap and not an account', () => {
    expect(BOARD_WHITELIST as readonly string[]).toContain('leadershipGaps');
  });

  it('the lead-only reads still may not', () => {
    const safe = pickBoardSafeReportFields({
      leadershipGaps: [{ dimension: 'CREDIT', gap: 'g', note: 'n' }],
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
