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

export function thePartialPicture(label: string, progress: { answered: string[]; ofHowMany: number }, left?: WhoIsLeft) {
  const n = progress.answered.length;
  const of = progress.ofHowMany;
  return {
    subject: `${capital(aNumberInWords(n))} of ${aNumberInWords(of)} people have checked in on "${label}", and it is not the whole team's view yet`,
    lines: [
      `${capital(aNumberInWords(n))} of ${aNumberInWords(of)} people have checked in so far: ${listed(progress.answered)}.`,
      "That is not yet the whole team's view, so Groundwork has not drawn any conclusion about the team from it.",
      ...(left && left.count > 0 ? [haveNotCheckedInSaid(left)] : []),
      'The shared picture is made once everyone is in.',
    ],
  };
}
