import { theFirstNameOfAParticipant } from '../reports/a-title-is-not-a-first-name';

/**
 * RECOMMENDED CHECK-INS, "WHAT GROUNDWORK RECOMMENDS" (docs/anchor-scenario-plan.md, piece 24; docs/anchor-scenario.md, section 21).
 * Looked for on every check-in, whatever its scenario or how it was started (Hafsah, 3 November evening: leads always see it).
 *
 * Groundwork looks at one check-in's own record and, where the work itself shows it, offers the lead
 * one more check-in: one for two people who keep waiting on each other, one for a piece of work that
 * four or more people are tangled in, and one for an aim nobody owns while several people carry
 * something open. Nothing is created and nobody is invited until the lead says yes. The offer is made
 * once: a "not now" is never asked again.
 *
 * WHAT IT NEVER DOES. It draws on this one check-in only, never on another one the same people are in,
 * so it can never become a person's load across check-ins. It puts no label and no score on anybody;
 * it says what the record shows and asks. It is not an advertisement for the product.
 *
 * The rows are `Recommendation` rows, the engine's own table, tied to the check-in by their subject
 * (`check-in:<id>`), and the public API does not list them (see ANCHOR_KINDS).
 */

export const ANCHOR_KINDS = ['anchor_pair_check_in', 'anchor_project_check_in', 'anchor_aim_check_in'] as const;
export type AnAnchorKind = (typeof ANCHOR_KINDS)[number];

/** The subject a recommendation is kept under, so it can only ever be read back for its own check-in. */
export const theSubjectOf = (groundId: string) => `check-in:${groundId}`;

/** A pair needs to keep appearing in each other's handoffs, not just once. */
export const A_PAIR_NEEDS_THIS_MANY_HANDOFFS = 2;
/** A piece of work is a project when this many people are tangled in at least this many handoffs. */
export const A_PROJECT_NEEDS_THIS_MANY_PEOPLE = 4;
export const A_PROJECT_NEEDS_THIS_MANY_HANDOFFS = 3;
/** An aim nobody owns is worth a check-in when this many people are carrying something open. */
export const AN_AIM_NEEDS_THIS_MANY_PEOPLE = 3;

export interface APersonHere {
  id: string;
  /** First name, as the check-in calls them; null when nobody knows one. */
  name: string | null;
  isTheLead: boolean;
}

/** Everything the offers are worked out from. All of it is from one check-in. */
export interface TheRecordOfOneCheckIn {
  people: APersonHere[];
  /** Handoffs still open: who is waiting, and on whom (null when on someone outside). */
  handoffs: { fromId: string; onId: string | null }[];
  aims: { id: string; name: string; ownerId: string | null }[];
  /** One entry per open thing somebody said they would do: the participant it is theirs. */
  openCommitmentsBy: string[];
}

export interface AnOffer {
  kind: AnAnchorKind;
  /** What makes it the same offer next time, so it is never made twice. */
  key: string;
  says: string;
  question: string;
  peopleIds: string[];
  aim: string | null;
}

const NUMBERS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const aNumber = (n: number) => (n <= 10 ? NUMBERS[n] : String(n));
const capital = (s: string) => `${s.charAt(0).toUpperCase()}${s.slice(1)}`;

/**
 * AN AIM IS STORED AS A SENTENCE ABOUT WHOEVER SET IT ("Wairimu is aiming for the team to understand that..."), and the offer is read by her alone.
 * Quoted as it is stored it read "Nobody has been named as the owner of "Wairimu is aiming for...", ..." to Wairimu (anchor walk, 8 October).
 * Said to her, it is her aim; any other sentence is quoted as it stands.
 */
export function theAimAsTheLeadReadsIt(aim: string, byId: Map<string, APersonHere>): string {
  const lead = [...byId.values()].find((p) => p.isTheLead);
  const name = lead?.name?.trim();
  if (name && aim.toLowerCase().startsWith(`${name.toLowerCase()} is `)) {
    const m = aim.slice(name.length + 4).match(/^(?:aiming|trying)\s+(for|to)\s+(.+?)[.!]*$/i);
    if (m) return `your aim ${m[1].toLowerCase()} ${m[2]}`;
  }
  return `"${aim}"`;
}

export function theOffers(record: TheRecordOfOneCheckIn): AnOffer[] {
  const byId = new Map(record.people.map((p) => [p.id, p]));
  const offers: AnOffer[] = [];

  /* A handoff between two people on this check-in, in either direction, counted for the pair. */
  const between = new Map<string, number>();
  for (const h of record.handoffs) {
    if (!h.onId || h.onId === h.fromId || !byId.has(h.fromId) || !byId.has(h.onId)) continue;
    const key = [h.fromId, h.onId].sort().join('|');
    between.set(key, (between.get(key) ?? 0) + 1);
  }

  /* 1. Two people who keep waiting on each other. The pair with the most open handoffs, if it can be named. */
  const pairs = [...between.entries()].filter(([, n]) => n >= A_PAIR_NEEDS_THIS_MANY_HANDOFFS).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  for (const [key, n] of pairs) {
    const [a, b] = key.split('|').map((id) => byId.get(id)!);
    const me = a.isTheLead ? a : b.isTheLead ? b : null;
    const other = me ? (me === a ? b : a) : null;
    if (me && !other!.name) continue;
    if (!me && (!a.name || !b.name)) continue;
    const who = me ? `You and ${other!.name}` : `${a.name} and ${b.name}`;
    const them = me ? 'you' : 'them';
    offers.push({
      kind: 'anchor_pair_check_in',
      key,
      says: `${who} seem to have different expectations about how work is handed over between ${them}. ${capital(aNumber(n))} handoffs between ${them} are still waiting.`,
      question: 'Would a separate check-in help you align on this?',
      peopleIds: [a.id, b.id],
      aim: null,
    });
    break;
  }

  /* 2. A piece of work many people are tangled in. */
  const tangled = new Set<string>();
  let counted = 0;
  for (const h of record.handoffs) {
    if (!byId.has(h.fromId)) continue;
    counted += 1;
    tangled.add(h.fromId);
    if (h.onId && byId.has(h.onId)) tangled.add(h.onId);
  }
  if (tangled.size >= A_PROJECT_NEEDS_THIS_MANY_PEOPLE && counted >= A_PROJECT_NEEDS_THIS_MANY_HANDOFFS) {
    offers.push({
      kind: 'anchor_project_check_in',
      key: [...tangled].sort().join('|'),
      says: `${capital(aNumber(tangled.size))} people are waiting on each other, and several handoffs keep appearing.`,
      question: 'Set up a project check-in?',
      peopleIds: [...tangled].sort(),
      aim: null,
    });
  }

  /* 3. An aim nobody owns, while several people each carry something open. */
  const carrying = [...new Set(record.openCommitmentsBy.filter((id) => byId.has(id)))];
  if (carrying.length >= AN_AIM_NEEDS_THIS_MANY_PEOPLE) {
    const aim = record.aims.find((a) => !a.ownerId && a.name.trim());
    if (aim) {
      offers.push({
        kind: 'anchor_aim_check_in',
        key: aim.id,
        says: `Nobody has been named as the owner of ${theAimAsTheLeadReadsIt(aim.name.trim(), byId)}, and ${aNumber(carrying.length)} people are each carrying something open. Their responsibilities may not be completely clear.`,
        question: 'Set up a check-in for this aim?',
        peopleIds: carrying.sort(),
        aim: aim.name.trim(),
      });
    }
  }
  return offers;
}

/** What a participant row gives a name, for the people this check-in can name. */
export const theNameOf = (p: { nameGiven?: string | null; user?: { firstName?: string | null; lastName?: string | null } | null }) =>
  theFirstNameOfAParticipant(p as any);

/** What the lead reads for one offer. No id of a person, no address, nothing anybody said. */
export interface AnOfferTheLeadReads {
  id: string;
  kind: AnAnchorKind;
  says: string;
  question: string;
  yes: string;
  no: string;
}

export const THE_YES = 'Yes, set it up';
export const THE_NO = 'Not now';

// ---- the part that reads and writes ----------------------------------------------------------

interface Reader {
  ground: any;
  groundParticipant: any;
  groundDependency: any;
  groundObjective: any;
  groundCommitment: any;
  recommendation: any;
}

/** Reads one check-in's record, whatever its scenario. */
export async function theRecordOf(prisma: Reader, groundId: string): Promise<{ organizationId: string; leadId: string; record: TheRecordOfOneCheckIn } | null> {
  const ground = await prisma.ground.findUnique({ where: { id: groundId }, select: { id: true, organizationId: true, initiatorId: true } });
  if (!ground) return null;
  const [participants, handoffs, aims, commitments] = await Promise.all([
    prisma.groundParticipant.findMany({ where: { groundId }, select: { id: true, userId: true, nameGiven: true, managingOnly: true, user: { select: { firstName: true, lastName: true } } } }),
    prisma.groundDependency.findMany({ where: { groundId, status: { not: 'CLEARED' } }, select: { fromParticipantId: true, onParticipantId: true } }),
    prisma.groundObjective.findMany({ where: { groundId }, select: { id: true, name: true, ownerParticipantId: true } }),
    prisma.groundCommitment.findMany({ where: { groundId, status: 'UNKNOWN', participantId: { not: null } }, select: { participantId: true } }),
  ]);
  return {
    organizationId: ground.organizationId,
    leadId: ground.initiatorId,
    record: {
      people: (participants as any[]).filter((p) => !p.managingOnly || p.userId === ground.initiatorId).map((p) => ({ id: p.id, name: p.userId === ground.initiatorId ? null : theNameOf(p), isTheLead: p.userId === ground.initiatorId })),
      handoffs: (handoffs as any[]).map((h) => ({ fromId: h.fromParticipantId, onId: h.onParticipantId ?? null })),
      aims: (aims as any[]).map((a) => ({ id: a.id, name: a.name, ownerId: a.ownerParticipantId ?? null })),
      openCommitmentsBy: (commitments as any[]).map((c) => c.participantId as string),
    },
  };
}

/**
 * Looks at the check-in's record and writes any offer that is not already there, asked or answered.
 * Safe to run as often as anything new comes in. Returns how many offers were written.
 */
export async function lookForRecommendedCheckIns(prisma: Reader, groundId: string): Promise<number> {
  const found = await theRecordOf(prisma, groundId);
  if (!found) return 0;
  let written = 0;
  for (const offer of theOffers(found.record)) {
    const same = await prisma.recommendation.findFirst({
      where: {
        organizationId: found.organizationId, kind: offer.kind, subjectExternalId: theSubjectOf(groundId),
        rationale: { path: ['key'], equals: offer.key },
        state: { in: ['PROPOSED', 'ACCEPTED', 'DECLINED'] },
      },
      select: { id: true },
    });
    if (same) continue;
    await prisma.recommendation.create({
      data: {
        organizationId: found.organizationId, kind: offer.kind, subjectExternalId: theSubjectOf(groundId),
        personExternalId: null, body: offer.says,
        rationale: { key: offer.key, question: offer.question, peopleIds: offer.peopleIds, aim: offer.aim, groundId },
        sourceDetectorIds: [],
      },
    });
    written += 1;
  }
  return written;
}

/** The offers waiting for the lead's answer on this check-in. */
export async function theOffersWaiting(prisma: Reader, groundId: string, organizationId: string): Promise<AnOfferTheLeadReads[]> {
  const rows: any[] = await prisma.recommendation.findMany({
    where: { organizationId, subjectExternalId: theSubjectOf(groundId), kind: { in: [...ANCHOR_KINDS] }, state: 'PROPOSED' },
    orderBy: { proposedAt: 'asc' },
  });
  return rows.map((r) => ({ id: r.id, kind: r.kind, says: r.body, question: r.rationale?.question ?? '', yes: THE_YES, no: THE_NO }));
}

/** What a screen needs to open a new check-in already filled in. Nothing is created and nobody is invited by this. */
export interface WhatToSetUp {
  kind: AnAnchorKind;
  about: string;
  aim: string | null;
  people: { name: string | null; email: string }[];
}

/**
 * The lead's answer. A yes marks the offer accepted and hands back what a new check-in would start
 * from; it does not create the check-in or invite anybody, because the lead finishes that on the
 * set-up screen. A "not now" is never asked again.
 */
export async function theLeadAnswers(
  prisma: Reader,
  args: { groundId: string; offerId: string; leadUserId: string; yes: boolean },
): Promise<{ ok: true; state: 'ACCEPTED' | 'DECLINED'; setUp?: WhatToSetUp } | { ok: false }> {
  const ground = await prisma.ground.findUnique({ where: { id: args.groundId }, select: { organizationId: true, initiatorId: true } });
  if (!ground || ground.initiatorId !== args.leadUserId) return { ok: false };
  const row = await prisma.recommendation.findFirst({
    where: { id: args.offerId, organizationId: ground.organizationId, subjectExternalId: theSubjectOf(args.groundId), kind: { in: [...ANCHOR_KINDS] }, state: 'PROPOSED' },
  });
  if (!row) return { ok: false };
  const state = args.yes ? 'ACCEPTED' : 'DECLINED';
  const { count } = await prisma.recommendation.updateMany({
    where: { id: row.id, state: 'PROPOSED' },
    data: { state, resolvedAt: new Date(), resolvedByExternalId: args.leadUserId },
  });
  if (!count) return { ok: false };
  if (!args.yes) return { ok: true, state };
  const ids: string[] = Array.isArray(row.rationale?.peopleIds) ? row.rationale.peopleIds : [];
  const people: any[] = ids.length
    ? await prisma.groundParticipant.findMany({ where: { groundId: args.groundId, id: { in: ids } }, select: { id: true, email: true, userId: true, nameGiven: true, user: { select: { firstName: true, lastName: true } } } })
    : [];
  return {
    ok: true,
    state,
    setUp: {
      kind: row.kind,
      about: row.body,
      aim: row.rationale?.aim ?? null,
      /* The lead is the one setting it up, so she is not listed as somebody to invite. */
      people: people.filter((p) => p.userId !== args.leadUserId).map((p) => ({ name: theNameOf(p), email: p.email })),
    },
  };
}
