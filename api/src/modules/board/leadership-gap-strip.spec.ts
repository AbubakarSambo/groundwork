import { BoardService } from './board.service';
import { forbiddenNames } from '../reports/guide-sanitiser';

/**
 * THE BOARD'S NAME STRIP HAD TWO HOLES. BOTH ARE FIXED HERE.
 *
 * `managerAlignment` is the most consequential read on the board: a pattern in
 * how someone is LEADING, shown on a card every party can open. It has always
 * been enforced in code rather than requested of the model, and the comment there
 * says so. The enforcement was incomplete in two ways.
 *
 * ONE - ONLY `gap` WAS CHECKED, AND `note` RENDERS DIRECTLY BENEATH IT. This one
 * was live. A real record from the eighteen-ground run reads:
 *
 *   note: "The pattern of deferral is visible in the lead's record over time..."
 *
 * "the lead" is precisely what the party-label rule exists to stop, and it went
 * through untouched because the rule only ever looked at the other field.
 *
 * TWO - NEITHER FIELD WAS CHECKED AGAINST PARTICIPANT NAMES. The rule caught
 * "Party A" and "the lead" but not "Eric" - and a first name is the form a leak
 * actually takes. Across four real leadership gaps the model did write "One
 * account", so nothing had gone wrong yet; that was the prompt behaving, not a
 * guarantee. The same class of feature in this codebase produced "I want to
 * acknowledge Eric's consistent focus" under an equivalent instruction, which is
 * why the prompt is not treated as the control.
 *
 * The names come from `forbiddenNames`, deliberately reused rather than
 * reimplemented. It matches most names case-insensitively but collision-prone
 * ones case-sensitively, because Success, Grace, Blessing and Will are common
 * given names in this product's markets - and a case-insensitive strip would have
 * silently emptied this section on every board about a quarter's success.
 */

const NAMES = forbiddenNames([
  { firstName: 'Eric', lastName: 'Mensah', email: 'eric.mensah@meridian.test' },
  { firstName: 'Success', lastName: 'Obi', email: 'success.obi@meridian.test' },
]);

/** Drive the private read directly - it is where the guarantee lives. */
function build(gap: string, note: string, periods = 3) {
  const svc = Object.create(BoardService.prototype) as any;
  svc.logger = { warn: jest.fn() };
  const rows = svc.buildManagerAlignment(
    { leadershipGaps: [{ pattern: 'CONVERSATION_DEFERRED', gap, note, periods }] },
    NAMES,
  );
  return { rows, warn: svc.logger.warn as jest.Mock };
}

const CLEAN_GAP =
  'One account describes a series of key decisions being deferred across several weeks, while other accounts are silent on the impact of the delay.';
const CLEAN_NOTE =
  'This pattern can create uncertainty for a team waiting on direction, even when they are making progress in other areas.';

describe('a clean gap still renders', () => {
  it('passes both fields through unchanged', () => {
    // Verbatim from a real record, so the strip cannot be "safe" by rejecting
    // everything.
    const { rows } = build(CLEAN_GAP, CLEAN_NOTE);
    expect(rows).toHaveLength(1);
    expect(rows[0].gap).toBe(CLEAN_GAP);
    expect(rows[0].note).toBe(CLEAN_NOTE);
  });

  it('is not attributed to anyone', () => {
    const { rows } = build(CLEAN_GAP, CLEAN_NOTE);
    expect(rows[0].managerName).toBeNull();
    expect(rows[0].managerParticipantId).toBe('');
  });
});

describe('the note is checked, not just the gap', () => {
  it('drops the real record whose NOTE says "the lead"', () => {
    // THE LIVE BUG. This note is verbatim from the eighteen-ground run.
    const { rows, warn } = build(
      'One account describes decisions regarding scope, budget and reporting lines being deferred across five sessions, while the other account contains no information.',
      "The pattern of deferral is visible in the lead's record over time, but its effect on the other party is unknown because their record is empty.",
    );
    expect(rows).toHaveLength(0);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('note identifies a party by role'));
  });

  it('drops a note that names a participant', () => {
    const { rows, warn } = build(CLEAN_GAP, 'Eric has carried this decision for three sessions.');
    expect(rows).toHaveLength(0);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('note names a participant'));
  });

  it('drops a note that quotes someone', () => {
    const { rows } = build(CLEAN_GAP, 'One account called it "a moving target".');
    expect(rows).toHaveLength(0);
  });
});

describe('names, not only role labels', () => {
  it('drops a gap naming a participant - what the old rule missed', () => {
    const { rows, warn } = build('Eric has deferred the scope decision for three sessions.', CLEAN_NOTE);
    expect(rows).toHaveLength(0);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('gap names a participant'));
  });

  it('drops a possessive form, which is how it leaked elsewhere', () => {
    const { rows } = build("Eric's decisions have been outstanding for three sessions.", CLEAN_NOTE);
    expect(rows).toHaveLength(0);
  });

  it('still drops the role labels it always caught', () => {
    for (const text of ['Party A has deferred the decision.', 'The lead has deferred the decision.']) {
      expect(build(text, CLEAN_NOTE).rows).toHaveLength(0);
    }
  });
});

describe('a participant called Success does not empty the board', () => {
  it('keeps a gap containing the ordinary word', () => {
    // Case-insensitive matching would drop this, and with it every leadership
    // read on any ground where someone is called Success - which is the failure
    // mode the case-sensitivity rule exists for.
    const { rows } = build(
      'One account measures success by a list of completed tasks, while another measures it by a delivered outcome.',
      'The two definitions of success have not been reconciled across three sessions.',
    );
    expect(rows).toHaveLength(1);
  });

  it('still drops the capitalised name', () => {
    expect(build('Success has deferred the scope decision.', CLEAN_NOTE).rows).toHaveLength(0);
  });
});

describe('contractions are not quotations', () => {
  it('keeps a note with TWO contractions - one is not enough to reproduce it', () => {
    // The bug needs a PAIR of apostrophes: the first opens a match, the second
    // closes it. My first version of this test used one contraction and one
    // possessive, and the possessive-only carve-out neutralised the possessive,
    // leaving a single apostrophe and no match - so the test passed against the
    // broken code and proved nothing. Found by bite-checking it.
    const { rows } = build(
      CLEAN_GAP,
      "It isn't clear whose call this is, and the work that's waiting on it hasn't moved.",
    );
    expect(rows).toHaveLength(1);
  });

  it('keeps the gap field too, with the same shape of text', () => {
    const { rows } = build(
      "One account isn't sure whose call this is, and says the work that's blocked hasn't moved in three sessions.",
      CLEAN_NOTE,
    );
    expect(rows).toHaveLength(1);
  });
});

describe('the filter covers model output, not our own copy', () => {
  it('does not reject the pattern map\'s own fallback reason', () => {
    // spec.why is hand-written and says "the manager stays the bottleneck" - a
    // generic role in an explanation, not an identification. Filtering it made the
    // board drop every gap that fell back to it, which is a filter rejecting the
    // product's own words. Found when this change broke an existing test.
    const svc = Object.create(BoardService.prototype) as any;
    svc.logger = { warn: jest.fn() };
    const rows = svc.buildManagerAlignment(
      { leadershipGaps: [{ pattern: 'WORK_NOT_HANDED_OVER', gap: CLEAN_GAP, note: undefined, periods: 3 }] },
      NAMES,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].note).toContain('the manager stays the bottleneck');
  });

  it('still filters a model note that uses the same words', () => {
    // The carve-out is for OUR copy, not for that phrasing. A model writing "the
    // manager" is identifying a party and is still dropped.
    const { rows } = build(CLEAN_GAP, 'The manager has held this decision for three sessions.');
    expect(rows).toHaveLength(0);
  });
});

describe('the three-period rule still holds', () => {
  it('drops a single-period pattern however clean it is', () => {
    // One period is not a pattern, and this is the most consequential read on
    // the board.
    expect(build(CLEAN_GAP, CLEAN_NOTE, 1).rows).toHaveLength(0);
  });
});
