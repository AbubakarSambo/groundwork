import { readFileSync } from 'fs';
import { ENGINE_RULES } from './prompt-library';
import { oneScriptOnly, theSituationSaysHowToOpen } from './one-script-per-conversation';

/**
 * TWO INTERVIEWS REACHED ONE CONVERSATION AND IT READ AS BEING ABOUT NOTHING.
 *
 * The real OKR pack, read from the live prompt table, is the fixture: 1,463 characters against a
 * base prompt of 120,932. That ratio is the reason a check-in did not follow the situation it was
 * set up for, and this is the cut that fixes it.
 */
const OKR_PACK = `MOMENT: OKR alignment across teams.

PURPOSE: Each person submits their own OKRs and shows how they connect to the company OKRs.

OPENING: Ask the person to name their top two or three objectives for this period. Do not ask them to recite the company OKRs back. Ask them to describe, in their own words, what they are trying to achieve and why it matters.

FOLLOW-UP: For each objective, ask what the key result looks like at the end of the period. What specific and observable thing will exist that would tell them, and anyone else who looks, that the objective was met?

ALIGNMENT CHECK: Ask how this objective connects to the company direction as they understand it, in whatever words their organisation uses for it.`;

describe('one script per conversation', () => {
  it('takes the general interview out when the situation says how to open', () => {
    expect(theSituationSaysHowToOpen(OKR_PACK)).toBe(true);
    const cut = oneScriptOnly(ENGINE_RULES, OKR_PACK);
    expect(cut.length).toBeLessThan(ENGINE_RULES.length);
    /* The sales opener is the one she was actually asked, in a check-in about targets. */
    expect(cut).not.toContain('closest to a decision');
  });

  it('and leaves everything that is not that interview exactly where it was', () => {
    const cut = oneScriptOnly(ENGINE_RULES, OKR_PACK);
    for (const kept of ['PUSHBACK RULES', 'BANNED WORDS', 'ONE QUESTION RULE', 'A CLAIM ABOUT A COLLEAGUE IS THEIRS']) {
      expect(cut).toContain(kept);
    }
  });

  it('says where it went, so an absence reads as deliberate', () => {
    const cut = oneScriptOnly(ENGINE_RULES, OKR_PACK);
    expect(cut).toContain('GOAL ALIGNMENT: the most important first conversation');
    expect(cut).toMatch(/its own opening and its own follow-ups, below/);
  });

  it('changes nothing at all when there is no situation prompt to defer to', () => {
    expect(oneScriptOnly(ENGINE_RULES, null)).toBe(ENGINE_RULES);
    expect(oneScriptOnly(ENGINE_RULES, '')).toBe(ENGINE_RULES);
    /* A pack too thin to steer anything is not a pack that says how to open. */
    expect(oneScriptOnly(ENGINE_RULES, 'MOMENT: a quick pulse check.')).toBe(ENGINE_RULES);
  });

  it('is wired into the prompt the entry chat actually builds', () => {
    const svc = readFileSync(`${__dirname}/../entry/entry.service.ts`, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '');
    expect(svc).toMatch(/oneScriptOnly\(ENGINE_RULES, scenarioPack\)/);
  });
});
