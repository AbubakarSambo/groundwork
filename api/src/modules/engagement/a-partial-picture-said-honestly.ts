import { aNumberInWords } from './a-number-in-words';
import { haveNotCheckedInSaid, type WhoIsLeft } from '../email/who-has-not-checked-in-yet';

/**
 * PARTIAL PARTICIPATION, SAID HONESTLY (decision 109; spec section 36, journey 4).
 *
 * When some of the people have answered and some have not, the lead is told how many are in and who, that this is not yet the whole team's view,
 * and what is missing. Nothing is concluded about the team from the ones who answered. Names are the lead's to read, as they are on her board.
 */
const capital = (s: string) => `${s.charAt(0).toUpperCase()}${s.slice(1)}`;
const listed = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

export function thePartialPicture(label: string, progress: { answered: string[]; ofHowMany: number; /** The lead is one of the people counted and has not answered herself. */ youAreStillToAnswer?: boolean }, left?: WhoIsLeft) {
  const n = progress.answered.length;
  const of = progress.ofHowMany;
  const verb = n === 1 ? 'has' : 'have';
  /* "You" is the lead herself, so the verb is "have" whenever she is one of them. */
  const who = capital(listed(progress.answered));
  const isHave = progress.answered.length === 1 && progress.answered[0] !== 'you' ? 'has' : 'have';
  return {
    subject: `${capital(aNumberInWords(n))} of ${aNumberInWords(of)} people ${verb} checked in on "${label}", and it is not the whole team's view yet`,
    lines: [
      `${who} ${isHave} checked in so far, ${aNumberInWords(n)} of the ${aNumberInWords(of)} people in it.`,
      "That is not yet the whole team's view, so Groundwork has not drawn any conclusion about the team from it.",
      ...(left && left.count > 0 ? [haveNotCheckedInSaid(left)] : []),
      /* The people left to check in are counted without the lead, who is reading this. When she is one of the people counted and has not answered, the counts only add up
         if she is told so: "one of the nine" and "seven have not" leaves one person nobody mentions. */
      ...(progress.youAreStillToAnswer ? ['You have not checked in yet either.'] : []),
      'The shared picture is made once everyone is in.',
    ],
  };
}
