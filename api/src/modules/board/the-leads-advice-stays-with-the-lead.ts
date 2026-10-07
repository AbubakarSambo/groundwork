/**
 * WHAT THE BOARD SAYS TO THE LEAD IS NOT SERVED TO THE PERSON IT IS ABOUT (B-109).
 *
 * A participant reads their own row of "contribution" and "where work is landing". Both rows carry
 * sentences written to whoever runs the check-in, about how to read that person:
 *
 *   "Define what it is responsible for before assessing anyone against it. An undefined role is
 *    often the real problem, not the person."
 *   "Define what this role owns before reading anything into where work is landing."
 *   "Take the blocked part out before you read anything into the rest."
 *   "Worth asking about, not concluding."
 *
 * That is advice to the lead about the person, and the person reading it is reading the lead's
 * judgement of them. Nobody who does not run the check-in is sent it, and nobody is handed it with
 * the words hidden by the screen: it is taken out here, on the server. The lead and an admin with
 * access keep every word. The person's own row keeps what it says about themselves.
 */
/**
 * Of the reasons a coverage row can carry, only SHARED_BY_DESIGN is a plain statement about the person
 * ("Your responsibilities are staying with you", or "you said this was handed over deliberately"). The
 * other four sentences tell the lead how to read the person ("Watch for overload", "Take the blocked
 * part out before you read anything into the rest", "Worth asking about, not concluding", "Treat it
 * as a question") and go.
 */
const SAYS_HOW_TO_READ_THE_PERSON = new Set(['CANNOT_DETERMINE', 'OVER_REACH', 'BLOCKED_OR_OVERLOADED', 'OWNERSHIP_DROP']);

export function withoutTheLeadsAdvice<T extends Record<string, any>>(row: T): T {
  if (!row || typeof row !== 'object') return row;
  const { note: _note, ...rest } = row as Record<string, any>;
  if (SAYS_HOW_TO_READ_THE_PERSON.has(String(rest.reason ?? ''))) delete rest.reasonText;
  return rest as T;
}

export function contributionWithoutTheLeadsAdvice(rows: any): any {
  return Array.isArray(rows) ? rows.map(withoutTheLeadsAdvice) : rows;
}

export function coverageWithoutTheLeadsAdvice(coverage: any): any {
  if (!coverage || typeof coverage !== 'object' || !Array.isArray(coverage.reads)) return coverage;
  return { ...coverage, reads: coverage.reads.map(withoutTheLeadsAdvice) };
}
