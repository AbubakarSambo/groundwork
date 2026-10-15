import type { TheRevealCounts, TheRevealSaid } from '../entry/the-anchor-served-shapes';
import { aNumber, capital } from './the-anchor-month-board';

/**
 * WHAT THE LEAD READS UNDER "THIS STARTED AS ONE CHECK-IN" (docs/anchor-scenario.md, section 29; 6 October).
 *
 * The spec's list is "3 projects that could benefit from their own Ground", and so on. The product's word for what a person opens is
 * "check-in", never "Ground", and a bare "0 projects" is not a sentence. So every line is a full sentence, a count of nothing is said as a
 * sentence about nothing, and a number up to ten is a word. The spec's own two lines are kept as they are: "During the month, Groundwork also
 * found" (said without the colon) and "Your team has already started building its Groundwork."
 *
 * THE SUITES LINE IS LEFT OUT until the number is really counted: it is fixed at nothing today, and every lead read "did not find a suite that fits".
 */
const one = (n: number, a: string, many: string) => (n === 1 ? a : many);

export function theRevealSaid(c: TheRevealCounts): TheRevealSaid {
  const projects = c.projectsThatCouldHaveTheirOwnGround;
  const aims = c.sharedObjectivesWorthTracking;
  const pairs = c.workingRelationshipsNeedingAlignment;
  const open = c.activeCommitments;
  const ideas = c.teamGeneratedIdeas;
  return {
    heading: 'This started as one check-in.',
    intro: 'During the month, Groundwork also found this.',
    lines: [
      projects === 0 ? 'Groundwork did not find a project that could have a check-in of its own.'
        : `Groundwork found ${aNumber(projects)} ${one(projects, 'project that could have a check-in of its own', 'projects that could have a check-in of their own')}.`,
      aims === 0 ? 'Groundwork did not find a shared objective worth tracking.'
        : `Groundwork found ${aNumber(aims)} ${one(aims, 'shared objective', 'shared objectives')} worth tracking.`,
      pairs === 0 ? 'Groundwork did not find a working relationship that needs aligning.'
        : `Groundwork found ${aNumber(pairs)} ${one(pairs, 'working relationship that needs', 'working relationships that need')} aligning.`,
      open === 0 ? 'Nothing that people said they would do is still open.'
        : `${capital(aNumber(open))} ${one(open, 'thing somebody said they would do is', 'things people said they would do are')} still open.`,
      ideas === 0 ? 'No idea from your team was captured.'
        : `${capital(aNumber(ideas))} ${one(ideas, 'idea', 'ideas')} from your team ${one(ideas, 'was', 'were')} captured.`,
    ],
    closing: 'Your team has already started building its Groundwork.',
  };
}
