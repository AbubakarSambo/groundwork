/**
 * SOMEBODY WHOSE COMPANY ALREADY LISTED THEM SHOULD NOT ARRIVE AS A STRANGER.
 *
 * HR pushes their directory — a sync, or a spreadsheet — and Groundwork holds a
 * roster of real people with real addresses. Then one of those people opens the
 * product, verifies their address, and founds A BRAND NEW ORGANISATION OF THEIR
 * OWN, as its admin, with nothing in it. Their objectives, their check-ins and
 * their colleagues are all one row away in the organisation that listed them, and
 * nothing joins the two. They conclude the product is empty and leave.
 *
 * This decides whether an address arriving at the door is already expected
 * somewhere. It is the only place that decision is made, and it is deliberately
 * paranoid, because the failure mode is putting a stranger inside a company.
 *
 * FOUR RULES. EVERY ONE OF THEM EXISTS TO STOP SOMEBODY JOINING A COMPANY THEY
 * DO NOT BELONG TO.
 *
 *   ONLY AN EXACT ADDRESS, NEVER A DOMAIN. Matching @northwind.test would hand
 *   the company to anybody who obtains one address at that domain — a contractor,
 *   a former employee, an alias. The roster row is a customer's own assertion
 *   that this named person is theirs; a domain is a guess about everybody at once.
 *   (Joining by email domain, U.3, is not this rule changing. Nobody is put into a
 *   company automatically: an admin switches it on for their own confirmed domain,
 *   and the person chooses to join on "Where do you work?". See auth.service
 *   `joinByDomain`.)
 *
 *   THEY JOIN AS A MEMBER, AND THERE IS NO ARGUMENT THAT ARRIVES. Being listed on
 *   a roster is not authority over the organisation. Nobody becomes an admin by
 *   being expected.
 *
 *   TWO ORGANISATIONS LISTING THE SAME ADDRESS IS A REFUSAL. It should not
 *   happen; where it does, picking one puts a person inside a company that never
 *   asked for them. They get their own workspace and somebody has to say.
 *
 *   A ROW ALREADY LINKED TO SOMEBODY ELSE'S ACCOUNT IS NOT A MATCH. That is a
 *   different person's seat, whatever the address says.
 *
 * AND THE ADDRESS IS PROVED FIRST. This runs at verification, never at sign-up,
 * so nothing here happens for an address the person has not opened mail at.
 */

export interface ARosterRow {
  personId: string;
  organizationId: string;
  email: string | null;
  active: boolean;
  linkedUserId: string | null;
}

export type WhereTheyBelong =
  | { join: true; organizationId: string; personId: string }
  | { join: false; because: string };

/**
 * Pure. `rowsWithThatAddress` is passed in already narrowed to the address, so
 * the query that finds them is the caller's and this file cannot accidentally
 * widen it to a domain.
 */
export function whereTheyBelong(rowsWithThatAddress: ARosterRow[]): WhereTheyBelong {
  /* Not a match: somebody already sits in that seat. */
  const unclaimed = rowsWithThatAddress.filter((r) => r.linkedUserId === null);

  /* A person their company switched off is not expected back. Being on a roster
     as INACTIVE is a record of somebody who left, and letting them in on it is
     the leaver keeping their access by signing up again. */
  const expected = unclaimed.filter((r) => r.active);

  if (expected.length === 0) {
    return { join: false, because: 'Nobody has listed that address, so they get a workspace of their own.' };
  }

  if (new Set(expected.map((r) => r.organizationId)).size > 1) {
    return {
      join: false,
      because:
        'More than one organisation lists that address. Which one they belong to cannot be decided here, so they get their own workspace and somebody has to say.',
    };
  }

  return { join: true, organizationId: expected[0].organizationId, personId: expected[0].personId };
}

/** What they are given when they do belong somewhere. Never an admin — see the rules above. */
export const ROLE_FOR_SOMEBODY_EXPECTED = 'MEMBER';
