import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * AN ORG ADMIN READS NAMES, AND THAT IS A DECISION. W8-72.
 *
 * I raised this as a question for her - should a non-party org admin see the other party's
 * name in the report's prose - and the answer was already in the code: `reports.service.ts`
 * passes `isInitiator || isOrgAdmin` as the lead flag, and a lead reads every name. What
 * looked like a policy gate was three mechanical bugs (W8-73/74) leaving labels behind.
 *
 * Verified at the endpoint, as an org admin who is not a party: "Hafsah and Abubakar were
 * operating from different definitions of success."
 *
 * WHY IT IS RIGHT, written down because the opposite looks safer and is not. On a two-party
 * ground the label is transparent: the reader sees one name in the prose and both names in
 * the party row on the same screen, so "the participant" resolves by elimination in a second.
 * Hiding the noun buys the APPEARANCE of a boundary, costs the person who has to act on the
 * report, and invites us to believe we protected something we did not.
 *
 * WHAT THE REAL BOUNDARY IS, and it is not identity. Per-person quality material - recall
 * notes, specificity reads, concern flags - is content ABOUT a person, and
 * `own-reads-only.ts` strips everybody else's from every reader including the lead. That is
 * the wall. An admin knowing who is in a ground they administer is not.
 *
 * This file exists so that nobody "tightens" the names later without meeting the argument,
 * and so the next person can see it was decided rather than left.
 */
const SRC = readFileSync(join(__dirname, 'reports.service.ts'), 'utf8');
const CODE = SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('who reads with the lead\'s eyes', () => {
  it('an org admin does, on both the forming and the released report', () => {
    // Two call sites, and a report that names people before release but not after would be
    // the worst of both.
    const calls = CODE.match(/applyNames\([^)]*isInitiator \|\| isOrgAdmin\)/g) ?? [];
    expect(calls.length).toBe(2);
  });

  it('and it is the same flag that gates the rest of their view', () => {
    // If an org admin can read the report at all, they can read the nouns in it. The
    // coherent alternative is to withhold the whole report, not the names inside it.
    expect(CODE).toMatch(/const isOrgAdmin = !isInitiator && !participant && !!requestingUserOrgId && ground\.organizationId === requestingUserOrgId/);
  });
});

describe('what an org admin still does not read', () => {
  it('other people\'s quality reads are stripped for them too', () => {
    // The actual wall. `withoutOtherPeoplesReads` runs on the released report for every
    // reader, with the lead flag deciding scope - not skipped for admins.
    expect(CODE).toMatch(/withoutOtherPeoplesReads\(/);
    expect(CODE).toMatch(/viewerIsLead: isInitiator \|\| isOrgAdmin/);
  });

  it('and concerns about people are deleted outright, for everyone', () => {
    const filter = readFileSync(join(__dirname, 'own-reads-only.ts'), 'utf8');
    expect(filter).toMatch(/delete engagement\.concernFlags/);
  });
});
