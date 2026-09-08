import {
  onlyWhatThisReaderMaySee, onlyHandoffsTheyAreIn, WHY_YOU_ONLY_SEE_YOURSELF,
} from './the-board-keeps-the-same-wall';
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

  it('works the rule out the same way the ground does', () => {
    expect(SRC).toMatch(/const evaluative = \[BoardFamily\.EVALUATION, BoardFamily\.COHORT\]\.includes\(family\)/);
    expect(SRC).toMatch(/peersVisibleToEachOther \?\? !evaluative/);
  });

  it('and never hides anything from whoever runs the check-in', () => {
    expect(SRC).toMatch(/const runsThisGround =[\s\S]{0,200}isInitiator \|\| isSetupAdmin/);
    expect(SRC).toMatch(/viewer\?\.role === 'ADMIN' && viewer\.organizationId/);
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
