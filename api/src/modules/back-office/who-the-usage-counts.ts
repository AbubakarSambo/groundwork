import { wasAQuietClose } from '../grounds/an-answer-includes-a-refusal';

/**
 * WHO THE USAGE COUNTS (Hafsah, 2 November 2026). One owner for what the daily usage summary counts, written to agree line for line with
 * the "SHARED EXCLUSIONS" block of the read-only production SQL written the same day for the YC application
 * (~/Desktop/yc/production-queries.sql). If a rule changes there, it changes here, and the other way round.
 *
 * Left out, as organisations: a name with "(test)", "demo", "example" or "sandbox" in it, or exactly "Groundwork"; a slug with "test" as one
 * of its parts, or the slug "demo" or "groundwork"; an organisation address at groundwork.example or myground.work, or a test address; and an
 * organisation whose only accounts and only people on its check-ins are Groundwork's own team.
 * Left out, as check-ins: the three demo check-ins api/scripts/seed-the-demos.ts makes, and the lead's setup conversation (never a session).
 * Left out, as people: Groundwork's own team (platform admins, @myground.work and @groundwork.example addresses, Hafsah's own addresses) and
 * anybody with a test address. Their own sessions are not counted; the rest of a team they lead is.
 * Internal means Coamana's own: the organisation is marked internal, or its name has "Coamana", "MarketView" or "Market View" in it.
 * Completed means the session's status is COMPLETED and it was not a quiet close (the clock closed it and the person said nothing), the
 * product's own rule in grounds/an-answer-includes-a-refusal.ts.
 */

const TEST_ADDRESS = /\.(test|example|invalid|localhost)$|@example\.(com|org|net)$/;
export const HAFSAHS_OWN_ADDRESSES: readonly string[] = ['hjumare@gmail.com', 'hafsah.jumare@coamana.com', 'hjumare@coamana.com'];
export const THE_DEMO_CHECK_INS: readonly string[] = [
  'Business Development: Habiba onboarding',
  'Product and Engineering: the Monday outage',
  'Agent Network: weekly read',
];

const lower = (s: string | null | undefined) => String(s ?? '').trim().toLowerCase();

export function isATestAddress(email: string | null | undefined): boolean {
  return TEST_ADDRESS.test(lower(email));
}

/** An address that is Groundwork's own, or a test address. */
export function isAStaffAddress(email: string | null | undefined): boolean {
  const e = lower(email);
  return e.endsWith('@myground.work') || e.endsWith('@groundwork.example') || isATestAddress(e) || HAFSAHS_OWN_ADDRESSES.includes(e);
}

/** An account that is Groundwork's own: a platform admin, or a staff or test address. */
export function isAStaffAccount(u: { email: string; isPlatformAdmin?: boolean | null }): boolean {
  return !!u.isPlatformAdmin || isAStaffAddress(u.email);
}

/** Left out by its own name, slug or address. The other rule, an organisation of staff only, needs its people and is read in theOrganisations. */
export function isATestOrDemoOrganisation(o: { name: string; slug?: string | null; email?: string | null }): boolean {
  const name = lower(o.name);
  const slug = lower(o.slug);
  const email = lower(o.email);
  return name.includes('(test)') || /(^|-)test($|-)/.test(slug)
    || slug === 'demo' || name.includes('demo') || name.includes('example') || name.includes('sandbox')
    || email.endsWith('@groundwork.example') || email.endsWith('@myground.work') || isATestAddress(email)
    || slug === 'groundwork' || name === 'groundwork';
}

export function isInternal(o: { name: string; isInternal?: boolean | null }): boolean {
  const name = lower(o.name);
  return !!o.isInternal || name.includes('coamana') || name.includes('marketview') || name.includes('market view');
}

/** A session that counts as completed: COMPLETED and not a quiet close. `personTurns` is how many turns the person had in it. */
export function isCompleted(c: { status: string; closedReason?: string | null; personTurns: number }): boolean {
  return c.status === 'COMPLETED' && !wasAQuietClose(c);
}

/** When a session happened: when it was finished, else when it began, else when it was made. */
export function whenItHappened(c: { completedAt?: Date | null; startedAt?: Date | null; createdAt: Date }): Date {
  return c.completedAt ?? c.startedAt ?? c.createdAt;
}

/** The rows the counting reads, as the database holds them. Nothing anybody said is among them: only whether the person said anything. */
export interface TheRows {
  organizations: { id: string; name: string; slug: string; email: string; isInternal: boolean; createdAt: Date;
    subscriptionPlan: string | null; subscriptionStatus: string | null; subscriptionStripeId: string | null; freeUntil: Date | null; freePlan: string | null; freeTrialStartedAt: Date | null }[];
  users: { id: string; organizationId: string; email: string; isPlatformAdmin: boolean }[];
  grounds: { id: string; organizationId: string; label: string }[];
  participants: { id: string; groundId: string; userId: string | null; email: string }[];
  people: { id: string; organizationId: string; email: string | null; linkedUserId: string | null; createdAt: Date }[];
  checkIns: { id: string; groundId: string; participantId: string; sessionNumber: number; status: string; closedReason: string | null;
    isSetup: boolean; startedAt: Date | null; completedAt: Date | null; createdAt: Date; personTurns: number }[];
  /** Payments Groundwork's own records hold as paid. Stripe is the ledger; this is what the database knows. */
  paid: { organizationId: string; amountCents: number; currency: string }[];
}

export interface ASession {
  id: string; groundId: string; organizationId: string; side: 'internal' | 'external'; personKey: string; sessionNumber: number;
  status: string; closedReason: string | null; startedAt: Date | null; at: Date; completed: boolean;
}

export interface TheCountedRecord {
  /** Every organisation that is counted, with its side. */
  organisations: (TheRows['organizations'][number] & { side: 'internal' | 'external' })[];
  /** The names of the organisations left out, newest first. */
  leftOut: string[];
  /** One row per participant row that is counted, with the key that names the person once. */
  participants: { id: string; groundId: string; organizationId: string; personKey: string }[];
  /** Payments recorded as paid by the counted organisations. */
  paid: TheRows['paid'];
  /** The counted check-ins (grounds). */
  grounds: { id: string; organizationId: string }[];
  sessions: ASession[];
}

/**
 * The record as the summary counts it: who is left out, who is one person, and which sessions are completed. A person is one person across
 * their participant rows: by account (the participant's own, else the account with that address, else the roster person's linked account),
 * else by roster person, else by address. The address never leaves this function.
 */
export function theCountedRecord(rows: TheRows): TheCountedRecord {
  const staffUsers = new Set(rows.users.filter(isAStaffAccount).map((u) => u.id));
  const staffEmails = new Set(rows.users.filter(isAStaffAccount).map((u) => lower(u.email)));
  const isStaffEmail = (e: string) => staffEmails.has(lower(e)) || isAStaffAddress(e);
  const groundsOf = new Map<string, string[]>();
  for (const g of rows.grounds) groundsOf.set(g.organizationId, [...(groundsOf.get(g.organizationId) ?? []), g.id]);
  const participantsOf = new Map<string, TheRows['participants']>();
  for (const p of rows.participants) participantsOf.set(p.groundId, [...(participantsOf.get(p.groundId) ?? []), p]);

  const onlyStaff = (orgId: string) =>
    !rows.users.some((u) => u.organizationId === orgId && !staffUsers.has(u.id))
    && !(groundsOf.get(orgId) ?? []).some((g) => (participantsOf.get(g) ?? []).some((p) => !isStaffEmail(p.email)));

  const newestFirst = [...rows.organizations].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  const counted = newestFirst.filter((o) => !isATestOrDemoOrganisation(o) && !onlyStaff(o.id));
  const countedIds = new Set(counted.map((o) => o.id));
  const organisations = counted.map((o) => ({ ...o, side: (isInternal(o) ? 'internal' : 'external') as 'internal' | 'external' }));
  const sideOf = new Map(organisations.map((o) => [o.id, o.side]));

  const grounds = rows.grounds.filter((g) => countedIds.has(g.organizationId) && !THE_DEMO_CHECK_INS.includes(g.label));
  const orgOfGround = new Map(grounds.map((g) => [g.id, g.organizationId]));
  const userByEmail = new Map(rows.users.map((u) => [lower(u.email), u.id]));
  const theRosterPerson = (orgId: string, email: string) => rows.people
    .filter((p) => p.organizationId === orgId && lower(p.email) === lower(email) && lower(email) !== '')
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0];

  const participants = rows.participants
    .filter((p) => orgOfGround.has(p.groundId) && !isStaffEmail(p.email) && !(p.userId && staffUsers.has(p.userId)))
    .map((p) => {
      const organizationId = orgOfGround.get(p.groundId)!;
      const roster = theRosterPerson(organizationId, p.email);
      const account = p.userId ?? userByEmail.get(lower(p.email)) ?? roster?.linkedUserId ?? null;
      const personKey = account ? `u:${account}` : roster ? `p:${roster.id}` : `e:${lower(p.email)}`;
      return { id: p.id, groundId: p.groundId, organizationId, personKey };
    });
  const participantById = new Map(participants.map((p) => [p.id, p]));

  const sessions: ASession[] = rows.checkIns
    .filter((c) => !c.isSetup && participantById.has(c.participantId))
    .map((c) => {
      const p = participantById.get(c.participantId)!;
      return {
        id: c.id, groundId: c.groundId, organizationId: p.organizationId, side: sideOf.get(p.organizationId)!, personKey: p.personKey,
        sessionNumber: c.sessionNumber, status: c.status, closedReason: c.closedReason, startedAt: c.startedAt,
        at: whenItHappened(c), completed: isCompleted(c),
      };
    });

  return {
    organisations,
    leftOut: newestFirst.filter((o) => !countedIds.has(o.id)).map((o) => o.name),
    participants,
    grounds: grounds.map((g) => ({ id: g.id, organizationId: g.organizationId })),
    paid: (rows.paid ?? []).filter((b) => countedIds.has(b.organizationId)),
    sessions,
  };
}

/** Reads the rows, and nothing anybody wrote: a check-in brings only how many turns the person had in it. */
export async function readTheRows(prisma: any): Promise<TheRows> {
  const [organizations, users, grounds, participants, people, checkIns, paid] = await Promise.all([
    prisma.organization.findMany({ select: { id: true, name: true, slug: true, email: true, isInternal: true, createdAt: true,
      subscriptionPlan: true, subscriptionStatus: true, subscriptionStripeId: true, freeUntil: true, freePlan: true, freeTrialStartedAt: true } }),
    prisma.user.findMany({ select: { id: true, organizationId: true, email: true, isPlatformAdmin: true } }),
    prisma.ground.findMany({ select: { id: true, organizationId: true, label: true } }),
    prisma.groundParticipant.findMany({ select: { id: true, groundId: true, userId: true, email: true } }),
    prisma.person.findMany({ select: { id: true, organizationId: true, email: true, linkedUserId: true, createdAt: true } }),
    prisma.checkIn.findMany({ select: { id: true, groundId: true, participantId: true, sessionNumber: true, status: true, closedReason: true,
      isSetup: true, startedAt: true, completedAt: true, createdAt: true, _count: { select: { turns: { where: { role: 'PERSON' } } } } } }),
    prisma.billingEvent.findMany({ where: { status: 'PAID' }, select: { organizationId: true, amountCents: true, currency: true } }),
  ]);
  return {
    organizations, users, grounds, participants, people, paid,
    checkIns: checkIns.map(({ _count, ...c }: any) => ({ ...c, personTurns: _count?.turns ?? 0 })),
  };
}
