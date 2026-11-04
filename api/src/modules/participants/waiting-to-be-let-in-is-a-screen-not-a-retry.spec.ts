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
    expect(link).toContain('I do not recognise that link.');
  });
});

describe('the invite page', () => {
  /*
   * U.3: the wait is its own page now, "Almost in" (/join/waiting), which can be opened again and says
   * who was asked. So the invite page no longer renders the sentence itself; it sends the queued person
   * there, first time and coming back alike, and never on to a check-in. The same promise, checked
   * where it now lives: the queued case goes to the waiting screen before any check-in navigation, and
   * that screen renders the wait and never navigates to a check-in.
   */
  it('sends a queued person to the waiting screen, never to a check-in that will refuse them', () => {
    const queued = page.search(/if \(res\.queuedForApproval\) \{\s*navigate\('\/join\/waiting'/);
    expect(queued).toBeGreaterThan(-1);
    const toACheckIn = page.indexOf('whereTheLinkGoes(checkInId, preview?.scenario), {', queued);
    expect(toACheckIn).toBeGreaterThan(queued);
    /* And coming back on the same browser, before the resumed path's own navigation. */
    const resumedQueued = page.search(/if \(\(res as any\)\.resumed && res\.queuedForApproval\) \{\s*navigate\('\/join\/waiting'/);
    const resumed = page.indexOf('if ((res as any).resumed) {');
    expect(resumedQueued).toBeGreaterThan(-1);
    expect(resumedQueued).toBeLessThan(resumed);
  });
  it('and the waiting screen renders the wait, and never sends them to a check-in', () => {
    const waiting = strip(readFileSync(join(__dirname, '..', '..', '..', '..', 'client', 'src', 'pages', 'join', 'WaitingForAnAdminPage.tsx'), 'utf8'));
    /* U.20: the screens workspace rebuilt this page from components/gw/ui (the invitation task) -
       AuthCard's `sub` became PageTitle's `subtitle`. Same sentence, same source, new markup. */
    expect(waiting).toMatch(/<PageTitle title="Almost in" subtitle=\{youAreFromOutside\(w\)\}/);
    expect(waiting).not.toMatch(/\/checkin\//);
    expect(waiting).not.toMatch(/navigate\(/);
  });
  it('the server says they are still waiting when they come back on the same browser', () => {
    expect(service).toMatch(/if \(waitingStill\?\.awaitingOrgApproval\) \{\s*return \{ resumed: true as const, groundId: participant\.groundId, checkInId: null, queuedForApproval: true, saying: WAITING_TO_BE_LET_IN \};/);
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
