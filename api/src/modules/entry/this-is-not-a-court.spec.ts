/**
 * THIS IS NOT A COURT.
 *
 * Setting up a check-in, the product told her: "you go into your own check-in, where you set the
 * context and give your side of it." Her reply, typed into the running product:
 *
 *   "my side of it, it sounds like a court, why does it have to be my side, i am just setting the
 *   context"
 *
 * She is right, and the frame was everywhere. Sides, parties, putting things on record, the other
 * party's independent account - the vocabulary of a dispute between two people who have lawyered
 * up. Most of what this is used for is a team getting an honest read on something: a new hire
 * settling in, a handover, a plan nobody has checked against reality. A person describing what
 * they are tracking is not defending a position, and telling them they have a "side" invents an
 * opponent they did not have when they arrived.
 *
 * The record is still a record and the report still says where people differ. What goes is the
 * courtroom staging around it.
 *
 * Held on the prompts because the prompt is what the person actually hears - the model says these
 * words to somebody in their first two minutes, and nothing else in the codebase reads them.
 */
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const HERE = __dirname;
/** Every file in the entry module: this is the first conversation anybody has with the product. */
const sources = readdirSync(HERE)
  .filter((f) => f.endsWith('.ts') && !f.endsWith('.spec.ts'))
  .map((f) => ({ file: f, text: readFileSync(join(HERE, f), 'utf8') }));

/** Comments explain the rule and quote the old wording, so they are stripped before checking. */
const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const COURTROOM = [
  /\byour side\b/i,
  /\bthe other party\b/i,
  /\bboth parties\b/i,
  /\bopposing\b/i,
  /\btestimony\b/i,
  /\bthe defendant\b/i,
];

describe('the words a person meets in their first two minutes', () => {
  it.each(COURTROOM.map((r) => [String(r), r] as const))('never use %s', (_label, pattern) => {
    /* The anchor invitation is Hafsah's own wording (docs/anchor-scenario.md section 14: "Groundwork now wants to
       understand your side too"; decision 94: built almost verbatim). It is a friendly invitation, not a dispute. */
    const found = sources
      .filter((s) => !(String(pattern) === String(/\byour side\b/i) && s.file === 'the-anchor-people-step.ts'))
      .filter((s) => pattern.test(strip(s.text)))
      .map((s) => s.file);
    expect(found).toEqual([]);
  });

  it('and the sentence that started this says how it is going, not whose side it is', () => {
    const entry = readFileSync(join(HERE, 'entry.service.ts'), 'utf8');
    expect(entry).toContain('where you set the context and say how it is going');
  });

  it('the rule is written down where the next person to edit the prompt will read it', () => {
    /*
     * A banned-words list nobody can find gets argued with, so the reason sits in the prompt
     * itself. It states the rule WITHOUT using the phrase - a prohibition that has to quote the
     * thing it forbids cannot be told apart from the thing it forbids by any check like this one.
     */
    const entry = readFileSync(join(HERE, 'entry.service.ts'), 'utf8');
    expect(entry).toMatch(/AND NEVER FRAME IT AS TAKING A SIDE/);
  });
});
