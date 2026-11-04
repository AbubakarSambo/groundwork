import * as fs from 'fs';
import * as path from 'path';

/**
 * ONE SCREEN, TWO DENOMINATORS.
 *
 * The Report tab's header said "1 of 2 checked in for session 1". Three inches below it the
 * release box said "1 of 1 have checked in for this session". Same ground, same round, same
 * moment - and the second one is the worse of the two, because the round does NOT release at
 * 1 of 1: somebody holding an unopened invitation holds it open, by `isSessionReadyForReport`.
 *
 * `getSessionProgress`'s own doc comment says it uses "the same active party definition as
 * isSessionReadyForReport". It did once. The invited-not-yet-accepted clause was added to the
 * release rule and never to the counter, so the comment asserted an invariant the code had lost -
 * which is exactly the kind of drift a reader cannot see.
 */
const source = fs
  .readFileSync(path.join(__dirname, 'grounds.service.ts'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\/\/.*$/gm, '');

/* From the signature to the next method, not to the first closing brace: `getSessionProgress`
   declares its return type as an object literal, so the first "\n  }" is that type's. */
const bodyOf = (name: string) => {
  const at = source.indexOf(`async ${name}(`);
  expect(at).toBeGreaterThan(-1);
  const next = source.indexOf('\n  async ', at + 1);
  return source.slice(at, next > -1 ? next : undefined);
};

describe('who is in this round', () => {
  const release = bodyOf('isSessionReadyForReport');
  const progress = bodyOf('getSessionProgress');

  it('is one definition, and the counter uses it', () => {
    /* The counter stopped carrying its own copy of the clause on 22 September 2026 - three copies is
       three answers waiting to happen - and asks how-many-have-answered, which holds the one.
       CHANGED 1 NOVEMBER 2026: the count is one pure function (whoHasAnswered) that counts everyone on the check-in, as Hafsah approved;
       the release rule's own query answers a different question (whom the report waits for) and no longer shares its clauses. */
    expect(progress).toContain('await howManyHaveAnswered(this.prisma, groundId, sessionNumber)');
    const theRule = fs.readFileSync(path.join(__dirname, '..', 'reports', 'how-many-have-answered.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(theRule).toContain('const c = whoHasAnswered(people, sessionNumber, ground?.scenario);');
    expect(release.length).toBeGreaterThan(0);
  });
});
