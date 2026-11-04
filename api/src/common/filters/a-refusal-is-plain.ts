/**
 * EVERY REFUSAL, NOT-FOUND AND FAILURE A PERSON IS SERVED READS AS PLAIN SENTENCES THAT SAY WHAT HAPPENED AND WHAT TO DO NEXT.
 *
 * (Piece 6, small states. The prototype's small states: "Every one says what happened, what's safe, and what to do next.
 * None apologises, none is vague, and none leaves someone stuck.")
 *
 * The global filter is the one door every error passes, so the defaults are made plain here rather than on each screen and
 * each controller. Three kinds of thing get through it that no person should read:
 *
 *  - FRAMEWORK DEFAULTS. A route that does not exist answers "Cannot GET /api/v1/x", an unsigned request "Unauthorized",
 *    a refused one "Forbidden resource", a wrong request "Bad Request". Each is replaced by a sentence for a person.
 *  - A CRASH'S OWN WORDS. A plain `Error` thrown by our own code ("Cannot read properties of undefined (reading 'id')")
 *    went straight into the body. The detail goes to the log; the person reads one sentence about it.
 *  - THE PIPE'S FIELD LIST. "The request did not validate: name must be a string" is a developer's sentence. A person reads
 *    that something they sent could not be used. The list still travels as `errors` for a machine to read.
 *
 * And every sentence that is left is made into a sentence: it starts with a capital letter and ends with a full stop. Nothing
 * else is rewritten, so a refusal somebody wrote for a person is passed on word for word.
 *
 * NOT FOR THE DEVELOPER API. The published surfaces (`isPublished`) are read by a developer's code, where a field name such
 * as `startsAt` is the vocabulary, so the filter calls this only for the screens' own routes.
 */

export const SOMETHING_WENT_WRONG = 'Something went wrong on my side. Please try again in a minute, and if it happens again, tell me.';

const BY_DEFAULT: Record<string, string> = {
  'bad request': 'That could not be done as it was sent, so check what you typed and try again.',
  'unauthorized': 'You need to be signed in to do that, so sign in and try again.',
  'forbidden': 'You are not allowed to do that here, so ask an admin of your organisation if you need it.',
  'forbidden resource': 'You are not allowed to do that here, so ask an admin of your organisation if you need it.',
  'not found': 'That page or action is not there, so go back and start again from Today.',
  'method not allowed': 'That page or action is not there, so go back and start again from Today.',
  'conflict': 'That clashes with something already here, so refresh the page and try again.',
  'gone': 'That is not available any more, so go back and start again from Today.',
  'payload too large': 'That is too large to send, so choose something smaller and try again.',
  'request entity too large': 'That is too large to send, so choose something smaller and try again.',
  'unprocessable entity': 'That could not be used as it was sent, so check what you typed and try again.',
  'internal server error': SOMETHING_WENT_WRONG,
  'service unavailable': 'Groundwork cannot do that for a moment, so please try again in a minute.',
  'bad gateway': 'Groundwork cannot do that for a moment, so please try again in a minute.',
  'gateway timeout': 'That took too long, so please try again in a minute.',
};

const NOTHING_AT_THAT_ADDRESS = 'That page or action is not there, so go back and start again from Today.';
export const SOMETHING_YOU_SENT_COULD_NOT_BE_USED = 'Something you sent could not be used, so check what you typed and try again.';

export type HowItFailed = {
  /** The pipe listed fields that did not validate, and none was a sentence written for a person. */
  fromTheValidationList?: boolean;
  /** Our own code threw a plain `Error`: nothing in its message was written for a person. */
  fromOurOwnCrash?: boolean;
};

/** Capital letter at the start, a full stop at the end, and nothing else touched. */
export function asASentence(message: string): string {
  let m = message.trim();
  if (!m) return m;
  if (/^[a-z]/.test(m)) m = m[0].toUpperCase() + m.slice(1);
  if (!/[.!?]["')’”]?$/.test(m)) m += '.';
  return m;
}

export function aPlainRefusal(status: number, message: string, how: HowItFailed = {}): string {
  if (how.fromOurOwnCrash) return SOMETHING_WENT_WRONG;
  if (how.fromTheValidationList) return SOMETHING_YOU_SENT_COULD_NOT_BE_USED;
  const m = (message ?? '').trim();
  if (!m) return status >= 500 ? SOMETHING_WENT_WRONG : BY_DEFAULT[statusWord(status)] ?? SOMETHING_YOU_SENT_COULD_NOT_BE_USED;
  if (/^Cannot (GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS) /.test(m)) return NOTHING_AT_THAT_ADDRESS;
  /* The parser's own words for a body that is not JSON ("Unexpected end of JSON input", "Unexpected token } in JSON at position 41"). */
  if (status === 400 && (/\bJSON\b/.test(m) || /^Unexpected (token|end|non-whitespace)/i.test(m))) return BY_DEFAULT['bad request'];
  const plain = BY_DEFAULT[m.toLowerCase().replace(/\.$/, '')];
  if (plain) return plain;
  return asASentence(m);
}

function statusWord(status: number): string {
  switch (status) {
    case 400: return 'bad request';
    case 401: return 'unauthorized';
    case 403: return 'forbidden';
    case 404: return 'not found';
    case 409: return 'conflict';
    case 413: return 'payload too large';
    default: return status >= 500 ? 'internal server error' : 'bad request';
  }
}
