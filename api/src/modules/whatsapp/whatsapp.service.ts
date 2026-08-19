import * as crypto from 'crypto';
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
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
      this.logger.warn(`[DEV WHATSAPP] To: ${to} | Body: ${text}`);
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
