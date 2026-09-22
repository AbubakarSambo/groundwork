/**
 * A SHEET OF TARGETS IS READ, AND EACH NUMBER KEEPS ITS OWNER.
 *
 * Hafsah, 22 September 2026: "I updated an excel sheet and uploaded it onto the chat with my team
 * targets, rather than just go through the conversation, but it did not read the document and whose
 * targets belong to who."
 *
 * The file was read - a .xlsx becomes text on upload - and then two things happened to that text.
 * The acknowledgement saw the first thousand characters of it, to say its name. And the extraction
 * that writes targets read the TRANSCRIPT, so a lead who put the numbers in a sheet instead of
 * typing them had said nothing the record could keep. A spreadsheet of targets is the most ordinary
 * thing a manager has; typing it out again is the product asking for work it has already been given.
 *
 * WHAT THIS DOES. Reads one document's text for rows that pair a person with a number: the name as
 * the sheet writes it, what the number is of, and the number. Nothing else - not the commentary, not
 * the totals column, not the dates.
 *
 * WHAT IT DELIBERATELY DOES NOT DO. It does not guess who a name is. A name that matches nobody on
 * the check-in is dropped, by the same resolver the spoken path uses, because a target attached to
 * the wrong person is worse than a target nobody holds. It does not overwrite a number already on
 * the board. And it never states what it took as settled: the product writes the list, in its own
 * words, and asks the lead whether that is right - which is the one thing a model must not be
 * trusted to word, because a plausible wrong number read back as confirmed is unrecoverable.
 */

export interface ATargetFromASheet {
  /** The name exactly as the sheet writes it. Resolved against the roster by the caller. */
  personName: string;
  /** What the number is of, in the sheet's own words: "Q3 sales", "new dealers". */
  what: string;
  target: number;
}

export const A_SHEET_OF_TARGETS_PROMPT = `You are reading one document a manager attached to their check-in. Your only job is to find rows that give a PERSON a NUMBER to reach.

A row counts when all three are there: a person's name, what the number is of, and the number itself.

- "Dayo | Q3 sales | 45,000,000" is Dayo, Q3 sales, 45000000.
- "Chika Nwosu / new dealers signed / 12" is Chika Nwosu, new dealers signed, 12.
- A team total with no person's name against it is not a row. Leave it out.
- A column of dates, a percentage complete, or a number already achieved is not a target. Leave it out.
- A person named with no number, or a number with no person, is not a row. Leave it out.

Give back the name exactly as the document writes it. Do not correct it, expand it, or match it to anybody. Do not convert the number: 45,000,000 is 45000000, and "45m" is 45000000.

An empty answer is a correct answer. A document with no targets in it is an ordinary document.`;

export const A_SHEET_OF_TARGETS_SCHEMA = {
  name: 'emit_targets_from_the_sheet',
  description: 'Emit each row of the document that gives one person one number to reach.',
  input_schema: {
    type: 'object',
    properties: {
      rows: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            personName: { type: 'string', description: "The person's name exactly as the document writes it." },
            what: { type: 'string', description: 'What the number is of, in the document’s own words.' },
            target: { type: 'number', description: 'The number to reach.' },
          },
          required: ['personName', 'what', 'target'],
        },
      },
    },
    required: ['rows'],
  },
} as const;

/** How much of a document is read for this. A sheet of targets is small; a hundred-page plan is not this. */
export const MOST_OF_A_SHEET_WE_READ = 20_000;

const fmt = (n: number): string =>
  Math.abs(n) >= 1e6 ? `${+(n / 1e6).toFixed(n % 1e6 ? 1 : 0)}m` : Math.abs(n) >= 1e3 ? n.toLocaleString('en-GB') : String(n);

/**
 * THE PRODUCT'S OWN SENTENCE, NAMING WHAT IT TOOK AND WHOSE IT IS.
 *
 * Written here rather than asked of the model, for the reason at the top of this file. `kept` is what
 * landed on the record; `unmatched` are names the sheet has that this check-in does not, said plainly
 * so the lead can add the person or fix the spelling rather than wonder what happened to the row.
 */
export function whatTheSheetGave(
  fileName: string,
  kept: { who: string; what: string; target: number }[],
  unmatched: string[],
): string | null {
  if (!kept.length && !unmatched.length) return null;
  const lines: string[] = [];
  if (kept.length) {
    lines.push(`From ${fileName} I have put these on the record, each against the person who holds it:`);
    for (const k of kept) lines.push(`- ${k.who}: ${k.what}, ${fmt(k.target)}`);
  } else {
    lines.push(`I read ${fileName} and could not match any of its names to the people on this check-in.`);
  }
  if (unmatched.length) {
    lines.push(
      kept.length
        ? `${unmatched.length === 1 ? 'One name in it is' : `${unmatched.length} names in it are`} not on this check-in yet: ${unmatched.join(', ')}. Add them and their rows go on too.`
        : `The names it has: ${unmatched.join(', ')}.`,
    );
  }
  lines.push('Is that right?');
  return lines.join('\n');
}
