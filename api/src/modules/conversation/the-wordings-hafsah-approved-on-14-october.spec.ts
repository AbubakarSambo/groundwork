import { readFileSync } from 'fs';
import { join } from 'path';
import { ENGINE_RULES, WHO_ARE_YOU_IN_THIS, SEED_PROMPTS } from './prompt-library';
import { theQuestionAboutTheNumbers } from './the-numbers-do-not-meet';
import { THE_FIRST_QUESTION, theSetupPackFor } from '../entry/the-first-question-for-this-situation';

/**
 * HAFSAH'S ANSWERS ON THE QUESTION WORDING (fix list, item 7, 14 October 2026; docs/question-wording.md). Her yes to the
 * proposed first questions, "Who do you need to get on the same page with, and what do you think you each see
 * differently?" for realigning a team, the plainer wordings inside check-ins that keep exactly the same meaning, and
 * removing the setup openers nobody reached. Each is pinned where the model is given it, and the old words are gone.
 */
const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('the first question for each situation, as Hafsah approved it', () => {
  it.each([
    ['TEAM_UPDATES', 'What is the one thing you want to ask them? They will answer exactly what you write.'],
    ['CONTRACT_REVIEW', 'What are you about to sign, and who is it with?'],
    ['WORKPLAN_BUDGET', 'What is the plan for, and what money and people do you actually have for it?'],
    ['BOARD_STRATEGY', 'Who is on the leadership team, and what is the big question you have to decide?'],
    ['OPEN_READ', 'What is going on? Tell me in your own words. A couple of sentences is enough.'],
    ['REALIGN_TEAM', 'Who do you need to get on the same page with, and what do you think you each see differently?'],
  ])('%s', (scenario, ask) => {
    expect((THE_FIRST_QUESTION as any)[scenario].ask).toBe(ask);
    expect(theSetupPackFor(scenario as any)).toContain(ask);
  });
  it('a group starting', () => {
    expect(theSetupPackFor('COHORT_CHECK' as any, 'STARTING' as any)).toContain('Who is starting, and what are they each starting on?');
  });
});

describe('the plainer wordings inside a check-in, with the same meaning', () => {
  it('reach the rulebook the model is given, and the old words are gone', () => {
    for (const now of [
      '"Before we finish, what will you do about this, and by when?"',
      'Over what time? The next few weeks, this quarter, or the year?',
      '"Is anything you need waiting on someone else right now?"',
      '"Is what was agreed here written down anywhere, for example in a message, a brief or a note?"',
      '"Which of your conversations is closest to a decision right now?"',
    ]) expect(ENGINE_RULES).toContain(now);
    for (const old of ['Before we close: what will you do', 'Over what timeframe - the next', "blocked on someone else right now", 'captures what was agreed here', 'most advanced conversation you have']) {
      expect(ENGINE_RULES).not.toContain(old);
    }
  });
  it('the stored rulebook the product seeds is the same new text', () => {
    const system = (SEED_PROMPTS as any[]).find((p) => p.key === 'system');
    expect(system.content).toContain('"Before we finish, what will you do about this, and by when?"');
  });
  it('the first line to a person in a starting check-in', () => {
    expect(WHO_ARE_YOU_IN_THIS).toBe('Before anything else, so I ask you the right things: is this check-in about you, or do you work alongside the person it is about? One line is enough.');
  });
  it('the question about two numbers that do not meet', () => {
    expect(theQuestionAboutTheNumbers({ theirs: 12000, objective: 400000, objectiveName: 'grants' })).toBe(
      'This check-in is aiming at 400,000. You said 12,000. Is that your own part of it, or is the 400,000 something else?',
    );
  });
  it('who else is part of it, in setup', () => {
    const entry = strip(readFileSync(join(__dirname, '..', 'entry', 'entry.service.ts'), 'utf8'));
    expect(entry).toContain('"Who else is part of this? It can be a person, a team or another department."');
    expect(entry).not.toContain('Who else is part of this - a person');
  });
  it('the setup openers nobody reached are gone', () => {
    const entry = strip(readFileSync(join(__dirname, '..', 'entry', 'entry.service.ts'), 'utf8'));
    expect(entry).not.toContain('SCENARIO_OPENERS');
    expect(entry).not.toContain('Good moment to use Groundwork');
  });
});
