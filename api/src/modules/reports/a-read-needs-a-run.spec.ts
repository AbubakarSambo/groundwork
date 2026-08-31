import { GroundMoment } from '@prisma/client';
import { isBaselineRound, withoutWhatOneRoundCannotShow, RUN_ONLY_FIELDS } from './a-read-needs-a-run';

/**
 * A REPORT MAY NOT CONCLUDE FROM A ROUND THAT HAS NOT HAPPENED YET.
 *
 * `concernFlags` and `hiddenContributors` both read a run. On the first session of a ground opened at
 * the start, there is no run: that session exists to agree what success would look like, so nothing
 * has been delivered by anyone. Nothing gated them, so a lead could be told a party's follow-through
 * was thin before that party had been asked to follow through on anything.
 *
 * The same rule is already stated once in this codebase, for the specificity trend: "under three
 * sessions there is no trend, only noise, and telling somebody their record is 'falling' off two
 * numbers is a verdict dressed as an observation."
 */
describe('what a single round cannot support', () => {
  describe('when it counts as a baseline', () => {
    it('the first completed session of a ground opened at the start', () => {
      expect(isBaselineRound({ moment: GroundMoment.STARTING, highestCompletedSession: 1 })).toBe(true);
    });

    it('and before anybody has completed one at all', () => {
      expect(isBaselineRound({ moment: GroundMoment.STARTING, highestCompletedSession: 0 })).toBe(true);
    });

    it('but not once a second session has actually completed', () => {
      expect(isBaselineRound({ moment: GroundMoment.STARTING, highestCompletedSession: 2 })).toBe(false);
    });

    it.each([GroundMoment.RECOGNITION, GroundMoment.RESOLUTION])(
      'and never on a ground opened %s, where the work already exists',
      (moment) => {
        /**
         * The absence only means "too early" where the product put the start of the work after the
         * start of the ground. A ground opened mid-way is asking about work that has been happening,
         * so a thin contribution there is a real read.
         */
        expect(isBaselineRound({ moment, highestCompletedSession: 1 })).toBe(false);
      },
    );

    it('and not when the moment is missing, which is the safe direction', () => {
      // An unknown moment must not silently suppress a real read.
      expect(isBaselineRound({ moment: null, highestCompletedSession: 1 })).toBe(false);
    });
  });

  describe('what it removes', () => {
    const engagement = {
      concernFlags: [{ label: 'the participant', observation: 'thinner follow-through' }],
      hiddenContributors: [{ label: 'Ade', evidence: 'named twice' }],
      coverage: 'thin',
      parties: [{ label: 'the initiator' }],
    };

    it('removes every field that reads a run', () => {
      const { engagement: out } = withoutWhatOneRoundCannotShow(engagement);
      for (const f of RUN_ONLY_FIELDS) expect(out).not.toHaveProperty(f);
    });

    it('and reports what it removed, so the removal is never silent', () => {
      const { removed } = withoutWhatOneRoundCannotShow(engagement);
      expect(removed.sort()).toEqual(['concernFlags', 'hiddenContributors']);
    });

    it('does not report removing something that was already empty', () => {
      // Otherwise the log claims a suppression on every baseline ground, and stops meaning anything.
      const { removed } = withoutWhatOneRoundCannotShow({ concernFlags: [], hiddenContributors: [] });
      expect(removed).toEqual([]);
    });

    it('keeps everything a single round genuinely supports', () => {
      const { engagement: out } = withoutWhatOneRoundCannotShow(engagement);
      expect(out.coverage).toBe('thin');
      expect(out.parties).toHaveLength(1);
    });

    it('does not mutate what it was given', () => {
      const input = { ...engagement };
      withoutWhatOneRoundCannotShow(input);
      expect(input).toHaveProperty('concernFlags');
    });
  });
});
