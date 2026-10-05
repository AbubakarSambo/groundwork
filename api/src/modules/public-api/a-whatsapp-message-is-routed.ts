/**
 * HOW A WHATSAPP MESSAGE FINDS ITS CHECK-IN, AND HOW A REPORT READS AS A TEXT.
 *
 * Pure. The service does the reading and writing; this file holds the rules a person could argue
 * with: which session a number is talking to, what "2" means when two are open, what a session is
 * called on a phone, and how much of a report fits in a message.
 */

import { askName } from '../assistant/ask-name';

export interface AnOpenCheckIn {
  id: string;
  status: string;
  sessionNumber: number;
  label: string;
  /** The lead keeps this check-in in the app (`overWhatsApp = false`). It is never answered from the phone. */
  keptOffThePhone?: boolean;
}

/** "September sprint, session 3." One line, so somebody on three grounds knows which this is. */
export function sessionHeader(c: { label: string; sessionNumber: number }): string {
  return `${c.label}, session ${c.sessionNumber}.`;
}

/**
 * The reply to "which one?", as list rows Meta can render as tappable, and as a numbered text
 * fallback. Ids are the check-in ids so a tap and a typed number resolve the same way.
 */
export function whichOneRows(open: AnOpenCheckIn[]): { id: string; title: string; description: string }[] {
  return open.slice(0, 10).map((c) => ({
    id: c.id,
    title: c.label.slice(0, 24),
    description: `Session ${c.sessionNumber}${c.status === 'IN_PROGRESS' ? ', started' : ''}`.slice(0, 72),
  }));
}

export function whichOneAsText(open: AnOpenCheckIn[]): string {
  return [
    'You have more than one check-in open. Which is this for? Reply with the number.',
    ...open.slice(0, 10).map((c, i) => `${i + 1}. ${c.label}, session ${c.sessionNumber}${c.status === 'IN_PROGRESS' ? ' (started)' : ''}`),
  ].join('\n');
}

/** A typed number or a tapped row id picks one; anything else picks nothing. */
export function pickedOne(said: string, open: AnOpenCheckIn[]): AnOpenCheckIn | null {
  const t = (said ?? '').trim();
  const byId = open.find((c) => c.id === t);
  if (byId) return byId;
  const n = /^\d{1,2}$/.test(t) ? Number(t) : NaN;
  if (Number.isInteger(n) && n >= 1 && n <= open.length) return open[n - 1];
  return null;
}

/**
 * WHAT A FILE IS CALLED IN THE SENTENCE THAT SAYS IT ARRIVED. A document keeps the name its sender
 * gave it. A photo has none, so it was stored under a name made from WhatsApp's message number
 * ("image-wamid.HBgM...png") and the person was told that name. They are told "Your photo" instead.
 */
export function whatTheFileIsCalled(arrived: { fileName: string; named?: boolean; what?: string }): string {
  if (arrived.named) return `"${arrived.fileName}"`;
  return `Your ${arrived.what ?? 'file'}`;
}

/** The kind of thing that arrived, from Meta's message shape. */
export function whatArrived(message: any): { kind: 'text'; text: string } | { kind: 'pick'; id: string } | { kind: 'media'; mediaId: string; mimeType: string; fileName: string; caption: string; /** The sender gave the file a name. A photo has none, and is named here only so it can be stored. */ named?: boolean; /** What it is, for a sentence: photo, document, recording or video. */ what?: 'photo' | 'document' | 'recording' | 'video' } | { kind: 'other' } {
  if (!message) return { kind: 'other' };
  if (message.type === 'text') return { kind: 'text', text: (message.text?.body ?? '').trim() };
  /* A template's quick-reply button ("Start", "Not now") arrives as its own type, with the words on it. */
  if (message.type === 'button' && (message.button?.text || message.button?.payload)) return { kind: 'text', text: String(message.button.text ?? message.button.payload).trim() };
  if (message.type === 'interactive') {
    const id = message.interactive?.list_reply?.id ?? message.interactive?.button_reply?.id;
    return id ? { kind: 'pick', id } : { kind: 'other' };
  }
  for (const t of ['image', 'document', 'audio', 'video'] as const) {
    if (message.type === t && message[t]?.id) {
      const m = message[t];
      const mime: string = m.mime_type ?? 'application/octet-stream';
      const ext = mime.split('/')[1]?.split(';')[0] ?? 'bin';
      return { kind: 'media', mediaId: m.id, mimeType: mime, fileName: m.filename ?? `${t}-${message.id ?? Date.now()}.${ext}`, caption: (m.caption ?? '').trim(), named: !!m.filename, what: t === 'image' ? 'photo' : t === 'audio' ? 'recording' : t === 'video' ? 'video' : 'document' };
    }
  }
  return { kind: 'other' };
}

/**
 * A SESSION REPORT AS ONE MESSAGE. Where things stand, the reads at a glance, the conversation worth
 * having. The same card the panel shows at the end, said rather than drawn.
 */
export function reportAsText(report: any, label: string): string {
  const lines: string[] = [`Your report for ${label} is ready.`];
  if (report?.whereThingsStand?.saying) lines.push(report.whereThingsStand.saying);
  const glance = (report?.atAGlance ?? []) as { label: string; value: string; sub?: string }[];
  /* Each read is its own sentence, not "Label: value (note)". The note is already a sentence; without one, the label and value make one. */
  const sentence = (t: string) => { const x = t.trim().replace(/\s+/g, ' '); return `${x.charAt(0).toUpperCase()}${x.slice(1)}${/[.!?]$/.test(x) ? '' : '.'}`; };
  const lower = (t: string) => `${t.charAt(0).toLowerCase()}${t.slice(1)}`;
  const reads = glance.map((g) => (g.sub?.trim() ? sentence(g.sub) : g.value?.trim() ? sentence(`${g.label} is ${lower(g.value.trim())}`) : '')).filter(Boolean);
  if (reads.length) lines.push(reads.join(' '));
  if (report?.theConversationWorthHaving) lines.push(`Here is a conversation worth having. ${report.theConversationWorthHaving}`);
  const whole = lines.join('\n\n');
  /* Where the whole report would not fit in one WhatsApp message, one short line, and the app for the rest. */
  return whole.length <= A_TEXT_MESSAGE_LIMIT ? whole : `${reportAsOneLine(report, label)} Open Groundwork to read it.`;
}

/** WhatsApp's limit for one ordinary message. */
export const A_TEXT_MESSAGE_LIMIT = 4096;
/** The longest "where things stand" line that goes into a template's blank. */
export const ONE_SHORT_LINE = 200;

/** The first sentence of where things stand, on one line and short. */
export function whereThingsStandInOneLine(report: any): string {
  const saying = String(report?.whereThingsStand?.saying ?? '').replace(/\s+/g, ' ').trim();
  const first = (saying.match(/^.*?[.!?](?=\s|$)/)?.[0] ?? saying).trim();
  return first.length <= ONE_SHORT_LINE ? first : `${first.slice(0, ONE_SHORT_LINE - 1).replace(/\s+\S*$/, '')}…`;
}

/** "Your report for the sales team is ready. <where things stand, one line>" */
export function reportAsOneLine(report: any, label: string): string {
  const line = whereThingsStandInOneLine(report);
  return line ? `Your report for ${label} is ready. ${line}` : `Your report for ${label} is ready.`;
}

/**
 * THE REPORT AS ITS TEMPLATE'S BLANKS (groundwork_report_ready): the check-in's name, and one short
 * line of where things stand. Never a line break: WhatsApp refuses a blank with one, and the report
 * as written has several. The template says "Open Groundwork to read it." itself.
 */
export function reportAsTemplateBlanks(report: any, label: string): string[] {
  return [label, whereThingsStandInOneLine(report) || 'It is in Groundwork under Report.'];
}

/** ISO 639-1 codes we will converse in. Anything else falls back to English with the person told so. */
export const LANGUAGES_WE_CONVERSE_IN: Record<string, string> = {
  en: 'English', ha: 'Hausa', sw: 'Swahili', yo: 'Yoruba', ig: 'Igbo', fr: 'French', pt: 'Portuguese', ar: 'Arabic', am: 'Amharic', es: 'Spanish',
};

export function languageBlock(code: string | null | undefined): string {
  if (!code || code === 'en' || !LANGUAGES_WE_CONVERSE_IN[code]) return '';
  const name = LANGUAGES_WE_CONVERSE_IN[code];
  return `THIS PERSON WRITES IN ${name.toUpperCase()}. Ask and answer in ${name}, in plain everyday words. Keep every name, number, date and place exactly as they wrote it. If they switch to English, follow them. Nothing else about how you work changes.`;
}

/**
 * A NUMBER IS NOT ALWAYS A MENU PICK. With two check-ins open, any bare one-or-two-digit text was read
 * as a choice from the list - so "7", typed in answer to "how many did you close?", switched check-in.
 * A typed number is a pick only while the question is fresh: the list was sent, and not long ago.
 */
export const A_PICK_IS_GOOD_FOR_MS = 10 * 60 * 1000;

export function pickWasAsked(pickPendingAt: Date | string | null | undefined, now: Date = new Date()): boolean {
  if (!pickPendingAt) return false;
  return now.getTime() - new Date(pickPendingAt).getTime() <= A_PICK_IS_GOOD_FOR_MS;
}

/** A tapped row is always a pick; a typed id is; a typed number is only when the list was just sent. */
export function pickedFromText(text: string, open: AnOpenCheckIn[], pickPendingAt: Date | string | null | undefined, now: Date = new Date()): AnOpenCheckIn | null {
  const t = (text ?? '').trim();
  if (open.some((c) => c.id === t)) return pickedOne(t, open);
  if (/^\d{1,2}$/.test(t)) return pickWasAsked(pickPendingAt, now) ? pickedOne(t, open) : null;
  return null;
}

/** A greeting and nothing else. The only text that opens a session without being handed in as an answer. */
export const A_GREETING_ALONE = /^\s*((hi|hello|hey|hiya|yo)(\s+there)?|good\s+(morning|afternoon|evening))\s*[.!]*\s*$/i;

/** "Not now" (the quick reply on checkin_open, or typed): nothing more is written first today (decision 83). */
export const A_NOT_NOW = /^\s*(not\s+now|later|not\s+today)\s*[.!]?\s*$/i;
export const NOT_NOW_SAYING = 'All right. I will not write to you first again today. Your check-in is still open, and you can answer here whenever you are ready.';

/** What the person reads when they write "finish" and there is not enough yet to close the check-in. */
export const NOT_ENOUGH_YET_TO_FINISH = 'I need a little more from you before this check-in can close. Please answer one or two more questions, then write "finish" again.';

/** The words that close a session. Matched before the status is looked at, so "finish" on a session not yet opened gets an honest answer. */
export const A_FINISH_WORD = /^\s*(finish|complete|done|close)\s*[.!]?\s*$/i;

/** Which organisation, when a number is on more than one roster. Same shape as the check-in list. */
export function whichOrganisationAsText(orgs: { id: string; name: string }[]): string {
  return ['This number is on more than one organisation\'s roster. Which is this for? Reply with the number.', ...orgs.map((o, i) => `${i + 1}. ${o.name}`)].join('\n');
}

export function pickedOrganisation(text: string, orgs: { id: string; name: string }[]): { id: string; name: string } | null {
  const n = /^\s*\d{1,2}\s*$/.test(text ?? '') ? Number(text.trim()) : NaN;
  return Number.isInteger(n) && n >= 1 && n <= orgs.length ? orgs[n - 1] : null;
}

/* ---------------- switching between a check-in and Ask Groundwork (survey items 2 and 12) ---------------- */

/** "ask" or "Ask Groundwork": the next messages go to Ask, until "back". "Ask <the organisation>" is read by `isAnAskWord`. */
export const AN_ASK_WORD = /^\s*(ask|ask\s+groundwork)\s*[.!]?\s*$/i;
/** "ask", "Ask Groundwork" or the organisation's own Ask name ("Ask Coamana"). */
export const isAnAskWord = (text: string, ask: string): boolean =>
  AN_ASK_WORD.test(text) || text.trim().replace(/[.!]$/, '').replace(/\s+/g, ' ').toLowerCase() === ask.toLowerCase();
/** "back": from Ask Groundwork to the check-in. */
export const A_BACK_WORD = /^\s*(back|go\s+back|back\s+to\s+(my\s+)?check-?in)\s*[.!]?\s*$/i;
/** "switch": the list of check-ins again, or, on Groundwork's number, the list of organisations. */
export const A_SWITCH_WORD = /^\s*switch\s*[.!]?\s*$/i;
export const A_YES = /^\s*(yes|yeah|yep|y|ok|okay|sure|please do)\s*[.!]?\s*$/i;
export const A_NO = /^\s*(no|nope|n|no thanks|keep it|keep it in the check-?in)\s*[.!]?\s*$/i;

/** The one sentence that says the words, said when a check-in starts on WhatsApp. */
export const THE_WORDS = (ask: string = askName(null)) => `You can write "ask" at any time to talk to ${ask}, "back" to come back to your check-in, and "switch" to choose another check-in.`;
export const NOW_ASKING = (ask: string = askName(null)) => `You are now talking to ${ask}. Ask me anything about the company, your work or your check-ins. Write "back" to return to your check-in.`;
export const ASKING_NEEDS_A_ROSTER_ENTRY = (ask: string = askName(null)) => `${ask} needs your number on your organisation's roster. Ask your admin to add it, then write "ask" again.`;
export const ASK_READS_WORDS = (ask: string = askName(null)) => `${ask} reads words here. Write "back" first, and then send the file to put it on your check-in.`;
export const ONLY_ONE_OPEN = (label: string, ask: string = askName(null)) => `You have one check-in open, "${label}". Carry on here, or write "ask" to talk to ${ask}.`;
export const NONE_OPEN = (ask: string = askName(null)) => `You have no check-in open right now. Write "ask" to talk to ${ask}.`;
export const BACK_IN = (c: { label: string; sessionNumber: number }) => `You are back in your check-in. ${sessionHeader(c)} Carry on where you left off.`;
export const BACK_TO_NOTHING = (ask: string = askName(null)) => `You have no check-in open right now, so there is nothing to go back to. ${ask} is still here.`;

/** The thread remembers Ask Groundwork as "ask:" and the check-in to go back to, when there was one. */
export const ASKING = 'ask:';
export function isAsking(checkInId: string | null | undefined): boolean {
  return !!checkInId && checkInId.startsWith(ASKING);
}
export function wasIn(checkInId: string | null | undefined): string | null {
  return isAsking(checkInId) ? checkInId!.slice(ASKING.length) || null : null;
}

/** A check-in named by the person: its number in the list, or its name. */
export function namedCheckIn(text: string, open: AnOpenCheckIn[]): AnOpenCheckIn | null {
  const t = (text ?? '').trim().toLowerCase().replace(/[.!]$/, '');
  if (!t) return null;
  const byNumber = /^\d{1,2}$/.test(t) ? open[Number(t) - 1] : undefined;
  if (byNumber) return byNumber;
  return open.find((c) => c.label.trim().toLowerCase() === t) ?? null;
}

/* ---------------- a request said during a check-in (decision 82, item 2) ---------------- */

export type ARequest = 'leave' | 'spending' | 'hours';

const ASKS = /\b(i\s+(want|need|would\s+like|'d\s+like|wish)|i'd\s+like|can\s+i|could\s+i|may\s+i|please|request|apply\s+for|book)\b/i;
const LEAVE = /\b(leave|day\s+off|days\s+off|time\s+off|holiday|vacation|annual\s+leave|sick\s+leave)\b/i;
const A_DAY = /\b(\d{1,2}(st|nd|rd|th)?\s+(of\s+)?(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*|(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2}|monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|next\s+week|\d{4}-\d{2}-\d{2})\b/i;
const LOG_HOURS = /^\s*(please\s+)?(log|record|put\s+down|add)\s+(\d+(?:[.,]\d+)?|an?|half\s+an)\s*(hours?|hrs?|h)\b/i;
const SPEND = /\b(i\s+(need|want|would\s+like|have)\s+to\s+spend|i'd\s+like\s+to\s+spend|(can|may|could)\s+(i|we)\s+spend|request\s+to\s+spend|approve\s+(spending|a\s+spend))\b/i;
const A_SUM = /\d/;

/**
 * WHETHER A MESSAGE IS PLAINLY A LEAVE, HOURS OR SPENDING REQUEST, rather than an answer. Narrow on
 * purpose: "I was on leave on Monday" or "I spent 12,000 on fuel" are things a person tells their
 * check-in, and stay there. Only a request in the person's own words is asked about, and the person's
 * answer decides; nothing is guessed.
 */
export function looksLikeARequest(text: string): ARequest | null {
  const t = (text ?? '').trim();
  if (!t) return null;
  if (LOG_HOURS.test(t)) return 'hours';
  if (SPEND.test(t) && A_SUM.test(t)) return 'spending';
  if (LEAVE.test(t) && ASKS.test(t) && A_DAY.test(t)) return 'leave';
  return null;
}

/** The one question, in Hafsah's words (decision 82, item 2). */
export function shallITreatThisAs(kind: ARequest): string {
  return kind === 'leave' ? 'Shall I treat this as a leave request?' : kind === 'spending' ? 'Shall I treat this as a spending request?' : 'Shall I treat this as hours?';
}
export const YES_OR_NO = (kind: ARequest) => `Please reply yes or no. ${shallITreatThisAs(kind)}`;

/*
 * WORDS HELD FOR A YES OR A NO, AFTER TEN MINUTES WITH NO ANSWER. They go into the check-in they were
 * held from, as a "no" puts them, and the person is told so, in their own words.
 */
export const HELD_WORDS_PUT_IN = (words: string) => `You did not answer my question within ten minutes, so I have added what you wrote earlier to your check-in: "${words}"`;
/** The check-in the words were held from has closed since, so they are given back to the person. */
export const heldWordsNotPut = (words: string, ask: string = askName(null)) => `What you wrote earlier was not added to a check-in, because that check-in is no longer open. You wrote: "${words}". You can send it again in your next check-in, or write "ask" to send it to ${ask}.`;
