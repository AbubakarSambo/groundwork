/**
 * WHERE THE ROSTER AND A SIGNED-IN ACCOUNT MEET.
 *
 * `Person.linkedUserId` has existed since the roster was built, is documented as
 * "where the two meet if and when that person actually signs in", and was
 * written by nothing and read by nothing. That is why the embedded panel could
 * never run a check-in: a check-in belongs to a participant, a participant is a
 * User, and the panel knows a Person.
 *
 * THE MATCH IS ON THE ADDRESS, AND ONLY ON THE ADDRESS.
 *
 * Not on the name — two people called Sam would be merged by it, and merging
 * the wrong two people hands one of them the other's private check-in. There is
 * no version of that mistake that is recoverable, so the rule is the same one
 * the back office uses for the same reason: an address is a fact, a name is a
 * guess, and this code never guesses.
 *
 * A person with no match is REFUSED WITH A SENTENCE rather than shown an empty
 * panel. "There is nothing for you" and "we cannot tell who you are" look
 * identical to somebody reading a screen, and they need opposite things done
 * about them.
 */

export interface SomebodyOnTheRoster {
  id: string;
  externalId: string;
  email: string | null;
  linkedUserId: string | null;
}

export interface AnAccount {
  id: string;
  email: string;
}

export type WhoTheyAre =
  | { linked: true; userId: string; newlyLinked: boolean }
  | { linked: false; because: string };

/**
 * The account this panel person signs in as, or why there is not one.
 *
 * `accountsInTheOrg` is passed rather than looked up so this file can be read
 * and tested without a database, and so that the caller — which knows which
 * organisation is asking — is the thing that scopes it. An account from
 * another organisation must never reach here at all.
 */
export function whoThePanelIsSignedInAs(
  person: SomebodyOnTheRoster,
  accountsInTheOrg: AnAccount[],
): WhoTheyAre {
  if (person.linkedUserId) {
    return { linked: true, userId: person.linkedUserId, newlyLinked: false };
  }

  const address = person.email?.trim().toLowerCase();
  if (!address) {
    return {
      linked: false,
      because:
        'This person has no email address on the roster, so there is no way to tell which account is theirs. Push their address, or link the account explicitly.',
    };
  }

  const matches = accountsInTheOrg.filter((a) => a.email.trim().toLowerCase() === address);

  /*
   * TWO MATCHES IS A REFUSAL, NOT A CHOICE.
   *
   * It should be impossible — an address identifies one account — and if it
   * ever happens, picking one is picking whose check-in a stranger reads.
   */
  if (matches.length > 1) {
    return {
      linked: false,
      because:
        'More than one account in this organisation carries that address, so which one is theirs cannot be decided here. Somebody has to say.',
    };
  }

  if (matches.length === 0) {
    return {
      linked: false,
      because:
        'Nobody has signed in with that address yet, so there is no account to open their check-in as. They sign in once, and this connects itself.',
    };
  }

  return { linked: true, userId: matches[0].id, newlyLinked: true };
}
