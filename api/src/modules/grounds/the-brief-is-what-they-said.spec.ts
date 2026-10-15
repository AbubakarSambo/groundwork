import * as fs from 'fs';
import * as path from 'path';

/**
 * THE BRIEF WAS A READ OF SOMEBODY'S PRIVATE ACCOUNT, PUBLISHED TO THEIR TEAM.
 *
 * Read off a live Context page under a heading that says "the brief - from setup, in the lead's
 * own words":
 *
 *   "You have two standards for Zainab's first quarter. One you told her in week one; the other
 *    you have never written down and doubt she knows about."
 *
 * Reported as "the check-in brief is wrong - that is not a brief about the check-in", and it is two
 * faults in one line. It is not a brief: a brief is what the lead tells the people who are about to
 * check in. And it is a read of what that person said in their own private setup conversation,
 * addressed to them in the second person, made readable by everybody on the check-in - without the
 * person whose account it came from choosing to share it.
 *
 * `Ground.brief` was set to `report.whatGroundworkSaw` on every commit through the entry chat, and
 * an empty brief fell back to the report's `sharedPicture` once released. Both gone. What travels
 * instead is `composeLeadBrief` on the client - their own extracted answers, which has always
 * existed and was being sent only when somebody had opted out of checking in.
 */
const withoutComments = (p: string) =>
  fs.readFileSync(p, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

const entry = withoutComments(path.join(__dirname, '..', 'entry', 'entry.service.ts'));
const grounds = withoutComments(path.join(__dirname, 'grounds.service.ts'));
const client = withoutComments(
  path.join(__dirname, '..', '..', '..', '..', 'client', 'src', 'pages', 'enter', 'EntryChatPage.tsx'),
);

describe('the brief', () => {
  it('is what the person wrote, not what the report made of it', () => {
    expect(entry).toContain('const brief = dto.brief?.trim() || undefined;');
  });

  it('never comes from the report\'s read of their account', () => {
    /* The exact line, and the field, because either one returning is the same defect. */
    expect(entry).not.toContain('dto.report?.whatGroundworkSaw ?? undefined');
    const at = entry.indexOf('const brief =');
    expect(entry.slice(at, at + 200)).not.toContain('whatGroundworkSaw');
  });

  it('and an empty one does not fall back to the shared picture', () => {
    /* Same fault, later in the run: the shared picture is what the product made of everybody's
       accounts, and it has its own home on the report where it is named correctly. */
    expect(grounds).toContain('const rawBrief = (ground as any).brief ?? null;');
    expect(grounds).not.toMatch(/rawBrief[^\n]*sharedPicture/);
  });

  it('travels on every commit, not only when somebody opts out of checking in', () => {
    /* This is why the server had a fallback at all: on the ordinary path the client sent nothing. */
    /* U.7 re-check: the composer now also takes who answered, so the call carries a second argument. */
    expect(client).toMatch(/\.\.\.\(composeLeadBrief\(onboardingSelections(, [^)]+)?\)[\s\S]{0,120}brief: composeLeadBrief\(onboardingSelections(, [^)]+)?\)/);
  });

  it('and is composed from their own answers', () => {
    /* Bounded by the function's own end, not by a character count. It was `at + 600`, and adding a
       comment inside the composer pushed the last field past it - a spec failing on code that had
       not changed, which is the same trap `a-page-you-cannot-change-says-so` already wrote down. */
    const at = client.indexOf('export function composeLeadBrief');
    const end = client.indexOf('\n}', at);
    const body = client.slice(at, end > at ? end : at + 600);
    for (const own of ['sels.initial', 'sels.whoInvolved', 'sels.decision', 'sels.goals', 'sels.brief']) {
      expect(body).toContain(own);
    }
  });
});
