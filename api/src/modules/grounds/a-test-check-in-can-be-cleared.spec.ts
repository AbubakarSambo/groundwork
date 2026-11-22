import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * A TEST CHECK-IN CAN BE CLEARED, AND A REAL ONE CANNOT BE DESTROYED.
 *
 * "they can clear any test chats/checkins they run. I suspect this is likely to happen with new
 * users." It is exactly what happens: the first thing anybody does is try the product on something
 * invented, and the only way to get rid of it was to email us. New accounts fill up with "test" and
 * "asdf" sitting beside a real check-in.
 *
 * THE TWO HALVES ARE THE DESIGN. Its lead alone may delete it - an org admin deleting somebody
 * else's check-in is the complaint that came just before this one, with nothing left to argue about
 * afterwards. And only while nobody else has given an account: the moment somebody has, this stops
 * being a test being cleared and becomes a record being destroyed, written in confidence by
 * somebody who is not being asked and cannot get it back.
 *
 * A source read: the rule is a refusal inside a delete, and what must never regress is that the
 * refusal is there at all.
 */
const SRC = readFileSync(join(__dirname, 'grounds.service.ts'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const METHOD = (() => {
  const i = SRC.indexOf('async deleteWhileItIsStillATest');
  expect(i).toBeGreaterThan(-1);
  return SRC.slice(i, SRC.indexOf('\n  async ', i + 10));
})();

describe('deleting a check-in that was only ever a test', () => {
  it('is the lead\'s, and a stranger cannot even learn it exists', () => {
    expect(METHOD).toMatch(/if \(!ground\) throw new NotFoundException/);
    expect(METHOD).toMatch(/if \(!mine\) throw new NotFoundException/);
  });

  it('and a party of it is refused with a reason rather than a 404', () => {
    expect(METHOD).toMatch(/throw new ForbiddenException\(/);
  });

  /** The half that protects somebody who is not in the room when the button is pressed. */
  /* Changed 22 November 2026 (bug N6): who else has answered is one rule, whoElseHasAnswered in people-and-setup.ts, which People
     and setup also serves, so the page offers this delete exactly when it works. Its behaviour, COMPLETED sessions of anybody but the
     lead in any session, is proved in deleting-a-check-in-somebody-answered-in-an-earlier-session.spec.ts. */
  it('refuses once anybody else has given an account', () => {
    expect(METHOD).toMatch(/const answered = whoElseHasAnswered\(/);
    expect(METHOD).toMatch(/if \(answered\.length\) \{[\s\S]*throw new BadRequestException/);
  });

  it('and only counts OTHER people, because your own account is not somebody else\'s record', () => {
    expect(METHOD).toMatch(/whoElseHasAnswered\(ground\.participants, ground\.checkIns as any\[\], ground\.initiatorId\)/);
  });

  it('and names who answered, so the refusal can be acted on', () => {
    expect(METHOD).toMatch(/who\.join\(' and '\)/);
    expect(METHOD).toMatch(/Close the check-in instead/);
  });

  /**
   * A declined invitation is not an account. Somebody saying no is not a record to protect, and a
   * check-in everybody declined is precisely the sort a person wants rid of.
   */
  it('and a decline does not block it', () => {
    expect(METHOD).not.toMatch(/DECLINED/);
  });

  it('deletes rather than flags, since the point is that it stops being there', () => {
    expect(METHOD).toMatch(/this\.prisma\.ground\.delete\(\{ where: \{ id: groundId \} \}\)/);
  });
});
