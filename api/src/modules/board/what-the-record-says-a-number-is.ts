/**
 * WHAT THE RECORD SAYS A TARGET IS AT, READ BY THE THING THAT CAN READ.
 *
 * The board has had the screen for this all along - "The record shows 40 for this, not 0. Use 40",
 * with a press to accept it - and the rule behind it never once fired.
 *
 * The rule required every word of the target's name longer than three letters to appear in a single
 * entry, with trailing esses stripped, AND a verb from a list of nine: signed, closed, paying, live,
 * onboarded, delivered, shipped, joined, confirmed. Then it suggested the NUMBER OF MATCHING
 * ENTRIES rather than the number the person said.
 *
 * Run against a real quarter, with a target of "Teams migrated: 40" and a team who reported
 * "Nine of the forty teams are migrated" and later "All forty migrated by Friday", the board read
 * 0 of 40 at the close. The first sentence has no listed verb; the second has no "team". Zero of
 * fourteen entries matched, and the lead's central question - are we tracking - was answered wrong.
 *
 * WHICH SENTENCE REPORTS A NUMBER AGAINST WHICH TARGET IS A READING, and this codebase has now
 * learnt the same lesson three times in one day: a word list cannot read English, and the repair is
 * never a longer list. So the model reads it and the code uses the answer.
 *
 * THE EXAMPLES IN THE PROMPT ARE DELIBERATELY NOT THE SENTENCES IT IS CHECKED ON. The first pass
 * used the run's own lines as the examples, so the check was partly asking the model to copy the
 * prompt back. Different words, same shapes.
 *
 * WHAT DOES NOT CHANGE. The board never silently overwrites what a person set. This produces a
 * suggestion, beside their number, with the sentence it came from so they can see what they are
 * accepting; the lead presses to take it. That rule was right when it was written and it stays.
 */

export interface ATarget {
  id: string;
  name: string;
  target: number | null;
  count: number;
}

export interface SomethingSaid {
  text: string;
  /** Whose line it is, for the prompt's benefit only; nothing here is about the person. */
  who: string | null;
}

export interface AReadNumber {
  objectiveId: string;
  count: number;
  said: string;
}

export const WHAT_THE_RECORD_SAYS_PROMPT = `You are reading a team's own words for the current value of the numbers their lead is tracking.

You will be given the targets, each with a name and the number the lead currently has recorded, and the lines people said in this round.

Work through the targets ONE AT A TIME, in the order given, and decide each one before moving to the next. Answer for every target somebody reported a number against: two targets reported means two answers, and stopping after the first is the commonest way to get this wrong.

A line does not have to repeat the target's name. "All forty are done" against a target called "Sites onboarded, target 40" is that target at 40 - the number and the target's own total are the match.

Where a later line supersedes an earlier one, take the later.

For each, give the number the line reports the target is AT NOW.

- "we closed the last three, so all twelve are signed" against "Contracts signed" is 12 - the total reached, not the three.
- "seven of the thirty are onboarded" against "Sites onboarded" is 7 - what is done, never the target.
- "we're at just over 4,000 users" against "Paying users" is 4000.
- "I want us at fifty by March" is a hope, not a count. Do not read a number from it.
- "support handled nine tickets" against "Sites onboarded" is about tickets. Do not force a match.

Only where a line genuinely reports the current value of that target. Where nothing does, leave the target out. An empty answer is a correct answer, and a wrong number is worse than none - a lead is being asked to accept this.

Give back, for each target you can answer: its id, the number, and the exact line you read it from.`;

export const WHAT_THE_RECORD_SAYS_SCHEMA = {
  name: 'emit_numbers_the_record_reports',
  description: 'Emit the current value each target is reported at, and the line it was read from.',
  input_schema: {
    type: 'object',
    properties: {
      numbers: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            objectiveId: { type: 'string', description: 'The id of the target this is the value of.' },
            count: { type: 'number', description: 'The number the record reports it is at now.' },
            said: { type: 'string', description: 'The exact line it was read from.' },
          },
          required: ['objectiveId', 'count', 'said'],
        },
      },
    },
    required: ['numbers'],
  },
};

/** The targets and the lines, as the model is given them. */
export function theQuestion(targets: ATarget[], said: SomethingSaid[]): string {
  return (
    'TARGETS\n'
    + targets.map((t) => `- id ${t.id}: "${t.name}"${t.target != null ? `, target ${t.target}` : ''}, currently recorded as ${t.count}`).join('\n')
    + '\n\nWHAT PEOPLE SAID THIS ROUND\n'
    + said.map((s) => `- ${s.text}`).join('\n')
  );
}

/**
 * WHAT SURVIVES THE READ.
 *
 * A suggestion the lead is asked to accept has to clear a low bar honestly: a real number, a target
 * that exists, and something different from what they already have. The last one matters most - the
 * screen says "the record shows X, not Y", and offering to change 40 to 40 is a prompt about
 * nothing that trains somebody to ignore the next one.
 */
export function onlyWhatIsWorthOffering(read: AReadNumber[], targets: ATarget[]): AReadNumber[] {
  const byId = new Map(targets.map((t) => [t.id, t]));
  const seen = new Set<string>();
  return read.filter((r) => {
    const t = byId.get(r.objectiveId);
    if (!t) return false;
    if (!Number.isFinite(r.count) || !Number.isInteger(r.count) || r.count < 0) return false;
    if (r.count === t.count) return false;
    if (!r.said?.trim()) return false;
    /* One suggestion per target: two readings of the same number is a choice nobody asked for. */
    if (seen.has(r.objectiveId)) return false;
    seen.add(r.objectiveId);
    return true;
  });
}
