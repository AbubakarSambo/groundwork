import * as crypto from 'crypto';
import { Injectable, Logger, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Single Groundwork-owned WhatsApp Business number, shared across every org -
 * there is no per-org toggle. A phone number identifies exactly one account
 * (User.phoneNumber is globally unique), so inbound messages are matched to
 * a user by number alone ("it detects your number").
 *
 * Until WHATSAPP_ACCESS_TOKEN/WHATSAPP_PHONE_NUMBER_ID are set, sends are
 * dev-logged only - mirrors EmailService's [DEV EMAIL] pattern so the rest
 * of the app can wire against this service today and it goes live the
 * moment credentials land, with no code change.
 */
@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {}

  private static readonly TOGGLE_KEY = 'whatsapp_enabled';

  /**
   * Two independent gates, both must pass:
   * (1) credentials configured (WHATSAPP_ACCESS_TOKEN/PHONE_NUMBER_ID) - this
   *     is the "is it technically available" check.
   * (2) the GW admin toggle - "should we actually use it right now."
   * Credentials being set does not turn WhatsApp on by itself; an admin must
   * flip the toggle once they've verified the integration.
   */

  /**
   * MESSAGES FROM META, OR NOTHING.
   *
   * The inbound handler used to trust `message.from` - a phone number written in the request body -
   * as proof of identity, and then wrote into that person's private check-in as them. Nothing
   * verified the request came from Meta at all: the class was `@Public()`, the admin toggle and the
   * credential check both govern SENDING, and the GET handler's verifyToken is only the subscribe
   * handshake. So anyone who knew one linked number could author somebody else's answers.
   *
   * FAIL CLOSED, in the same shape the Resend webhook already uses: no secret, no header, a
   * malformed header or a mismatch all reject and nothing is processed. An unconfigured deployment
   * therefore has no live inbound path, which is the correct default for a channel that writes to
   * the record.
   *
   * Compared with `timingSafeEqual` on equal-length buffers, so the comparison cannot leak the
   * expected digest a byte at a time.
   */
  verifySignature(headers: Record<string, string | string[] | undefined>, raw: Buffer): void {
    const secret = this.config.get<string>('whatsapp.appSecret');
    if (!secret) throw new UnauthorizedException('WhatsApp webhook signature cannot be verified');

    const header = headers['x-hub-signature-256'];
    const provided = Array.isArray(header) ? header[0] : header;
    if (!provided || !provided.startsWith('sha256=')) {
      throw new UnauthorizedException('Missing or malformed WhatsApp signature');
    }

    const expected = crypto.createHmac('sha256', secret).update(raw).digest('hex');
    const got = provided.slice('sha256='.length);
    /** Length check first: timingSafeEqual throws on unequal lengths rather than returning false. */
    if (got.length !== expected.length ||
        !crypto.timingSafeEqual(Buffer.from(got, 'utf8'), Buffer.from(expected, 'utf8'))) {
      throw new UnauthorizedException('WhatsApp signature did not match');
    }
  }

  async isEnabled(): Promise<boolean> {
    if (!this.config.get<boolean>('whatsapp.enabled')) return false;
    const setting = await this.prisma.platformSetting.findUnique({ where: { key: WhatsAppService.TOGGLE_KEY } });
    return setting?.value === true;
  }

  async getToggleState(): Promise<{ credentialsConfigured: boolean; adminEnabled: boolean; live: boolean }> {
    const credentialsConfigured = !!this.config.get<boolean>('whatsapp.enabled');
    const setting = await this.prisma.platformSetting.findUnique({ where: { key: WhatsAppService.TOGGLE_KEY } });
    const adminEnabled = setting?.value === true;
    return { credentialsConfigured, adminEnabled, live: credentialsConfigured && adminEnabled };
  }

  async setEnabled(enabled: boolean, adminUserId: string): Promise<void> {
    await this.prisma.platformSetting.upsert({
      where: { key: WhatsAppService.TOGGLE_KEY },
      create: { key: WhatsAppService.TOGGLE_KEY, value: enabled, updatedBy: adminUserId },
      update: { value: enabled, updatedBy: adminUserId },
    });
  }

  /** Normalizes to E.164-ish digits-only-with-leading-plus for lookup/storage consistency. */
  static normalize(rawNumber: string): string {
    const trimmed = rawNumber.trim();
    const digits = trimmed.replace(/[^\d+]/g, '');
    return digits.startsWith('+') ? digits : `+${digits}`;
  }

  /**
   * Send a WhatsApp message to a phone number. Returns true if actually sent
   * via the API, false if dev-logged only (no credentials configured yet).
   */
  async sendMessage(phoneNumber: string, text: string): Promise<boolean> {
    const to = WhatsAppService.normalize(phoneNumber);
    if (!(await this.isEnabled())) {
      /*
       * THE BODY ONLY OUTSIDE PRODUCTION.
       *
       * This branch is "the channel is off", not "this is a developer's laptop" — and a production
       * deployment with no WhatsApp credentials configured is exactly that state. So a message
       * meant for one person's phone was written into the production log, where staff can read it.
       * The address stays because knowing a send was attempted and to whom is the point of the
       * line; the body is somebody's message.
       */
      if (process.env.NODE_ENV === 'production') {
        this.logger.warn(`WhatsApp is not configured; a message to ${to} was not sent (${text.length} characters).`);
      } else {
        this.logger.warn(`[DEV WHATSAPP] To: ${to} | Body: ${text}`);
      }
      return false;
    }

    const accessToken = this.config.get<string>('whatsapp.accessToken');
    const phoneNumberId = this.config.get<string>('whatsapp.phoneNumberId');
    const res = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: to.replace('+', ''),
        type: 'text',
        text: { body: text },
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      this.logger.error(`WhatsApp send failed for ${to}: ${res.status} ${body}`);
      throw new Error(`WhatsApp send failed: ${res.status}`);
    }
    this.logger.log(`WhatsApp message sent to ${to}`);
    return true;
  }

  /** Finds the account a check-in link should go to, by phone number - the "auto-detect" step. */
  /**
   * SEND ON THE ORGANISATION'S OWN NUMBER, OR OURS.
   *
   * An organisation with a connection sends from its number with its token; one without falls back to
   * the platform number, which is what every send did before. Returns false when nothing could send,
   * and never throws into the caller's flow: a notice that could not go is a warning, not a failure of
   * the check-in it was about.
   */
  async sendFor(organizationId: string, phoneNumber: string, text: string): Promise<boolean> {
    const own = await this.prisma.whatsAppConnection.findUnique({ where: { organizationId } }).catch(() => null);
    if (!own || !own.enabled) return this.sendMessage(phoneNumber, text).catch(() => false);
    const to = WhatsAppService.normalize(phoneNumber);
    const ok = await this.deliver(own.phoneNumberId, own.accessToken, to, text);
    if (ok) await this.prisma.whatsAppConnection.update({ where: { id: own.id }, data: { lastOutboundAt: new Date() } }).catch(() => undefined);
    return ok;
  }

  /**
   * A LIST THEY CAN TAP. Meta's interactive list message, up to ten rows; the text fallback is the
   * numbered version, sent when the organisation has no connection of its own or the list is refused.
   */
  async sendListFor(organizationId: string, phoneNumber: string, body: string, rows: { id: string; title: string; description: string }[], fallbackText: string): Promise<boolean> {
    const own = await this.prisma.whatsAppConnection.findUnique({ where: { organizationId } }).catch(() => null);
    if (!own || !own.enabled) return this.sendMessage(phoneNumber, fallbackText).catch(() => false);
    const to = WhatsAppService.normalize(phoneNumber).replace('+', '');
    try {
      const res = await fetch(`https://graph.facebook.com/v20.0/${own.phoneNumberId}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${own.accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messaging_product: 'whatsapp', to, type: 'interactive',
          interactive: { type: 'list', body: { text: body.slice(0, 1024) }, action: { button: 'Choose', sections: [{ title: 'Your check-ins', rows: rows.slice(0, 10) }] } },
        }),
      });
      if (res.ok) return true;
      this.logger.warn(`WhatsApp list refused for ${to}: ${res.status}; sending the numbered text instead.`);
    } catch (err: any) {
      this.logger.warn(`WhatsApp list failed for ${to}: ${err?.message}; sending the numbered text instead.`);
    }
    return this.deliver(own.phoneNumberId, own.accessToken, `+${to}`, fallbackText);
  }

  /**
   * A PHOTO OR A DOCUMENT THEY SENT. Meta hands over an id; the bytes are fetched with the
   * organisation's own token in two steps, the second signed the same way. Ten megabytes is the
   * document pipeline's own ceiling.
   */
  async fetchMediaFor(organizationId: string, mediaId: string): Promise<{ buffer: Buffer; mimeType: string } | null> {
    const own = await this.prisma.whatsAppConnection.findUnique({ where: { organizationId } }).catch(() => null);
    const token = own?.accessToken ?? this.config.get<string>('whatsapp.accessToken');
    if (!token) return null;
    try {
      const meta = await fetch(`https://graph.facebook.com/v20.0/${mediaId}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!meta.ok) { this.logger.warn(`WhatsApp media lookup failed: ${meta.status}`); return null; }
      const info = (await meta.json()) as { url?: string; mime_type?: string; file_size?: number };
      if (!info.url) return null;
      if ((info.file_size ?? 0) > 10 * 1024 * 1024) return null;
      const file = await fetch(info.url, { headers: { Authorization: `Bearer ${token}` } });
      if (!file.ok) { this.logger.warn(`WhatsApp media download failed: ${file.status}`); return null; }
      return { buffer: Buffer.from(await file.arrayBuffer()), mimeType: info.mime_type ?? 'application/octet-stream' };
    } catch (err: any) {
      this.logger.warn(`WhatsApp media fetch failed: ${err?.message}`);
      return null;
    }
  }

  private async deliver(phoneNumberId: string, accessToken: string, to: string, text: string): Promise<boolean> {
    try {
      const res = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ messaging_product: 'whatsapp', to: to.replace('+', ''), type: 'text', text: { body: text } }),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        this.logger.error(`WhatsApp send failed for ${to}: ${res.status} ${body.slice(0, 200)}`);
        return false;
      }
      return true;
    } catch (err: any) {
      this.logger.error(`WhatsApp send failed for ${to}: ${err?.message}`);
      return false;
    }
  }

  /**
   * WHO IS WRITING, INSIDE ONE ORGANISATION. The roster's phone first, then the number a person typed
   * into Settings. Scoped to the organisation whose webhook received it, so a number never crosses
   * organisations.
   */
  async whoIsWritingTo(organizationId: string, rawNumber: string): Promise<{ personId: string | null; userId: string | null; externalId: string | null }> {
    const normalized = WhatsAppService.normalize(rawNumber);
    const person = await this.prisma.person.findFirst({
      where: { organizationId, phone: normalized, active: true },
      select: { id: true, externalId: true, linkedUserId: true, email: true },
    });
    if (person) {
      const userId = person.linkedUserId
        ?? (person.email ? (await this.prisma.user.findFirst({ where: { organizationId, email: person.email, deletedAt: null }, select: { id: true } }))?.id ?? null : null);
      return { personId: person.id, userId, externalId: person.externalId };
    }
    const user = await this.prisma.user.findFirst({ where: { organizationId, phoneNumber: normalized, deletedAt: null }, select: { id: true, email: true } });
    if (!user) return { personId: null, userId: null, externalId: null };
    const byEmail = user.email ? await this.prisma.person.findFirst({ where: { organizationId, email: user.email }, select: { id: true, externalId: true } }) : null;
    return { personId: byEmail?.id ?? null, userId: user.id, externalId: byEmail?.externalId ?? null };
  }

  /** The organisation's connection, with the secrets left out, for its admin to read. */
  async connectionFor(organizationId: string) {
    const c = await this.prisma.whatsAppConnection.findUnique({ where: { organizationId } });
    if (!c) return null;
    return {
      phoneNumberId: c.phoneNumberId,
      businessAccountId: c.businessAccountId,
      displayNumber: c.displayNumber,
      verifyToken: c.verifyToken,
      enabled: c.enabled,
      connectedAt: c.connectedAt,
      lastInboundAt: c.lastInboundAt,
      lastOutboundAt: c.lastOutboundAt,
      tokenEndsWith: c.accessToken.slice(-4),
    };
  }

  async connect(organizationId: string, dto: { phoneNumberId?: string; businessAccountId?: string; displayNumber?: string; accessToken?: string; appSecret?: string }) {
    const phoneNumberId = dto.phoneNumberId?.trim();
    const accessToken = dto.accessToken?.trim();
    const appSecret = dto.appSecret?.trim();
    if (!phoneNumberId) throw new BadRequestException('phoneNumberId is required: the id Meta gives the number, not the number itself.');
    if (!/^\d{6,}$/.test(phoneNumberId)) throw new BadRequestException('phoneNumberId is digits only. It is on the WhatsApp > API Setup page in Meta Business.');
    const existing = await this.prisma.whatsAppConnection.findUnique({ where: { organizationId } });
    if (!accessToken && !existing) throw new BadRequestException('accessToken is required the first time: the permanent system-user token from Meta.');
    if (!appSecret && !existing) throw new BadRequestException("appSecret is required the first time: the App Secret from your Meta app, used to check that inbound messages are Meta's.");
    const verifyToken = existing?.verifyToken ?? `gwv_${crypto.randomBytes(16).toString('hex')}`;
    const row = await this.prisma.whatsAppConnection.upsert({
      where: { organizationId },
      create: {
        organizationId, phoneNumberId, businessAccountId: dto.businessAccountId?.trim() || null, displayNumber: dto.displayNumber?.trim() || null,
        accessToken: accessToken!, appSecret: appSecret!, verifyToken, enabled: true,
      },
      update: {
        phoneNumberId, businessAccountId: dto.businessAccountId?.trim() || null, displayNumber: dto.displayNumber?.trim() || null,
        ...(accessToken ? { accessToken } : {}), ...(appSecret ? { appSecret } : {}),
      },
    });
    this.logger.log(`WhatsApp connected for org ${organizationId} on number id ${row.phoneNumberId}`);
    return this.connectionFor(organizationId);
  }

  async setConnectionEnabled(organizationId: string, enabled: boolean) {
    await this.prisma.whatsAppConnection.update({ where: { organizationId }, data: { enabled } });
    return this.connectionFor(organizationId);
  }

  async disconnect(organizationId: string) {
    await this.prisma.whatsAppConnection.delete({ where: { organizationId } }).catch(() => undefined);
    return { disconnected: true };
  }

  /** A test message to the admin's own number, on the organisation's connection. Proves the token and the number id. */
  async sendTest(organizationId: string, toNumber: string) {
    const own = await this.prisma.whatsAppConnection.findUnique({ where: { organizationId } });
    if (!own) throw new BadRequestException('Connect a number first.');
    if (!toNumber?.trim()) throw new BadRequestException('Say which number to send the test to.');
    const ok = await this.deliver(own.phoneNumberId, own.accessToken, WhatsAppService.normalize(toNumber), 'Groundwork is connected to this number. Reply here when a check-in is open and it goes into your record.');
    if (!ok) throw new BadRequestException('Meta refused the message. Check the token, the number id, and that this number may receive messages from your Meta app.');
    await this.prisma.whatsAppConnection.update({ where: { id: own.id }, data: { lastOutboundAt: new Date() } });
    return { sent: true };
  }

  /** Verify an inbound POST against the organisation's own app secret. Same rule as the platform route. */
  verifySignatureWith(appSecret: string, headers: Record<string, string | string[] | undefined>, raw: Buffer): void {
    const header = headers['x-hub-signature-256'];
    const provided = Array.isArray(header) ? header[0] : header;
    if (!provided || !provided.startsWith('sha256=')) throw new UnauthorizedException('Missing or malformed WhatsApp signature');
    const expected = crypto.createHmac('sha256', appSecret).update(raw).digest('hex');
    const got = provided.slice('sha256='.length);
    if (got.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(got, 'utf8'), Buffer.from(expected, 'utf8'))) {
      throw new UnauthorizedException('WhatsApp signature did not match');
    }
  }

  async findUserByPhoneNumber(rawNumber: string) {
    const normalized = WhatsAppService.normalize(rawNumber);
    return this.prisma.user.findUnique({ where: { phoneNumber: normalized } });
  }

  /** Set (or clear) a user's WhatsApp number. Called from Settings (self) or org roster (admin/HR on someone's behalf). */
  async setPhoneNumber(userId: string, rawNumber: string | null): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { phoneNumber: rawNumber ? WhatsAppService.normalize(rawNumber) : null },
    });
  }
}
