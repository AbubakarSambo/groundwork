/**
 * A PERSON WHO ACTS FOR A SENIOR PERSON, AND WHAT THAT DOES AND DOES NOT GIVE THEM.
 *
 * A senior person (the principal) names somebody, usually an executive assistant, who may read what she
 * could read about what is outstanding and what needs her decision, and who may send her replies. She is
 * never asked to sign in. The grant is made by talking to the assistant, or by an admin, and taken back
 * the same way.
 *
 * THE LIMIT IS BUILT INTO WHO THE READER IS, NOT FILTERED AFTER. A delegate's reading is computed from the
 * principal's own standing: the register is built for the principal, and `forADelegate` is passed down so
 * the principal's private notes (her to-do list) are never read at all. There is no code path that builds
 * a wider reading and then takes pieces away. Somebody whose grant was revoked is nobody's delegate, so
 * the next question they ask reads only what they could read before.
 *
 * EVERY THING A DELEGATE DOES IS WRITTEN DOWN as "Amina Yusuf for Fatima", and stays when the grant ends.
 */

export interface TheDelegateGrant {
  id: string;
  organizationId: string;
  principalUserId: string;
  delegateEmail: string;
  delegateName: string;
  delegateUserId: string | null;
  createdAt: Date;
  revokedAt: Date | null;
}

/** Who is reading, as far as the register is concerned. */
export type TheReader =
  /** The person reading for themselves. */
  | { kind: 'own'; principalUserId: string }
  /** A delegate, reading for one principal. */
  | { kind: 'delegate'; principalUserId: string; principalFirstName: string; delegate: { id: string; name: string } }
  /** A delegate for more than one principal who did not say which. */
  | { kind: 'which'; names: string[] }
  /** Nobody the register is for. */
  | { kind: 'nobody' };

const lower = (s: string | null | undefined): string => (s ?? '').trim().toLowerCase();

/** Whether somebody has a standing of their own to read a register for: they run a check-in, or lead or administer. */
export async function hasAStandingOfTheirOwn(prisma: any, organizationId: string, userId: string): Promise<boolean> {
  const membership = await prisma.organizationMembership?.findUnique?.({ where: { userId_organizationId: { userId, organizationId } }, select: { role: true } }).catch(() => null);
  if (membership?.role === 'ADMIN' || membership?.role === 'LEAD') return true;
  const ran = await prisma.ground?.findFirst?.({ where: { organizationId, initiatorId: userId }, select: { id: true } }).catch(() => null);
  return !!ran;
}

/** The grants that are in force for this sign-in, found by sign-in or by the address the principal gave. */
export async function whoThisPersonActsFor(prisma: any, organizationId: string, userId: string): Promise<TheDelegateGrant[]> {
  const me = await prisma.user?.findUnique?.({ where: { id: userId }, select: { email: true } }).catch(() => null);
  const email = lower(me?.email);
  const live: TheDelegateGrant[] = (await prisma.delegate.findMany({ where: { organizationId, revokedAt: null } })) ?? [];
  return live.filter((g) => g.delegateUserId === userId || (!!email && g.delegateEmail === email));
}

/**
 * WHO THE REGISTER IS READ FOR. Their own standing comes first; a delegate reads for the principal they
 * act for. A delegate for several who names none is asked which, and `forName` (a first name) picks one.
 */
export async function whoIsTheReader(prisma: any, organizationId: string, userId: string | null, forName?: string | null, theirWords?: string | null): Promise<TheReader> {
  if (!userId) return { kind: 'nobody' };
  const grants = await whoThisPersonActsFor(prisma, organizationId, userId);
  const named = lower(forName);
  const own = await hasAStandingOfTheirOwn(prisma, organizationId, userId);
  if (own && !named && !(theirWords && grants.length)) return { kind: 'own', principalUserId: userId };
  if (!grants.length) return own ? { kind: 'own', principalUserId: userId } : { kind: 'nobody' };

  const principals: { grant: TheDelegateGrant; firstName: string }[] = [];
  for (const grant of grants) {
    const p = await prisma.user?.findUnique?.({ where: { id: grant.principalUserId }, select: { firstName: true } }).catch(() => null);
    principals.push({ grant, firstName: p?.firstName ?? 'the person you act for' });
  }
  /* A name anywhere in what she said ("what is outstanding for Amara Lawal", "Amara's decisions") picks the one she acts for, when exactly one is named. */
  const inWords = !named && theirWords ? principals.filter((p) => new RegExp(`\\b${lower(p.firstName).replace(/[^a-z0-9]/g, '')}(?:['’]s)?\\b`, 'i').test(theirWords)) : [];
  if (own && !named && inWords.length !== 1) return { kind: 'own', principalUserId: userId };
  const picked = named ? principals.filter((p) => lower(p.firstName) === named) : inWords.length === 1 ? inWords : principals;
  if (picked.length === 1) {
    const g = picked[0].grant;
    return { kind: 'delegate', principalUserId: g.principalUserId, principalFirstName: picked[0].firstName, delegate: { id: g.id, name: g.delegateName } };
  }
  if (own) return { kind: 'own', principalUserId: userId };
  return { kind: 'which', names: principals.map((p) => p.firstName) };
}

/** The line a person reads for something a delegate did. */
export function forThePrincipal(delegateName: string, principalFirstName: string): string {
  return `${delegateName} for ${principalFirstName}`;
}

/** Writes down what a delegate did. Never throws into the answer it belongs to. */
export async function recordWhatADelegateDid(
  prisma: any,
  reader: Extract<TheReader, { kind: 'delegate' }>,
  organizationId: string,
  action: string,
  summary: string,
): Promise<string> {
  const line = forThePrincipal(reader.delegate.name, reader.principalFirstName);
  await prisma.delegateAction
    .create({ data: { organizationId, principalUserId: reader.principalUserId, delegateId: reader.delegate.id, delegateName: reader.delegate.name, action, summary: `${line}: ${summary}` } })
    .catch(() => null);
  return line;
}

/** What the principal's delegates did, newest first. The principal's to read, and an admin's. */
export async function whatMyDelegatesDid(prisma: any, organizationId: string, principalUserId: string): Promise<{ summary: string; at: Date }[]> {
  const rows: any[] = (await prisma.delegateAction.findMany({ where: { organizationId, principalUserId }, orderBy: { createdAt: 'desc' }, take: 50 })) ?? [];
  return rows.map((r) => ({ summary: r.summary, at: r.createdAt }));
}

/** Gives a person the right to act. Doing it twice for the same person changes nothing. */
export async function grantADelegate(
  prisma: any,
  g: { organizationId: string; principalUserId: string; delegateEmail: string; delegateName: string; delegateUserId?: string | null; via: 'chat' | 'admin' },
): Promise<TheDelegateGrant> {
  const email = lower(g.delegateEmail);
  const existing: TheDelegateGrant[] = (await prisma.delegate.findMany({ where: { organizationId: g.organizationId, principalUserId: g.principalUserId, delegateEmail: email, revokedAt: null } })) ?? [];
  if (existing.length) return existing[0];
  return prisma.delegate.create({
    data: { organizationId: g.organizationId, principalUserId: g.principalUserId, delegateEmail: email, delegateName: g.delegateName, delegateUserId: g.delegateUserId ?? null, createdVia: g.via },
  });
}

/** Takes the right away. What was done stays on the record. Returns how many grants ended. */
export async function revokeADelegate(
  prisma: any,
  r: { organizationId: string; principalUserId: string; delegateEmail: string; via: 'chat' | 'admin' },
): Promise<number> {
  const live: TheDelegateGrant[] = (await prisma.delegate.findMany({ where: { organizationId: r.organizationId, principalUserId: r.principalUserId, delegateEmail: lower(r.delegateEmail), revokedAt: null } })) ?? [];
  for (const g of live) await prisma.delegate.update({ where: { id: g.id }, data: { revokedAt: new Date(), revokedVia: r.via } });
  return live.length;
}

/** The delegates a principal has now, for the principal to read and to name when ending one. */
export async function myDelegates(prisma: any, organizationId: string, principalUserId: string): Promise<TheDelegateGrant[]> {
  return (await prisma.delegate.findMany({ where: { organizationId, principalUserId, revokedAt: null } })) ?? [];
}

/* ------------------------------------------------------------------ saying it by talking */

const ROLE = '(?:ea|e\\.a\\.|executive\\s+assistant|pa|p\\.a\\.|personal\\s+assistant|assistant|secretary)';

/** Naming somebody as the one who acts for you. Revoking is matched first, because it holds the same words. */
export const SET_UP_A_DELEGATE_PATTERNS: RegExp[] = [
  new RegExp(`\\bmy\\s+${ROLE}\\s+(?:is|will\\s+be)\\s+\\S`, 'i'),
  /\b(?:can|may|to)\s+(?:act|do\s+(?:things|everything|stuff)|handle\s+(?:things|everything)|sign\s+in|reply|answer)\s+(?:for|on\s+behalf\s+of)\s+me\b/i,
  /^\s*(?:please\s+)?(?:let|allow)\s+.{2,60}\s+(?:act|sign\s+in|do\s+things|reply)\s+(?:for|on\s+behalf\s+of)\s+me\b/i,
];

export const STOP_A_DELEGATE_PATTERNS: RegExp[] = [
  /\b(?:can|may)\s+no\s+longer\s+(?:act|do\s+things|handle\s+things|sign\s+in|reply|answer)\s+(?:for|on\s+behalf\s+of)\s+me\b/i,
  /\bstop\s+.{2,60}\s+(?:acting|signing\s+in|replying|answering)\s+(?:for|on\s+behalf\s+of)\s+me\b/i,
  new RegExp(`\\bremove\\s+.{2,60}\\s+as\\s+my\\s+${ROLE}\\b`, 'i'),
  new RegExp(`\\bis\\s+no\\s+longer\\s+my\\s+${ROLE}\\b`, 'i'),
  /\brevoke\s+.{2,60}(?:access|permission|rights)\b/i,
];

const STOP_WORDS = /\s+(?:can|may|will|should|to|and|who|she|he|they|is|as|for|from|please|now|no|please)\b.*$/i;

/** A name or an address, read from the sentence. The first capitalised words after the cue, or an address. */
export function readWhoItIsAbout(message: string): { name: string | null; email: string | null } {
  const email = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/.exec(message)?.[0]?.toLowerCase() ?? null;
  const cleaned = message.replace(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, ' ').replace(/\s+/g, ' ').trim();
  const patterns: RegExp[] = [
    new RegExp(`\\bmy\\s+${ROLE}\\s+(?:is|will\\s+be)\\s+([^,.;]{2,60})`, 'i'),
    /^\s*(?:please\s+)?(?:let|allow)\s+(.{2,60}?)\s+(?:act|sign\s+in|do\s+things|reply)\b/i,
    /\bstop\s+(.{2,60}?)\s+(?:acting|signing\s+in|replying|answering)\b/i,
    new RegExp(`\\bremove\\s+(.{2,60}?)\\s+as\\s+my\\s+${ROLE}\\b`, 'i'),
    /\brevoke\s+(.{2,60}?)(?:'s|s')?\s+(?:access|permission|rights)\b/i,
    /^\s*(?:and\s+)?([A-Z][\w'’.-]*(?:\s+[A-Z][\w'’.-]*){0,3})\s+(?:is\s+no\s+longer|can\s+no\s+longer|can|may)\b/,
  ];
  for (const rx of patterns) {
    const m = rx.exec(cleaned);
    if (m) {
      const name = m[1].replace(STOP_WORDS, '').replace(/^(?:the|a)\s+/i, '').replace(/['’]s$/, '').trim();
      if (name && !/^(?:me|you|it|this|that|someone|somebody)$/i.test(name)) return { name, email };
    }
  }
  return { name: null, email };
}

export interface ThePersonFound {
  name: string;
  email: string | null;
  userId: string | null;
}

/** Who on the organisation's People list the name means. More than one means the person must be asked. */
export async function whoOnThePeopleListIs(prisma: any, organizationId: string, said: { name: string | null; email: string | null }): Promise<ThePersonFound[]> {
  const people: any[] = (await prisma.person.findMany({ where: { organizationId, active: true } })) ?? [];
  const asPerson = (p: any): ThePersonFound => ({ name: p.displayName ?? p.userName ?? [p.givenName, p.familyName].filter(Boolean).join(' '), email: lower(p.email) || null, userId: p.linkedUserId ?? null });
  if (said.email) {
    const byAddress = people.filter((p) => lower(p.email) === said.email);
    if (byAddress.length) return byAddress.map(asPerson);
    return [{ name: said.name ?? said.email, email: said.email, userId: null }];
  }
  const words = lower(said.name).split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const full = (p: any) => lower([p.givenName, p.familyName].filter(Boolean).join(' ') || p.displayName || p.userName);
  const hits = people.filter((p) => {
    const label = full(p).split(/\s+/);
    return words.every((w) => label.includes(w) || lower(p.displayName).split(/\s+/).includes(w));
  });
  return hits.map(asPerson);
}

/* ------------------------------------------------------------------ the words people read */

export function aDelegateSaidBack(delegateName: string, principalFirstName: string): string {
  return `I will let ${delegateName} act for you. ${delegateName} will be able to read what is outstanding and what needs your decision, and nothing that you could not read yourself. Everything ${delegateName} does will be written down as "${delegateName} for ${principalFirstName}". You never have to sign in, and you can end this by telling me. Shall I do that?`;
}

export function aDelegateGranted(delegateName: string): string {
  return `Done. ${delegateName} can now act for you. To end it, tell me that ${delegateName} can no longer act for you.`;
}

export function aDelegateLeftAlone(): string {
  return 'I have left it as it was. Nobody was given the right to act for you.';
}

export function aRevokeSaidBack(delegateName: string): string {
  return `I will stop ${delegateName} acting for you. From then on ${delegateName} cannot read or do anything for you. What ${delegateName} did before stays on the record. Shall I do that?`;
}

export function aDelegateRevoked(delegateName: string): string {
  return `Done. ${delegateName} can no longer act for you. What ${delegateName} did before is still on the record.`;
}

export function aRevokeLeftAlone(delegateName: string): string {
  return `I have left it as it was. ${delegateName} can still act for you.`;
}

export const NO_ONE_TO_ACT_IS_NAMED = 'Who should act for you? Tell me their name, or their email address if they are not on your People list.';
export const NOT_YOURS_TO_GIVE = 'Only a lead or an administrator can name somebody to act for them. Ask the person you work for to tell me who should act for them.';
export function noOneActsForYouCalled(): string {
  return 'Nobody acts for you at the moment, so there is nobody to stop.';
}
export function whichOneDoYouMean(names: string[]): string {
  const list = names.length <= 2 ? names.join(' or ') : `${names.slice(0, -1).join(', ')} or ${names[names.length - 1]}`;
  return `${names.length} people on your People list match that name, ${list}. Which one do you mean? An email address is the surest way to say.`;
}
export function noOneOnYourListIsCalled(name: string): string {
  return `I cannot find ${name} on your People list. If you give me their email address I will use that.`;
}
