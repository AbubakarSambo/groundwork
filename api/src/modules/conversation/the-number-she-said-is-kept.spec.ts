import { readFileSync } from 'fs';
import { join } from 'path';
import { EXPECTATION_PROMPT, EXPECTATION_SCHEMA } from './prompt-library';

/**
 * "500 CONTRACTS, 150 EACH, AND I HAVE A TARGET OF 50", AND NOT ONE NUMBER WAS KEPT.
 *
 * A lead came to set targets for her team and track them. The aims were stored as names with
 * `target: null`, always, so her board read "No targets set yet, so there is nothing for this board
 * to measure progress against" and "Movement: not tracked" - about the figures she had just given
 * it. Nothing was being tracked because nothing had been kept.
 *
 * It also ran once per ground and never again, so a second objective named in session four was
 * dropped in silence.
 *
 * Pinned at the two places it was severed: the model is asked for the number, and the write keeps
 * it. Asserted on the prompt and the schema rather than a rendered board, because that is where the
 * figure was being discarded.
 */
describe('the number she said is kept', () => {
  const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const service = strip(readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8'));
  const write = service.slice(service.indexOf('const aims = (result.groundAims'));

  it('asks for the number, not only the name', () => {
    expect(EXPECTATION_PROMPT).toMatch(/- target: the NUMBER they are aiming at/);
    const aims = (EXPECTATION_SCHEMA as any).input_schema.properties.groundAims;
    expect(aims.items.type).toBe('object');
    expect(aims.items.properties).toHaveProperty('target');
    expect(aims.items.properties).toHaveProperty('by');
    /* The name is the only thing an aim cannot do without. */
    expect(aims.items.required).toEqual(['name']);
  });

  it('asks for the total, never what is done so far', () => {
    expect(EXPECTATION_PROMPT).toMatch(/Take the TOTAL they are aiming at, never what is done so far/);
    expect(EXPECTATION_PROMPT).toMatch(/"Nine of the forty are migrated" is a target of 40/);
  });

  it('and says a wrong number is worse than none', () => {
    expect(EXPECTATION_PROMPT).toMatch(/a wrong number is worse than none/);
  });

  it('writes the number rather than null', () => {
    expect(write).not.toMatch(/target: null,\s*sortOrder/);
    expect(write).toMatch(/target: a\.target/);
  });

  it('no longer refuses everything after the first aim', () => {
    expect(write).not.toMatch(/existing === 0/);
    expect(write).toMatch(/already\.has\(a\.name\.toLowerCase\(\)\)/);
  });

  it('never overwrites an aim that already exists, because that number may be theirs', () => {
    /* Only what is new is written. A conflict belongs on the board's accept-this prompt. */
    expect(write).toMatch(/const fresh = aims\.filter\(\(a\) => !already\.has/);
    expect(write).toMatch(/data: fresh\.map/);
  });

  it('refuses a number that is not a whole count of something', () => {
    expect(write).toMatch(/Number\.isFinite\(a\?\.target\)/);
    expect(write).toMatch(/> 0 \?/);
  });
});
