/**
 * WHY YOU CANNOT SEE THIS, IN THE RIGHT WORDS.
 *
 * One sentence — "Report not found." — was shown for a server error, for a check-in somebody is
 * not on, and for a report that has not been written yet. Three different situations, two of which
 * a person can act on, all reported as the third. The audit met this from both ends: 64 of the
 * hundred journeys read it seconds after finishing their own check-in.
 *
 * The API now sends a real sentence with the 404 (see api/src/modules/reports/
 * why-there-is-no-report-yet.ts), so the rule here is: prefer what the server said, and only fall
 * back to a shape-based sentence where it said nothing.
 */

export interface WhatCameBack {
  status?: number;
  /** The sentence the API sent, if it sent one. */
  message?: string;
}

export function whatWentWrong(e: unknown): WhatCameBack {
  const r = (e as any)?.response;
  return { status: r?.status, message: r?.data?.message };
}

export function whyYouCannotSeeThis(what: WhatCameBack): { say: string; canRetry: boolean } {
  /* THE SHAPE CHECK FIRST. An array is what class-validator sends, and it is not a sentence for a
     person — asking it to trim throws, which is how this line was written the first time. */
  const sentence = typeof what.message === 'string' ? what.message.trim() : '';

  if (what.status === 403) {
    return { say: sentence || 'This record belongs to a check-in you are not part of.', canRetry: false };
  }
  if (what.status === 404) {
    return { say: sentence || 'There is nothing at this address. The link may be out of date.', canRetry: false };
  }
  if (what.status === 401) {
    return { say: 'You have been signed out. Sign in again and the record will be here.', canRetry: false };
  }
  if (typeof what.status === 'number' && what.status >= 500) {
    /* NOT "not found": the record exists and we failed to fetch it. Telling somebody their record
       is missing when the server broke is the worst of the three, and it was the default. */
    return { say: 'Something on our side failed while opening this record. It is still there.', canRetry: true };
  }
  if (what.status === undefined) {
    return { say: 'We could not reach the record just then. Check your connection and try again.', canRetry: true };
  }
  return { say: sentence || 'This record could not be opened.', canRetry: true };
}
