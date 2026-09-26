/**
 * A SUGGESTED ORGANISATION NAME, FROM THE EMAIL ADDRESS. U.2, Hafsah's decision of 26 September.
 *
 * Like a Slack workspace: signing up as hafsah@coamana.com suggests "Coamana", which the person can
 * change. An address at a public mail service (gmail.com and the like) suggests nothing, because
 * "Gmail" is not anybody's organisation.
 *
 * THE ONE LIST OF PUBLIC MAIL DOMAINS. Joining an existing organisation by its email domain (U.3) will
 * need the same list on the server; when that is built, the list moves to the API and this reads it,
 * so there is still only one.
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
]
/** The big services under any country's ending: yahoo.co.ke, hotmail.fr, outlook.co.za, and so on. */
const PUBLIC_EVERYWHERE = ['gmail', 'yahoo', 'hotmail', 'outlook', 'live', 'icloud', 'aol', 'gmx', 'yandex']

/** Labels that are part of a country's ending rather than a name: acme.co.uk, baridi.co.ke. */
const SECOND_LEVEL = new Set(['co', 'com', 'org', 'net', 'ac', 'gov', 'edu', 'or', 'ne', 'go', 'sch', 'ltd', 'plc'])
const NOT_A_NAME = new Set(['www', 'mail', 'email', 'mx', 'smtp'])

export function isAPublicMailDomain(domain: string): boolean {
  const d = domain.trim().toLowerCase()
  if (PUBLIC_MAIL_DOMAINS.includes(d)) return true
  return PUBLIC_EVERYWHERE.includes(d.split('.')[0])
}

/** "hafsah@coamana.com" gives "Coamana"; "sam@blue-river.co.uk" gives "Blue River"; a Gmail address gives null. */
export function aNameFromAnEmailAddress(email: string): string | null {
  const at = email.trim().toLowerCase().lastIndexOf('@')
  if (at < 1) return null
  const domain = email.trim().toLowerCase().slice(at + 1)
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(domain) || isAPublicMailDomain(domain)) return null
  const labels = domain.split('.').slice(0, -1)
  if (labels.length > 1 && SECOND_LEVEL.has(labels[labels.length - 1])) labels.pop()
  const name = [...labels].reverse().find(l => !NOT_A_NAME.has(l))
  if (!name || name.length < 2) return null
  return name.split('-').filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}
