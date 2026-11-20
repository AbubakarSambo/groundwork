/**
 * WHAT A MAIL MAY CARRY, SAID ONCE (Fatima, increment 4).
 *
 * The one door (email.service.ts, throughTheDoor) is the only place a mail reaches the mail service, so it is
 * also the only place attachments are checked and handed on. A held mail keeps its attachments in
 * `scheduled_emails.attachments` as base64, so the copy that goes in the morning is the copy that was meant.
 *
 * The limits are ours and sit well under the provider's (Resend takes 40 MB a mail after encoding, and
 * encoding adds a third), so a mail that passes here is never refused by the provider for its size.
 */
export interface AnAttachment {
  filename: string;
  contentType: string;
  content: Buffer;
}

/** The held form, for the column. */
export interface AHeldAttachment {
  filename: string;
  contentType: string;
  contentBase64: string;
}

export const ATTACHMENT_LIMITS = {
  maxFiles: 8,
  maxBytesEach: 8 * 1024 * 1024,
  maxBytesTotal: 20 * 1024 * 1024,
  /** Only the kinds of file the product makes. Nothing a person uploads is mailed on to somebody else. */
  allowedExtensions: ['docx', 'pdf', 'pptx', 'xlsx', 'csv', 'txt'] as const,
};

/** Null when the attachments may go; otherwise the reason, in a sentence. */
export function whyTheseCannotGo(files: AnAttachment[] | undefined): string | null {
  if (!files?.length) return null;
  const L = ATTACHMENT_LIMITS;
  if (files.length > L.maxFiles) return `A mail may carry at most ${L.maxFiles} files, and this one has ${files.length}.`;
  let total = 0;
  for (const f of files) {
    const ext = (f.filename.split('.').pop() ?? '').toLowerCase();
    if (!(L.allowedExtensions as readonly string[]).includes(ext)) return `The file "${f.filename}" is not a kind that can be mailed. Only ${L.allowedExtensions.join(', ')} files can.`;
    if (/[\\/\r\n]/.test(f.filename)) return `The file name "${f.filename.replace(/[\r\n]/g, ' ')}" is not allowed.`;
    if (f.content.length > L.maxBytesEach) return `The file "${f.filename}" is larger than ${L.maxBytesEach / 1024 / 1024} MB, which is the most one file in a mail may be.`;
    total += f.content.length;
  }
  if (total > L.maxBytesTotal) return `The files together are larger than ${L.maxBytesTotal / 1024 / 1024} MB, which is the most one mail may carry.`;
  return null;
}

export const holdTheAttachments = (files: AnAttachment[] | undefined): AHeldAttachment[] | null =>
  files?.length ? files.map((f) => ({ filename: f.filename, contentType: f.contentType, contentBase64: f.content.toString('base64') })) : null;

export const releaseTheAttachments = (held: unknown): AnAttachment[] | undefined =>
  Array.isArray(held) && held.length
    ? (held as AHeldAttachment[]).map((h) => ({ filename: h.filename, contentType: h.contentType, content: Buffer.from(h.contentBase64, 'base64') }))
    : undefined;
