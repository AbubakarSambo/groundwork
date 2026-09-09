import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * "I WAS ADDED TO A CHECK-IN IN ONE ORG AND THEN DIDN'T HAVE A WAY TO JOIN THE ORG."
 *
 * Three separate things, and only one of them was ever a hole.
 *
 * READING IT WORKS AND ALWAYS DID. `get()` falls back to a participant-membership lookup when the
 * org-scoped one finds nothing - the cross-org path, a hundred lines up from here - so a guest opens
 * the check-in without switching anything, and every other org-scoped read still refuses them.
 *
 * THE SWITCHER LISTS IT. `myOrganizations` reads memberships, and being added now writes a GUEST
 * membership (see joining-a-second-organisation.ts), so the second organisation appears and can be
 * switched to. That was the fix that made this reachable at all.
 *
 * NOTHING SAID SO. That was the hole. A person opened a workspace holding one check-in and nothing
 * around it, and the first they knew of being somewhere else was that the rest of the product looked
 * empty. The list page had said it for a while; the check-in itself never did.
 *
 * AND ONLY WHEN IT DIFFERS. On a reader's own check-in this is null and no screen says anything -
 * "at your own company" is not information, and a badge that is always there stops being read.
 */
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const SERVICE = strip(readFileSync(join(__dirname, 'grounds.service.ts'), 'utf8'));
const PARTY = strip(
  readFileSync(
    join(__dirname, '..', '..', '..', '..', 'client', 'src', 'pages', 'grounds', 'GroundParticipantPage.tsx'),
    'utf8',
  ),
);

describe('a guest in somebody else\'s check-in', () => {
  it('is told whose it is, by name', () => {
    expect(SERVICE).toContain('guestIn: ground.organizationId !== organizationId');
    expect(PARTY).toContain('A guest check-in at');
  });

  it('and is told nothing on their own', () => {
    /* Null rather than the reader's own company name: a badge on every check-in is furniture. */
    expect(SERVICE).toMatch(/guestIn: ground\.organizationId !== organizationId[\s\S]{0,200}: null,/);
    expect(PARTY).toContain('{(ground as any).guestIn && (');
  });

  it('with the name loaded on the cross-org read, which is the one that needs it', () => {
    /* Two queries assign to one `ground`. The fallback is the guest's path, so a field present on
       only the primary read is a field every guest is missing - which is the trap the comment on
       that query already names. */
    /* Comments are stripped, so the fallback is found by the query that defines it. */
    const at = SERVICE.indexOf('const link = await this.prisma.groundParticipant.findFirst');
    expect(at).toBeGreaterThan(-1);
    expect(SERVICE.slice(at, at + 1200)).toContain('organization: { select: { name: true } }');
    /* And on the primary read too, so a member of the org gets a defined field rather than a
       crash-shaped undefined the moment anything else reads it. */
    expect((SERVICE.match(/organization: \{ select: \{ name: true \} \}/g) ?? []).length).toBeGreaterThanOrEqual(2);
  });

  it('and reading it never required switching organisation', () => {
    /* The membership makes the switcher list it. It was never a precondition for opening the
       check-in, and a guest asked to switch would be asked to leave their own workspace. */
    expect(SERVICE).toContain('const link = await this.prisma.groundParticipant.findFirst({ where: { groundId: id, userId: requestingUserId } });');
  });
});
