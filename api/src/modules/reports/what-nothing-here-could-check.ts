/**
 * WHICH PARTS OF THIS REPORT WERE CHECKED AGAINST ANYTHING, AND WHICH WERE NOT.
 *
 * The report already says it is built from what people said themselves and is not independently
 * verified. That sentence is true and it is not enough, because it is the same sentence whether
 * every claim in the report was corroborated by three other accounts or none of them were. A reader
 * cannot act differently on the two, so in practice they act the same on both - which means the
 * caveat is doing no work at all.
 *
 * The cost of that shows up hardest where the reader cannot judge the content themselves. A
 * non-technical person reading about technical work, a board member reading about a market they do
 * not know: they have no independent way to tell a claim that stood up from one that was simply
 * repeated, and a well-written report reads equally confident about both. That is not a small
 * imperfection. It is the report converting an open question into a settled one.
 *
 * WHAT COUNTS AS CHECKED IS DELIBERATELY NARROW:
 *
 *   Somebody else's own account of the same work, given separately.
 *   A document that was attached rather than remembered.
 *   A record from a system, at a strength above somebody's own say-so.
 *
 * Not counted: how much detail somebody gave, how confident they sounded, how many sessions they
 * did. Those describe the telling, not the thing told, and treating them as corroboration is the
 * exact mistake this file exists to stop.
 *
 * UNCHECKED IS NOT DOUBTED. Most true things in any report are unchecked, because most work leaves
 * no trace and nobody is watching. The wording never suggests otherwise, and a report where nothing
 * could be checked is still a real report - it is just one to hold more lightly, which is a thing
 * the reader is entitled to know.
 *
 * NOTHING HERE IS A NUMBER ABOUT A PERSON. Every count is a count of CLAIMS, and the sentences are
 * about the record. "Two of six were checked" describes what the record holds. "You corroborated 33
 * percent" would be a score, and there is no version of that which is not one.
 */

export interface AClaim {
  /** What was said, only used to know one claim from another. Never rendered by this file. */
  what: string;
  /** Did somebody else give their own separate account touching the same work? */
  anotherAccount: boolean;
  /** Was a document attached rather than the thing being recalled? */
  document: boolean;
  /** Is there a record from a system stronger than somebody's own say-so? */
  record: boolean;
}

export interface WhatCouldBeChecked {
  checked: number;
  total: number;
  /** Sentences, in the order they should be read. Empty when there is nothing worth saying. */
  says: string[];
}

/** A claim is checked when ANY of the three exists. One corroborating source is the bar. */
export function wasChecked(c: AClaim): boolean {
  return c.anotherAccount || c.document || c.record;
}

/**
 * WHETHER THERE WAS ANYBODY TO CHECK AGAINST AT ALL is the first thing said, when it applies.
 *
 * A one-party ground where nobody else has checked in is not a report with weak corroboration; it
 * is a report where corroboration was never possible. Those are different, and a reader told the
 * second will read the whole thing differently - correctly.
 */
export const NOBODY_TO_CHECK_AGAINST =
  'Nobody else has answered yet, so nothing in this report has been checked against what'
  + ' another person said. It is what one person said about the work, which is a real thing to read and not the same'
  + ' as something people agree on.';

/**
 * WHEN THE WORKING-OUT ITSELF FAILED, WHICH MUST NOT BE SILENT.
 *
 * The obvious way to make this safe is to let it fail to nothing - a report is worth more than its
 * caveat, so a database hiccup should not cost the whole thing. But a caveat that disappears when it
 * cannot be computed leaves a report reading exactly as confident as one where everything checked
 * out, which is the failure this whole file was written to remove. So it fails to a sentence, not to
 * silence.
 */
export const COULD_NOT_WORK_IT_OUT =
  'It was not possible to work out which parts of this report line up with anything other than what'
  + ' one person said. Read all of it as what one person said until you can check it yourself.';

export const UNCHECKED_IS_NOT_DOUBTED =
  'Not being checked does not make something wrong. Most of what people do leaves no record, and'
  + ' most true things in any report are unchecked. It means hold it more lightly, not less.';

export function whatCouldBeChecked(claims: AClaim[], othersWhoGaveAnAccount: number): WhatCouldBeChecked {
  const total = claims.length;
  const checked = claims.filter(wasChecked).length;

  if (!total) return { checked: 0, total: 0, says: [] };

  const says: string[] = [];

  if (othersWhoGaveAnAccount === 0) {
    says.push(NOBODY_TO_CHECK_AGAINST);
  }

  /* One thing is "the one thing", never "all 1 of the things"; the list of what it was checked
     against is a sentence of its own, never hung on a dash. */
  const things = (n: number) => (n === 1 ? 'thing' : 'things');
  const are = (n: number) => (n === 1 ? 'is' : 'are');
  const AGAINST = ' It is backed by what another person said, a document, or a record.';
  if (checked === 0) {
    says.push(
      total === 1
        ? 'The one thing described here could not be checked against what another person said, a document,'
          + ' or a record from a system. It is in this report because somebody said it.'
        : `None of the ${total} things described here could be checked against what another person said, a`
          + ' document, or a record from a system. They are in this report because somebody said them.',
    );
  } else if (checked === total) {
    says.push(
      total === 1
        ? 'The one thing described here lines up with something other than what the person said.' + AGAINST
        : `All ${total} of the things described here line up with something other than what the person said.`
          + ' Each one is backed by what another person said, a document, or a record.',
    );
  } else {
    /*
     * THE ORDINARY CASE, and the one the wording has to get right. It names both halves in the same
     * sentence so neither can be read alone: some of this stood up against something, and some of
     * it is here because it was said.
     */
    const rest = total - checked;
    says.push(
      `${checked} of the ${total} ${things(total)} described here ${checked === 1 ? 'lines' : 'line'} up with something other than what the person`
      + ` said. The other ${rest === 1 ? 'one is' : `${rest} ${are(rest)}`} in this report because somebody said`
      + ` ${rest === 1 ? 'it' : 'them'}, and nothing else in the record speaks to ${rest === 1 ? 'it' : 'them'} either way.`,
    );
  }

  says.push(UNCHECKED_IS_NOT_DOUBTED);
  return { checked, total, says };
}
