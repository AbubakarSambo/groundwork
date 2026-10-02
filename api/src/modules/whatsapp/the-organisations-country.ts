import { BadRequestException } from '@nestjs/common';
import { aLocalForm, callingCodeOf, tidyANumber } from './a-number-whatsapp-can-reach';

/**
 * THE ORGANISATION'S COUNTRY, FOR A LOCAL NUMBER (survey item 6).
 *
 * An organisation has no country stored. Two things say it without guessing: the organisation's own
 * WhatsApp number, when it has connected one, and the numbers already kept for its people, when they
 * all share one country code. When neither says, a local number starting with 0 is refused with a
 * sentence asking for the whole number, rather than given a country somebody did not choose.
 */
type Db = {
  whatsAppConnection?: { findUnique: (q: any) => Promise<any> };
  person?: { findMany: (q: any) => Promise<any[]> };
  user?: { findMany: (q: any) => Promise<any[]> };
};

export async function theCountryCodeOf(db: Db, organizationId: string | null | undefined): Promise<string | null> {
  if (!organizationId) return null;
  const own = await db.whatsAppConnection?.findUnique({ where: { organizationId }, select: { displayNumber: true } }).catch(() => null);
  if (own?.displayNumber && !aLocalForm(own.displayNumber)) {
    const code = callingCodeOf(own.displayNumber);
    if (code) return code;
  }
  const [people, users] = await Promise.all([
    db.person?.findMany({ where: { organizationId, phone: { startsWith: '+' } }, select: { phone: true }, take: 200 }).catch(() => []) ?? [],
    db.user?.findMany({ where: { organizationId, phoneNumber: { startsWith: '+' } }, select: { phoneNumber: true }, take: 200 }).catch(() => []) ?? [],
  ]);
  const codes = new Set<string>();
  for (const n of [...(people ?? []).map((p: any) => p?.phone), ...(users ?? []).map((u: any) => u?.phoneNumber)]) {
    if (!n || aLocalForm(n)) continue;
    const code = callingCodeOf(n);
    if (code) codes.add(code);
  }
  return codes.size === 1 ? [...codes][0] : null;
}

/**
 * A NUMBER SOMEBODY TYPED, IN THE ONE STORED FORM, OR A PLAIN SENTENCE SAYING WHAT TO WRITE. Used
 * wherever a number is kept: Settings, an admin's roster entry, and an organisation's roster.
 */
export async function tidyANumberFor(db: Db, organizationId: string | null | undefined, raw: string): Promise<string> {
  const plain = tidyANumber(raw);
  if ('number' in plain) return plain.number;
  const withCountry = tidyANumber(raw, await theCountryCodeOf(db, organizationId));
  if ('number' in withCountry) return withCountry.number;
  throw new BadRequestException(withCountry.refused);
}
