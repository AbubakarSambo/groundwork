/**
 * THE WORDS OF AN EMAIL WITH THE DIRECT MORNING ON (a-direct-email.ts). What happened, with names, numbers, customers and days, and the
 * link. No paragraph about Groundwork, no note about who sees what, no "shared picture", no count of things settled, and nothing that
 * hedges. Only ever used where the switch is on: with it off, each sender writes what it always wrote.
 */
import { MAIL_BUTTON } from './the-kits-look-in-an-email';

const esc = (s: string) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const p = (s: string) => `<p>${esc(s)}</p>`;
const BUTTON = MAIL_BUTTON;
const button = (url: string, label: string) => `<p><a href="${url}" style="${BUTTON}">${esc(label)}</a></p>`;

/** The report is ready: the finding first, as the reader is served it, then the link. */
export function theReportReadyDirectly(
  label: string,
  reportUrl: string,
  insight: string[] | null | undefined,
  whoCheckedIn: string[] | null | undefined,
  sharedByAnAdminSentence: string | null | undefined,
  chat: { url: string; label: string } | null | undefined,
): string {
  const lines = insight?.length ? insight : whoCheckedIn?.length ? whoCheckedIn : [`Everybody on ${label} has checked in, and the report is ready.`];
  return lines.map(p).join('') +
    (sharedByAnAdminSentence ? p(sharedByAnAdminSentence) : '') +
    (chat ? button(chat.url, chat.label) + `<p><a href="${reportUrl}">Read the report</a></p>` : button(reportUrl, 'Read the report →'));
}

/** The report has been ready a while and this person has not opened it. */
export function theReportIsStillWaitingDirectly(label: string, reportUrl: string, since: string): string {
  return p(since ? `Your report for ${label} has been ready since ${since}.` : `Your report for ${label} is ready.`) + button(reportUrl, 'Read the report →');
}

/** A check-in invitation: who asks, what it is, how long it takes, and the button. */
export function theInvitationDirectly(a: { hello: string; from: string; label: string; joining: string; noteHtml: string; url: string; whatsApp: string; stopLine: string }): string {
  return p(a.hello) +
    `<p><strong>${esc(a.from)}</strong> would like to know what you are seeing in <strong>${esc(a.label)}</strong>.</p>` +
    p('It is a short check-in, about ten minutes, where you say what is actually going on from where you sit.') +
    a.joining + a.noteHtml +
    `<p><a href="${a.url}" style="${BUTTON}">Start my check-in →</a></p>` +
    a.whatsApp + a.stopLine;
}

/** Somebody checked in: who, on which check-in, what they reported where the lead may read it, who is still to come, and the link. */
export function somebodyCheckedInDirectly(a: { name: string; label: string; reported: string[]; stillToCome: string | null; url: string }): string {
  return `<p><strong>${esc(a.name)}</strong> has checked in on <strong>${esc(a.label)}</strong>.</p>` +
    a.reported.map(p).join('') +
    p(a.stillToCome ?? 'Everyone has now checked in.') +
    button(a.url, 'Read the check-in →');
}
