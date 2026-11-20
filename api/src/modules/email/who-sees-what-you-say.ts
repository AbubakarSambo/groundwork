import { askName } from '../assistant/ask-name';
import { peersAreNamedByDefaultOn } from '../reports/peers-are-named';
import { whoCanReadWhatYouSay } from '../grounds/who-may-read-this-check-in';

/**
 * The sentence about who sees what you say, for a check-in (whoSeesWhatYouSay).
 *
 * TO THE PERSON WHO RUNS IT, WRITTEN FOR THEM (Hafsah, 19 October, point 5: "Emails to the lead are written for the lead. Never
 * 'including your manager' ... to the person who runs it."). Grace and Wanjiru read, in every shared-picture email, "The people in this
 * check-in, including your manager, can see what you say in it." They are the manager. To the person who runs the check-in it says what
 * is true for them; everybody else reads the invitation's own sentence (join-invite.txt), as before.
 */
export function whoSeesWhatYouSayIn(g: { scenario?: any; peersVisibleToEachOther?: boolean | null; organization?: { name?: string | null } | null; initiator?: { firstName?: string | null } | null } | null | undefined, readerRunsIt = false): string {
  const ask = askName(g?.organization?.name ?? null);
  const together = g ? (g.peersVisibleToEachOther ?? peersAreNamedByDefaultOn(g)) : true;
  if (readerRunsIt) {
    return together
      ? `The people in this check-in can see what you say in it, and you can see what they say. Your questions to ${ask} stay private.`
      : `You can see what each person says in this check-in, and they do not see what each other says. Your questions to ${ask} stay private.`;
  }
  /* To everybody else, the one owner's sentence (grounds/who-may-read-this-check-in.ts). */
  return whoCanReadWhatYouSay(g, g?.initiator?.firstName ?? null);
}
