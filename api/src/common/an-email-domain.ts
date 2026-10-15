/**
 * WHAT AN EMAIL ADDRESS'S DOMAIN SAYS ABOUT AN ORGANISATION, IN ONE PLACE (U.2, U.3).
 *
 * Two things read it:
 *   - Sign-up suggests the organisation's name from the address, like a Slack workspace:
 *     hafsah@coamana.com suggests "Coamana" (GET /auth/name-from-address).
 *   - Joining an organisation by its email domain: an admin may let "anyone with an @baridi.co.ke
 *     email" join, and somebody who signs up with such an address is offered it.
 *
 * THE ONE LIST OF PUBLIC MAIL DOMAINS. A public mail address (gmail.com, yahoo.com, outlook.com and
 * the like, including yahoo.co.ke-style country endings) is nobody's organisation: it suggests no
 * name, and no organisation may claim it for joining. The list lives here, on the server, and the
 * screens only ever ask (Hafsah, 26 September). It moved here from client/src/lib in U.3.
 */
export const PUBLIC_MAIL_DOMAINS: readonly string[] = [
  'gmail.com', 'googlemail.com',
  'yahoo.com', 'yahoo.co.uk', 'yahoo.fr', 'ymail.com', 'rocketmail.com',
  'outlook.com', 'hotmail.com', 'hotmail.co.uk', 'live.com', 'msn.com',
  'icloud.com', 'me.com', 'mac.com',
  'aol.com', 'proton.me', 'protonmail.com', 'pm.me',
  'gmx.com', 'gmx.net', 'gmx.de', 'mail.com', 'zoho.com', 'zohomail.com',
  'yandex.com', 'yandex.ru', 'mail.ru', 'qq.com', '163.com', '126.com',
  'fastmail.com', 'hey.com', 'tutanota.com', 'tuta.io',
];
/** The big services under any country's ending: yahoo.co.ke, hotmail.fr, outlook.co.za, and so on. */
const PUBLIC_EVERYWHERE = ['gmail', 'yahoo', 'hotmail', 'outlook', 'live', 'icloud', 'aol', 'gmx', 'yandex'];

/** Labels that are part of a country's ending rather than a name: acme.co.uk, baridi.co.ke. */
const SECOND_LEVEL = new Set(['co', 'com', 'org', 'net', 'ac', 'gov', 'edu', 'or', 'ne', 'go', 'sch', 'ltd', 'plc']);
const NOT_A_NAME = new Set(['www', 'mail', 'email', 'mx', 'smtp']);

export function isAPublicMailDomain(domain: string): boolean {
  const d = (domain ?? '').trim().toLowerCase();
  if (PUBLIC_MAIL_DOMAINS.includes(d)) return true;
  return PUBLIC_EVERYWHERE.includes(d.split('.')[0]);
}

/** The domain of an address, lowercased, or null when it is not an address. */
export function theDomainOf(email: string | null | undefined): string | null {
  const e = (email ?? '').trim().toLowerCase();
  const at = e.lastIndexOf('@');
  if (at < 1) return null;
  const domain = e.slice(at + 1);
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(domain) ? domain : null;
}

/** A domain an organisation could be joined by: a real one, and not a public mail service. */
export function mayBeJoinedBy(domain: string | null | undefined): boolean {
  const d = (domain ?? '').trim().toLowerCase();
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(d) && !isAPublicMailDomain(d);
}

/**
 * THE ONE DOMAIN "WHO CAN JOIN" MEANS (Hafsah, 30 September, item 3).
 *
 * It starts as the domain of the organisation's own founding email address (`Organization.email`,
 * set when the organisation was created) - so long as that is a real company domain, never a public
 * one. An admin can change it (`Organization.joinDomain`, `UsersService.changeJoinDomain`); once
 * they have, their choice is what this returns, whatever the founding address was. With a public
 * founding address, there is no domain until an admin names one - this returns null, not a guess.
 *
 * BOTH THE INVITE LINK AND JOINING BY DOMAIN READ THIS SAME VALUE, so an admin who changes it
 * changes what both mean by "this organisation's people": the invite link's own domain check
 * (`TheOrganisationInviteLinkService.join`) and the domain join switch (`UsersService.joiningByDomain`)
 * call this rather than each reading `Organization.email` or `Organization.joinDomain` on its own.
 */
export function effectiveJoinDomain(org: { email: string | null | undefined; joinDomain: string | null | undefined }): string | null {
  if (org.joinDomain) return org.joinDomain;
  const founding = theDomainOf(org.email);
  return founding && mayBeJoinedBy(founding) ? founding : null;
}

/** "hafsah@coamana.com" gives "Coamana"; "sam@blue-river.co.uk" gives "Blue River"; a Gmail address gives null. */
export function aNameFromAnEmailAddress(email: string): string | null {
  const domain = theDomainOf(email);
  if (!domain || isAPublicMailDomain(domain)) return null;
  const labels = domain.split('.').slice(0, -1);
  if (labels.length > 1 && SECOND_LEVEL.has(labels[labels.length - 1])) labels.pop();
  const name = [...labels].reverse().find((l) => !NOT_A_NAME.has(l));
  if (!name || name.length < 2) return null;
  return name.split('-').filter(Boolean).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

/**
 * AN ADDRESS WRITTEN THE WAY MAIL PROGRAMS WRITE IT (journey test, 12 October).
 *
 * Lena pasted her team as "Pia Alpha <pia@brightloom.test>", the way an address book copies them.
 * The whole line was kept as Pia's address. So her domain could not be read and she was told she was
 * "from outside" her own company, and when she later asked for a sign-in link with her real address
 * nobody had that address, so a new organisation was made for her and her check-in was lost.
 *
 * This takes the address out of such a line and keeps the name beside it. A plain address comes back
 * lowercased and trimmed. Anything that is still not an address comes back as it was typed, lowercased,
 * so the caller's own check can refuse it with its own sentence.
 */
export function theAddressAndNameIn(raw: string | null | undefined): { email: string; name: string | null } {
  const typed = (raw ?? '').trim();
  const bracketed = typed.match(/^(.*?)<\s*([^<>\s]+@[^<>\s]+)\s*>\s*$/);
  if (bracketed) {
    const name = bracketed[1].replace(/^["'\s]+|["'\s]+$/g, '').replace(/\s+/g, ' ').trim();
    return { email: bracketed[2].toLowerCase(), name: name || null };
  }
  return { email: typed.replace(/^mailto:/i, '').toLowerCase(), name: null };
}
