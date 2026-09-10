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
export const BUSINESS_INITIATED: ReadonlySet<string> = new Set(['session-ready', 'opening', 'report', 'report-retry', 'nudge']);

export function isBusinessInitiated(kind: string | null | undefined): boolean {
  return !!kind && BUSINESS_INITIATED.has(kind);
}

export interface ATemplate {
  name: string;
  language: string;
  /** The body's positional parameters, in Meta's shape, from the plain text the caller would have sent. */
  components: (text: string) => { type: 'body'; parameters: { type: 'text'; text: string }[] }[];
}

/** The three business-initiated bodies. Names are ours; approval is Meta's. */
export const TEMPLATES: Record<string, ATemplate> = {
  'session-ready': { name: 'groundwork_session_ready', language: 'en', components: (text) => [{ type: 'body', parameters: [{ type: 'text', text: text.slice(0, 1024) }] }] },
  opening: { name: 'groundwork_check_in_opened', language: 'en', components: (text) => [{ type: 'body', parameters: [{ type: 'text', text: text.slice(0, 1024) }] }] },
  report: { name: 'groundwork_report_ready', language: 'en', components: (text) => [{ type: 'body', parameters: [{ type: 'text', text: text.slice(0, 1024) }] }] },
};
TEMPLATES['report-retry'] = TEMPLATES.report;

export function templateFor(kind: string | null | undefined, approved: readonly string[]): ATemplate | null {
  const t = kind ? TEMPLATES[kind] : null;
  return t && approved.includes(t.name) ? t : null;
}

export const OUTSIDE_THE_WINDOW = 'Outside the 24-hour service window and no approved template for this message; not sent';
export const THEY_SAID_STOP = 'This person said STOP on WhatsApp; not sent';

/** The two words that end and resume this channel, matched alone. */
export const A_STOP_WORD = /^\s*(stop|unsubscribe|opt\s*out)\s*[.!]?\s*$/i;
export const A_START_WORD = /^\s*(start|unstop|resume|opt\s*in)\s*[.!]?\s*$/i;

export const STOPPED_SAYING = 'Stopped. Nothing more comes to this number from Groundwork unless you reply START. Your check-ins are still in Groundwork.';
export const RESUMED_SAYING = 'Resumed. Your check-in notices come here again.';
