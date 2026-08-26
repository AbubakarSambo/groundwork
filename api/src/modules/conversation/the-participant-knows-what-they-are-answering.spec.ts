import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * "THE PARTICIPANT SESSION DOES NOT TELL THEM WHAT THEY HAVE BEEN INVITED TO CHECK IN AGAINST,
 *  SO THEY COME IN AND JUST FREESTYLE." Hafsah, from a live run.
 *
 * A person arrives by invite link, is asked "what did you understand your role in this to be", and
 * is shown nothing: not the subject, not the objectives, not who set it up. The report is then
 * built on that answer.
 *
 * This is not a presentation problem. `an-objective-nobody-has-seen.spec.ts` already states the
 * rule: "reading a person against a target they have never seen is the definition of an unfair
 * review, and the fact that the product would be doing it silently makes it worse rather than
 * better." `PersonObjective` carries a `seenBySubject` flag for exactly this reason - and nothing
 * showed the objective to the subject, so that flag could never honestly become true.
 */
const SERVICE = readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8');
const CODE = SERVICE.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const OPEN = CODE.slice(CODE.indexOf('async open(checkInId'), CODE.indexOf('async sendMessage('));

describe('opening a check-in returns what it is about', () => {
  it('the ground lookup asks for the subject and the objectives', () => {
    /** The same query that already ran for the status gate, so this costs no extra round trip. */
    expect(OPEN).toMatch(/label: true/);
    expect(OPEN).toMatch(/objectives: \{ select: \{ name: true, target: true \}/);
  });

  it('BOTH return paths carry the brief, not just a first open', () => {
    /**
     * The method returns in two places - one for a check-in being resumed with an AI turn already
     * on record, one for a fresh open. A brief on only the fresh path would mean anybody coming
     * back to finish their check-in loses the thing they were answering against, which is the
     * likelier case for a person who was invited and left it for a day.
     */
    const returns = OPEN.match(/return \{ reply:[^;]*;/g) ?? [];
    expect(returns.length).toBe(2);
    for (const r of returns) expect(r).toContain('brief: this.briefFor(ground)');
  });

  it('the brief carries the subject and the objectives', () => {
    expect(CODE).toMatch(/subject: ground\.label \?\? null/);
    expect(CODE).toMatch(/objectives: ground\.objectives \?\? \[\]/);
  });
});

describe('and it carries NOTHING anybody else said', () => {
  it('the brief is built from the ground, never from a participant or a check-in', () => {
    /**
     * THE GUARD THAT MATTERS MOST HERE. The whole reason the answers are worth having is that
     * nobody reads anybody else's. A brief that leaked one party's words to another to give them
     * "context" would break that in the one place a person is most likely to be influenced by it -
     * immediately before they answer.
     */
    const brief = CODE.slice(CODE.indexOf('private briefFor('), CODE.indexOf('async open(checkInId'));
    /**
     * Word-bounded. My first version tested `.toLowerCase().includes('turn')` and failed on the
     * word `return`, which is a test finding its own scaffolding rather than a defect.
     */
    for (const forbidden of ['recordEntry', 'conversationTurn', 'participant', 'report', 'answer']) {
      expect(brief).not.toMatch(new RegExp(`\\b${forbidden}`, 'i'));
    }
  });

  it('and returns null rather than inventing a brief for a ground it could not read', () => {
    expect(CODE).toMatch(/if \(!ground\) return null;/);
  });
});
