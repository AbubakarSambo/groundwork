import { readFileSync } from 'fs';
import { join } from 'path';
import { EXPECTATION_PROMPT, EXPECTATION_SCHEMA, READ_THE_AIMS } from './prompt-library';
import { THE_ASSESSMENT_PROMPT, THE_ASSESSMENT_SCHEMA } from './the-assessment';

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
  /* The aims are read by the conversation's assessment now (one source, 2 November 2026) and kept by keepTheTeamsAims. */
  const write = service.slice(service.indexOf('const aims = said'));

  it('asks for the number, not only the name', () => {
    expect(THE_ASSESSMENT_PROMPT).toContain(READ_THE_AIMS);
    expect(READ_THE_AIMS).toMatch(/- target: the NUMBER they are aiming at/);
    const aims = (THE_ASSESSMENT_SCHEMA as any).input_schema.properties.targets;
    expect(aims.items.type).toBe('object');
    expect(aims.items.properties).toHaveProperty('target');
    expect(aims.items.properties).toHaveProperty('by');
    expect(aims.items.properties).toHaveProperty('aim');
    /* And the expectations read no longer reads the aims a second time. */
    expect((EXPECTATION_SCHEMA as any).input_schema.properties).not.toHaveProperty('groundAims');
  });

  it('asks for the total, never what is done so far', () => {
    expect(READ_THE_AIMS).toMatch(/Take the TOTAL they are aiming at, never what is done so far/);
    expect(READ_THE_AIMS).toMatch(/"Nine of the forty are migrated" is a target of 40/);
  });

  it('and says a wrong number is worse than none', () => {
    expect(READ_THE_AIMS).toMatch(/a wrong number is worse than none/);
  });

  it('writes the number rather than null', () => {
    expect(write).not.toMatch(/target: null,\s*sortOrder/);
    expect(write).toMatch(/target: a\.target/);
  });

  it('no longer refuses everything after the first aim', () => {
    expect(write).not.toMatch(/existing === 0/);
  });

  it('never overwrites an aim that already exists, because that number may be theirs', () => {
    /*
     * Only what is new is written. A conflict belongs on the board's accept-this prompt.
     *
     * THE MATCH MOVED OUT OF THIS FILE AND THE RULE DID NOT. Matching on the name alone put
     * "units of tea sold in Abuja (10,000)" and "10,000 units (10,000)" on one board, as two
     * objectives, read off a participant's own screen. The same-name case it always handled is
     * still handled; `theAimsThatAreNew` owns both and has its own spec.
     */
    /* Request 117 (2): the aims now carry the figure in their own name first (theNumberInTheNameIsKept); the match is the same. */
    expect(write).toMatch(/const fresh = theAimsThatAreNew\(aimsWithTheirNumbers, existing as any, \(n\) => numbersInTheirWords\.has\(n\)\)/);
    expect(write).toMatch(/data: fresh\.map/);
  });

  it('refuses a number that is not a whole count of something', () => {
    expect(write).toMatch(/Number\.isFinite\(a\?\.target\)/);
    expect(write).toMatch(/> 0 \?/);
  });
});

/**
 * "150 EACH" IS THREE TARGETS WITH THREE OWNERS, NOT ONE.
 *
 * She said "500 contracts, daaa. and the sales linked to them", then "150 each and i have a target
 * of 50". Three people, three numbers, and what was stored was one aim with no figure on it at all.
 *
 * `ownerParticipantId` has been on the model the whole time, and
 * where-each-person-is-against-their-number.ts already renders progress per person. Nothing was
 * writing the rows.
 */
describe('a number said about one person is that person\'s', () => {
  const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const service = strip(readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8'));
  /* The write moved into one method both callers use - the spoken path and a sheet they attached. */
  const owned = service.slice(service.indexOf('private async putOwnedTargetsOnTheRecord('), service.indexOf('DO THE TWO VIEWS OF THIS PERSON'));

  it('asks for a number per person, and says to split "150 each"', () => {
    expect(EXPECTATION_PROMPT).toMatch(/- targetNumber: the NUMBER this particular person is aiming at/);
    expect(EXPECTATION_PROMPT).toMatch(/"150 each" said about three people is 150 for each of those three/);
    expect(EXPECTATION_PROMPT).toMatch(/A total for the whole group is the\s+team's aim, not one person's, and does not go here/);
  });

  it('keeps it on a key of its own rather than a second meaning on an existing one', () => {
    const ex = (EXPECTATION_SCHEMA as any).input_schema.properties.expectations.items.properties;
    expect(ex).toHaveProperty('targetNumber');
    /* The existing string `target` on this schema is a different field and keeps its meaning. */
    expect(ex.target.type).toBe('string');
    expect(ex.targetNumber.type).toBe('number');
  });

  it('writes it against the person who owns it', () => {
    expect(owned).toMatch(/ownerParticipantId: t\.participantId/);
    expect(owned).toMatch(/target: t\.target/);
  });

  it('does not duplicate one they restate, and never overwrites a number already on the board', () => {
    /* Matched by owner and by what the aim is about, not only its exact name (requests 109 b, 111 b): see
       one-aim-said-three-times-is-one-target.spec.ts for what a person reads. */
    expect(owned).toMatch(/theAimsThatAreNew\(\[aim\], theirOwn\)/);
    expect(owned).toMatch(/data: fresh\.map/);
  });

  it('and a failure here never stops the check-in being recorded', () => {
    expect(owned).toMatch(/\.catch\(/);
  });
});

/**
 * THE LEAD'S OWN NUMBER, AND ONE AIM PER THING SHE IS AFTER.
 *
 * Both of these were found by running her real transcript through the real extraction and reading
 * the rows, not by reading the code. Neither would have failed a test.
 *
 * First run: the 500 landed, the three 150s landed on three people, and "i have a target of 50" went
 * nowhere. Everything in that extraction is about OTHER people, so the lead - the person who set the
 * whole thing up - was the one participant whose number had no home.
 *
 * Same run: three ground-level aims, two with no number. "selling trucks to customers", "a contract
 * and money in the bank" and "500 contracts" are one objective getting sharper across three
 * sentences, and all three were written down.
 */
describe('the lead is a participant too', () => {
  it('asks for the number the speaker set for themselves', () => {
    expect(EXPECTATION_PROMPT).toMatch(/theirOwnTarget: the number the SPEAKER said they themselves are aiming at/);
    expect(EXPECTATION_PROMPT).toMatch(/"150 each and i have a target of 50" is 150 for each of the others and 50 for the speaker/);
    const props = (EXPECTATION_SCHEMA as any).input_schema.properties;
    expect(props.theirOwnTarget.required).toEqual(['name', 'target']);
  });

  it('and says a lead who sets none for themselves is normal, not a gap', () => {
    expect(EXPECTATION_PROMPT).toMatch(/A lead who sets targets for a team\s+and none for themselves is a normal thing and not a gap/);
  });

  it('writes it against the speaker, not the ground', () => {
    const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '');
    const service = strip(readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8'));
    expect(service).toMatch(/theirOwnNumbers\.push\(\{ participantId, name: own\.name\.trim\(\)/);
  });
});

describe('one aim per thing they are after', () => {
  it('is asked for, in the words it went wrong in', () => {
    expect(READ_THE_AIMS).toMatch(/ONE AIM PER THING THEY ARE AFTER, NOT ONE PER SENTENCE/);
    expect(READ_THE_AIMS).toMatch(/one aim getting sharper, not three aims/);
  });

  it('keeps the sharpest version rather than the first or the last', () => {
    expect(READ_THE_AIMS).toMatch(/Keep the sharpest version - the one with the number/);
    /* And does not collapse things that are genuinely different, which would lose a real objective. */
    expect(READ_THE_AIMS).toMatch(/Two aims that\s+are genuinely different stay as two/);
  });
});
