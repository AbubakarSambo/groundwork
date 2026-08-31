import { readFileSync } from 'fs';
import { join } from 'path';
import { DetectorsService, UNMENTIONED_DAYS } from './detectors.service';

/**
 * §12.8 BINDS HARDEST HERE OF ANYWHERE IN THE API.
 *
 * This is the endpoint whose whole purpose is to describe behaviour, so what leaves is the evidence
 * - what was seen, about which work - and never a judgement about a person, never attributed
 * testimony, never a score. The judgement stays with the human who has to make it.
 */
const CONTROLLER = readFileSync(join(__dirname, 'detectors.controller.ts'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');
const SERVICE = readFileSync(join(__dirname, 'detectors.service.ts'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

describe('what leaves is evidence', () => {
  it('is an allow-list, named field by field', () => {
    const present = CONTROLLER.slice(CONTROLLER.indexOf('private present('));
    expect(present).not.toMatch(/\.\.\.r/);
  });

  it('never carries the observation text lifted from a check-in', () => {
    /*
     * That is attributed testimony wearing a different name - somebody's own words about their week,
     * leaving the boundary attached to them. The one sentence written FOR a reader goes out; the
     * raw observation does not.
     */
    const present = CONTROLLER.slice(CONTROLLER.indexOf('private present('), CONTROLLER.indexOf('private present(') + 900);
    expect(present).not.toMatch(/evidence\.observation/);
    expect(present).toMatch(/evidence\?\.says/);
  });

  it('never carries our own ids or the ground it came from', () => {
    const present = CONTROLLER.slice(CONTROLLER.indexOf('private present('), CONTROLLER.indexOf('private present(') + 900);
    for (const forbidden of ['id: r.id', 'sourceGroundId', 'sourcePatternDetectionId', 'organizationId']) {
      expect(present).not.toContain(forbidden);
    }
  });

  it('says what is built and what is only named', () => {
    /* A customer asking why they have seen no goal_divergence deserves "it is not built yet" rather
       than silence - the same reasoning as only offering webhook events that can fire. */
    expect(CONTROLLER).toMatch(/notYetImplemented/);
  });
});

describe('detection holds its tongue while a customer is still arriving', () => {
  it('runs nothing at all during a quiet period', () => {
    /*
     * The whole reason that window is stamped at import time. A first sync produces exactly the
     * conditions these detectors fire on - many objectives, no conversations, nothing linked - and
     * a wall of findings on day one is how a customer decides the tool is broken.
     */
    expect(SERVICE).toMatch(/if \(quiet\) \{/);
    expect(SERVICE).toMatch(/return \{ ran: false/);
  });

  it('and the check comes before any detector runs', () => {
    const quietAt = SERVICE.indexOf('quietUntil(');
    const subjectsAt = SERVICE.indexOf('findUndeclaredDependencies(');
    expect(quietAt).toBeGreaterThan(-1);
    expect(quietAt).toBeLessThan(subjectsAt);
  });
});

describe('a finding that keeps being true is one finding', () => {
  it('looks for an existing row before creating another', () => {
    /* A findings list that grows every night is a list nobody opens twice. */
    const create = SERVICE.indexOf('detectorResult.create');
    const find = SERVICE.indexOf('detectorResult.findFirst');
    expect(find).toBeGreaterThan(-1);
    expect(find).toBeLessThan(create);
  });

  it('and an objective too young to have gone quiet is left alone', () => {
    /* Something set last week has not gone quiet, it has just started - and saying otherwise on day
       three is the product being wrong in the way that teaches people to ignore it. */
    expect(SERVICE).toMatch(/if \(r\.createdAt\.getTime\(\) > cutoff\) continue;/);
    expect(UNMENTIONED_DAYS).toBeGreaterThanOrEqual(30);
  });
});

describe('matching a conversation to an objective is strict', () => {
  it('requires every meaningful word of the title, not any of them', () => {
    /*
     * A loose match produces dependencies nobody has, which is worse than producing none: the
     * finding names two specific objectives, and being wrong about which ones is the whole error.
     */
    expect(SERVICE).toMatch(/k\.words\.every\(/);
    expect(SERVICE).not.toMatch(/k\.words\.some\(/);
  });

  it('and drops stopwords from the title before matching', () => {
    /* "Rebuild the billing service" must not match on "the". */
    expect(SERVICE).toMatch(/!STOPWORDS\.has\(w\)/);
  });
});

describe('a ground detection is mirrored into the org layer', () => {
  /*
   * THE ORPHAN CHECK CANNOT SEE THIS. `nothing-in-here-is-wired-to-nothing` notices a file nobody
   * imports, and `if (false) await mirrorDetection(...)` still imports it - so removing the
   * dual-write left every suite green. What matters is that the call is reached, not that the
   * module is referenced.
   */
  const PATTERNS = readFileSync(join(__dirname, '../patterns/patterns.service.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

  it('is called unconditionally when a detection is created', () => {
    expect(PATTERNS).toMatch(/await mirrorDetection\(this\.prisma, \{/);
    expect(PATTERNS).not.toMatch(/if \([^)]*\)\s*await mirrorDetection/);
  });

  it('and the ground row is written first, because it is the authoritative one', () => {
    /* The mirror is the copy. If the order ever inverted, a failed ground write would still leave
       an org-level finding about a detection that does not exist. */
    const create = PATTERNS.indexOf('patternDetection.create({ data })');
    const mirror = PATTERNS.indexOf('await mirrorDetection(');
    expect(create).toBeGreaterThan(-1);
    expect(create).toBeLessThan(mirror);
  });
});
