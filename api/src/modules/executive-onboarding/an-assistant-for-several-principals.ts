/**
 * AN ASSISTANT WHO ACTS FOR SEVERAL SENIOR PEOPLE (Ebele round 2, E2; plan section 7). Somebody who acts for one senior person is that person's assistant, and
 * what they send is hers. Somebody who acts for two or more cannot be taken to mean any one of them: until now their words and forwards fell through (the
 * speaker was "nobody" to the code that hears a senior person), so nothing was kept and nobody was asked. What they send now is held, ONE question is put to them
 * (which of them it is for), and nothing is done, kept for anyone or told to anyone until they answer.
 *
 * WHAT IS PREDICTABLE HERE IS WHOSE RECORD SOMETHING GOES INTO, because that is a privacy matter. So who is meant is not guessed: it is a name the assistant wrote that is
 * exactly one of the people she acts for. Anything else is asked about, and the item stays held. What the item says (the owner, the day) is read afterwards by the
 * same code that reads everything she sends, and asked about once there (fix C's unclear matter).
 *
 * The held words are kept in the information-gap table under the speaker's own id, the one place that already holds "asked, not yet answered", so nothing new is stored.
 */
import { createHash } from 'crypto';
import { whoThisPersonActsFor } from '../outstanding/a-delegate-acts-for-a-principal';

export interface APrincipalSheActsFor { principalUserId: string; first: string; full: string }

/** The senior people, with their set-up done, that this person acts for. Fewer than two means this is not their situation. */
export async function thePrincipalsSheActsFor(prisma: any, organizationId: string, userId: string): Promise<APrincipalSheActsFor[]> {
  const setups: any[] = (await prisma.principalSetup?.findMany?.({ where: { organizationId }, select: { principalUserId: true } }).catch(() => [])) ?? [];
  if (setups.length < 2) return [];
  const out: APrincipalSheActsFor[] = [];
  for (const g of await whoThisPersonActsFor(prisma, organizationId, userId)) {
    if (!setups.some((s) => s.principalUserId === g.principalUserId) || out.some((o) => o.principalUserId === g.principalUserId)) continue;
    const u: any = await prisma.user?.findUnique?.({ where: { id: g.principalUserId }, select: { firstName: true, lastName: true } }).catch(() => null);
    const first = u?.firstName ?? 'the person you act for';
    out.push({ principalUserId: g.principalUserId, first, full: [u?.firstName, u?.lastName].filter(Boolean).join(' ') || first });
  }
  return out.length >= 2 ? out : [];
}

/* "Amara's day" names Amara: the possessive is taken off before names are compared. */
const squash = (s: string) => ` ${String(s ?? '').toLowerCase().replace(/['’]s\b/g, '').replace(/[^a-z0-9']+/g, ' ').trim()} `;

/** The one person named, by full name or by first name when only one has it. Null when none is named, or when more than one is. */
export function whoIsMeant(text: string, people: APrincipalSheActsFor[]): APrincipalSheActsFor | null {
  const hay = squash(text);
  const named = people.filter((p) => hay.includes(squash(p.full)) || (people.filter((q) => squash(q.first) === squash(p.first)).length === 1 && hay.includes(squash(p.first))));
  return named.length === 1 ? named[0] : null;
}

const either = (people: APrincipalSheActsFor[]) => (people.length === 2 ? `${people[0].full} or ${people[1].full}` : `${people.slice(0, -1).map((p) => p.full).join(', ')} or ${people[people.length - 1].full}`);

export const WHICH_ONE_IS_IT_FOR = (assistantFirst: string, people: APrincipalSheActsFor[]) => `${assistantFirst}, who is this for, ${either(people)}? I am holding what you sent, and I have not kept it for anybody or done anything with it yet.`;
/** Files cannot be held until she answers, so she is asked to send them again with a name, and nothing is said to be held. */
export const WHICH_ONE_ARE_THE_FILES_FOR = (assistantFirst: string, people: APrincipalSheActsFor[]) => `${assistantFirst}, who are these for, ${either(people)}? I have not kept them for anybody. Please send them again with the name in your message, and I will keep them for that person.`;
export const STILL_NOT_SURE_WHICH = (people: APrincipalSheActsFor[]) => `I still cannot tell who it is for, and I am still holding it. Is it for ${either(people)}? Please give me one name.`;
export const NOW_IT_IS_HERS = (person: APrincipalSheActsFor) => `Thank you. I have taken what you sent for ${person.first}.`;

export type TheHeldAnswer =
  /** Say this, and hold. */
  | { kind: 'ask'; say: string }
  /** Carry on as this person's assistant, with this text (the held words when it was an answer). */
  | { kind: 'go'; principalUserId: string; text: string; say: string | null }
  /** Not this situation. */
  | null;

/**
 * What to do with words (or the words of a forward) from somebody who may act for several. `text` is what they sent now. Null when they act for fewer than two.
 * The held words are read back only by the person who sent them.
 */
export async function whichOneIsItFor(prisma: any, a: { organizationId: string; userId: string; text: string; now: Date; /** The forward carries files, which cannot be held. */ withFiles?: boolean }): Promise<TheHeldAnswer> {
  const people = await thePrincipalsSheActsFor(prisma, a.organizationId, a.userId);
  if (!people.length) return null;
  const me: any = await prisma.user?.findUnique?.({ where: { id: a.userId }, select: { firstName: true, email: true } }).catch(() => null);
  const mine = (me?.firstName as string) ?? 'there';
  const held: any = await prisma.informationGap.findFirst({ where: { principalUserId: a.userId, state: 'asked', gapKey: { startsWith: 'which:' } } }).catch(() => null);
  const meant = whoIsMeant(a.text, people);
  if (held) {
    if (!meant) return { kind: 'ask', say: STILL_NOT_SURE_WHICH(people) };
    await prisma.informationGap.updateMany({ where: { id: held.id, state: 'asked' }, data: { state: 'answered', answeredAt: a.now } });
    return { kind: 'go', principalUserId: meant.principalUserId, text: String(held.what), say: NOW_IT_IS_HERS(meant) };
  }
  if (meant) return { kind: 'go', principalUserId: meant.principalUserId, text: a.text, say: null };
  if (a.withFiles) return { kind: 'ask', say: WHICH_ONE_ARE_THE_FILES_FOR(mine, people) };
  const text = String(a.text ?? '').trim();
  if (!text) return null;
  await prisma.informationGap.create({ data: { organizationId: a.organizationId, principalUserId: a.userId, gapKey: `which:${createHash('sha256').update(`${text}|${a.now.toISOString()}`).digest('hex').slice(0, 16)}`, what: text, askedOfEmail: me?.email ?? null, askedOfName: mine, state: 'asked', askedAt: a.now } }).catch(() => null);
  return { kind: 'ask', say: WHICH_ONE_IS_IT_FOR(mine, people) };
}
