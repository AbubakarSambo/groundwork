/**
 * THE FLOOR IS UNDER EVERYBODY, INCLUDING PEOPLE WHOSE JOB WE NEVER MAPPED.
 *
 * UNIVERSAL_PROBES was written so that somebody in an unmapped role "still gets read fairly" - its
 * own header says the modes are the floor, not the job buckets. Nothing ever imported it. And
 * buildRoleProbeBlock returned an empty string the moment there was no role map, so a person in an
 * unmapped role got a check-in with no probing in it at all: the vaguer the answer, the less the
 * product had to say back.
 *
 * That is the shape of "the questions seem unproductive". Ten functions are mapped; every job that
 * is not one of them - and every person whose function has not been read confidently yet, which is
 * everybody in session one - was falling through.
 */
import { buildRoleProbeBlock, UNIVERSAL_PROBES, UniversalMode, RoleFunction } from './role-maps';
import { detectUniversalModes } from './function-detection';

describe('somebody whose job we never mapped', () => {
  it('still gets asked something', () => {
    const block = buildRoleProbeBlock(null, null, [UniversalMode.VAGUENESS]);
    expect(block).not.toBe('');
    expect(block).toContain(UNIVERSAL_PROBES[UniversalMode.VAGUENESS]);
  });

  it('and gets nothing invented when their account gave nothing to read', () => {
    expect(buildRoleProbeBlock(null, null, [])).toBe('');
  });

  it('is never told what shape their answer was', () => {
    /* Naming the mode to the person turns a question about the work into an accusation. */
    const block = buildRoleProbeBlock(null, null, [UniversalMode.AVOIDANCE, UniversalMode.VAGUENESS]);
    expect(block).toMatch(/NEVER name the shape itself/);
    expect(block).not.toMatch(/\bAVOIDANCE\b|\bVAGUENESS\b/);
  });
});

describe('somebody whose job we did map', () => {
  it('gets the role block and the floor, because vagueness is not only an unmapped habit', () => {
    const block = buildRoleProbeBlock(RoleFunction.SALES, 0.9, [UniversalMode.NON_COMMITMENT]);
    expect(block).toMatch(/READING THIS PERSON'S WORK IN ITS OWN TERMS/);
    expect(block).toContain(UNIVERSAL_PROBES[UniversalMode.NON_COMMITMENT]);
  });

  it('and the role block alone when there was no shape to read', () => {
    const block = buildRoleProbeBlock(RoleFunction.SALES, 0.9, []);
    expect(block).toMatch(/READING THIS PERSON'S WORK IN ITS OWN TERMS/);
    expect(block).not.toMatch(/HOW THIS ACCOUNT IS SHAPED/);
  });
});

describe('what the shape reader actually catches', () => {
  it('a check-in made of generalities', () => {
    const modes = detectUniversalModes(['several things are going well, a few bits on track, some progress, lots of good stuff']);
    expect(modes).toContain(UniversalMode.VAGUENESS);
  });

  it('and a decision that keeps not being made', () => {
    expect(detectUniversalModes(['we are still exploring it, too early to tell'])).toContain(UniversalMode.NON_COMMITMENT);
  });

  it('but leaves a specific account alone', () => {
    expect(detectUniversalModes(['Shipped the Afrimash integration on Tuesday. Samson signed it off.'])).toEqual([]);
  });
});

describe('the wiring itself', () => {
  /* Comments stripped first: this repository quotes code inside its comments, and a source
     assertion that reads them matches the explanation instead of the code. */
  const SRC = require('fs')
    .readFileSync(require('path').join(__dirname, '..', 'conversation', 'conversation.service.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

  it('reads the shape on every turn and hands it to the block', () => {
    expect(SRC).toMatch(/const modes = detectUniversalModes\(texts\)/);
    expect(SRC).toMatch(/buildRoleProbeBlock\(roleRead\.fn, roleRead\.confidence, roleRead\.modes\)/);
  });

  it('and does not skip reading it when the function is already known', () => {
    /* The early return used to sit above the text fetch, which is how the floor was skipped for
       exactly the people the product knows most about. */
    const body = SRC.slice(SRC.indexOf('private async roleReadForThisTurn'), SRC.indexOf('private async roleReadForThisTurn') + 1800);
    expect(body.indexOf('detectUniversalModes')).toBeLessThan(body.indexOf('>= MIN_COACHING_CONFIDENCE) return'));
  });
});
