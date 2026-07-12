import { Injectable, Logger } from '@nestjs/common';
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
