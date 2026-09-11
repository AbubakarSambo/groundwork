import { readFileSync } from 'fs';
import { join } from 'path';
import { WAITING_TO_BE_LET_IN } from './nobody-joins-your-company-by-being-invited-to-a-check-in';

/**
 * WAITING TO BE LET IN IS A SCREEN, NOT A RETRY. A person queued for approval was signed in, sent to
 * the check-in, refused, and shown "This is usually a temporary issue" with a retry that could never
 * work. accept() knew; now it says, and the invite page renders the sentence.
 */
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const service = strip(readFileSync(join(__dirname, 'participants.service.ts'), 'utf8'));
const page = strip(readFileSync(join(__dirname, '..', '..', '..', '..', 'client', 'src', 'pages', 'invite', 'InvitePage.tsx'), 'utf8'));

describe('accept', () => {
  it('returns whether they are queued, with the sentence', () => {
    expect(service).toMatch(/queuedForApproval,\s*\.\.\.\(queuedForApproval \? \{ saying: WAITING_TO_BE_LET_IN \} : \{\}\),/);
  });
  it('and an unknown token says the true thing, not "already been used"', () => {
    const link = strip(readFileSync(join(__dirname, 'an-invite-link-still-opens.ts'), 'utf8'));
    expect(link).not.toContain('This link has already been used');
    expect(link).toContain('That is not a link we recognise.');
  });
});

describe('the invite page', () => {
  it('renders the wait instead of navigating to a check-in that will refuse them', () => {
    expect(page).toMatch(/if \(res\.queuedForApproval\) \{\s*setWaiting\(res\.saying/);
    expect(page).toMatch(/if \(waiting\) \{\s*return \(/);
  });
  it('prints the server\'s sentence on failure when there is one', () => {
    /* The sentence is kept on the page as well as toasted (fix plan C7). */
    expect(page).toMatch(/const said = err\?\.response\?\.data\?\.message \?\? /);
    expect(page).toMatch(/setFailed\(said\)\s*toast\.error\(said\)/);
  });
});

describe('the sentence', () => {
  it('does not use the banned word', () => {
    expect(WAITING_TO_BE_LET_IN).not.toMatch(/\baccount\b/i);
    expect(WAITING_TO_BE_LET_IN).toMatch(/^Your sign-in is ready/);
  });
});
