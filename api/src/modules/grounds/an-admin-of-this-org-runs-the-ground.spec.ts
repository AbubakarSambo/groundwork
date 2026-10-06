import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * AN ADMIN OF THIS ORGANISATION RUNS THE CHECK-IN, AND THE PEER RULE HAS TO KNOW IT.
 *
 * On an evaluation-family ground - a new hire, a probation, a cohort - peers are hidden from each
 * other by default. The filter that does it keeps only rows whose `userId` is the viewer's, and the
 * only exemption was the INITIATOR. An org admin who is not a party matches no row at all, so the
 * ground came back with `participants: []` and `checkIns` in full.
 *
 * Walked as a second admin of a real organisation, that is: a Report tab reading "Session 1 - 0 of 0
 * answered" on a check-in with two people in it, an empty "who is in this", and session rows
 * belonging to nobody - all of it directly beneath a banner reading "You can see everything here,
 * which is the point of being an admin".
 *
 * The comment above the rule had said "The lead or an admin decides ... The lead always sees
 * everyone - running the ground is the job" since it was written. The code never did the admin half.
 *
 * A source read rather than a service call: the rule is one boolean inside a 400-line method, and
 * what must not regress is which boolean it reads.
 */
const SRC = readFileSync(join(__dirname, 'grounds.service.ts'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('who runs a ground, for the rule that hides peers', () => {
  it('is worked out from the initiator AND an admin of the ground\'s own organisation', () => {
    /* Through the one rule (who-may-read-this-check-in.ts): the role, in THIS organisation. */
    expect(SRC).toMatch(/const viewerAdminsThisOrg = adminsThisOrg\(\{ \.\.\.viewer, userId: requestingUserId \}, ground as any\);/);
    /* Decision 75, item 2: and, for reading only, the admin asked to approve an evaluation check-in. */
    expect(SRC).toMatch(/const viewerReadsAsAnAdmin = viewerAdminsThisOrg \|\| askedToApproveIt\(\{ \.\.\.viewer, userId: requestingUserId \}, ground as any\);/);
    expect(SRC).toMatch(/const viewerRunsThisGround = viewerIsInitiator \|\| !!viewerReadsAsAnAdmin;/);
  });

  it('and the peer rule reads that, not the initiator alone', () => {
    expect(SRC).toMatch(/const hidePeers = !peersVisible && !viewerRunsThisGround;/);
    expect(SRC).not.toMatch(/const hidePeers = !peersVisible && !viewerIsInitiator;/);
  });

  /**
   * An admin of a DIFFERENT organisation is a stranger. The org comparison is the whole safety
   * argument, and dropping it would hand every admin on the platform every ground on it.
   */
  it('and an admin of another organisation is not admitted by it', () => {
    const line = SRC.slice(SRC.indexOf('const viewerAdminsThisOrg'), SRC.indexOf('const viewerRunsThisGround'));
    expect(line).toContain('adminsThisOrg(');
  });

  /**
   * The join token ran the identical test with its own user query two hundred lines lower, which is
   * why the peer rule went without one. One read, both users.
   */
  it('and the join-token rule reuses it rather than querying the user again', () => {
    expect(SRC).toMatch(/const mayShareJoinLink = isInitiatorViewer \|\| viewerAdminsThisOrg;/);
    expect((SRC.match(/findUnique\(\{ where: \{ id: requestingUserId \}, select: \{ role: true, organizationId: true \} \}\)/g) ?? []).length).toBe(1);
  });
});
