/**
 * HOW A WHATSAPP MESSAGE FINDS ITS CHECK-IN, AND HOW A REPORT READS AS A TEXT.
 *
 * Pure. The service does the reading and writing; this file holds the rules a person could argue
 * with: which session a number is talking to, what "2" means when two are open, what a session is
 * called on a phone, and how much of a report fits in a message.
 */

export interface AnOpenCheckIn {
  id: string;
  status: string;
  sessionNumber: number;
  label: string;
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

/** The kind of thing that arrived, from Meta's message shape. */
export function whatArrived(message: any): { kind: 'text'; text: string } | { kind: 'pick'; id: string } | { kind: 'media'; mediaId: string; mimeType: string; fileName: string; caption: string } | { kind: 'other' } {
  if (!message) return { kind: 'other' };
  if (message.type === 'text') return { kind: 'text', text: (message.text?.body ?? '').trim() };
  if (message.type === 'interactive') {
    const id = message.interactive?.list_reply?.id ?? message.interactive?.button_reply?.id;
    return id ? { kind: 'pick', id } : { kind: 'other' };
  }
  for (const t of ['image', 'document', 'audio', 'video'] as const) {
    if (message.type === t && message[t]?.id) {
      const m = message[t];
      const mime: string = m.mime_type ?? 'application/octet-stream';
      const ext = mime.split('/')[1]?.split(';')[0] ?? 'bin';
      return { kind: 'media', mediaId: m.id, mimeType: mime, fileName: m.filename ?? `${t}-${message.id ?? Date.now()}.${ext}`, caption: (m.caption ?? '').trim() };
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
  if (glance.length) lines.push(glance.map((g) => `${g.label}: ${g.value}${g.sub ? ` (${g.sub})` : ''}`).join('\n'));
  if (report?.theConversationWorthHaving) lines.push(`Worth having: ${report.theConversationWorthHaving}`);
  return lines.join('\n\n');
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
