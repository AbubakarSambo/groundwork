import { askName } from '../assistant/ask-name';
import { peersAreNamedByDefaultOn } from '../reports/peers-are-named';

/** The sentence about who sees what you say, for a check-in (whoSeesWhatYouSay). */
export function whoSeesWhatYouSayIn(g: { scenario?: any; peersVisibleToEachOther?: boolean | null; organization?: { name?: string | null } | null } | null | undefined): string {
  const ask = askName(g?.organization?.name ?? null);
  const together = g ? (g.peersVisibleToEachOther ?? peersAreNamedByDefaultOn(g)) : true;
  return together
    ? `The people in this check-in, including your manager, can see what you say in it. Your questions to ${ask} stay private.`
    : `Whoever runs this check-in can see what you say in it. The other people taking part do not see what you say. Your questions to ${ask} stay private.`;
}
