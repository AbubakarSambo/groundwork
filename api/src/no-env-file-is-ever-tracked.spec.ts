import { execSync } from 'child_process';
import { join } from 'path';

/**
 * NO FILE OF SECRETS IS TRACKED IN THIS REPOSITORY.
 *
 * `api/.env.bak` was committed on 31 July 2026, inside a commit about board handoffs, carrying a
 * live JWT signing secret and a database URL. It sat there until 1 September. The repository is
 * public, so the exposure was to everybody, not to the three people with clones.
 *
 * HOW IT GOT PAST: `.gitignore` named `.env`, `.env.local` and `.env.production` individually. A
 * backup called `.env.bak` matched none of them. The rule was a list where it needed to be a
 * pattern, and a list only covers the names somebody thought of.
 *
 * This asks git what is actually tracked, rather than asking whether the ignore rules look right -
 * an ignore rule does nothing for a file already in the index, which is exactly how this one
 * survived being noticed.
 */
const repoRoot = join(__dirname, '..', '..');
const tracked = () =>
  execSync('git ls-files', { cwd: repoRoot, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 })
    .split('\n')
    .filter(Boolean);

describe('no env file is ever tracked', () => {
  const files = tracked();

  it('found the file list, so an empty answer cannot pass', () => {
    expect(files.length).toBeGreaterThan(100);
  });

  it('nothing that looks like an environment file is in the index', () => {
    /* `.env.example` is the one that belongs here: it carries names and no values. */
    const offenders = files.filter(
      f => /(^|\/)\.env($|\.)/.test(f) && !/\.env\.example$/.test(f),
    );
    /* The message a failure needs is the list itself, which toEqual prints. */
    expect(offenders).toEqual([]);
  });

  /**
   * ASKED OF GIT, NOT READ OFF THE FILE.
   *
   * The first version of this read `.gitignore` and matched the pattern text, and
   * `a-guard-that-a-comment-satisfies-is-not-a-guard` caught it: `.gitignore` carries `#` comments,
   * and the note above these rules names the very files they cover, so a sentence could have
   * satisfied the assertion while the rule beneath it was gone.
   *
   * Asking git is strictly stronger than reading the text. It cannot be satisfied by prose, and it
   * tests what the rule DOES rather than how it is spelled - so rewriting the pattern in some
   * better way keeps this green, and deleting it does not.
   */
  it('the pattern really catches the name that got through, asked of git itself', () => {
    const check = (p: string) => {
      try {
        execSync(`git check-ignore --no-index -q ${p}`, { cwd: repoRoot });
        return true;
      } catch { return false; }
    };
    expect({
      'api/.env.bak (the file that was committed)': check('api/.env.bak'),
      'client/.env.backup (a name nobody has used yet)': check('client/.env.backup'),
      'api/.env.example (the template, must stay tracked)': check('api/.env.example'),
    }).toEqual({
      'api/.env.bak (the file that was committed)': true,
      'client/.env.backup (a name nobody has used yet)': true,
      'api/.env.example (the template, must stay tracked)': false,
    });
  });
});
