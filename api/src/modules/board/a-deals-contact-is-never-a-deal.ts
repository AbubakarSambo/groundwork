import { aLineNamesTheCustomer } from './one-deal-per-customer';

/**
 * A PERSON NAMED AS A DEAL'S CONTACT IS NEVER A DEAL (Drop Access short run, item 8).
 *
 * Joseph was asked "You also have Juja Hardware on your list. What is the customer's need, their budget?" and said "Mr Kariuki
 * wants five units if they're KES 4,500 each." The record kept a second deal named "Mr Kariuki", with Mr Kariuki as its own
 * contact, beside Juja Hardware, and every board listed it as one of Joseph's deals ("Mr Kariuki is Joseph Kariuki's deal.
 * Nothing booked."). Mr Kariuki is Juja Hardware's owner.
 *
 * A DEAL NAMED AS A PERSON: a name with a title (Mr, Mrs, Ms, Dr, Madam) and no business word in it, or a name that is its own
 * contact. It is folded into the deal it is about, never kept as a deal of its own:
 *   - the speaker's deal that has this person as its contact, else
 *   - the one deal of the speaker's named in the question they were answering.
 * With neither, nothing is guessed: no deal is kept, and the line stays on the record as what was said.
 */
export interface ADealToFold {
  id?: string;
  kind?: string;
  name: string;
  stage?: string | null;
  ownerParticipantId?: string | null;
  fields?: Record<string, unknown> | null;
}

const BUSINESS = /\b(?:Cafe|Café|Hotel|Supermarket|Stores?|Shops?|Offices?|Hardware|Mart|Minimart|Gym|Kiosk|Restaurant|Ltd|Limited|Electricals|Electronics|Foods?|Butchery|Deli|Distributors|Pharmacy|Bakery|School|Hospital|Clinic|Bank|Company|Enterprises|Traders|Wholesalers|Lodge|Inn|Bar|Club|Salon|Farms?|Industries|Group|Services|Solutions|Westgate|Fresh)\b/i;
const A_TITLE = /^\s*(?:Mr|Mrs|Ms|Miss|Dr|Madam|Prof)\.?\s+[A-Z][\p{L}'’-]+(?:\s+[A-Z][\p{L}'’-]+)?\s*$/u;
const squash = (s: unknown) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const contactOf = (fields: Record<string, unknown> | null | undefined) =>
  String(Object.entries(fields ?? {}).find(([k]) => /^(?:contact|contact person|customer contact)$/i.test(k.trim()))?.[1] ?? '').trim();

/** Whether a deal's name is a person's: titled with no business word, or its own contact. */
export function aDealNamedAsAPerson(d: ADealToFold): boolean {
  const name = String(d.name ?? '').trim();
  if (!name || BUSINESS.test(name)) return false;
  if (A_TITLE.test(name)) return true;
  const contact = contactOf(d.fields ?? null);
  return !!contact && squash(contact) === squash(name);
}

/** The deal a person-named deal is about, from the speaker's own deals and the question they were answering; null where unsure. */
export function theDealThePersonIsAt<D extends ADealToFold>(personDeal: ADealToFold, theirDeals: D[], questionBefore: string | null): D | null {
  const others = theirDeals.filter((d) => d !== personDeal && (!personDeal.id || d.id !== personDeal.id) && !aDealNamedAsAPerson(d));
  const who = squash(personDeal.name);
  const byContact = others.filter((d) => { const c = squash(contactOf(d.fields ?? null)); return !!c && (c === who || c.replace(/^(?:mr|mrs|ms|miss|dr|madam|prof) /, '') === who.replace(/^(?:mr|mrs|ms|miss|dr|madam|prof) /, '')); });
  if (byContact.length === 1) return byContact[0];
  if (!questionBefore) return null;
  const named = others.filter((d) => aLineNamesTheCustomer(questionBefore, d.name));
  return named.length === 1 ? named[0] : null;
}

/** The deal's fields with the person's details carried over where the deal has none: the person becomes its contact. */
export function thePersonsDetailsOnTheDeal(deal: ADealToFold, personDeal: ADealToFold): Record<string, unknown> {
  const out: Record<string, unknown> = { ...((deal.fields as any) ?? {}) };
  for (const [k, v] of Object.entries((personDeal.fields as any) ?? {})) {
    if (k.startsWith('_')) continue;
    if (out[k] == null || out[k] === '') out[k] = v;
  }
  if (!contactOf(out)) out.Contact = String(personDeal.name).trim();
  return out;
}

/** The AI turn just before the person's turn that holds this line, from one check-in's turns in order. */
export function theQuestionBefore(turns: { role: string; content: string | null }[], line: string): string | null {
  const head = squash(line).slice(0, 40);
  if (!head) return null;
  const at = turns.findIndex((t) => t.role === 'PERSON' && squash(t.content).includes(head));
  for (let i = at - 1; i >= 0; i--) if (turns[i].role === 'AI') return String(turns[i].content ?? '');
  return null;
}
