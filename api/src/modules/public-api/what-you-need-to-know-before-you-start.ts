import { GroundScenario, GroundMoment, ObjectiveKind } from '@prisma/client';

/**
 * The contract, readable before you fail it.
 *
 * Connecting a system to this API takes six calls, and four of them fail on the
 * first attempt — not because anything is broken, but because each one knows
 * something the caller does not and only says it once the caller has guessed
 * wrong. Walking the whole path as a customer for the first time, that is what
 * it cost:
 *
 *   SCIM stored no email and the failure surfaced three calls later.
 *   `moment` must be one of three values, discovered by sending a fourth.
 *   Opening a check-in needs the person to have SIGNED IN, which nothing says
 *     until it refuses.
 *   The objectives endpoint wants `text`, and `described` is the word every
 *     other part of the product uses.
 *   `kind` is required, and its error is the only place the seven live.
 *
 * Every one of those errors is well written. The problem is that reading them
 * requires already having made the mistake, and an integrator who has made four
 * mistakes in six calls concludes the API is difficult rather than that they are
 * three steps from finished.
 *
 * So this is one call that answers all of it in advance. Generated from the same
 * enums the validators use, so it cannot drift into describing an API we do not
 * have.
 */

export interface IntegrationStep {
  n: number;
  call: string;
  why: string;
  /** The thing that is not obvious and that costs an afternoon. */
  watchOutFor?: string;
}

export const THE_SEQUENCE: IntegrationStep[] = [
  {
    n: 1,
    call: 'POST /scim/v2/Users',
    why: 'Tell us who your people are. Everything after this refers to them.',
    watchOutFor:
      'Send the address in emails[]. A userName that is an email works too, but a bare login handle leaves the person with no address and nothing fails until step 4.',
  },
  {
    n: 2,
    call: 'Each person signs in to Groundwork once',
    why: 'A check-in is opened AS somebody, and that needs an account rather than a directory entry.',
    watchOutFor:
      'This is a human step in the middle of an automated sequence. Nothing before it will tell you it is coming, and step 4 refuses until it has happened.',
  },
  {
    n: 3,
    call: 'POST /subjects',
    why: 'The things your people work on, so evidence and conversation can point at the same thing twice.',
  },
  {
    n: 4,
    call: 'POST /grounds',
    why: 'Open a check-in. Same engine and same report as one opened in the product.',
    watchOutFor:
      'scenario and moment are both required, and both are closed sets - see `vocabulary` below. `startsAt` (ISO date) holds the first session until that day; `timelineDays` is any number of days, 21 for three weeks; `brief` is what everybody works from.',
  },
  {
    n: 5,
    call: 'POST /grounds/:groundId/objectives',
    why: 'Put the objectives on the check-in. This is where evidence attaches.',
    watchOutFor:
      'The field is `text`, not `described`. `kind` is required and the seven values are not interchangeable.',
  },
  {
    n: 6,
    call: 'PUT /evidence',
    why: 'Push your current numbers against those objectives.',
    watchOutFor:
      'Evidence attaches to an objective ON A CHECK-IN, not to a subject. Push it against a subject id and you get a 200 with `"matched": false` on every row and nothing written. The response carries `matched`, `unmatched` and a `says` line for exactly this: check `matched`, not the status code.',
  },
];

/** The closed sets, straight from the enums the validators use. */
/**
 * THE PANEL, WHICH IS THE OTHER HALF OF THE API AND WAS NOT WRITTEN DOWN HERE.
 *
 * Everything above is a machine talking to us. The panel is a person: one script tag on the
 * customer's page, signed in by their own login, and from it the person runs their check-in, reads
 * their report, states what success looks like, and keeps their commitments. These are the routes
 * it uses, every one of them acting as the signed-in person and never as anybody else.
 */
export const THE_PANEL = {
  embed: '<script src="{api}/embed.js" data-token="{identity token}"></script>; data-mode="anchor" data-anchor="#el" pins it inside your own element',
  session: 'POST /embed/session (the loader does this); GET /embed/opening returns the first line, what is due, and what the person can do next',
  routes: [
    'GET /check-ins/mine',
    'GET /grounds/awaiting-me',
    'POST /grounds/:id/confirm-lead',
    'POST /check-ins  { label, scenario, moment, timelineDays (or runsUntilEnded: true, for a check-in that runs until its lead ends it), cadence, startsAt, brief, participants[] }',
    'POST /check-ins/:id/open',
    'POST /check-ins/:id/messages  { message }',
    'POST /check-ins/:id/complete',
    'GET /check-ins/:id/report',
    'GET /check-ins/:id/transcript',
    'POST /check-ins/:id/success-looks-like  { text }',
    'POST /grounds/:groundId/documents  (multipart file, uploaderNote, visibility OPEN|OWN)',
    'PATCH /grounds/:groundId/documents/:docId/visibility  { visibility }',
    'GET /commitments/mine',
    'POST /commitments  { text, dueSaid, dueAt, subjectExternalId }',
    'POST /commitments/:id/done',
    'GET /todos/mine',
    'POST /todos  { text, dueSaid, dueAt }',
    'POST /todos/:id/done',
    'GET /reports/my-people',
    'POST /chat  { message }',
  ],
  whatsapp: 'PUT /integrations/whatsapp from Connect with your Meta number id, token and app secret; point Meta\'s webhook at /api/v1/webhooks/whatsapp/{organizationId} with the verify token shown; send phoneNumbers[] on SCIM users or phone on POST /people. A person then does their check-in by replying on WhatsApp, and asks the assistant the same way.',
  says: "The panel runs the check-in in place. A check-in that becomes open fires checkin.opened to your webhooks, with the person's own id, so you can tell them in your channel.",
} as const;

export const VOCABULARY = {
  /* The anchor's own situation is not one the developer API offers: it starts from its link, and the API keeps working exactly as it did. */
  scenario: Object.values(GroundScenario).filter((s) => s !== GroundScenario.HELP_TEAM_UNDERSTAND),
  moment: Object.values(GroundMoment),
  objectiveKind: Object.values(ObjectiveKind),
} as const;

/**
 * Where two names for one idea will trip somebody up.
 *
 * Kept as data rather than prose because these are the ones that cost real
 * time, and a list somebody can read is worth more than a paragraph they skim.
 */
export const WORDS_THAT_DIFFER = [
  {
    endpoint: 'POST /grounds/:groundId/objectives',
    field: 'text',
    notCalled: 'described',
    note: 'Everything else in the product speaks of an objective being described. Here it is `text`.',
  },
  {
    endpoint: 'POST /scim/v2/Users',
    field: 'emails[].value',
    notCalled: 'email',
    note: 'SCIM shape. A userName that is an address is accepted as a fallback.',
  },
];

/**
 * WHAT A FAILURE LOOKS LIKE, so a parser learns it once. Every route under /api/org/v1 returns a
 * raw body on success and this shape on failure; `message` is always one sentence, and `details`
 * carries the pipe's sentences when a body did not validate (fix plan F14).
 */
export const THE_ERROR_SHAPE = {
  shape: '{ error: { code, message, details } }',
  code: 'A stable word: bad_request, unauthorized, forbidden, not_found, conflict, gone, too_many_requests, server_error - or a route\'s own.',
  message: 'One sentence, always a string, written to be read.',
  details: 'The individual validation sentences when a body did not validate; otherwise null.',
  retries: 'Send Idempotency-Key on any POST. A retry with the same key and body is answered with the first call\'s response; the same key with a different body is refused.',
};
