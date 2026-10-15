/**
 * A TITLE IS NOT A FIRST NAME.
 *
 * "Dr Amina Bello says that you were hired to manage the relationships with the five biggest
 * clients. Success for Dr means you ..." (seniorhire, run 10, the participant's own report). The
 * full name went in once and every later mention was cut to the first word of it, which was her
 * title. The same first word is what the conversation calls somebody and what it calls their lead.
 *
 * So the first name is the first word that is not a title. Titles are the ones people here really
 * carry, written with or without a full stop: Dr, Prof, Eng, Engr, Hon, Mr, Mrs, Ms, Miss, Sir, Madam,
 * Dame, Chief, Alhaji, Alhaja, Hajiya, Rev, Pastor, Barr, Arc, Justice and the rest below, and more
 * than one of them in a row ("Rt. Hon.", "Chief Dr").
 *
 * WHAT A TITLE LEAVES BEHIND DECIDES WHAT THE SHORT NAME IS:
 *   - a title and two or more names, "Dr Amina Bello": the short name is "Amina";
 *   - a title and one name, "Dr Bello" or "Mrs Okafor": there is no first name to use, and "Dr
 *     Bello" is how people say it, so the short name is the whole thing;
 *   - nothing but the word, "Hon": that is somebody's name, and it is left exactly as it is.
 */

const TITLES = new Set([
  'dr', 'doctor', 'prof', 'professor', 'eng', 'engr', 'engnr', 'hon', 'honourable', 'honorable', 'rt',
  'mr', 'mrs', 'ms', 'miss', 'mx', 'sir', 'madam', 'dame', 'chief', 'alhaji', 'alhaja', 'hajiya', 'hajia',
  'mallam', 'malam', 'rev', 'revd', 'reverend', 'pastor', 'pst', 'bishop', 'imam', 'apostle',
  'evangelist', 'deacon', 'deaconess', 'barr', 'barrister', 'arc', 'arch', 'justice', 'sen', 'senator',
  'amb', 'ambassador', 'oba', 'sheikh', 'gen', 'col', 'capt', 'maj', 'lt', 'sgt', 'cdr', 'pharm',
]);
/* NOT "Prince", "Princess", "Lady" or "Elder": each is somebody's given name here as often as a
   title. "Justice" is too, and is kept because it was asked for; alone, or with one other name, it
   is left as written, so a Justice Mensah is still Justice Mensah. */

/** Whether a word is a title, with or without its full stop. */
export function isATitle(word: string): boolean {
  return TITLES.has((word ?? '').trim().toLowerCase().replace(/\.+$/, ''));
}

/** The name, split into the titles in front of it and the rest. */
function split(fullName: string): { titles: string[]; rest: string[] } {
  const words = (fullName ?? '').trim().split(/\s+/).filter(Boolean);
  let k = 0;
  while (k < words.length && isATitle(words[k])) k += 1;
  return { titles: words.slice(0, k), rest: words.slice(k) };
}

/**
 * The name a person is called by after the first mention. See the three cases above: "Amina" for
 * "Dr Amina Bello", "Dr Bello" for "Dr Bello", "Hon" for "Hon".
 */
export function theShortNameOf(fullName: string): string {
  const name = (fullName ?? '').trim();
  const { titles, rest } = split(name);
  if (!titles.length) return rest[0] ?? name;
  if (rest.length >= 2) return rest[0];
  return name;
}

/**
 * The first name to call somebody by, from the two fields a person fills in. A first-name field
 * that holds only a title ("Dr", with "Amina Bello" as the last name) gives the first word of the
 * last name; one that starts with a title ("Dr Amina") gives the word after it. Anything else is
 * the first-name field, as they wrote it.
 */
export function theFirstNameFrom(firstName: string | null | undefined, lastName?: string | null): string | null {
  const first = (firstName ?? '').trim();
  if (!first) return null;
  const words = first.split(/\s+/);
  if (!isATitle(words[0])) return first;
  const short = theShortNameOf(`${first} ${(lastName ?? '').trim()}`.trim());
  return short || first;
}

/**
 * The first name of a person on a check-in, from their account name or, where they have none, the name they were given.
 * A title ("Dr") is never taken as the first name. Null when there is no name at all.
 */
export function theFirstNameOfAParticipant(p: { user?: { firstName?: string | null; lastName?: string | null } | null; nameGiven?: string | null } | null | undefined): string | null {
  const typed = (p?.user?.firstName ?? '').trim();
  const fromAccount = theFirstNameFrom(typed, p?.user?.lastName);
  /* Signup stores whatever was typed for the name whole, so "Rukia Otieno" can sit in the first-name field: only its first word is the first name. */
  if (fromAccount) return typed && !isATitle(typed.split(/\s+/)[0]) ? typed.split(/\s+/)[0] : fromAccount;
  const given = (p?.nameGiven ?? '').trim();
  return given ? theShortNameOf(given) : null;
}


/**
 * A SURNAME THAT IS A ROLE IS NO SURNAME (request 127 item 9). A person whose sign-up put "Lead" in the surname field was
 * read as "Wanjiru Lead has not said it" in one sentence and "Wanjiru" in the next. A last name that is only one of these
 * role or placeholder words is left off, wherever the full name is made.
 */
const NOT_A_SURNAME = new Set(['lead', 'leader', 'participant', 'member', 'admin', 'administrator', 'user', 'manager', 'owner', 'staff', 'team']);
export function aSurnameOrNothing(last: string | null | undefined): string | undefined {
  const l = (last ?? '').trim();
  return l && !NOT_A_SURNAME.has(l.toLowerCase().replace(/\.+$/, '')) ? l : undefined;
}
