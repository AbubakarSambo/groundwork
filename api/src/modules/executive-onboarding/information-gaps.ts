/**
 * WHAT IS MISSING, WHO WAS ASKED, AND WHETHER THEY ANSWERED (Fatima, increment 5; plan 6.3 and 7, acceptance test 7).
 *
 * The code that decides to ask somebody (year-end/the-year-end-owner.ts) is the only code that asks, and it writes the gap here as it asks, so there
 * is one record and nothing can ask twice: one row per thing and per person. The person asked is somebody who can fill it (the person who acts for
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

/** Written once for each thing and person. Never throws into the asking. */
export async function recordTheGap(prisma: any, a: { organizationId: string; principalUserId: string; gapKey: string; what: string; askedOfEmail: string; askedOfName: string | null; now: Date }): Promise<void> {
  if (!prisma?.informationGap?.create) return;
  try {
    const there = await prisma.informationGap.findFirst({ where: { principalUserId: a.principalUserId, gapKey: a.gapKey, askedOfEmail: a.askedOfEmail } });
    if (there) return;
    await prisma.informationGap.create({ data: { organizationId: a.organizationId, principalUserId: a.principalUserId, gapKey: a.gapKey, what: a.what, askedOfEmail: a.askedOfEmail, askedOfName: a.askedOfName, state: 'asked', askedAt: a.now } });
  } catch {
    /* The question was asked; a record that could not be written is found again on the next look. */
  }
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
