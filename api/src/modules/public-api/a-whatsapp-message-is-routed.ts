/**
 * HOW A WHATSAPP MESSAGE FINDS ITS CHECK-IN, AND HOW A REPORT READS AS A TEXT.
 *
 * Pure. The service does the reading and writing; this file holds the rules a person could argue
 * with: which session a number is talking to, what "2" means when two are open, what a session is
 * called on a phone, and how much of a report fits in a message.
 */

import { askName } from '../assistant/ask-name';
import { theConversationWorthHavingSaying } from '../grounds/what-is-sent-in-simpler-words';
import { theFindingOnItsOwn } from '../engagement/the-first-insight';

export interface AnOpenCheckIn {
  id: string;
  status: string;
  sessionNumber: number;
  label: string;
  /** The lead keeps this check-in in the app (`overWhatsApp = false`). It is never answered from the phone. */
  keptOffThePhone?: boolean;
  /** The lead set this check-in to use simpler words: what is sent about it afterwards has its plainer form. */
  simplerWords?: boolean;
  /** When it is due, for "the one closing soonest first" (decision 106 item 1). */
  dueAt?: Date | null;
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
export function whatArrived(message: any): { kind: 'text'; text: string } | { kind: 'pick'; id: string } | { kind: 'media'; mediaId: string; mimeType: string; fileName: string; caption: string; /** The sender gave the file a name. A photo has none, and is named here only so it can be stored. */ named?: boolean; /** What it is, for a sentence: photo, document, recording or video. */ what?: 'photo' | 'document' | 'recording' | 'video' } | { kind: 'location'; latitude: number; longitude: number; name: string | null; address: string | null; sentAt: Date | null } | { kind: 'other' } {
  if (!message) return { kind: 'other' };
  if (message.type === 'text') return { kind: 'text', text: (message.text?.body ?? '').trim() };
  /* A template's quick-reply button ("Start", "Not now") arrives as its own type, with the words on it. */
  if (message.type === 'button' && (message.button?.text || message.button?.payload)) return { kind: 'text', text: String(message.button.text ?? message.button.payload).trim() };
  if (message.type === 'interactive') {
    const id = message.interactive?.list_reply?.id ?? message.interactive?.button_reply?.id;
    return id ? { kind: 'pick', id } : { kind: 'other' };
  }
  /* A location pin: the coordinates, and the name and address only where WhatsApp sent them with it. */
  if (message.type === 'location' && Number.isFinite(Number(message.location?.latitude)) && Number.isFinite(Number(message.location?.longitude))) {
    const l = message.location;
    const sent = Number(message.timestamp);
    return {
      kind: 'location', latitude: Number(l.latitude), longitude: Number(l.longitude),
      name: typeof l.name === 'string' && l.name.trim() ? l.name.trim() : null,
      address: typeof l.address === 'string' && l.address.trim() ? l.address.trim() : null,
      sentAt: Number.isFinite(sent) && sent > 0 ? new Date(sent * 1000) : null,
    };
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
/**
 * A REPORT THAT HAS NOTHING TO READ YET IS NOT ANNOUNCED AS READY (B-021). While the round is open and nothing is agreed or open between
 * people, "Your report is ready. Not everyone has answered yet, so there is nothing to agree or differ with." was sent to the person who had
 * just answered. They are thanked, and told when they will hear.
 */
export function nothingToReadYet(report: any): boolean {
  return !!report && report.state === 'forming' && (report.whereThingsStand?.agreed ?? 0) === 0 && (report.whereThingsStand?.stillOpen ?? 0) === 0;
}

/**
 * A REPORT NOTICE WITH NOTHING IN IT IS NOT A REPORT NOTICE (Drop Access run 1, items 22 and 23). Outside the 24 hours the notice can only go
 * as groundwork_report_ready, "Your report for {{1}} is ready. {{2}} Open Groundwork to read it.", and with nothing agreed or open yet {{2}}
 * was "Not everyone has answered yet, so there is nothing to agree or differ with." or "Everybody has answered. The report has not yet found
 * anything they agree or differ on." The second went to Joseph at 11:30 on days Grace was told at 15:30 that two differences were still open;
 * the first was Grace's very first WhatsApp message. A notice is worth its template only when the report has something agreed or open;
 * otherwise it is a thank-you said inside the 24 hours only (its own kind, with no template), and nothing outside them.
 */
export const THANKS_ONLY = 'report-thanks';
const SAYS_NOTHING_YET = /has not yet found anything|nothing to agree or differ/i;
export function aReportWorthItsTemplate(report: any): boolean {
  if (!report) return false;
  const counted = (report.whereThingsStand?.agreed ?? 0) > 0 || (report.whereThingsStand?.stillOpen ?? 0) > 0;
  if (counted) return true;
  /* A report of one person's own work has no agreements to count and still says something; only "nothing yet" says nothing. */
  return !nothingToReadYet(report) && !SAYS_NOTHING_YET.test(String(report.whereThingsStand?.saying ?? ''));
}

/* With the direct morning on (email/a-direct-email.ts): thanked, and told what comes, with no "shared picture". */
export const THANKS_YOUR_ANSWER_IS_IN = (label: string, direct = false) =>
  direct
    ? `Thank you, your answer for ${label} is in. You will be told when the report is ready.`
    : `Thank you, your answer for ${label} is in. The shared picture is made once everyone has answered, and you will be told as soon as there is something to read.`;

/**
 * WHERE THINGS STAND, DIRECTLY (direct morning, part 4). The first thing the report served to this reader names as still open, as a whole
 * sentence, in place of "Three things are settled, and one is still open." Where nothing is open it says so; where the report says nothing
 * yet, its own line stands. The same report as the reader is served it, so it carries the same walls.
 */
export function whereThingsStandDirectly(report: any, label: string): string {
  const found = theFindingOnItsOwn(report, label);
  const said = found?.finding
    ?? ((report?.whereThingsStand?.stillOpen ?? 0) === 0 && (report?.whereThingsStand?.agreed ?? 0) > 0 ? 'Nothing in it is still open.' : String(report?.whereThingsStand?.saying ?? ''));
  const x = said.replace(/\s+/g, ' ').trim();
  return x.length <= ONE_SHORT_LINE ? x : `${x.slice(0, ONE_SHORT_LINE - 1).replace(/\s+\S*$/, '')}…`;
}

export function reportAsText(report: any, label: string, simplerWords?: boolean | null, direct = false): string {
  const lines: string[] = [`Your report for ${label} is ready.`];
  if (direct) { const d = whereThingsStandDirectly(report, label); if (d) lines.push(d); }
  else if (report?.whereThingsStand?.saying) lines.push(report.whereThingsStand.saying);
  const glance = (report?.atAGlance ?? []) as { label: string; value: string; sub?: string }[];
  /* Each read is its own sentence, not "Label: value (note)". The note is already a sentence; without one, the label and value make one. */
  const sentence = (t: string) => { const x = t.trim().replace(/\s+/g, ' '); return `${x.charAt(0).toUpperCase()}${x.slice(1)}${/[.!?]$/.test(x) ? '' : '.'}`; };
  const lower = (t: string) => `${t.charAt(0).toLowerCase()}${t.slice(1)}`;
  const reads = glance.map((g) => (g.sub?.trim() ? sentence(g.sub) : g.value?.trim() ? sentence(`${g.label} is ${lower(g.value.trim())}`) : '')).filter(Boolean);
  if (reads.length) lines.push(reads.join(' '));
  if (report?.theConversationWorthHaving) lines.push(direct ? String(report.theConversationWorthHaving) : `${theConversationWorthHavingSaying(simplerWords)} ${report.theConversationWorthHaving}`);
  const whole = lines.join('\n\n');
  /* Where the whole report would not fit in one WhatsApp message, one short line, and the app for the rest. */
  return whole.length <= A_TEXT_MESSAGE_LIMIT ? whole : `${reportAsOneLine(report, label, direct)} Open Groundwork to read it.`;
}

/** WhatsApp's limit for one ordinary message. */
export const A_TEXT_MESSAGE_LIMIT = 4096;
/** The longest "where things stand" line that goes into a template's blank. */
export const ONE_SHORT_LINE = 200;

/**
 * Where things stand, on one line and short: the whole of it when it fits, else its first sentence.
 *
 * THE FIRST SENTENCE ALONE CAN BE UNTRUE (Pulse check rerun, 15 October 2026). "Everybody who has joined
 * has answered. One person has not joined yet." reached Zawadi as "Everybody who has joined has
 * answered." while Chidi, in the same check-in, had not answered at all. The second sentence is the
 * part that keeps the first one honest, so when the whole line fits it is sent whole.
 */
export function whereThingsStandInOneLine(report: any): string {
  const saying = String(report?.whereThingsStand?.saying ?? '').replace(/\s+/g, ' ').trim();
  if (saying && saying.length <= ONE_SHORT_LINE) return saying;
  const first = (saying.match(/^.*?[.!?](?=\s|$)/)?.[0] ?? saying).trim();
  return first.length <= ONE_SHORT_LINE ? first : `${first.slice(0, ONE_SHORT_LINE - 1).replace(/\s+\S*$/, '')}…`;
}

/** "Your report for the sales team is ready. <where things stand, one line>" */
export function reportAsOneLine(report: any, label: string, direct = false): string {
  const line = direct ? whereThingsStandDirectly(report, label) : whereThingsStandInOneLine(report);
  return line ? `Your report for ${label} is ready. ${line}` : `Your report for ${label} is ready.`;
}

/**
 * THE REPORT AS ITS TEMPLATE'S BLANKS (groundwork_report_ready): the check-in's name, and one short
 * line of where things stand. Never a line break: WhatsApp refuses a blank with one, and the report
 * as written has several. The template says "Open Groundwork to read it." itself.
 */
export function reportAsTemplateBlanks(report: any, label: string, direct = false): string[] {
  /* With the direct morning on, the blank carries the finding; the template's approved words around it are never changed. */
  return [label, (direct ? whereThingsStandDirectly(report, label) : whereThingsStandInOneLine(report)) || 'It is in Groundwork under Report.'];
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


/** The words that close a session. Matched before the status is looked at, so "finish" on a session not yet opened gets an honest answer. */
/* "end" and "end session" too, as the opening line says on the phone (26 October). Never "stop", which is WhatsApp's own opt-out. */
export const A_FINISH_WORD = /^\s*(finish|complete|done|close|end|end session|end it)\s*[.!]?\s*$/i;

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
/**
 * SOMEBODY WHO IS IN ASK AND WRITES AS IF TO THEIR CHECK-IN (B-143). After she approved a request on WhatsApp, Wairimu's thread stayed in
 * Ask, her reminders said "you can answer here now", and "Hi", "I want to do my check-in" and "START" were each answered "I cannot answer
 * that one yet". Those words are a return to the check-in, as "back" is. A question ("when is my next check-in?") stays with Ask.
 */
export const A_WISH_TO_CARRY_ON_THE_CHECK_IN = /^\s*(?:(?:hi|hello|hey)[\s,!.]*|(?:start|begin|continue|resume)\s*[.!]?\s*|(?!(?:when|what|how|who|why|is|are|can|could|do|does|where)\b)[^?]*\b(?:(?:do|start|begin|continue|resume|finish|answer)\b[^?]*\bcheck-?in|check-?in\b[^?]*\b(?:now|please))[^?]*)$/i;
/**
 * WORDS THAT ONLY ASK TO BEGIN ARE NOT THE FIRST ANSWER (B-108). "Hi, I want to do my check-in" was handed to the check-in as what the person said,
 * and the reply quoted it back ("You mentioned last time that you wanted to do your check-in"), after the opener had already asked its question, so the
 * message carried two openers (B-101). A greeting alone, or a short message that only asks to start, opens the check-in and is not put in it. A long
 * message that happens to mention a check-in is an answer.
 */
export const isAGreetingOrARequestToStart = (text: string): boolean =>
  A_GREETING_ALONE.test(text) || ((text ?? '').trim().length <= 60 && A_WISH_TO_CARRY_ON_THE_CHECK_IN.test(text));
/** "switch": the list of check-ins again, or, on Groundwork's number, the list of organisations. */
export const A_SWITCH_WORD = /^\s*switch\s*[.!]?\s*$/i;
export const A_YES = /^\s*(?:(?:yes|yeah|yep|ok|okay|sure)(?:\s+(?:please|thanks|thank\s+you|do))?|y|please\s+do|go\s+ahead|yes,?\s+please)\s*[.!]?\s*$/i;
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
/*
 * SPENDING ASKED FOR WITHOUT THE WORD "SPEND" (the coordinator, 5 October): "I need 15,000 shillings
 * approved for fuel for the van this week." got no offer. A sum of money (a currency, or "k", "thousand",
 * "million") asked for in the person's own words. Telling ("I spent 12,000 on fuel") still is not one.
 */
const MONEY = String.raw`(?:(?:KES|KSh|Ksh|NGN|N|₦|\$|USD|GHS|£|GBP|€|EUR|ZAR|R)\s?\d[\d,.]*\s*(?:k|m|thousand|million)?|\d[\d,.]*\s*(?:k|m|thousand|million)?\s*(?:shillings?|bob|naira|dollars?|pounds?|euros?|cedis?|rand|KES|KSh|NGN|USD|GHS)|\d[\d,.]*\s*(?:k|thousand|million)\b)`;
const SPENDING_ASKED = [
  new RegExp(String.raw`\bi\s+need\s+(?:about\s+|around\s+)?${MONEY}[^.?!]*\b(?:approved|for)\b`, 'i'),
  new RegExp(String.raw`\b(?:can|could|may)\s+(?:i|we)\s+(?:get|have)\s+(?:about\s+|around\s+)?${MONEY}\s+(?:for|to)\b`, 'i'),
  new RegExp(String.raw`\bplease\s+approve\b[^.?!]*${MONEY}`, 'i'),
  new RegExp(String.raw`\brequesting\s+(?:about\s+|around\s+)?${MONEY}`, 'i'),
  new RegExp(String.raw`\bcan\s+you\s+approve\b[^.?!]*${MONEY}`, 'i'),
];

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
  if (SPENDING_ASKED.some((rx) => rx.test(t))) return 'spending';
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
