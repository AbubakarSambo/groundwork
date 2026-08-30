import { whatThisProves, Kind, Strength } from '../public-api/what-a-record-actually-proves';
import { NEVER_CONCLUDE } from '../public-api/what-a-record-actually-proves';

/**
 * WHAT THEIR OWN SYSTEMS SAY THIS PERSON DID, IN THE ROOM WHERE THEY ARE ASKED ABOUT IT.
 *
 * The principle this exists for: never ask somebody a question their own company already knows the
 * answer to. "How many shops did you visit" is a worse question than "twelve visits are recorded
 * and three have a next step - what happened in the other nine", and the second is only possible
 * if the interview can see the twelve.
 *
 * IT IS NOT A CHECKLIST TO WORK THROUGH. The interview is given what is on record and told to use
 * it where the conversation goes there. A session that reads a person their own activity log back
 * to them is an audit, and nobody answers an audit honestly.
 *
 * COUNTS AND SHAPES, NEVER CONTENT. What was said in any of these belongs to the people who said
 * it. What arrives here is that a visit was logged, on a day, at a shop, with the line somebody
 * wrote at the time.
 */

export interface Happened {
  kind: Kind;
  strength: Strength;
  happenedAt: Date;
  note: string | null;
  counterparty: string | null;
  sourceSystem: string;
  disputed: boolean;
}

/** More than this and the block stops being context and becomes a spreadsheet. */
export const MOST_IN_A_SESSION = 12;

export function whatTheirWeekLooksLike(items: Happened[], now: Date): string {
  if (!items.length) return '';

  const recent = [...items]
    .sort((a, b) => b.happenedAt.getTime() - a.happenedAt.getTime())
    .slice(0, MOST_IN_A_SESSION);

  const lines = recent.map((i) => {
    const when = i.happenedAt.toISOString().slice(0, 10);
    const where = i.counterparty ? ` (${i.counterparty})` : '';
    const note = i.note ? ` Their note: "${i.note}".` : '';
    /*
     * A DISPUTED RECORD STAYS IN, AND SAYS SO. Removing it would quietly settle the disagreement
     * in the record's favour by making it invisible; leaving it unmarked would settle it the other
     * way. Both sides stay, and the interview is told not to argue about it.
     */
    const disputed = i.disputed
      ? ' They have already said this record is wrong - do not press them on it again, and do not treat it as settled either way.'
      : '';
    return `- ${when}${where}: ${whatThisProves(i.kind, i.strength, 'they', i.counterparty)}${note}${disputed}`;
  });

  return [
    'WHAT THEIR OWN SYSTEMS RECORDED THIS PERIOD.',
    'From the tools this organisation already runs, not from anything we watched.',
    '',
    ...lines,
    '',
    'HOW TO USE IT.',
    'Never ask them something this already answers. "How many shops did you visit" is a question',
    'their company can answer without them; "nine of the twelve visits have nothing recorded after',
    'them - what happened there" is a question only they can answer.',
    '',
    'Use it where the conversation is already going there. This is not a list to work through, and',
    'a session that reads somebody their own activity log back to them is an audit - nobody answers',
    'an audit honestly.',
    '',
    'A RECORD BEING ABSENT IS NOT AN EVENT. If something they describe is not here, the ordinary',
    'explanations are that it was done somewhere nothing is connected to, or that the tool failed.',
    'Ask which; accept the answer; never say the record proves it did not happen.',
    '',
    NEVER_CONCLUDE,
  ].join('\n');
}
