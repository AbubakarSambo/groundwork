/**
 * PUTTING 160 PEOPLE ON, WHICH THE PRODUCT COULD ONLY DO ONE EMAIL AT A TIME.
 *
 * An HR admin rolling this out pastes a list. Everything about that is different from inviting one
 * person, and none of the differences are cosmetic:
 *
 * IT MUST NOT BE ALL-OR-NOTHING. A hundred and sixty addresses will contain a typo, somebody who
 * already has an account, and a duplicate. Failing the batch on any of those and asking them to
 * find it is not a feature, it is homework. Every row gets its own answer.
 *
 * IT MUST BE PREVIEWABLE, and the preview has to be the same code path as the send. A preview that
 * reads the list separately is a second implementation that will one day disagree with the first,
 * and it will disagree on the screen where somebody is deciding whether to email their whole
 * company.
 *
 * THE SEAT LIMIT IS THE POINT OF THE PREVIEW. `teamInvite` already refuses when the plan has no
 * room, one at a time. Pasting 160 into a free account without a preview means the first forty
 * land, the rest fail, and the admin has emailed a fraction of their company with no way to tell
 * which fraction.
 */

/** What happened, or would happen, to one address. */
export type RowResult =
  | 'invited'      /* A new person. On a preview: would be invited. */
  | 'already here' /* Somebody with this address is already in the record. Not an error. */
  | 'repeated'     /* The same address twice in one paste. Counted once. */
  | 'not an email' /* Kept out here rather than failing at the send. */
  | 'no seat';     /* The plan has no room. The whole reason a preview exists. */

export interface Row { email: string; result: RowResult; /** The name typed beside the address, so the preview can show what was read. */ name?: string; /** The phone number typed on the same line (Hafsah, 30 October 2026). */ phone?: string; /** Why that number was not saved, in the refusal's own words, when it was not. */ phoneNotSaved?: string }

/**
 * How many addresses one paste may carry.
 *
 * Not a guess at a comfortable number - it is the size of the largest organisation this is
 * plausibly used for in one go, and past it the answer is a directory sync rather than a paste.
 * A cap that is never hit still has to exist: without one, a paste is an unbounded fan-out of
 * emails triggered by one request.
 */
export const MOST_IN_ONE_PASTE = 500;

/**
 * WHAT COUNTS AS AN ADDRESS HERE.
 *
 * Deliberately loose. This is not validating an email, it is separating "somebody pasted a name by
 * accident" from "an address we can try". Being strict here rejects real addresses - plus signs,
 * long suffixes, unusual domains - and the person it rejects is a real colleague who then never
 * gets invited and nobody notices.
 */
const LOOKS_LIKE_AN_ADDRESS = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Split whatever they pasted.
 *
 * Commas, semicolons, newlines, tabs and spaces, because a paste comes from a spreadsheet column,
 * a mail client's To field, or a chat message, and all three arrive differently. Angle brackets and
 * display names are stripped: "Ada Lovelace <ada@example.com>" is what a mail client hands over.
 */
/**
 * "ONE PER LINE: A NAME AND AN EMAIL" (U.4, the prototype's People page). A line with exactly one
 * address and a name beside it - "Ada Obi, ada@x.com", or a name and an address in two spreadsheet
 * columns - is that person, written the way a mail client writes them, "Ada Obi <ada@x.com>". A line
 * with two or more addresses is left alone, so a pasted To field still splits as it did.
 */
const A_NAME = /^[\p{L}][\p{L}\p{M}' .-]*$/u;
/*
 * A NAME IS TWO WORDS OR MORE, or one in its own spreadsheet column. "oops, b@x.com" is a typo
 * beside an address, and must still come back as its own "not an email" row rather than become
 * somebody called Oops.
 */
const aFullName = (name: string, fromAColumn: boolean) => A_NAME.test(name) && (fromAColumn || name.includes(' '));
/*
 * "ONE PER LINE: A NAME AND AN EMAIL, OR A WHATSAPP NUMBER" (A4 people.txt:224). A phone number on the line is that person's,
 * read with their name and address and taken out before the address is read, so it is never mistaken for an address. Hafsah,
 * 30 October 2026: phone numbers are added with the team, not one by one afterwards.
 */
const A_PHONE = /(?:^|(?<=[\s,;\t]))(\+?\d[\d ()-]{6,}\d)(?=$|[\s,;\t])/;
const theNumberOn = (line: string): string | null => line.match(A_PHONE)?.[1]?.trim() ?? null;
const withoutTheNumber = (line: string): string => line.replace(A_PHONE, ' ');
function aPersonOnALine(raw: string): { name: string; email: string } | null {
  const line = withoutTheNumber(raw);
  if (/<[^>]+>/.test(line)) return null;
  const fromAColumn = line.includes('\t');
  const parts = line.split(/[,;\t]+|\s{2,}/).map((p) => p.trim()).filter(Boolean);
  const withAt = parts.filter((p) => p.includes('@'));
  if (withAt.length !== 1) return null;
  const rest = parts.filter((p) => !p.includes('@')).join(' ').replace(/\s+/g, ' ').trim();
  if (!rest || !aFullName(rest, fromAColumn)) {
    /* "Ada Obi ada@x.com", with single spaces. */
    const m = line.trim().match(/^(.+?)\s+(\S+@\S+)$/);
    if (m && aFullName(m[1].trim(), false)) return { name: m[1].trim(), email: m[2] };
    return null;
  }
  return { name: rest, email: withAt[0] };
}
function withNamesWritten(pasted: string): string {
  return (pasted ?? '').split(/\r?\n/).map((line) => {
    const p = aPersonOnALine(line);
    return p ? `${p.name} <${p.email}>` : withoutTheNumber(line);
  }).join('\n');
}

/** The phone number typed on the same line as an address, by address. */
export function numbersIn(pasted: string): Map<string, string> {
  const numbers = new Map<string, string>();
  for (const line of (pasted ?? '').split(/\r?\n/)) {
    const phone = theNumberOn(line);
    const email = withoutTheNumber(line).match(/[^\s,;<>\t]+@[^\s,;<>\t]+/)?.[0];
    if (phone && email) numbers.set(email.trim().toLowerCase(), phone);
  }
  return numbers;
}

/** The names given beside addresses, by address, for the accounts the invitations make. */
export function namesIn(pasted: string): Map<string, string> {
  const names = new Map<string, string>();
  for (const line of (pasted ?? '').split(/\r?\n/)) {
    const p = aPersonOnALine(line);
    if (p) names.set(p.email.trim().toLowerCase(), p.name);
    /* "Name <address>", the way a mail client writes a person, on its own line or in a To field (B-128). It was read for the address and the name thrown away. */
    for (const m of line.matchAll(/([^,;<>\t]*?)<([^<>\s,;]+@[^<>\s,;]+)>/g)) {
      const name = m[1].replace(/["']/g, ' ').replace(/\s+/g, ' ').trim();
      if (name && A_NAME.test(name)) names.set(m[2].trim().toLowerCase(), name);
    }
  }
  return names;
}

export function addressesIn(pasted: string): string[] {
  return withNamesWritten(pasted)
    .split(/[,;\n\r\t]+|\s{2,}/)
    .map((part) => {
      const angled = part.match(/<([^>]+)>/);
      return (angled ? angled[1] : part).trim().toLowerCase();
    })
    .filter(Boolean);
}

/**
 * Decide what happens to each address, in order, against a fixed number of seats.
 *
 * IN ORDER AND NOT SORTED. When there are twelve seats and forty addresses, which twelve get in has
 * to be something the admin can predict, and "the first twelve I pasted" is the only answer that is
 * predictable from the screen they are looking at.
 *
 * `seats` is null for an organisation with no cap.
 */
export function planFor(
  pasted: string,
  alreadyHere: (email: string) => boolean,
  seats: number | null,
): Row[] {
  const seen = new Set<string>();
  let left = seats;
  const rows: Row[] = [];

  const names = namesIn(pasted);
  const numbers = numbersIn(pasted);
  for (const email of addressesIn(pasted)) {
    const name = names.get(email);
    const phone = numbers.get(email);
    const withName = (result: RowResult): Row => ({ email, result, ...(name ? { name } : {}), ...(phone ? { phone } : {}) });
    if (seen.has(email)) { rows.push(withName('repeated')); continue; }
    seen.add(email);

    if (!LOOKS_LIKE_AN_ADDRESS.test(email)) { rows.push({ email, result: 'not an email' }); continue; }
    if (alreadyHere(email)) { rows.push(withName('already here')); continue; }
    /* Only a new person consumes a seat, which is the same rule `canInviteMember` applies. */
    if (left !== null && left <= 0) { rows.push(withName('no seat')); continue; }
    if (left !== null) left -= 1;
    rows.push(withName('invited'));
  }
  return rows;
}

/** One line an admin can read before they email their company. */
/**
 * THE LINE AN ADMIN READS BEFORE, AND AFTER, EMAILING THEIR COMPANY: full sentences (U.4). It read
 * "2 to invite, 1 repeated", pieces joined with commas. What will be sent comes first, and what is
 * blocked for want of a seat last, because that is the one that needs a decision. `sent` changes
 * the tense once the invitations have gone.
 */
export function summarise(rows: Row[], sent = false): string {
  const n = (r: RowResult) => rows.filter((x) => x.result === r).length;
  const one = (k: number) => k === 1;
  const said: string[] = [];
  const invited = n('invited');
  if (invited) {
    said.push(sent
      ? (one(invited) ? '1 person was invited.' : `${invited} people were invited.`)
      : (one(invited) ? '1 person will be invited.' : `${invited} people will be invited.`));
  }
  const here = n('already here');
  if (here) said.push(one(here) ? '1 person is already here.' : `${here} people are already here.`);
  const twice = n('repeated');
  if (twice) said.push(one(twice) ? '1 address was listed twice, so it is left out.' : `${twice} addresses were listed twice, so they are left out.`);
  const bad = n('not an email');
  if (bad) said.push(one(bad) ? '1 line is not an email address.' : `${bad} lines are not email addresses.`);
  const noSeat = n('no seat');
  if (noSeat) {
    const has = one(noSeat) ? '1 person has' : `${noSeat} people have`;
    /* After the send they are kept (B-129); before it they will be. */
    said.push(sent
      ? `${has} no seat on your plan, so ${one(noSeat) ? 'the invitation is' : 'the invitations are'} kept and will go out when there is room.`
      : `${has} no seat on your plan, so ${one(noSeat) ? 'the invitation' : 'the invitations'} will be kept until there is room.`);
  }
  return said.length ? said.join(' ') : 'There is nobody new to invite.';
}
