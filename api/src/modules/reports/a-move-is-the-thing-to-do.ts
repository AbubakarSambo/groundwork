/**
 * A MOVE THAT TELLS THE READER TO DO SOMETHING IS WRITTEN AS THE THING TO DO.
 *
 * The judgement is written about labels, and the reader is one of them: "the initiator". So the
 * model writes a move as if the lead were somebody else - "Tell the initiator to get Participant A
 * and Participant B in a room" - and when it is served the label becomes "you", and the lead reads
 * "Tell you to get Chidi Eze and Sara Lindqvist in a room". Run-7 had three of these, on the
 * workplan and project scenarios, after the instruction had already been told not to write them
 * (a5f6e8dc). The instruction stays. This is the check behind it, run where the judgement is
 * stored, while the text still holds labels.
 *
 * ONLY TWO SHAPES ARE TOUCHED, and only at the start of the move:
 *   "Tell / Instruct / Ask / Remind / Advise / Encourage / Direct the initiator to X"  becomes  "X"
 *   "Get the initiator, A, and B to X"  becomes  "Get A and B to X"
 * Every other move is left exactly as it is, and so is anything inside quotation marks: people's
 * words are theirs, and this only ever rewrites the engine's own opening words.
 */

const TELLS_THE_READER = /^(?:tell|instruct|ask|remind|advise|encourage|direct)\s+/i;
const A_QUOTE = /["“”‘’']/;

const capitalised = (s: string): string => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

function asAList(names: string[]): string {
  if (names.length <= 1) return names.join('');
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

export function aMoveForTheReader(move: string, readersLabel: string): string {
  const text = (move ?? '').trim();
  const label = (readersLabel ?? '').trim().toLowerCase();
  if (!text || !label) return move;

  /* "Tell the initiator to get X in a room" -> "Get X in a room". */
  const told = TELLS_THE_READER.exec(text);
  if (told) {
    const after = text.slice(told[0].length);
    const lead = `${label} to `;
    if (after.toLowerCase().startsWith(lead)) {
      const rest = after.slice(lead.length).trim();
      if (rest) return capitalised(rest);
    }
    return move;
  }

  /* "Get the initiator, A, and B to agree" -> "Get A and B to agree". */
  const got = /^get\s+(.+?)\s+to\s+(.+)$/i.exec(text);
  if (got && !A_QUOTE.test(got[1])) {
    const names = got[1].split(/\s*,\s*(?:and\s+)?|\s+and\s+/i).map((n) => n.trim()).filter(Boolean);
    const others = names.filter((n) => n.toLowerCase() !== label);
    if (others.length === names.length) return move;
    if (!others.length) return capitalised(got[2].trim());
    return `Get ${asAList(others)} to ${got[2].trim()}`;
  }

  return move;
}
