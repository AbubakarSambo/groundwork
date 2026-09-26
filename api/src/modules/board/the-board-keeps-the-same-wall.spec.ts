import {
  onlyWhatThisReaderMaySee, onlyHandoffsTheyAreIn, WHY_YOU_ONLY_SEE_YOURSELF,
} from './the-board-keeps-the-same-wall';
import { GroundScenario } from '@prisma/client';
import { peersAreNamedOn } from '../reports/peers-are-named';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * THE BOARD GAVE AWAY WHAT THE CHECK-IN WAS HIDING.
 *
 * On an evaluation-family ground people give their accounts without seeing each other, and
 * `grounds.service` enforces it by filtering the other parties out of the payload. Driven on a real
 * twelve-session sales cohort, one hire's check-in page came back with exactly one participant -
 * herself - and her team board came back with every colleague's name, remit and performance read:
 * "Nothing checkable since session 5." On a cohort whose purpose was the lead deciding who to keep.
 */
const ROWS = [
  { participantId: 'me', name: 'Lola' },
  { participantId: 'them', name: 'Seyi' },
  { participantId: null, name: 'nobody' },
];

describe('what a party may see of other people on the board', () => {
  it('keeps everything when the ground does not hide peers', () => {
    expect(onlyWhatThisReaderMaySee(ROWS, { peersHidden: false, meParticipantId: 'me' })).toHaveLength(3);
  });

  it('and only their own row when it does', () => {
    const kept = onlyWhatThisReaderMaySee(ROWS, { peersHidden: true, meParticipantId: 'me' });
    expect(kept?.map((r) => r.name)).toEqual(['Lola']);
  });

  /** A row about nobody in particular is not a row about somebody else - and it still goes, because
      an unattributed person-row cannot be shown to be the reader's own. */
  it('and drops rows it cannot attribute rather than guessing', () => {
    const kept = onlyWhatThisReaderMaySee(ROWS, { peersHidden: true, meParticipantId: null });
    expect(kept).toEqual([]);
  });

  it('leaves an absent section absent rather than inventing an empty one', () => {
    expect(onlyWhatThisReaderMaySee(undefined, { peersHidden: true, meParticipantId: 'me' })).toBeUndefined();
  });

  /** A handoff names two people; being one of them makes it a fact about your own work. */
  it('keeps a handoff the reader is either end of, and no others', () => {
    const deps = [
      { fromParticipantId: 'me', onParticipantId: 'them' },
      { fromParticipantId: 'them', onParticipantId: 'me' },
      { fromParticipantId: 'them', onParticipantId: 'other' },
    ];
    const kept = onlyHandoffsTheyAreIn(deps, { peersHidden: true, meParticipantId: 'me' });
    expect(kept).toHaveLength(2);
  });
});

describe('the board applies it, and says so', () => {
  const SRC = readFileSync(join(__dirname, 'board.service.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  /*
   * THIS USED TO ASSERT THAT THE BOARD HELD ITS OWN COPY OF THE RULE, word for word, and that is
   * what it was checking rather than what it wanted. The want is in its own name: the board and
   * the ground must reach the same answer. Three services held that copy and the conversation -
   * the one that speaks out loud - held none, so it named a colleague on a PIP in the next
   * question after the board had withheld the name.
   *
   * There is one copy now, in reports/peers-are-named.ts, and this checks that the board calls it
   * and that the copy still says what it always said. A regexp over the board's own source cannot
   * do that second half any more, so the rule is exercised rather than read.
   */
  it('works the rule out the same way the ground does, from the one copy of it', () => {
    expect(SRC).toMatch(/const peersVisible = peersAreNamedOn\(ground as any\)/);
    /* A PIP hides peers from each other; an ordinary check-in does not; the lead's answer wins either way. */
    expect(peersAreNamedOn({ scenario: GroundScenario.PIP, peersVisibleToEachOther: null })).toBe(false);
    expect(peersAreNamedOn({ scenario: GroundScenario.COHORT_CHECK, peersVisibleToEachOther: null })).toBe(false);
    expect(peersAreNamedOn({ scenario: GroundScenario.NEW_HIRE, peersVisibleToEachOther: null })).toBe(true);
    expect(peersAreNamedOn({ scenario: GroundScenario.PIP, peersVisibleToEachOther: true })).toBe(true);
    expect(peersAreNamedOn({ scenario: GroundScenario.NEW_HIRE, peersVisibleToEachOther: false })).toBe(false);
  });

  it('and never hides anything from whoever runs the check-in', () => {
    expect(SRC).toMatch(/const runsThisGround =[\s\S]{0,200}isInitiator \|\| isSetupAdmin/);
    /* Through the one rule (grounds/who-may-read-this-check-in.ts), which asks the role in THIS organisation. */
    expect(SRC).toMatch(/adminsThisOrg\(viewer, ground as any\)/);
    expect(SRC).toMatch(/peersHidden: !peersVisible && !runsThisGround/);
  });

  /**
   * EVERY PER-PERSON SECTION, and the list is the guard: a section added later is walled by being
   * added here rather than by whoever writes it remembering the rule exists.
   */
  it('walls every section that names a person', () => {
    for (const section of ['contribution', 'coverage', 'whoOwnsWhat', 'managerAlignment', 'patterns']) {
      const walled = new RegExp(`out\\.${section} = onlyWhatThisReaderMaySee\\(out\\.${section} as any, whoMaySee\\)`).test(SRC);
      expect({ section, walled }).toEqual({ section, walled: true });
    }
    expect(SRC).toMatch(/out\.dependencies = onlyHandoffsTheyAreIn/);
    expect(SRC).toMatch(/rows: onlyWhatThisReaderMaySee\(\(out\.checkInGrid as any\)\.rows, whoMaySee\)/);
  });

  /** The aggregate is the point of a board and stays: it names nobody. */
  it('and leaves the aggregate alone', () => {
    for (const section of ['quickRead', 'divergence', 'phaseSpine']) {
      expect(SRC).not.toMatch(new RegExp(`out\\.${section} = onlyWhatThisReaderMaySee`));
    }
  });

  it('and tells the reader why the board is shorter', () => {
    expect(SRC).toContain('out.whyYouOnlySeeYourself = WHY_YOU_ONLY_SEE_YOURSELF');
    expect(WHY_YOU_ONLY_SEE_YOURSELF).toContain('shows only you');
    expect(WHY_YOU_ONLY_SEE_YOURSELF).toContain('is the same for all of you');
  });
});
