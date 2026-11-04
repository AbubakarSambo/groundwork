import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * A REFERENCE POINTS AT A TICKET. IT NEVER HOLDS ONE.
 *
 * The failure this product exists to end is two places that must agree, each defensible on its own,
 * with nothing reconciling them. A ticket's state copied onto the Context page is that failure in
 * its purest form: somebody reads "in review" here, the tracker has said "closed" for a week, and
 * the next session is built on a fact that stopped being true without anybody lying.
 *
 * IT LIVES ON THE EXPECTATION, NOT IN A TABLE OF ITS OWN, and that is the point these tests defend.
 * My first version built `GroundReference` - a parallel band with its own table, routes and
 * visibility rules, connected to nothing. A delivery could point at an expectation but not at a
 * ticket, and the REFERENCE kind that already existed stayed dead. So there were two unconnected
 * representations of the same work: the same failure, arriving as a feature. A ticket IS an
 * expectation whose truth is settled elsewhere, so it is one row with three more columns.
 */
/** Comments stripped: a rule about what a column holds must not pass or fail on prose. */
const SCHEMA = readFileSync(join(__dirname, '../../../prisma/schema.prisma'), 'utf8').replace(
  /^\s*\/\/.*$/gm,
  '',
);
const SERVICE = readFileSync(join(__dirname, 'grounds.service.ts'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');
const CONTROLLER = readFileSync(join(__dirname, 'grounds.controller.ts'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');
const EXTRACT = readFileSync(join(__dirname, '../conversation/conversation.service.ts'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

function fn(name: string): string {
  const i = SERVICE.indexOf(`async ${name}(`);
  expect(i).toBeGreaterThan(-1);
  const rest = SERVICE.slice(i);
  return rest.slice(0, rest.indexOf('\n  }\n'));
}

describe('where a ticket lives', () => {
  /** The parallel table. Its absence is the fix, so its absence is the assertion. */
  it('is not a thing of its own', () => {
    expect(SCHEMA).not.toContain('model GroundReference');
    expect(SCHEMA).not.toContain('ground_references');
  });

  it('is an expectation whose truth is settled elsewhere', () => {
    const model = SCHEMA.slice(SCHEMA.indexOf('model PersonObjective {'));
    const body = model.slice(0, model.indexOf('\n}'));
    expect(body).toMatch(/trackedUrl/);
    expect(body).toMatch(/lastSeenState/);
    expect(body).toMatch(/lastSeenAt/);
  });

  /**
   * The columns that would make it a copy rather than a pointer. A mirrored status, an assignee or
   * a synced body is the tracker's data living in a second place.
   */
  it('holds none of the tracker’s own data', () => {
    const model = SCHEMA.slice(SCHEMA.indexOf('model PersonObjective {'));
    const body = model.slice(0, model.indexOf('\n}'));
    for (const forbidden of ['syncedAt', 'assignee', 'ticketStatus', 'ticketBody']) {
      expect(body).not.toContain(forbidden);
    }
  });
});

describe('when somebody last looked', () => {
  it('is stamped by the server, never taken from the caller', () => {
    const looked = fn('markExpectationLookedAt');
    expect(looked).toContain('lastSeenAt: new Date()');
    expect(looked).not.toMatch(/lastSeenAt:\s*dto\./);
  });

  it('is not a field the client can even send', () => {
    const dto = CONTROLLER.slice(CONTROLLER.indexOf('class LookedAtDto'));
    expect(dto.slice(0, dto.indexOf('\n}'))).not.toContain('lastSeenAt');
  });

  /** The state and the time it was true are written together or the row starts lying. */
  it('never re-stamps one without the other', () => {
    expect(fn('markExpectationLookedAt')).toMatch(
      /lastSeenState: state,\s*lastSeenAt: new Date\(\)/,
    );
  });

  it('refuses to record that somebody looked and saw nothing', () => {
    expect(fn('markExpectationLookedAt')).toContain("throw new BadRequestException('Say what it says now.')");
  });
});

describe('how a reference comes to exist at all', () => {
  /**
   * REFERENCE was in the enum from the day the primitive landed and nothing could produce one, so
   * "the work is in OPS-418" had nowhere to land but a to-do with a ticket number in its text.
   */
  it('the chat can name where the work is tracked', () => {
    expect(EXTRACT).toContain('trackedUrl');
    expect(EXTRACT).toMatch(/kind === 'REFERENCE'/);
  });

  /**
   * THE STATE IS NEVER TAKEN FROM THE CONVERSATION. "OPS-418 is in review" is a claim about a
   * moment already past by the time it is written down; storing it as the ticket's state would make
   * the page a stale copy of the tracker with nobody's name on the staleness.
   */
  it('the chat cannot set what the ticket says', () => {
    const i = EXTRACT.indexOf('const trackedUrl =');
    const block = EXTRACT.slice(i, i + 400);
    expect(block).not.toContain('lastSeenState');
    expect(block).not.toContain('lastSeenAt');
  });
});

/**
 * RE-STATING AN EXPECTATION MUST NOT DESTROY THE POINTER OR THE HISTORY OF LOOKING.
 *
 * Found live, not in code. The lead restated what they expect of somebody without repeating the
 * ticket number; the extraction wrote the whole shared object, so `trackedUrl` became null and
 * `lastSeenState`/`lastSeenAt` were left behind describing a ticket the row no longer named -
 * everybody's record of having looked, orphaned, still rendering as though it were current.
 */
describe('what an update is allowed to destroy', () => {
  const extract = (() => {
    const i = EXTRACT.indexOf('private async readTheAimsAndExpectations(');
    return EXTRACT.slice(i, EXTRACT.indexOf('\n  }\n', i));
  })();

  it('keeps the pointer when this extraction did not find one', () => {
    expect(extract).toContain('const keepsPointer = !trackedUrl || trackedUrl === prior.trackedUrl');
    expect(extract).toContain('{ trackedUrl: prior.trackedUrl }');
  });

  /** A different ticket makes the remembered state somebody else's ticket's words. */
  it('drops the remembered state when the ticket itself changes', () => {
    expect(extract).toMatch(/\{ trackedUrl, lastSeenState: null, lastSeenAt: null \}/);
  });

  it('and reads the prior pointer in order to be able to keep it', () => {
    expect(extract).toContain('select: { id: true, text: true, trackedUrl: true, awareness: true, authoredBy: true }');
  });
});

/**
 * THE MODEL IS TOLD WHAT THE FIELD IS FOR, IN THE SCHEMA IT ACTUALLY RECEIVES.
 *
 * `trackedUrl` was declared with a long TypeScript comment above it explaining exactly when to use
 * it - and none of that is sent anywhere. Only the JSON schema goes to the model. So the property
 * existed, REFERENCE was in the enum, the lead said "tracked in ticket OPS-902 in Jira", and the
 * extraction came back REFERENCE with no url at all. A source-reading spec was green throughout.
 */
describe('the extraction tool describes its own field', () => {
  const LIB = readFileSync(join(__dirname, '../conversation/prompt-library.ts'), 'utf8');

  it('trackedUrl carries a description, not just a comment', () => {
    const i = LIB.indexOf('trackedUrl: {');
    expect(i).toBeGreaterThan(-1);
    const prop = LIB.slice(i, i + 1400);
    expect(prop).toMatch(/description:/);
    expect(prop).toMatch(/REFERENCE only/);
  });

  it('and the description forbids putting the ticket’s state in it', () => {
    const i = LIB.indexOf('trackedUrl: {');
    expect(LIB.slice(i, i + 1400)).toMatch(/[Nn]ever put what the ticket SAYS in here/);
  });
});

/**
 * AN EXPECTATION IS PUBLISHED TO THE PERSON IT IS ABOUT, SO IT HAS TO ADDRESS THEM.
 *
 * `expectation` had no description, so the extraction stored whatever fragment the lead's sentence
 * happened to be - "he ships the onboarding rewrite" - and the Context page rendered that on Tom's
 * own page under a heading reading "You". The same third-person defect as the alignment line, except
 * this one is in the database, so every surface that quotes it inherits it.
 */
describe('the words that get published', () => {
  const LIB2 = readFileSync(join(__dirname, '../conversation/prompt-library.ts'), 'utf8');
  const prop = LIB2.slice(LIB2.indexOf('expectation: {'), LIB2.indexOf('awareness: {'));

  it('the expectation field says what shape it must be in', () => {
    expect(prop).toMatch(/description:/);
    expect(prop).toMatch(/standalone statement/i);
  });

  it('and forbids the third person, naming why', () => {
    expect(prop).toMatch(/never in the third person/i);
    expect(prop).toMatch(/read on their own page/i);
  });

  it('and keeps the person out of the sentence, since personName carries that', () => {
    expect(prop).toMatch(/personName already says who it is for/i);
  });
});
