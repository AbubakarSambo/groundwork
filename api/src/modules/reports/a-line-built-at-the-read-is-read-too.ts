/**
 * A LINE BUILT AT THE READ IS HELD TO THE SAME TESTS AS ONE BUILT AT THE WRITE.
 *
 * Seniorhire, check-3, the lead's report, in "what to ask each person":
 *
 *   "you is waiting on them for the initiation of commercial discussions. Ask what that is waiting on."
 *
 * The probe list and the coaching note are not stored. They are built when the report is read, with
 * the reader's own "you" already put in by `nameOf`, so they never pass through `withNames`, whose
 * rules make "you" read as "you"; and they are not in the stored report, so the check before a report
 * is kept (every-line-is-read-before-it-is-kept) never saw them either.
 *
 * So both get the two things that can be done at the read without a model: the verb agreement and
 * the capital from `withNames` (theVerbAgreesWithYou), and then the run scorer's own tests. A line of
 * a list that still fails a test that may drop is taken out of the list, under the same no-blank rule
 * as the check: an item of a list goes, a field on its own stays as it is. Nothing is rebuilt and no
 * model is asked; the line is made to read right or it is not shown. Quoted words are never touched.
 */
import { theVerbAgreesWithYou } from './party-labels';
import { whatIsWrongWith } from './a-line-a-person-can-read';

/* Labels and identifiers, never prose - the same keys the quote pass leaves alone. */
const NOT_PROSE = /^(label|participantLabel|who|on|from|fieldId|code|status|type|band|tone)$|Id$|Ids$/;

export function linesBuiltAtTheRead<T>(value: T, dropped: string[] = []): T {
  const walk = (v: any, inAList: boolean): any => {
    if (typeof v === 'string') {
      const now = theVerbAgreesWithYou(v);
      if (inAList && whatIsWrongWith(now).some((h) => h.dropIfUnfixed)) { dropped.push(now); return DROP; }
      return now;
    }
    if (Array.isArray(v)) return v.map((x) => walk(x, true)).filter((x) => x !== DROP);
    if (v && typeof v === 'object' && !(v instanceof Date)) {
      const out: Record<string, any> = {};
      for (const [k, x] of Object.entries(v)) out[k] = NOT_PROSE.test(k) ? x : walk(x, false);
      return out;
    }
    return v;
  };
  return walk(value, false);
}

const DROP = Symbol('drop');
