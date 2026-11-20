/**
 * WHERE THE BYTES OF A FORWARDED ATTACHMENT COME FROM, SWAPPABLE.
 *
 * Resend's inbound webhook says that an attachment exists (name, type, size), not what is in it; the
 * file is fetched separately, with the API key. Behind this small interface so a test, or the local
 * injector, can hand over bytes without any network: a payload attachment that carries `content`
 * (base64) is used as it is and the provider is never asked.
 */

export interface InboundAttachmentMeta {
  id: string | null;
  fileName: string;
  mimeType: string;
  size: number | null;
  /** Only ever present on a local or test payload. */
  contentBase64?: string | null;
}

export interface InboundMailClient {
  /** The bytes of one attachment, or null when they cannot be fetched. Never throws. */
  attachment(emailId: string | null, meta: InboundAttachmentMeta): Promise<Buffer | null>;
  /** The text of a message whose webhook carried none, or null. Never throws. */
  body(emailId: string): Promise<{ text: string | null; html: string | null } | null>;
}

export const INBOUND_MAIL_CLIENT = 'INBOUND_MAIL_CLIENT';

/** The default: inline content first, then Resend's receiving API (needs RESEND_API_KEY; unreachable or unkeyed means null). */
export class ResendInboundMailClient implements InboundMailClient {
  constructor(private readonly apiKey: () => string | undefined = () => process.env.RESEND_API_KEY, private readonly doFetch: typeof fetch = (...a) => fetch(...a)) {}

  async attachment(emailId: string | null, meta: InboundAttachmentMeta): Promise<Buffer | null> {
    if (meta.contentBase64) return Buffer.from(meta.contentBase64, 'base64');
    const key = this.apiKey();
    if (!key || !emailId || !meta.id) return null;
    try {
      const head = await this.doFetch(`https://api.resend.com/emails/receiving/${encodeURIComponent(emailId)}/attachments/${encodeURIComponent(meta.id)}`, { headers: { Authorization: `Bearer ${key}` } });
      if (!head.ok) return null;
      const info: any = await head.json();
      const url = info?.download_url ?? info?.data?.download_url;
      if (typeof url !== 'string') return null;
      const file = await this.doFetch(url);
      return file.ok ? Buffer.from(await file.arrayBuffer()) : null;
    } catch {
      return null;
    }
  }

  async body(emailId: string): Promise<{ text: string | null; html: string | null } | null> {
    const key = this.apiKey();
    if (!key) return null;
    try {
      const res = await this.doFetch(`https://api.resend.com/emails/receiving/${encodeURIComponent(emailId)}`, { headers: { Authorization: `Bearer ${key}` } });
      if (!res.ok) return null;
      const d: any = await res.json();
      return { text: typeof d?.text === 'string' ? d.text : null, html: typeof d?.html === 'string' ? d.html : null };
    } catch {
      return null;
    }
  }
}
