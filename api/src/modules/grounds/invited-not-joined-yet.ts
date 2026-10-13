import { PartyType } from '@prisma/client';
import { CLOSED_BY_THE_CLOCK } from '../../common/closed-by-the-clock';

/**
 * INVITED, NOT JOINED YET (decision 8 redone, night quality run 3, 12 October 2026).
 *
 * Amina Otieno was put on the check-in and sent an invitation. She never opened it. Her sign-in was
 * made for her when she was named (grounds.service, the person a lead names gets a User with no
 * password), so `userId` was set and every rule read her as somebody who had joined: the clock
 * closed her sessions one by one, the lead read "Amina has missed 4 of the last 4 check-ins ... a
 * formal process in the performance suite", and the board said she had answered six sessions.
 *
 * Hafsah: "People who haven't joined yet show as 'invited, not joined yet': neither missed nor
 * counted in totals."
 *
 * JOINED MEANS ACCEPTED (Hafsah, 13 October 2026, journey round 4): "count someone as missed only if they
 * joined the check-in (accepted the invitation) and then never opened a session. Someone who never accepted
 * the invitation must show as 'invited, not joined yet': not missed, not counted, no missed messages."
 *
 * Somebody has JOINED this check-in when the record shows any one of:
 *   - they accepted the invitation (`acceptedAt`: they pressed Join on it, or came in through the check-in's
 *     own join link);
 *   - they opened a session of this check-in, or said something in one, or declined one;
 *   - they came through an open link, which is itself answering;
 *   - they run the check-in.
 * Being able to sign in, or having seen the app's welcome, is NOT joining: a sign-in can be made for somebody
 * before they accept anything (an account made at setup, or one made when they joined the organisation). Eli
 * Epsilon never accepted and was named "has not checked in yet" in every session; Dara Delta accepted and
 * never opened a session, and was left out of the count of missed check-ins. Both were the wrong way round.
 * A person who has joined is counted from then on, with no other change.
 */
export interface SomebodyInvited {
  id: string;
  userId?: string | null;
  partyType?: PartyType | string | null;
  cameThroughTheLink?: boolean | null;
  acceptedAt?: Date | string | null;
}

/* The row's own sessions, where it carries them: a word said, a session opened or declined, or answered. */
const cameInByTheirRows = (p: any) => Array.isArray(p?.checkIns) && p.checkIns.some((c: any) =>
  (Array.isArray(c?.turns) && c.turns.length > 0) || !!c?.startedAt || c?.status === 'IN_PROGRESS' || c?.status === 'DECLINED'
  || (c?.status === 'COMPLETED' && c?.closedReason !== CLOSED_BY_THE_CLOCK && c?.turns === undefined));

/** Joined, by what this row itself carries. Undefined where the row does not carry enough to say. */
function joinedByTheRow(p: any): boolean | undefined {
  if (p.partyType === PartyType.INITIATOR || p.cameThroughTheLink === true || !!p.acceptedAt || cameInByTheirRows(p)) return true;
  /* No sign-in on the row at all: accepting writes one, so they have not accepted. */
  if (p.userId === null && p.cameThroughTheLink === false) return false;
  return undefined;
}

/** Of these people, the ids of those who were invited and have not joined yet (accepted, or come in). One read. */
export async function whoHasNotJoinedYet(prisma: any, people: SomebodyInvited[]): Promise<Set<string>> {
  const out = new Set<string>();
  const unsure: SomebodyInvited[] = [];
  for (const p of people ?? []) {
    if (!p || !p.id) continue;
    const said = joinedByTheRow(p);
    if (said === false) out.add(p.id);
    else if (said === undefined) unsure.push(p);
  }
  if (!unsure.length) return out;
  /* A reader with no way to look (a double with no participants) cannot tell, so it marks nobody it is unsure of. */
  if (typeof prisma?.groundParticipant?.findMany !== 'function') return out;
  const rows: any[] = (await Promise.resolve(prisma.groundParticipant.findMany({
    where: { id: { in: unsure.map((p) => p.id) } },
    select: {
      id: true, partyType: true, cameThroughTheLink: true, acceptedAt: true,
      checkIns: {
        where: { OR: [{ startedAt: { not: null } }, { status: { in: ['IN_PROGRESS', 'DECLINED'] } }, { turns: { some: { role: 'PERSON' } } }] },
        select: { id: true, startedAt: true, status: true, closedReason: true, turns: { where: { role: 'PERSON' }, take: 1, select: { id: true } } },
        take: 1,
      },
    },
  })).catch(() => null)) ?? [];
  const byId = new Map(rows.filter((r) => r && unsure.some((p) => p.id === r.id)).map((r) => [r.id, r]));
  for (const p of unsure) {
    const r = byId.get(p.id);
    /* Not found, or a reader that does not carry acceptance at all (the database always does): left as it was. */
    if (!r || !('acceptedAt' in r)) continue;
    const joined = r.partyType === PartyType.INITIATOR || r.cameThroughTheLink === true || !!r.acceptedAt || cameInByTheirRows(r);
    if (!joined) out.add(p.id);
  }
  return out;
}

/** "Amina Otieno was invited and has not joined yet." Several: "Amina Otieno and Jared Okoth were invited and have not joined yet." */
export function theNotJoinedYetLine(names: (string | null)[]): string | null {
  const named = names.map((n) => n?.trim()).filter((x): x is string => !!x);
  const unnamed = names.length - named.length;
  const out: string[] = [];
  if (named.length) {
    const who = named.length === 1 ? named[0] : `${named.slice(0, -1).join(', ')} and ${named[named.length - 1]}`;
    out.push(named.length === 1 ? `${who} was invited and has not joined yet.` : `${who} were invited and have not joined yet.`);
  }
  if (unnamed) {
    const subject = named.length ? (unnamed === 1 ? '1 other person' : `${unnamed} other people`) : (unnamed === 1 ? '1 person' : `${unnamed} people`);
    out.push(unnamed === 1 ? `${subject} was invited and has not joined yet.` : `${subject} were invited and have not joined yet.`);
  }
  return out.length ? out.join(' ') : null;
}
