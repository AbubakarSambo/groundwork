/**
 * THE KIND OF WORK IS READ FROM THE CHECK-IN'S PURPOSE AND THE LEAD'S WORDS, NEVER THE PEOPLE'S JOB TITLES (Hafsah, 21 November 2026).
 * "The new stock system, four depots" (getting a new project off to a good start) and "Imani Hassan, first ninety days" (helping a new
 * hire get started) were read as "distribution operations" from an operations analyst's title and the word depots, so a rollout drew
 * an incidents board. The model is now told what the check-in is for, and that a purpose is not a kind of work.
 */
import { theSetupWords } from '../board/the-kind-of-work';
import { theClassifierPrompt } from '../entry/which-situation-this-is';
/* Changed 22 November 2026: the kind of work is read by the one reading (which-situation-this-is.ts), so these words are checked in its prompt; THE_KIND_OF_WORK_PROMPT is gone. */
const THE_KIND_OF_WORK_PROMPT = theClassifierPrompt('');

import { THE_SCENARIO_TABLE } from '../conversation/the-scenario-table';

describe('the kind of work is read from the purpose, not the job titles', () => {
  it('the words the model reads say what the check-in is for, and hold no job title', () => {
    const words = theSetupWords(
      { label: 'The new stock system, four depots', brief: 'Four depots are moving onto the new stock system. Two are on it.' },
      (THE_SCENARIO_TABLE as any).NEW_PROJECT.name,
    );
    expect(words).toContain('What the check-in is for: Get a new project off to a good start');
    expect(words).not.toMatch(/job title/i);
  });

  it('the model is told that a new hire, a plan or a new project is not a kind of work, and never to decide from the people\'s job titles', () => {
    expect(THE_KIND_OF_WORK_PROMPT).toContain('a new hire\'s first weeks, one person\'s plan, or getting a new project off to a good start');
    /* The people's job titles, never the lead's own words about herself: "founder here" is how a founder's own check-in is told (release test, 21 November, bug 110). */
    expect(THE_KIND_OF_WORK_PROMPT).toContain('Never decide from the job titles of the people in it');
    expect(THE_KIND_OF_WORK_PROMPT).toContain('what the lead says about themselves, such as "founder here", is the lead\'s own words and counts');
    expect(THE_KIND_OF_WORK_PROMPT).not.toContain('job titles, where they are given, help');
    /* Distribution operations is the day-to-day running of sites, and a project that changes how they work is not it. */
    expect(THE_KIND_OF_WORK_PROMPT).toContain('A project that changes how the sites work, such as moving them onto a new system, is not distribution operations');
  });
});
