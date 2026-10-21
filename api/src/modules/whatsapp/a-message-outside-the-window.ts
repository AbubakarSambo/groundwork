/**
 * A MESSAGE OUTSIDE THE WINDOW GOES AS A TEMPLATE, OR NOT AT ALL.
 *
 * Meta accepts free text from a business only inside the 24 hours after the person last wrote;
 * outside it, only an approved template goes. Every outbound here was free text, so every
 * business-initiated send outside the window - the session-ready notice, the report after a session
 * closed in the app - was money spent on a rejection, and until the send record existed the
 * rejection was invisible. The window is checked BEFORE anything is composed or paid for.
 *
 * Template names and copy go through Meta's approval queue, which is outside this repository
 * (fix plan D, Decision 2). The registry below is the three bodies the product initiates; a name is
 * live only once it appears in WHATSAPP_APPROVED_TEMPLATES. Until then, a message outside the window
 * is recorded as not sent and why, rather than sent to be refused.
 *
 * And STOP means stop. A person can end this by the means the channel itself offers.
 */

export const SERVICE_WINDOW_MS = 24 * 60 * 60 * 1000;

export function insideTheServiceWindow(lastInboundAt: Date | string | null | undefined, now: Date = new Date()): boolean {
  if (!lastInboundAt) return false;
  return now.getTime() - new Date(lastInboundAt).getTime() < SERVICE_WINDOW_MS;
}

/** The kinds of send the product starts, as opposed to a reply to something the person just wrote. */
export const BUSINESS_INITIATED: ReadonlySet<string> = new Set([
  'checkin-open', 'due-tomorrow', 'opens-soon', 'closes-soon', 'overdue', 'team-almost-in', 'your-view-matters', 'lead-summary',
  /* The same words as the opening notice, to somebody it never reached (engagement/a-person-the-opening-never-reached.ts). It is the day's routine message and not an opening, so it counts. */
  'checkin-catch-up',
  'anchor-weekly-insight', 'anchor-follow-up',
  'report', 'report-retry', 'request-waiting', 'request-decided', 'review-started', 'review-decided',
  /* A thank-you for an answer when the report has nothing in it yet: Groundwork writes it first, it has no template, so it goes inside the 24 hours only (Drop Access run 1, item 22). */
  'report-thanks',
  /* What waits for an approver, said once for all of it (the-approvals-summary.ts). */
  'requests-waiting',
  /* A check-in left halfway (a-check-in-left-halfway.ts): the reminder to carry on, the half-hour warning, and the clock closing it. */
  'carry-on', 'closes-in-half-an-hour', 'closed-by-the-clock',
  /* The lead's own nudge (engagement/the-leads-own-nudge.ts): Groundwork writes it for her, so the 24 hours, the template, quiet hours and STOP hold. */
  'lead-nudge',
]);

/**
 * HOW OFTEN GROUNDWORK WRITES FIRST (decision 83, alongside decision 13). These are the messages
 * Groundwork starts on its own; each person gets at most one a day, or two on a day one of their
 * check-ins opens or closes. A report is not one of them: it follows the person finishing.
 *
 * APPROVALS (decision 82, item 1, changed by decision 92). Telling an approver that a request waits for
 * them is NOT one of them any more: it goes straight away (see APPROVALS below). Telling a person what was
 * decided about their own request is NOT one of them, for the same reason as the report: it answers
 * something they did (they asked). It still never goes after STOP, and outside the 24 hours it goes
 * only as its approved template.
 */
export const FIRST_MESSAGES: ReadonlySet<string> = new Set([
  'checkin-open', 'due-tomorrow', 'opens-soon', 'closes-soon', 'overdue', 'team-almost-in', 'your-view-matters', 'lead-summary',
  /* The same words as the opening notice, to somebody it never reached (engagement/a-person-the-opening-never-reached.ts). It is the day's routine message and not an opening, so it counts. */
  'checkin-catch-up',
  /*
   * A REVIEW (item 16). The person did nothing to start their review or to have it decided, so both
   * count towards their one message of the day. Held back, the review still waits for them in the app
   * (GET /suites/reviews/mine), so nothing is lost.
   */
  'review-started', 'review-decided',
  /*
   * THE ANCHOR'S WEEKLY INSIGHT (piece 28; decision 105 item 2). It is the lead's one message of that day: it goes on
   * Friday before the daily summary, so the summary that day is held back by the same count. That is the whole of
   * "it replaces that day's daily summary".
   */
  'anchor-weekly-insight',
  /* The anchor's nudge (piece 30; decision 105 item 3): one of the morning's chases, so it counts the same way. */
  'anchor-follow-up',
  /* A check-in left halfway: the one reminder to carry on is the day's first message; the half-hour warning is a closing. */
  'carry-on', 'closes-in-half-an-hour',
]);
/**
 * APPROVALS GO STRAIGHT AWAY (decision 92, item 3). Telling an approver that a request waits for them
 * (and telling them a question was answered, or that a step was passed on to them) is never held for
 * the morning summary, whatever else the person has had today, and it does not use up the one message
 * of the day either. Only "Not now" and "stop" still hold it: those are the person's own word.
 */
/* `requests-waiting` is the same kind of message said once for several that arrived together (the-approvals-summary.ts): it goes straight away too, and is not the person's one message of the day. */
export const APPROVALS: ReadonlySet<string> = new Set(['request-waiting', 'requests-waiting']);
/**
 * THE CLOCK CLOSING A SESSION (decision 107). It is not one of the day's first messages, so it never uses up the
 * count (it is told with what the person said kept, and the report follows). But it is still Groundwork writing
 * first, so the person's own "Not now" today holds it, as it holds the others; STOP and the 24 hours hold it
 * anyway, through the gates before this one.
 */
/*
 * THE LEAD'S OWN NUDGE (nudges that get answers, 20 October). The lead pressed "Nudge Peter": it is not the day's routine message, so it
 * neither counts towards the one a day nor is held by it, but Peter's own "Not now" today holds it, as STOP and quiet hours do.
 */
export const ONLY_HELD_BY_NOT_NOW: ReadonlySet<string> = new Set(['closed-by-the-clock', 'lead-nudge']);
/** The messages that mark a day a check-in opens or closes, when two may go. */
export const OPENING_OR_CLOSING: ReadonlySet<string> = new Set(['checkin-open', 'opens-soon', 'closes-soon', 'closes-in-half-an-hour']);
/**
 * THE MESSAGES THAT WENT BEFORE THIS RELEASE: the report after a session closes. Every other message
 * Groundwork starts is new, and goes to an organisation only once it has turned WhatsApp on (decisions
 * 78 and 88), or when it already had a number of its own connected.
 */
export const WENT_BEFORE_THIS_RELEASE: ReadonlySet<string> = new Set(['report', 'report-retry', 'report-thanks']);
/** Never a first contact: a thank-you with nothing to read is not how Groundwork introduces itself to a number (Drop Access run 1, item 23). */
export const NEVER_THE_FIRST_MESSAGE: ReadonlySet<string> = new Set(['report-thanks']);
export const NOT_TURNED_ON_QUIETLY = 'This organisation has not turned on WhatsApp; not sent';
export const NOT_TODAY = 'Groundwork has already written first to this person as often as it may today; not sent';
export const THEY_SAID_NOT_NOW = 'This person replied "Not now" today; not sent';

export function isBusinessInitiated(kind: string | null | undefined): boolean {
  return !!kind && BUSINESS_INITIATED.has(kind);
}

/**
 * A TEMPLATE PARAMETER IS ONE LINE (hosted item). WhatsApp refuses a parameter with a line break, a
 * tab, or more than four spaces in a row, so whatever the product puts into one is made a single
 * line first, and kept within the limit.
 */
export const A_TEMPLATE_BODY_LIMIT = 1024;
export function oneLine(text: string, limit = A_TEMPLATE_BODY_LIMIT): string {
  const flat = (text ?? '').replace(/[\r\n\t]+/g, ' ').replace(/ {2,}/g, ' ').trim();
  return flat.length <= limit ? flat : `${flat.slice(0, limit - 1).replace(/\s+\S*$/, '')}…`;
}

export interface ATemplate {
  name: string;
  language: string;
  /** The approved wording, with {{1}}, {{2}} where the product puts its own words. The same words go as free text inside the window. */
  body: string;
  /** The body's positional parameters, in Meta's shape. `params` are the product's own words for {{1}}, {{2}}; without them the composed text is the one parameter. */
  components: (text: string, params?: string[]) => { type: 'body'; parameters: { type: 'text'; text: string }[] }[];
}

/**
 * The product's words for a body's blanks, each one line, and together within WhatsApp's 1,024
 * characters for the whole body: when they would not fit, the longest is cut at a word and ends "…".
 */
export function withinTheLimit(body: string, params: string[]): string[] {
  const fixed = body.replace(/\{\{\d+\}\}/g, '').length;
  const out = params.map((p) => oneLine(p ?? ''));
  let over = fixed + out.reduce((n, p) => n + p.length, 0) - A_TEMPLATE_BODY_LIMIT;
  while (over > 0) {
    const i = out.reduce((best, p, j) => (p.length > out[best].length ? j : best), 0);
    const keep = Math.max(1, out[i].length - over - 1);
    const cut = oneLine(out[i], keep + 1);
    over -= out[i].length - cut.length;
    if (cut.length >= out[i].length) break;
    out[i] = cut;
  }
  return out;
}

const aTemplate = (name: string, body: string): ATemplate => ({
  name,
  language: 'en',
  body,
  components: (text, params) => [{ type: 'body', parameters: withinTheLimit(body, params?.length ? params : [text]).map((p) => ({ type: 'text' as const, text: p })) }],
});

/** The words a person reads, from a template's body and the product's own words for its blanks. */
export function fill(body: string, params: string[]): string {
  const fitted = withinTheLimit(body, params);
  return body.replace(/\{\{(\d+)\}\}/g, (_m, n) => fitted[Number(n) - 1] ?? '');
}

/**
 * Every business-initiated body. Hafsah's eight (decision 83) word for word, and five of ours that
 * hers do not cover, kept as a proposal for her (the report, a request waiting, a request decided, a review started, a review decided). Names are
 * ours; approval is Meta's. docs/whatsapp-templates.md holds the same wording, for submitting.
 * The parameters are in the order the body numbers them, whatever order they appear in.
 */
export const TEMPLATES: Record<string, ATemplate> = {
  'checkin-open': aTemplate('checkin_open', 'Hi {{1}}, your check-in for {{2}} is open. It takes about five minutes, and you can answer right here. Reply START to begin.'),
  'due-tomorrow': aTemplate('checkin_due_tomorrow', 'Hi {{1}}, your check-in for {{2}} is due tomorrow, {{3}}. You can answer here whenever suits you before then.'),
  'opens-soon': aTemplate('checkin_opens_soon', "Hi {{1}}, your check-in for {{2}} opens in an hour, at {{3}}. Reply here when it opens and we'll begin."),
  'closes-soon': aTemplate('checkin_closes_soon', 'Hi {{1}}, your check-in for {{2}} closes in an hour, at {{3}}. Five minutes now means your view is part of this round.'),
  overdue: aTemplate('checkin_overdue', "Hi {{1}}, your check-in for {{2}} is overdue. It's still open, so you can answer here now."),
  'team-almost-in': aTemplate('checkin_team_almost_in', 'Hi {{1}}, {{2}} of {{3}} people have checked in for {{4}}. Your check-in is still open, and you can answer here.'),
  'your-view-matters': aTemplate('checkin_your_view_matters', "Hi {{1}}, your check-in for {{2}} is still waiting. Your answers help {{3}} understand what's in your way, and where they can help. It takes about five minutes, and you can answer here."),
  'lead-summary': aTemplate('lead_daily_summary', "Good morning {{1}}. Here is today's summary of your check-ins. {{2}} You can open your board for the full picture here {{3}} If you would rather not hear from us here again today, reply \"not now\"."),
  /* Ours, proposed to Hafsah (anchor piece 28, decision 105 item 2): the weekly insight. It ends with words, not a blank. */
  /* Ours, proposed to Hafsah (anchor piece 30, decision 105 item 3): the nudge with the person's own promise, to them only. */
  'anchor-follow-up': aTemplate('anchor_checkin_follow_up', "Hi {{1}}, last time you said you would {{2}}. I'd love to hear how it went. Your check-in for {{3}} is open, and you can answer here."),
  'anchor-weekly-insight': aTemplate('anchor_weekly_insight', "Hi {{1}}. {{2}} This week's picture is on the board at {{3}}, if you want the rest."),
  /* Ours, proposed to Hafsah: hers do not cover it. */
  report: aTemplate('groundwork_report_ready', 'Your report for {{1}} is ready. {{2}} Open Groundwork to read it.'),
  /* Ours, proposed to Hafsah (decision 82, item 1): an approval waiting, and the decision told to the person. */
  'request-waiting': aTemplate('groundwork_request_waiting', 'Hi {{1}}, {{2}} has asked for {{3}}, and it is waiting for you. Reply here to approve or decline it, or open Groundwork to read it first.'),
  /* Ours, proposed to Hafsah: everything waiting for an approver, said once. {{2}} is the whole paragraph, in plain full sentences. */
  'requests-waiting': aTemplate('groundwork_requests_waiting', 'Hi {{1}}. {{2}} You can read and answer them in Groundwork here {{3}} and nothing is decided until you do.'),
  'request-decided': aTemplate('groundwork_request_decided', 'Hi {{1}}, your request for {{2}} was {{3}} by {{4}}. Open Groundwork to read it.'),
  /*
   * Ours, proposed to Hafsah (item 16): a review waits for the person in the app. Never anything the
   * review says, only who started or decided it, so its contents stay in the app.
   */
  'review-started': aTemplate('groundwork_review_started', 'Hi {{1}}, {{2}} has started your review. Open Groundwork to read it and add your own view before you meet.'),
  'review-decided': aTemplate('groundwork_review_decided', 'Hi {{1}}, {{2}} has decided your review. Open Groundwork to read the decision and the reasons.'),
  /* No template for the appeal of a decided review (decision 124, item 4): its messages go by email and in the app only. */
};
TEMPLATES['report-retry'] = TEMPLATES.report;
/*
 * THE LEAD'S OWN NUDGE, OUTSIDE THE 24 HOURS, GOES AS THE APPROVED TEMPLATE THAT FITS (nudges that get answers, 20 October): "your view
 * matters", which names the lead in {{3}} ("Your answers help Grace understand what's in your way"). Its wording is never changed; inside
 * the 24 hours the lead's own words go instead.
 */
TEMPLATES['lead-nudge'] = TEMPLATES['your-view-matters'];
/* The catch-up for somebody the opening notice never reached is the opening notice's own template: no new template (Hafsah, 8 October). */
TEMPLATES['checkin-catch-up'] = TEMPLATES['checkin-open'];
/*
 * THE FIRST MESSAGE TO A NUMBER (decision 106 item 2). Ours, for Hafsah: whatever the first message is, it goes
 * in this one template, naming the organisation, with the message's own words, and how to end it. Hafsah's
 * eight are unchanged. See the-first-message-to-a-number.ts and docs/whatsapp-templates.md.
 */
TEMPLATES['first-contact'] = aTemplate('groundwork_first_contact', 'This is Groundwork, writing for {{1}}. {{2}} Not you? Reply STOP.');

/** The names an organisation submits to Meta, once each: every template the product starts. */
export const THE_NAMES_TO_SUBMIT: string[] = [...new Set(Object.values(TEMPLATES).map((t) => t.name))];

/*
 * THE FOUR TEMPLATES OF 19 OCTOBER (docs/whatsapp-templates.md, "The new templates"), word for word, for Abubakar to submit. None of
 * them changes an approved template: each is a new one, and each is used only when all three hold:
 *  - its name is in WHATSAPP_APPROVED_TEMPLATES (or in the organisation's own approved list);
 *  - the person is outside the 24 hours (inside them, the ordinary message goes as free text, as before);
 *  - the message carries every one of its blanks (a thank-you with no first name cannot say "Thank you, {{1}}").
 * Until one is approved and listed, the template it replaces goes as before where that one is approved, and otherwise the same
 * message goes by email instead (whatsapp.service.ts, byEmailInstead). checkin_open stays in use until groundwork_checkin_open_v2
 * is approved and listed. The list is empty today, so nobody's messages change from these.
 */
export const THE_FOUR_OF_19_OCTOBER = {
  checkInOpen: aTemplate('groundwork_checkin_open_v2', 'Hi {{1}}, your check-in for {{2}} is open. It takes about ten minutes, and you can answer right here. Reply START to begin.'),
  thanks: aTemplate('groundwork_checkin_thanks', "Thank you, {{1}}. Your answer for {{2}} is in. You will hear here when the team's report is ready to read."),
  yourReport: aTemplate('groundwork_your_report_ready', 'Hi {{1}}, your own report for {{2}} is ready. It shows what you did, what is still open and what to do next. Open it here: {{3}} . Reply STOP to stop these messages.'),
  promiseDue: aTemplate('groundwork_promise_due', 'Hi {{1}}, you said you would {{2}} by {{3}}. Reply DONE if it is done, or tell me what changed.'),
} as const;
export const THE_FOUR_NAMES: string[] = Object.values(THE_FOUR_OF_19_OCTOBER).map((t) => t.name);
/*
 * THE TEMPLATE OF 21 OCTOBER (Hafsah's answers of 21 October; docs/whatsapp-templates.md, "The new template of 21 October"), word for
 * word, for Abubakar to submit. It replaces checkin_closes_soon (which says "Five minutes now") by the same three rules as the four above:
 * only once its name is listed, only outside the 24 hours, and only with every blank. It has checkin_closes_soon's three blanks in the same
 * order (first name, the check-in's name, the closing time), so the closing reminder's own words fill it. It counts as that day's routine
 * message, as checkin_closes_soon does. Until it is approved and listed, checkin_closes_soon goes as today.
 */
export const THE_ONE_OF_21_OCTOBER = {
  closesSoon: aTemplate('groundwork_checkin_closes_soon_v2', 'Hi {{1}}, your check-in for {{2}} closes at {{3}}. It takes about ten minutes, and you can answer right here.'),
} as const;
export const THE_NAMES_OF_21_OCTOBER: string[] = Object.values(THE_ONE_OF_21_OCTOBER).map((t) => t.name);
/** Every name the product may use: the ones it starts with today, the four of 19 October and the one of 21 October. */
export const THE_NAMES_WE_MAY_USE: string[] = [...new Set([...THE_NAMES_TO_SUBMIT, ...THE_FOUR_NAMES, ...THE_NAMES_OF_21_OCTOBER])];

/** Which of the four goes in place of a message, first, before the template that message has always had. */
export const THE_NEWER_TEMPLATE_FIRST: Record<string, ATemplate[]> = {
  'checkin-open': [THE_FOUR_OF_19_OCTOBER.checkInOpen],
  'checkin-catch-up': [THE_FOUR_OF_19_OCTOBER.checkInOpen],
  /* Only straight after the person's own check-in, once for it: its one sender is the thank-you after a finished check-in. */
  'report-thanks': [THE_FOUR_OF_19_OCTOBER.thanks],
  report: [THE_FOUR_OF_19_OCTOBER.yourReport],
  'report-retry': [THE_FOUR_OF_19_OCTOBER.yourReport],
  /* The person's own promise, never anybody else's, with the day it was due; a sender that has no day for it does not offer its blanks. */
  'anchor-follow-up': [THE_FOUR_OF_19_OCTOBER.promiseDue],
  /* The closing reminder: groundwork_checkin_closes_soon_v2 once it is listed, checkin_closes_soon until then. */
  'closes-soon': [THE_ONE_OF_21_OCTOBER.closesSoon],
};

/* groundwork_checkin_open_v2 has checkin_open's two blanks, and groundwork_checkin_closes_soon_v2 has checkin_closes_soon's three, in the same order: the message's own words fill them. The others say a message's own blanks. */
const THE_SAME_BLANKS_AS_BEFORE: ReadonlySet<string> = new Set(['groundwork_checkin_open_v2', 'groundwork_checkin_closes_soon_v2']);
const howManyBlanks = (body: string) => new Set([...body.matchAll(/\{\{(\d+)\}\}/g)].map((m) => m[1])).size;

/** The template a message goes as outside the 24 hours, and the words for its blanks; null when none is approved for it. */
export function theTemplateToUse(
  kind: string | null | undefined,
  approved: readonly string[],
  words: { params?: string[]; paramsFor?: Record<string, string[]> } = {},
): { template: ATemplate; params?: string[] } | null {
  if (!kind) return null;
  for (const t of THE_NEWER_TEMPLATE_FIRST[kind] ?? []) {
    if (!approved.includes(t.name)) continue;
    const params = words.paramsFor?.[t.name] ?? (THE_SAME_BLANKS_AS_BEFORE.has(t.name) ? words.params : undefined);
    if (params && params.length >= howManyBlanks(t.body) && params.every((p) => !!String(p ?? '').trim())) return { template: t, params };
  }
  const t = TEMPLATES[kind];
  return t && approved.includes(t.name) ? { template: t } : null;
}

export function templateFor(kind: string | null | undefined, approved: readonly string[]): ATemplate | null {
  return theTemplateToUse(kind, approved)?.template ?? null;
}

export const OUTSIDE_THE_WINDOW = 'Outside the 24-hour service window and no approved template for this message; not sent';
export const THEY_SAID_STOP = 'This person said STOP on WhatsApp; not sent';

/** The two words that end and resume this channel, matched alone. */
export const A_STOP_WORD = /^\s*(stop|unsubscribe|opt\s*out)\s*[.!]?\s*$/i;
export const A_START_WORD = /^\s*(start|unstop|resume|opt\s*in)\s*[.!]?\s*$/i;

/** A number Groundwork does not know (decision 106, item 5). */
export const UNKNOWN_NUMBER_SAYING = 'Groundwork does not know this number yet. If you use Groundwork, add this number under Settings, or ask your admin to add it, then write again.';
/* Decision 106 item 7: the last sentence is true because a decision that cannot go by WhatsApp goes by email (a-request-told-on-whatsapp.service.ts). */
export const STOPPED_SAYING = 'Stopped. Nothing more comes to this number from Groundwork unless you reply START. Your check-ins are still in Groundwork. Leave and spending decisions still reach you by email.';
export const RESUMED_SAYING = 'Resumed. Your check-in notices come here again.';
