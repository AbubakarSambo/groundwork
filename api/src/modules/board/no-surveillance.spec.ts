import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * THE PROMISES THE MARKETING SITE MAKES ABOUT SURVEILLANCE.
 *
 * The landing page tells a leader their team will accept this tool, and tells
 * the team why. It says, in a block headed "What Groundwork is not":
 *
 *   - it does not monitor activity, screen time, or who is online
 *   - it does not score, rank, or rate anyone
 *   - it never shows anyone's raw answers
 *   - it never says who said what about whom
 *
 * Those four lines are load-bearing in a way ordinary copy is not. If a team
 * suspects it is being watched they stop answering honestly, and dishonest
 * check-ins make the leader's report worthless - so the promise protects the
 * data the entire product depends on. A single feature that fingers an
 * individual would not just be a broken claim; it would quietly destroy the
 * input the reports are built from, and nobody would see it happen.
 *
 * So these are asserted against the SOURCE, not behaviour, because the risk is
 * a future addition rather than a present bug. If you are here because one of
 * these failed: the fix is almost never to relax the test. It is to decide
 * whether the product still deserves the sentence on the page.
 */

const api = (p: string) => readFileSync(join(__dirname, '..', '..', '..', p), 'utf8');
const schema = readFileSync(join(__dirname, '..', '..', '..', 'prisma', 'schema.prisma'), 'utf8');

/** A prisma model's body, so field checks cannot stray into another model. */
function model(name: string): string {
  const i = schema.indexOf(`model ${name} {`);
  expect(i).toBeGreaterThan(-1);
  return schema.slice(i, schema.indexOf('\n}', i));
}

describe('"it does not monitor activity, screen time, or who is online"', () => {
  it('records nothing about a person being present or active', () => {
    for (const m of ['User', 'GroundParticipant', 'CheckIn']) {
      const body = model(m);
      // lastSeenAt exists on PatternDetection and means "when this PATTERN was
      // last observed" - nothing to do with a person being online. It must not
      // appear on anything that represents a person.
      expect(body).not.toMatch(/lastSeenAt|last_seen_at/);
      expect(body).not.toMatch(/isOnline|onlineAt|lastActiveAt|presenceAt/);
      expect(body).not.toMatch(/screenTime|timeSpent|secondsActive|idleAt/);
    }
  });
});

describe('"it does not score, rank, or rate anyone"', () => {
  it('a contribution row cannot carry a position, because the field is typed null', () => {
    const reads = api('src/modules/board/reads.ts');
    // Not `number | null`. Literally `null`, so no future edit can slip a score
    // in without changing the type and tripping the compiler.
    expect(reads).toMatch(/position:\s*null;/);
    expect(reads).toMatch(/positionLabel\?:\s*null;/);
  });

  it('never orders people by anything that reads as performance', () => {
    const reads = api('src/modules/board/reads.ts');
    const board = api('src/modules/board/board.service.ts');
    for (const src of [reads, board]) {
      expect(src).not.toMatch(/\.sort\([^)]*\b(score|position|rank|rating|performance)\b/);
    }
  });

  it('keeps the guard that says each person is read in their own terms', () => {
    const reads = api('src/modules/board/reads.ts');
    expect(reads).toMatch(/never on one scale/i);
    expect(reads).toMatch(/not a rating of anyone/i);
  });
});

describe('"it never shows anyone\'s raw answers"', () => {
  it('no shared surface reads a conversation turn', () => {
    // The board and the shared report are the two surfaces another person can
    // see. Neither may touch the transcript.
    for (const f of ['src/modules/board/board.service.ts', 'src/modules/reports/reports.service.ts']) {
      expect(api(f)).not.toMatch(/conversationTurn\./);
    }
  });
});

describe('"it never says who said what about whom"', () => {
  it('the synthesis is instructed not to quote or name anyone', () => {
    const deferrals = api('src/modules/reports/deferrals.ts');
    expect(deferrals).toMatch(/never quote or name anyone|without quoting or naming anyone/);
  });
});

describe('"the same picture goes to everyone in it"', () => {
  it('the board admits any party, not only the person running the ground', () => {
    const board = api('src/modules/board/board.service.ts');
    // The read guard must accept a plain participant. If this ever narrows to
    // the initiator, the page's mutual-clarity claim becomes false and the
    // reason people answer honestly goes with it.
    expect(board).toMatch(/const me = ground\.participants\.find/);
    expect(board).toMatch(/if \(!me && !isInitiator/);
  });
});

describe('the one asymmetry, named rather than hidden', () => {
  it('keeps the arc advisory a prompt, and keeps raw answers out of it', () => {
    // PART 3 FINDING. Two-party Grounds are symmetric in almost everything: the
    // same report body, the same board, neither party controlling the other's
    // visibility. One exception exists and it is deliberate - `arcAdvisories`
    // reaches only the initiator, carrying the other party's id and a note that
    // the record's SHAPE is worth asking about.
    //
    // It fired zero times across ten grounds and 265 check-ins, so it is rare.
    // It still matters, because a cofounder Ground only works if neither side
    // believes the other set the tool up to build a case. The site now says
    // this out loud rather than claiming perfect symmetry.
    //
    // What must stay true: it is a QUESTION to ask, never a verdict, and it
    // never carries anything the person actually wrote.
    const reports = readFileSync(
      join(__dirname, '..', '..', '..', 'src/modules/reports/reports.service.ts'), 'utf8',
    );
    const i = reports.indexOf('arcAdvisories');
    expect(i).toBeGreaterThan(-1);
    const block = reports.slice(reports.indexOf('const advisories'), i + 400);
    expect(block).toMatch(/Worth asking about/);
    expect(block).not.toMatch(/recordEntry|conversationTurn|\.text\b/);
    // And it is stripped for everyone else.
    expect(reports).toMatch(/if \(!isInitiator && !isOrgAdmin\) \{\s*\n\s*delete base\.arcSignals;/);
  });
});
