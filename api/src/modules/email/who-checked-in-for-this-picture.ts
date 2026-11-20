/**
 * WHO CHECKED IN FOR THE PICTURE THIS MAIL ANNOUNCES, SAID TO EACH READER FROM THE SESSION'S OWN ROWS (messages test, 19 October, finding 2).
 *
 * "Everybody on Sales team, Q4 has now checked in" went to Mercy and Joseph on Tuesday 13 October, when only Kevin and Amos had
 * answered session 2: a picture released at the end of the day is released with whoever answered. Now the mail says who did, read
 * from the rows of the session the picture is made from, and the reader is "you".
 *
 * Names only where the people in the check-in are named to each other for this reader (reports/peers-are-named.ts); otherwise a count.
 * Returns null when everybody asked has answered, and the mail says so as it always did.
 */
export interface SomebodyAskedThisSession {
  participantId: string;
  /** Their name as the record holds it, or null where it holds none. */
  name: string | null;
  answered: boolean;
}

const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const inWords = (n: number) => (n <= 10 ? WORDS[n] : String(n));
const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const listed = (names: string[]) => (names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`);

/** The others, by name where the reader may read them and every name is known, else "two other people". Lower case. */
function theOthers(some: SomebodyAskedThisSession[], named: boolean): string {
  const names = some.map((p) => (p.name ?? '').trim()).filter(Boolean);
  if (named && names.length === some.length && some.length <= 3) return listed(names);
  return `${inWords(some.length)} other ${some.length === 1 ? 'person' : 'people'}`;
}

export function whoCheckedInForThisPicture(
  checkInLabel: string,
  sessionNumber: number,
  asked: SomebodyAskedThisSession[],
  readerParticipantId: string,
  namedToEachOther: boolean,
): string[] | null {
  if (!asked.length || asked.every((p) => p.answered)) return null;
  const others = asked.filter((p) => p.participantId !== readerParticipantId);
  const reader = asked.find((p) => p.participantId === readerParticipantId);
  const answered = others.filter((p) => p.answered);
  const notYet = others.filter((p) => !p.answered);
  const forWhat = `check-in ${sessionNumber} of ${checkInLabel}`;

  const lines: string[] = [];
  if (reader?.answered) {
    lines.push(answered.length
      ? `You and ${theOthers(answered, namedToEachOther)} have checked in for ${forWhat}, and the shared picture is made from what you each said.`
      : `You have checked in for ${forWhat}, and the shared picture is made from what you said.`);
  } else if (answered.length) {
    const who = theOthers(answered, namedToEachOther);
    lines.push(`${capital(who)} ${answered.length === 1 ? 'has' : 'have'} checked in for ${forWhat}, and the shared picture is made from what they said.`);
  } else {
    lines.push(`Nobody has checked in for ${forWhat} yet.`);
  }

  if (reader && !reader.answered) {
    lines.push(notYet.length ? `You and ${theOthers(notYet, namedToEachOther)} have not checked in for it yet.` : 'You have not checked in for it yet.');
  } else if (notYet.length) {
    const who = theOthers(notYet, namedToEachOther);
    lines.push(`${capital(who)} ${notYet.length === 1 ? 'has' : 'have'} not checked in for it yet.`);
  }
  return lines;
}
