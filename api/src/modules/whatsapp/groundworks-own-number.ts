import { BadRequestException, Logger } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { canSeal, open, seal, whyNoKey, MIN_KEY_CHARACTERS, THE_KEY_SETTING } from '../../common/a-secret-kept-sealed';

/**
 * GROUNDWORK'S OWN WHATSAPP NUMBER, SET IN THE BACK OFFICE (5 Oct 2026, Hafsah: "check whether the
 * back office lets Groundwork staff set Groundwork's own WhatsApp number and webhook for all users").
 *
 * It did not: the number, its keys and the verify token were server settings only (WHATSAPP_*), so
 * only whoever runs the hosting could set them. Now a platform admin types them in at /admin/whatsapp.
 *
 * - Kept in one `platform_settings` row, `whatsapp.groundworksNumber`.
 * - The three secrets (access token, app secret, verify token) are sealed with AES-256-GCM under the
 *   server setting SETTINGS_ENCRYPTION_KEY before they are written, opened only when used, and never
 *   returned, logged or put in an error. The page reads "set" or "not set", nothing more.
 * - Field by field, a value saved here wins; with nothing saved, the server setting is used, exactly
 *   as before. A deployment where nobody has saved anything behaves as it did.
 * - Read at most once every 30 seconds per database client, and forgotten the moment it is saved.
 */

export const OUR_NUMBER_KEY = 'whatsapp.groundworksNumber';
const FOR_MS = 30_000;

export const SECRET_FIELDS = ['accessToken', 'appSecret', 'verifyToken'] as const;
export const PLAIN_FIELDS = ['displayNumber', 'phoneNumberId', 'businessAccountId'] as const;
export type SecretField = (typeof SECRET_FIELDS)[number];
export type PlainField = (typeof PLAIN_FIELDS)[number];

/** What the row holds. Secrets are sealed text, never the secret. */
type Stored = Partial<Record<PlainField | SecretField, string | null>>;

/** What the sender, the signature check and the verify-token check use. */
export type OurNumber = {
  accessToken?: string;
  phoneNumberId?: string;
  appSecret?: string;
  verifyToken?: string;
  displayNumber?: string;
  /** Both the access token and the phone number ID are present, wherever each came from. */
  enabled: boolean;
};

export type SecretState = 'set' | 'not set';

/** What the back office reads. No secret, ever. */
export type OurNumberAsStaffReadIt = {
  fields: Record<PlainField, { value: string | null; from: 'here' | 'server' | null; saying: string }>;
  secrets: Record<SecretField, { state: SecretState; saying: string }>;
  canSaveSecrets: boolean;
  canSaveSecretsSaying: string;
  webhook: { address: string | null; path: string; saying: string };
};

export const OUR_CALLBACK_PATH = '/api/v1/webhooks/whatsapp';

const SECRET_NAMES: Record<SecretField, string> = {
  accessToken: 'access token',
  appSecret: 'app secret',
  verifyToken: 'verify token',
};
/** Each secret is sealed bound to its own place, so a sealed token cannot be moved into another field. */
export const placeOf = (field: SecretField) => `${OUR_NUMBER_KEY}:${field}`;

const PLAIN_NAMES: Record<PlainField, string> = {
  displayNumber: 'WhatsApp number',
  phoneNumberId: 'phone number ID',
  businessAccountId: 'business account ID',
};
const SERVER_SETTING: Record<PlainField | SecretField, string | null> = {
  displayNumber: 'whatsapp.displayNumber',
  phoneNumberId: 'whatsapp.phoneNumberId',
  businessAccountId: null,
  accessToken: 'whatsapp.accessToken',
  appSecret: 'whatsapp.appSecret',
  verifyToken: 'whatsapp.verifyToken',
};

const cache = new WeakMap<object, { at: number; stored: Stored | null }>();
/** Said once per saved secret that cannot be opened, not on every send. Held in memory, never logged. */
const toldCannotOpen = new Set<string>();

function aString(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() ? v.trim() : undefined;
}

export class GroundworksOwnNumber {
  private readonly logger = new Logger('GroundworksOwnNumber');

  constructor(
    private readonly config: Pick<ConfigService, 'get'>,
    private readonly prisma: any,
    private readonly keySetting: () => string | undefined = () => process.env[THE_KEY_SETTING],
  ) {}

  /** The row, or null when nothing is saved or it cannot be read. Never throws. */
  private async stored(): Promise<Stored | null> {
    const holder = (this.prisma && typeof this.prisma === 'object') ? this.prisma : null;
    const hit = holder ? cache.get(holder) : undefined;
    if (hit && Date.now() - hit.at < FOR_MS) return hit.stored;
    let stored: Stored | null = null;
    try {
      const row = await this.prisma?.platformSetting?.findUnique?.({ where: { key: OUR_NUMBER_KEY } });
      const v = row?.value;
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        stored = {};
        for (const f of [...PLAIN_FIELDS, ...SECRET_FIELDS]) {
          const s = aString((v as Record<string, unknown>)[f]);
          if (s) stored[f] = s;
        }
      }
    } catch {
      stored = null;
    }
    if (holder) cache.set(holder, { at: Date.now(), stored });
    return stored;
  }

  /** Forget the cached row, so the next read is the database's. */
  forget(): void {
    if (this.prisma && typeof this.prisma === 'object') cache.delete(this.prisma);
  }

  private server(field: PlainField | SecretField): string | undefined {
    const key = SERVER_SETTING[field];
    return key ? aString(this.config.get<string>(key)) : undefined;
  }

  /** A saved secret, opened. Undefined when none is saved or this server cannot open it. */
  private opened(stored: Stored | null, field: SecretField): string | undefined {
    const sealed = stored?.[field];
    if (!sealed) return undefined;
    const plain = open(sealed, placeOf(field), this.keySetting());
    if (plain === null) {
      /* The field's name only. Never the sealed text, never the key. */
      if (toldCannotOpen.has(sealed)) return undefined;
      toldCannotOpen.add(sealed);
      this.logger.warn(`The saved WhatsApp ${SECRET_NAMES[field]} cannot be opened with this server's ${THE_KEY_SETTING}; the server setting is used instead.`);
      return undefined;
    }
    return plain;
  }

  /** What every send and every webhook check uses: saved here first, then the server's settings. */
  async inUse(): Promise<OurNumber> {
    const stored = await this.stored();
    const accessToken = this.opened(stored, 'accessToken') ?? this.server('accessToken');
    const phoneNumberId = stored?.phoneNumberId ?? this.server('phoneNumberId');
    const savedAny = !!(stored?.phoneNumberId || stored?.accessToken);
    return {
      accessToken,
      phoneNumberId,
      appSecret: this.opened(stored, 'appSecret') ?? this.server('appSecret'),
      verifyToken: this.opened(stored, 'verifyToken') ?? this.server('verifyToken'),
      displayNumber: stored?.displayNumber ?? this.server('displayNumber'),
      /* With nothing saved, exactly the old reading of the server settings. */
      enabled: savedAny ? !!accessToken && !!phoneNumberId : !!this.config.get<boolean>('whatsapp.enabled'),
    };
  }

  /** The page, in sentences. Never a secret. */
  async asStaffReadIt(publicApiUrl: string | null | undefined): Promise<OurNumberAsStaffReadIt> {
    const stored = await this.stored();
    const fields = {} as OurNumberAsStaffReadIt['fields'];
    for (const f of PLAIN_FIELDS) {
      const here = stored?.[f] ?? null;
      const server = this.server(f) ?? null;
      const value = here ?? server;
      const from = here ? 'here' : server ? 'server' : null;
      fields[f] = {
        value,
        from,
        saying: from === 'here'
          ? `The ${PLAIN_NAMES[f]} was saved here.`
          : from === 'server'
            ? `The ${PLAIN_NAMES[f]} comes from the server's settings. Anything you save here replaces it.`
            : `The ${PLAIN_NAMES[f]} is not set.`,
      };
    }
    const secrets = {} as OurNumberAsStaffReadIt['secrets'];
    for (const f of SECRET_FIELDS) {
      const here = !!this.opened(stored, f);
      const savedButUnreadable = !!stored?.[f] && !here;
      const server = !!this.server(f);
      const state: SecretState = here || server ? 'set' : 'not set';
      const name = SECRET_NAMES[f];
      const saying = here
        ? `The ${name} is set. It was saved here and is kept encrypted.`
        : savedButUnreadable
          ? `The ${name} was saved here, but this server cannot read it, because its encryption key has changed. Type the ${name} in again.${server ? ' Until then the server setting is used.' : ''}`
          : server
            ? `The ${name} is set in the server's settings. Anything you save here replaces it.`
            : `The ${name} is not set.`;
      secrets[f] = { state, saying };
    }
    const canSaveSecrets = canSeal(this.keySetting());
    const base = publicApiUrl?.trim().replace(/\/+$/, '') || null;
    const address = base ? `${base}${OUR_CALLBACK_PATH}` : null;
    return {
      fields,
      secrets,
      canSaveSecrets,
      canSaveSecretsSaying: canSaveSecrets
        ? 'Secrets you type here are kept encrypted. Once saved, they are never shown again.'
        : whyNoKey(this.keySetting()) === 'too short'
          ? `This server's ${THE_KEY_SETTING} is too short, so secrets cannot be saved here yet. It must be at least ${MIN_KEY_CHARACTERS} characters, or 32 bytes written in base64 or hex. Ask whoever runs the hosting to change it, then come back.`
          : `This server has no ${THE_KEY_SETTING}, so secrets cannot be saved here yet. Ask whoever runs the hosting to add it, then come back.`,
      webhook: {
        address,
        path: OUR_CALLBACK_PATH,
        saying: address
          ? `The webhook address to give Meta is ${address}.`
          : `The server setting PUBLIC_API_URL is not set, so the full webhook address cannot be shown. It ends in ${OUR_CALLBACK_PATH}.`,
      },
    };
  }

  /**
   * SAVE WHAT WAS TYPED. A plain field left out stays as it is, and an empty one goes back to the
   * server setting. A secret left out or empty stays as it is; `remove` lists the secrets to forget.
   * Errors name the field, never what was typed into a secret.
   */
  async save(
    dto: Partial<Record<PlainField | SecretField, string | null>> & { remove?: string[] },
    userId: string,
  ): Promise<string[]> {
    const before = (await this.readRaw()) ?? {};
    const next: Stored = { ...before };
    const changed: string[] = [];

    for (const f of PLAIN_FIELDS) {
      const typed = dto?.[f];
      if (typed === undefined) continue;
      const v = typeof typed === 'string' ? typed.trim() : '';
      if (!v) { if (next[f]) { delete next[f]; changed.push(f); } continue; }
      if (f === 'phoneNumberId' && !/^\d{6,30}$/.test(v)) throw new BadRequestException('The phone number ID is digits only. It is on the WhatsApp API Setup page in Meta, beside the number.');
      if (f === 'businessAccountId' && !/^\d{6,30}$/.test(v)) throw new BadRequestException('The business account ID is digits only. It is on the WhatsApp API Setup page in Meta.');
      if (f === 'displayNumber' && (v.length > 30 || (v.match(/\d/g) ?? []).length < 7 || !/^[+\d][\d\s()-]*$/.test(v))) {
        throw new BadRequestException('Type the WhatsApp number the way people should read it, with its country code, for example +44 7700 900123.');
      }
      if (next[f] !== v) { next[f] = v; changed.push(f); }
    }

    const remove = new Set(Array.isArray(dto?.remove) ? dto.remove : []);
    for (const f of SECRET_FIELDS) {
      if (remove.has(f)) { if (next[f]) { delete next[f]; changed.push(f); } continue; }
      const typed = dto?.[f];
      if (typeof typed !== 'string' || !typed.trim()) continue;
      const v = typed.trim();
      if (/\s/.test(v)) throw new BadRequestException(`The ${SECRET_NAMES[f]} has a space in it. Copy it again from Meta, all in one piece.`);
      if (v.length > 2048) throw new BadRequestException(`The ${SECRET_NAMES[f]} is too long. Copy it again from Meta, and only it.`);
      if (!canSeal(this.keySetting())) {
        throw new BadRequestException(whyNoKey(this.keySetting()) === 'too short'
          ? `This server's ${THE_KEY_SETTING} is too short, so the ${SECRET_NAMES[f]} cannot be saved. It must be at least ${MIN_KEY_CHARACTERS} characters, or 32 bytes written in base64 or hex. Ask whoever runs the hosting to change it, then try again.`
          : `This server has no ${THE_KEY_SETTING}, so the ${SECRET_NAMES[f]} cannot be saved. Ask whoever runs the hosting to add it, then try again.`);
      }
      next[f] = seal(v, placeOf(f), this.keySetting());
      changed.push(f);
    }

    if (changed.length === 0) return [];
    await this.prisma.platformSetting.upsert({
      where: { key: OUR_NUMBER_KEY },
      create: { key: OUR_NUMBER_KEY, value: next, updatedBy: userId },
      update: { value: next, updatedBy: userId },
    });
    this.forget();
    /* Which fields changed and who changed them. Never a value. */
    this.logger.log(`Groundwork's WhatsApp settings were changed by ${userId}: ${changed.join(', ')}.`);
    return changed;
  }

  /** The row as stored, uncached, for a save. */
  private async readRaw(): Promise<Stored | null> {
    this.forget();
    return this.stored();
  }
}
