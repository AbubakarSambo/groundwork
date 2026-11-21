/**
 * WHAT IS MISSING, WHO WAS ASKED, AND WHETHER THEY ANSWERED (Fatima, increment 5; plan 6.3 and 7, acceptance test 7).
 *
 * The code that decides to ask somebody claims the gap here before the message goes (queueTheAsk), and the door marks it asked when the message really
 * goes (theAskWent), so there is one record and nothing can ask twice: one row per thing and per person. The person asked is somebody who can fill it (the person who acts for
 * her, the person who said it was done, an introduced team member), never her, and never again for the same thing. There is no form: a gap is
 * asked in a message, in context, and the answer is whatever the person sends next.
 *
 * A gap is closed when the person asked sends anything after they were asked. Silence closes nothing, and an answer is never read as proof of more
 * than it says: the answer is kept as material and read like any other record.
 */
import { MONTHS } from '../year-end/the-year-end-content';

export const whatAGapKeyMeans = (key: string, detail?: string | null): string => {
  if (key.startsWith('gap:')) { const m = Number(key.slice(9, 11)); return `Records from ${MONTHS[m - 1] ?? key.slice(4)}, which nothing yet covers.`; }
  if (key.startsWith('owner:')) return detail ?? key.slice(6);
  if (key.startsWith('match:')) return 'Two lines that may be one matter, and which one is meant.';
  return detail ?? key;
};

/** The keys the team loop writes: a question asked of a team member, a nudge, a chase of an approver, and a standing instruction's ask. */
export const A_TEAM_LOOP_KEY = /^(?:q|nudge|approver|instr):/;

/**
 * ASKED MEANS THE MESSAGE WENT (Dangote stress test, D4: 1,713 questions were written down as asked of Maryam when they were queued, and one mail reached her).
 * A question is claimed as "queued" before its message is handed to the door, which keeps it to one row for each thing and person. It becomes "asked" only
 * when the message carrying it really goes: the one mail door and the one WhatsApp gate call `theAskWent` with the message's key at that moment, whether it
 * went at once or after it was held. A message that does not go gives its questions back (`giveTheAskBack`), so they can be asked another day. Everything
 * that says somebody was asked reads `state: 'asked'`, so nothing can say a question was put that nobody received.
 */
/** The questions of one kind a message carries: the year-end work's, the team loop's, or a payment's. A message carries only one kind. */
const FAMILIES = { 'year-end': /^(?:owner|match|gap):/, team: /^(?:nudge|approver|instr):/, payments: /^payments:/ } as const;
export type AnAskFamily = keyof typeof FAMILIES;
export const anAskKey = (principalUserId: string, family: AnAskFamily, askedOf: string): string => `ask:${principalUserId}:${family}:${String(askedOf).trim().toLowerCase()}`;
const readAnAskKey = (sendKey: string | null | undefined): { principalUserId: string; family: RegExp; askedOf: string } | null => {
  const m = /^ask:([^:]+):([a-z-]+):(.+)$/.exec(String(sendKey ?? ''));
  const family = m ? FAMILIES[m[2] as AnAskFamily] : null;
  return m && family ? { principalUserId: m[1], family, askedOf: m[3] } : null;
};
const queuedOf = async (prisma: any, k: { principalUserId: string; family: RegExp; askedOf: string }): Promise<string[]> =>
  ((await prisma.informationGap.findMany({ where: { principalUserId: k.principalUserId, askedOfEmail: k.askedOf, state: 'queued' } }).catch(() => [])) ?? []).filter((g: any) => k.family.test(String(g.gapKey ?? ''))).map((g: any) => g.id);

/** Claims one question for one person, as waiting to go. False when it is already on record (asked, answered or waiting). Never throws into the asking. */
export async function queueTheAsk(prisma: any, a: { organizationId: string; principalUserId: string; gapKey: string; what: string; askedOfEmail: string; askedOfName: string | null }): Promise<boolean> {
  if (!prisma?.informationGap?.create) return false;
  try {
    const there = await prisma.informationGap.findFirst({ where: { principalUserId: a.principalUserId, gapKey: a.gapKey, askedOfEmail: a.askedOfEmail } });
    if (there) return false;
    await prisma.informationGap.create({ data: { organizationId: a.organizationId, principalUserId: a.principalUserId, gapKey: a.gapKey, what: a.what, askedOfEmail: a.askedOfEmail, askedOfName: a.askedOfName, state: 'queued', askedAt: null } });
    return true;
  } catch {
    return false;
  }
}

/** Called by the door at the moment a message carrying questions really goes. Never throws into a send. */
export async function theAskWent(prisma: any, sendKey: string | null | undefined, at: Date): Promise<void> {
  const k = readAnAskKey(sendKey);
  if (!k || !prisma?.informationGap?.updateMany) return;
  try {
    for (const id of await queuedOf(prisma, k)) await prisma.informationGap.updateMany({ where: { id, state: 'queued' }, data: { state: 'asked', askedAt: at } });
  } catch {
    /* The row says "queued", which is the honest word. */
  }
}

/** The message did not go: its questions are let go of, so they are asked another day and never said to have been asked. */
export async function giveTheAskBack(prisma: any, sendKey: string | null | undefined): Promise<void> {
  const k = readAnAskKey(sendKey);
  if (!k || !prisma?.informationGap?.deleteMany) return;
  for (const id of await queuedOf(prisma, k)) await prisma.informationGap.deleteMany({ where: { id, state: 'queued' } }).catch(() => undefined);
}

/** The keys of every question on record for this person, asked, answered or waiting to go: so the same thing is never asked twice. */
export async function theQuestionsOnRecordFor(prisma: any, a: { principalUserId: string; askedOfEmail: string }): Promise<Set<string>> {
  const rows: any[] = (await prisma.informationGap?.findMany?.({ where: { principalUserId: a.principalUserId, askedOfEmail: a.askedOfEmail } }).catch(() => [])) ?? [];
  return new Set(rows.map((g) => String(g.gapKey)));
}

/* A held item for an assistant who acts for several people (an-assistant-for-several-principals.ts, key "which:") is closed only by naming the one it is for, never by sending something else. */
/** Closes what this person was asked and has now answered by sending something. Returns what was closed, for the thank-you. */
export async function closeWhatTheyAnswered(prisma: any, a: { organizationId: string; email: string; now: Date }): Promise<string[]> {
  if (!prisma?.informationGap?.findMany) return [];
  const asked: any[] = (await prisma.informationGap.findMany({ where: { organizationId: a.organizationId, askedOfEmail: a.email.trim().toLowerCase(), state: 'asked' } })) ?? [];
  const closed: string[] = [];
  for (const g of asked) {
    if (!g.askedAt || new Date(g.askedAt).getTime() > a.now.getTime()) continue;
    /* The team loop's own questions are closed by what the answer says (team-loop), never by anything being sent: "ok" answers nothing. */
    if (A_TEAM_LOOP_KEY.test(String(g.gapKey ?? '')) || /^which:/.test(String(g.gapKey ?? ''))) continue;
    const r = await prisma.informationGap.updateMany({ where: { id: g.id, state: 'asked' }, data: { state: 'answered', answeredAt: a.now } });
    if (!r || r.count !== 0) closed.push(g.what);
  }
  return closed;
}

/** What is still open or asked, for the person who acts for her to see. */
export async function theGapsStillOpen(prisma: any, principalUserId: string): Promise<{ what: string; askedOfName: string | null; state: string }[]> {
  const rows: any[] = (await prisma.informationGap?.findMany?.({ where: { principalUserId, state: { in: ['open', 'asked'] } } })) ?? [];
  return rows.map((r) => ({ what: r.what, askedOfName: r.askedOfName ?? null, state: r.state }));
}

/** The questions not answered yet, in the states asked for ("asked" means its message went, "queued" that it is still waiting to go). The one read of this
 * table for the year-end report's "who is being asked" and the outstanding register's payments line (Dangote D4, D5). */
export async function theQuestionsAsked(prisma: any, principalUserId: string, states: ('asked' | 'queued')[] = ['asked']): Promise<{ gapKey: string; askedOfEmail: string | null; askedOfName: string | null; state: string }[]> {
  const rows: any[] = (await prisma.informationGap?.findMany?.({ where: { principalUserId, state: { in: states } } }).catch(() => [])) ?? [];
  return rows.map((g) => ({ gapKey: String(g.gapKey), askedOfEmail: g.askedOfEmail ?? null, askedOfName: g.askedOfName ?? null, state: String(g.state) }));
}
