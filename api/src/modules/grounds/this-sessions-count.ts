import { theSessionClock, holdsTheClock, type TheSessionClock } from '../board/one-count-for-the-sessions';
import { owesThisSession } from './the-lead-checks-in-when-they-choose';
import { isNotLetInYet, whoIsNotLetInYet, markedNotLetIn } from './who-an-admin-did-not-let-in';
import { whoHasNotJoinedYet } from './invited-not-joined-yet';
import { howACheckInIsGoing } from './how-a-check-in-is-going';
import { totalSessionsFor } from './session-count';
import { aNumberInWords } from '../engagement/a-number-in-words';
import { whoHasAnswered } from '../reports/how-many-have-answered';
import { awayUntilOn, type Stretch } from '../suites/who-is-away';
import { nameToCall } from '../engagement/a-name-to-call-them';
import { andList } from '../reports/each-wait-under-whoever-holds-it';

/**
 * THE SESSION, AND WHO IS IN IT AND WHO HAS ANSWERED IT, ONCE (Hafsah, 30 October 2026, first-experience round 1).
 *
 * A field lead with five people read "all three people have checked in" from Ask, "3 of 5 people have answered this session" on the
 * board, and a third count in the check-in page's header. Three counts of one session, each worked out its own way: the page counted
 * on the screen (`whoIsInRound`), Ask counted the rows of a round it chose itself, and the board left people who had not joined yet in
 * its count while the check-ins list took them out. A clinic lead's page said "Session 2 of 12" while her board said "Session 1 of 12",
 * because the page's clock counted the lead and the board's did not.
 *
 * This is the one owner. The clock is the board's (the team's: the lead checks in when she chooses, decision 133; nobody held at the
 * door or not yet joined holds it). The count is the board's own `howACheckInIsGoing` progress, for the clock's session, with everybody
 * invited and not joined yet marked, so they are out of "N of M" and said beside it ("Two more people are not counted yet, because they
 * were invited and have not joined yet."), as decided on 13 October. The board, the check-in's page and Ask all read it, and `says` is
 * the one sentence for it, so "N of M" never travels without the people it leaves out.
 */
export interface ThisSession {
  session: number;
  answered: number;
  ofPeople: number;
  /** Participant ids still waited on. Names are the reader's wall's business. */
  waitingOn: string[];
  /** Participant ids counted and not answered, a session the clock closed with nothing said included: "who has not checked in". */
  notAnswered: string[];
  /** Everybody counted has answered, and somebody is counted. "Everyone is in" reads this. */
  everyoneIn: boolean;
  /** Who is not counted and why, or null: "One more person is not counted yet, because an admin has not let them in." */
  notCountedSays: string | null;
  /** Who of them was invited and has not joined yet, or null: they are counted (Hafsah, 1 November), and said so: "One of them was invited and has not joined yet." */
  notJoinedSays: string | null;
  /** "Three of the five people have checked in for session 2.", then who (`whoSays`, for a reader who may read names, or else `notJoinedSays`), then `notCountedSays`. */
  says: string;
  /**
   * WHO, BY NAME (round 6, 1 November 2026: "1 of 2 answered" with nobody named, and a board that said Aisha was "partway through"
   * beside "Aisha has not answered"). Each person counted, once, in one state: "You and Aisha have checked in. David has started and
   * not finished yet. Neema has not started yet." Given only where the reader may read who has answered (`names` asked for).
   */
  whoSays: string | null;
}

export interface WhatTheCountReads {
  participants: any[];
  checkIns: any[];
  scenario?: string | null;
  timelineDays?: number | null;
  cadence?: string | null;
  /** The days a twice-a-week check-in meets on, so its sessions are counted as the board counts them. */
  cadenceDays?: number[] | null;
  runsUntilEnded?: boolean | null;
}

/** "Three of the five people have checked in for session 2.", in words up to ten. */
export function theCountSaid(session: number, answered: number, ofPeople: number): string {
  /* Nobody in the session yet (an anchor lead alone, before her team is in): there is no count to say, never "one of zero". */
  if (ofPeople <= 0) return '';
  if (answered <= 0) return `Nobody has checked in for session ${session} yet.`;
  if (answered >= ofPeople) {
    return ofPeople === 1 ? `The one person in it has checked in for session ${session}.` : `All ${aNumberInWords(ofPeople)} people have checked in for session ${session}.`;
  }
  const a = aNumberInWords(answered);
  return `${a.charAt(0).toUpperCase()}${a.slice(1)} of the ${aNumberInWords(ofPeople)} people ${answered === 1 ? 'has' : 'have'} checked in for session ${session}.`;
}

/**
 * The people with who has not joined yet, and who is not let in yet, marked on them, by the one joined rule and the one door rule.
 * Every count reads people through this, so no reader leaves somebody in that another leaves out.
 */
export async function withWhoHasNotJoinedMarked<T extends { id: string }>(prisma: any, people: T[]): Promise<(T & { notJoinedYet?: boolean; notLetIn?: boolean })[]> {
  const notJoined = await whoHasNotJoinedYet(prisma, (people ?? []) as any[]).catch(() => new Set<string>());
  const notLetIn = await whoIsNotLetInYet(prisma, (people ?? []) as any[]).catch(() => new Map<string, unknown>());
  return markedNotLetIn((people ?? []).map((p) => (notJoined.has(p.id) ? { ...p, notJoinedYet: true } : p)), notLetIn);
}

/**
 * WHO ONE SESSION COUNTS, AND WHO OF THEM HAS ANSWERED IT: the one rule (whoHasAnswered, reports/how-many-have-answered.ts), over people already marked
 * (`withWhoHasNotJoinedMarked`) and that session's rows. The open session's count and the week's "check-ins made" both read this
 * (Hafsah, 31 October 2026: the weekly tile reads the one count like every other count).
 */
export function theCountOfASession(
  people: any[], rows: any[], session: number, scenario: string | null | undefined, leave: Map<string, Stretch[]> | undefined, now: Date,
): { counted: string[]; answered: number; ofPeople: number; notAnswered: string[] } {
  const withTheirRows = (people ?? []).map((p) => ({
    ...p, awayUntil: awayUntilOn(leave?.get(p.id), now),
    checkIns: (rows ?? []).filter((c) => !c.isSetup && c.participantId === p.id && (c.sessionNumber ?? 1) === session),
  }));
  const c = whoHasAnswered(withTheirRows, session, scenario ?? null);
  const counted = c.onTheCheckIn;
  const notAnswered = counted.filter((id) => !c.answered.includes(id));
  return { counted, answered: counted.length - notAnswered.length, ofPeople: counted.length, notAnswered };
}

/** The clock and the count, from rows already marked (`withWhoHasNotJoinedMarked`). Pure: the board, the page and Ask all call this. */
/**
 * Each person the session counts, in one state each, by name: checked in, started and not finished, or not started. The reader is "you".
 * Read from the same rows and the same people the count reads, so the names and the number are one fact.
 */
export function whoSaid(people: any[], rows: any[], session: number, counted: string[], notAnswered: string[], readerUserId?: string | null): string {
  const byId = new Map((people ?? []).map((p) => [p.id, p]));
  const nameOf = (id: string) => {
    const p = byId.get(id);
    return p?.userId && readerUserId && p.userId === readerUserId ? 'you' : nameToCall(p);
  };
  const waiting = new Set(notAnswered);
  const startedIt = (id: string) => (rows ?? []).some((c) => !c.isSetup && c.participantId === id && (c.sessionNumber ?? 1) === session && c.status === 'IN_PROGRESS');
  const done = counted.filter((id) => !waiting.has(id)).map(nameOf).sort((a, b) => (a === 'you' ? -1 : b === 'you' ? 1 : 0));
  const started = notAnswered.filter(startedIt).map(nameOf);
  /* Somebody invited and not joined is counted (Hafsah, 1 November) and said as what happened, never "has not started". */
  const notJoined = notAnswered.filter((id) => !startedIt(id) && byId.get(id)?.notJoinedYet === true).map(nameOf);
  const notStarted = notAnswered.filter((id) => !startedIt(id) && byId.get(id)?.notJoinedYet !== true).map(nameOf);
  const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
  const one = (xs: string[]) => xs.length === 1 && xs[0] !== 'you';
  const out: string[] = [];
  if (done.length) out.push(`${cap(andList(done))} ${one(done) ? 'has' : 'have'} checked in.`);
  if (started.length) out.push(`${cap(andList(started))} ${one(started) ? 'has' : 'have'} started and not finished yet.`);
  if (notStarted.length) out.push(`${cap(andList(notStarted))} ${one(notStarted) ? 'has' : 'have'} not started yet.`);
  if (notJoined.length) out.push(`${cap(andList(notJoined))} ${notJoined.length === 1 ? 'was' : 'were'} invited and ${notJoined.length === 1 ? 'has' : 'have'} not joined yet.`);
  return out.join(' ');
}

export function theSessionAndItsCount(
  g: WhatTheCountReads,
  opts: { now?: Date; handOn?: boolean; leave?: Map<string, Stretch[]>; names?: { readerUserId?: string | null } } = {},
): { clock: TheSessionClock; count: ThisSession } {
  const now = opts.now ?? new Date();
  const participants = (g.participants ?? []) as any[];
  const rows = ((g.checkIns ?? []) as any[]).filter((c) => !c.isSetup);
  const planned = g.runsUntilEnded ? null : totalSessionsFor(g.timelineDays as any, g.cadence as any, g.cadenceDays as any) ?? null;
  const givers = new Set(participants.filter((p) => owesThisSession(p) && holdsTheClock(p, isNotLetInYet) && p.notJoinedYet !== true).map((p) => p.id));
  const clock = theSessionClock(rows, givers, planned, now, opts.handOn ?? true);
  const progress = howACheckInIsGoing({
    checkIns: g.checkIns ?? [],
    participants,
    scenario: g.scenario ?? null,
    dependencies: [],
    timelineDays: g.runsUntilEnded ? null : g.timelineDays ?? null,
    cadence: g.cadence ?? null,
    cadenceDays: g.cadenceDays ?? null,
    sharedPicture: null,
    leave: opts.leave,
    round: clock.currentSession,
  }, now).glance.progress;
  const notCountedSays = progress.notCountedSays ?? null;
  const one = theCountOfASession(participants, rows, clock.currentSession, g.scenario, opts.leave, now);
  const whoSays = opts.names && one.ofPeople > 0 ? whoSaid(participants, rows, clock.currentSession, one.counted, one.notAnswered, opts.names.readerUserId) || null : null;
  const count: ThisSession = {
    session: clock.currentSession,
    answered: one.answered,
    ofPeople: one.ofPeople,
    waitingOn: progress.waitingOn ?? [],
    notAnswered: one.notAnswered,
    everyoneIn: one.ofPeople > 0 && one.answered >= one.ofPeople,
    notCountedSays,
    notJoinedSays: progress.notJoinedSays ?? null,
    /* Each person once: where they are named, who has not joined is named among them, so the count's own not-joined sentence is not said too. */
    says: [theCountSaid(clock.currentSession, one.answered, one.ofPeople), whoSays ?? progress.notJoinedSays, notCountedSays].filter(Boolean).join(' '),
    whoSays,
  };
  return { clock, count };
}
