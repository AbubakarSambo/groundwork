import { readFileSync } from 'fs';
import { join } from 'path';
import { PartyType, GroundScenario } from '@prisma/client';
import { buildScenarioPackForParty, ENGINE_RULES } from './prompt-library';

/**
 * A SESSION THAT ENDS ON A DIAGNOSIS IS A SESSION THE NEXT ONE CANNOT READ.
 *
 * Read back from a real check-in. It established that a prototype was fear-based, that three weeks
 * were lost, and that nobody had ever written a brief - and closed with no commitment, no owner and
 * no date. The whole shape of this product is an objective agreed at the start and a run of
 * check-ins testing work against it. A session with nothing testable in it breaks the second half,
 * and every session in that run would have broken it the same way.
 *
 * TWO HALVES, AND THE STRUCTURAL ONE MATTERS MORE.
 *
 * The prompt now has to get one thing the person will do before it closes. But an instruction only
 * produces the sentence; something has to keep it. `writeTheirOwnPromises` already did that - for
 * participants only. A lead's session went to EXPECTATION_PROMPT, whose rules forbid the speaker
 * writing anything about themselves, correctly, because its job is what they expect OF OTHERS.
 *
 * So the one person whose own next step nobody recorded was the person running the check-in. In that
 * same session the lead said "I have not told him, and that is on me", the conversation called it
 * the most important fact established, and it went down as an observation about the situation rather
 * than as anything he owed.
 */
const RULES = ENGINE_RULES;
const SERVICE = readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8')
  /* Comments out: the note beside the change quotes these lines, and a guard a comment satisfies is
     not a guard. */
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

describe('something the next session can test', () => {
  it('is required before the session closes', () => {
    expect(RULES).toMatch(/SOMETHING THE NEXT SESSION CAN TEST - required/);
    expect(RULES).toContain('what will you do about this, and by when?');
  });

  it('and comes before the close marker, which is the thing it gates', () => {
    expect(RULES.indexOf('SOMETHING THE NEXT SESSION CAN TEST')).toBeLessThan(
      RULES.indexOf('SESSION CLOSE MARKER'),
    );
  });

  it('refuses an outcome in place of an action, once', () => {
    /* "She needs to change it" is what they want, not what they will do - and it is the answer that
       comes back, because it is easier to say. Asked again once, then dropped. */
    expect(RULES).toMatch(/IF THEY NAME AN OUTCOME RATHER THAN AN ACTION/);
    expect(RULES).toMatch(/What is the first thing you do towards it, and when\?/);
  });

  it('takes "nothing" for an answer rather than pressing a third time', () => {
    /* A record built by demanding commitments is a record of commitments people did not mean. */
    expect(RULES).toMatch(/IF THEY GENUINELY HAVE NOTHING, record that plainly and close anyway/);
    expect(RULES).toMatch(/never turn a vague intention into a deadline/);
  });

  it('and never invents the date', () => {
    /* Whitespace-tolerant: the prompt is wrapped prose, so this phrase straddles a line break and
       a literal match would fail on formatting rather than on the rule going missing. */
    expect(RULES).toMatch(/never invent a\s+date they did not say/i);
  });

  it('asks it of the lead too, which is where it was always missing', () => {
    expect(RULES).toMatch(/THIS IS ASKED OF EVERYONE, INCLUDING THE PERSON WHO SET THE CHECK-IN UP/);
  });
});

describe('and the answer is actually kept', () => {
  it('writes the lead’s own promises, not only a participant’s', () => {
    /*
     * THE STRUCTURAL HALF. Without this the prompt asks a good question and the answer lands
     * nowhere - which is the failure mode this codebase has watched several times: a rule that
     * exists, is followed, and is then dropped by the thing downstream of it.
     */
    const calls = SERVICE.match(/this\.writeTheirOwnPromises\(/g) ?? [];
    expect(calls.length).toBe(2);
    /* 3 November 2026: the lead's are written at the same time as her expectations of others, and still waited for. */
    expect(SERVICE).toMatch(/await herOwnPromises;/);
  });

  it('and still keeps expectations of others separate from promises of your own', () => {
    /* Different things about different people, stored differently. A lead has both. */
    expect(SERVICE).toMatch(/EXPECTATION_PROMPT/);
    expect(SERVICE).toMatch(/OWN_PROMISE_PROMPT/);
  });

  it('on a scenario pack that already asks for the person’s own part', () => {
    /* The standard-before-the-gap work put "what did you do, or not do" into the gap-shaped packs.
       A commitment at the close is the other end of the same idea: their part, going forwards. */
    const drift = buildScenarioPackForParty(GroundScenario.DRIFT, PartyType.INITIATOR, null);
    expect(drift).toContain('What did you do, or not do, that helped get it here?');
  });
});
