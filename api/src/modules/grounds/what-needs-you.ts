import { theCheckIn, yourCheckIn } from './which-check-in-it-is';
import { isShut } from './a-ground-that-has-ended';
import { sentencesIn } from '../presentation/where-a-sentence-actually-ends';

/**
 * WHAT NEEDS YOU, GATHERED ACROSS EVERY CHECK-IN YOU CAN SEE (C1, U.5). The one read behind Today,
 * the count beside Today in the sidebar, and the "3 new" on "Choose an organisation".
 *
 * IT CANNOT SHOW MORE THAN THE READER ALREADY SEES. It is worked out only from the check-ins list as
 * `GroundsService.list()` gives it to this reader, which is already cut to what they may read, and
 * from the approvals queue, which only an admin is given. It adds no query of its own, so it cannot
 * reach a check-in, a report or a person the reader could not open anyway. Nothing here counts a
 * person's load across check-ins, and nothing says how anybody's answers were rated.
 *
 * WHO IS NAMED. "Omar hasn't yet" is said only to whoever runs that check-in, or an admin of the
 * organisation, who both see who has answered on the check-in's own page. A participant is told
 * about their own turn, never about who else is late.
 *
 * The sentences are written here, once, so every place that shows them says the same words. Dates
 * and times are not: the server does not know the reader's clock, so "Tomorrow, 4pm" is left to the
 * screen, which gets the moment itself.
 */

export type NeedKind = 'ready' | 'decide' | 'look' | 'your_turn';

export interface Need {
  key: string;
  /** The coloured edge: ready to read, a decision, something to look at, or `your_turn`, your own check-in to start (starting your turn is not a decision, request 97c). */
  kind: NeedKind;
  title: string;
  detail: string | null;
  action: { label: string; to: string };
  groundId: string;
  /** Whose organisation it belongs to, so "Choose an organisation" can count each one's. */
  organizationId: string;
}

export interface ComingUp {
  /** When, as a moment. The screen says it in the reader's own time. */
  at: string;
  what: string;
  to: string;
}

export interface WhatNeedsYou {
  needs: Need[];
  count: number;
  /** One sentence under the date: who has checked in, or that your check-in is open. */
  line: string | null;
  comingUp: ComingUp[];
}

/** The parts of a check-ins list row this reads. Everything else on the row is ignored. */
export interface ListedCheckIn {
  id: string;
  label: string;
  status?: string | null;
  organizationId: string;
  initiatorId?: string | null;
  closedAt?: string | Date | null;
  resolvedAt?: string | Date | null;
  endsAt?: string | Date | null;
  reportWaitingForMe?: boolean;
  latestSummary?: string | null;
  participants?: { id: string; userId?: string | null; notLetIn?: boolean; user?: { firstName?: string | null } | null }[];
  checkIns?: {
    id: string;
    participantId: string;
    sessionNumber: number;
    status: string;
    availableFrom?: string | Date | null;
    completedAt?: string | Date | null;
    isSetup?: boolean | null;
  }[];
  glance?: { progress?: { roundsDone?: number; roundsPlanned?: number | null; answeredThisRound?: number; ofPeople?: number; waitingOn?: string[]; openRound?: number } } | null;
}

export interface WaitingForApproval {
  id: string;
  label: string;
  createdBy: string;
  organizationId?: string;
}

export interface Reader {
  userId: string;
  role?: string | null;
  organizationId: string;
  /**
   * NOT LET INTO THE ORGANISATION YET (U.8 third review, PRIVACY).
   *
   * Faraji joined a check-in through an open link while there was no free seat for him; his
   * account and his participant row both exist (so `whatTheyMayRead` correctly calls him "own" -
   * he is not a stranger, and the ground-level rule has not changed for anybody it already covers),
   * but he is still `awaitingOrgApproval`: queued for an admin to let him into the organisation, the
   * same hold `WhoIsWaitingAtTheDoorService` reads for "Almost in". The conversation layer already
   * refuses him at the gate (conversation.service.ts, `CANNOT_CHECK_IN_YET`) - but Today still read
   * "The report for Sales team, Q3 is ready… Read it" and "Your first check-in… Start it" for him,
   * because nothing here asked the question at all. This flag makes Today stop offering either
   * while it is true; it is the caller's job to know whether the reader is currently held (a report
   * being releasable to the ORGANISATION at large is a separate, engine-owned question - see
   * request to the engine workspace on whether a held person may read a shared report at all).
   */
  notLetIn?: boolean;
}

const DAY = 86_400_000;
/** After this long an open session has been waiting a while, and the row says for how long. */
const A_WHILE = 7;
/** How far ahead "Coming up" looks. */
const AHEAD = 14 * DAY;

const time = (d: string | Date | null | undefined) => (d ? new Date(d).getTime() : null);
const cap = (t: string) => `${t.charAt(0).toUpperCase()}${t.slice(1)}`;
const firstSentence = (text: string | null | undefined) => (text ? sentencesIn(text)[0]?.trim() || null : null);

function isOver(g: ListedCheckIn) {
  return isShut(g.status) || !!g.closedAt || !!g.resolvedAt;
}

function sessionsOf(g: ListedCheckIn) {
  return (g.checkIns ?? []).filter((c) => !c.isSetup);
}

/**
 * WHETHER A SESSION HAS OPENED FOR ITS PERSON (screens request 86). Its date has come, or somebody
 * has already started it: a session that is under way or finished is open whatever its `availableFrom`
 * still says, since that date only says when it was first offered. A started session with a later
 * date was read as "not open yet", so Today dropped the session the person was in the middle of.
 */
function hasOpened(c: { status: string; availableFrom?: string | Date | null }, at: number): boolean {
  return c.status === 'IN_PROGRESS' || c.status === 'COMPLETED' || (time(c.availableFrom) ?? 0) <= at;
}

/** The latest session that has opened. A session scheduled for later already has its rows. */
function openSession(g: ListedCheckIn, now: number): number {
  const open = sessionsOf(g).filter((c) => hasOpened(c, now));
  return open.length ? Math.max(...open.map((c) => c.sessionNumber)) : 0;
}

/** "Omar has not checked in yet.", "Omar and Brian have not checked in yet.", "You have not checked in yet.", or a count. */
function whoHasNotYet(missing: { name: string | null; isMe: boolean }[]): string {
  const said = missing.map((m) => (m.isMe ? 'you' : m.name));
  if (missing.length <= 2 && said.every(Boolean)) {
    const [a, b] = said as string[];
    const who = b ? `${a} and ${b}` : a;
    const onlyOne = missing.length === 1 && !missing[0].isMe;
    return `${who[0].toUpperCase()}${who.slice(1)} ${onlyOne ? 'has' : 'have'} not checked in yet.`;
  }
  return missing.length === 1 ? '1 person has not checked in yet.' : `${missing.length} people have not checked in yet.`;
}

const theSession = theCheckIn;

export function whatNeedsYou(
  list: ListedCheckIn[],
  reader: Reader,
  waiting: WaitingForApproval[] = [],
  now: Date = new Date(),
  /** What is waiting for this reader to approve, already said (waiting-for-you-to-approve.ts). Only ever the approver's. */
  toApprove: Need[] = [],
): WhatNeedsYou {
  const at = now.getTime();
  const isAdmin = reader.role === 'ADMIN';
  const firstTurns: Need[] = [];
  const lateTurns: Need[] = [];
  const reports: Need[] = [];
  const decisions: Need[] = [];
  const otherTurns: Need[] = [];
  const ownReports: Need[] = [];
  const comingUp: ComingUp[] = [];
  let myOpenTurn: string | null = null;
  let line: { people: number; text: string } | null = null;

  for (const g of list) {
    if ((g.status ?? '') === 'AWAITING_APPROVAL' || (g.status ?? '') === 'DECLINED') continue;
    const over = isOver(g);
    const me = (g.participants ?? []).find((p) => p.userId && p.userId === reader.userId) ?? null;
    const iRunIt = !!g.initiatorId && g.initiatorId === reader.userId;
    const mayName = iRunIt || (isAdmin && g.organizationId === reader.organizationId);
    const sessions = sessionsOf(g);
    const base = { groundId: g.id, organizationId: g.organizationId };
    /* THE TEAM'S ROUND, from the one clock the board and the list read (request 97a). Only where the row
       carries none is the latest session whose date has come used. */
    const teamRound = g.glance?.progress?.openRound ?? openSession(g, at);

    /*
     * NOT LET IN YET: OFFERED NEITHER A CHECK-IN NOR A REPORT (U.8 third review, PRIVACY).
     * A check-in this reader is not yet admitted to is not theirs to start or read about, whatever
     * their participant row already says - the conversation layer refuses them at the door anyway,
     * so offering it here was inviting them into a refusal (the same fault "offer only what the
     * server accepts" fixed elsewhere), and the report is exactly what CLAUDE.md's privacy rule
     * calls "released" - not yet something to hand somebody who has not been let into the reader.
     */
    const heldFromMyOwn = !!reader.notLetIn;

    /* Your turn: the earliest open session of yours that is not done. Being two behind is one thing to do. */
    if (!over && me && !heldFromMyOwn) {
      const next = sessions
        .filter((c) => c.participantId === me.id && c.status !== 'COMPLETED' && hasOpened(c, at))
        .sort((a, b) => a.sessionNumber - b.sessionNumber)[0];
      if (next) {
        const opened = time(next.availableFrom);
        const days = opened ? Math.floor((at - opened) / DAY) : 0;
        const need: Need = {
          key: `turn-${g.id}`,
          kind: 'your_turn',
          title: next.sessionNumber === 1 ? `Your first check-in for ${g.label}` : `Your own check-in for ${g.label}`,
          /*
           * The prototype's second line (today-lead.txt). "Everyone else's answers are read against
           * yours" is true only of the lead's own first check-in, so only they are told it. Nothing
           * in the product holds a closing time, so "It closes at 6pm" is never said.
           */
          detail: [
            next.sessionNumber === 1 && iRunIt ? 'About two minutes. Everyone else’s answers are read against yours.' : 'About two minutes.',
            days > A_WHILE ? `It opened ${days} days ago.` : null,
          ].filter(Boolean).join(' '),
          action: { label: 'Start it', to: `/checkin/${next.id}` },
          ...base,
        };
        if (next.sessionNumber === 1) firstTurns.push(need);
        else if (days > A_WHILE) lateTurns.push(need);
        else otherTurns.push(need);
        myOpenTurn ??= g.label;
      }
    }

    /* A released report you have not opened. */
    if (g.reportWaitingForMe && !heldFromMyOwn) {
      reports.push({
        key: `report-${g.id}`,
        kind: 'ready',
        title: `The report for ${g.label} is ready`,
        detail: firstSentence(g.latestSummary),
        action: { label: 'Read it', to: `/grounds/${g.id}/report` },
        ...base,
      });
    }

    /* Every planned session is done, and how it ends is yours to decide. */
    const planned = g.glance?.progress?.roundsPlanned ?? null;
    const done = g.glance?.progress?.roundsDone ?? 0;
    if (!over && iRunIt && planned && done >= planned) {
      decisions.push({
        key: `end-${g.id}`,
        kind: 'decide',
        title: `Decide how ${g.label} ends`,
        detail: 'The last session is done.',
        action: { label: 'Decide', to: `/grounds/${g.id}` },
        ...base,
      });
    }

    /* Your own report from a check-in you finished in the last day. Only you are given it. */
    if (me && !heldFromMyOwn) {
      const last = sessions
        .filter((c) => c.participantId === me.id && c.status === 'COMPLETED' && (time(c.completedAt) ?? 0) > at - DAY)
        .sort((a, b) => (time(b.completedAt) ?? 0) - (time(a.completedAt) ?? 0))[0];
      if (last) {
        ownReports.push({
          key: `own-${g.id}`,
          kind: 'ready',
          title: `Your own report for ${g.label}`,
          detail: 'Only you see it.',
          action: { label: 'Read it', to: `/checkin/${last.id}/report` },
          ...base,
        });
      }
    }

    /* Who has checked in, for whoever runs it or an admin. The check-in with the most people wins. */
    if (!over && mayName) {
      const n = teamRound;
      /* Somebody an admin did not let in cannot be asked, so is neither counted nor named (request 95). */
      const notLetInIds = new Set((g.participants ?? []).filter((p) => p.notLetIn).map((p) => p.id));
      const rows = sessions.filter((c) => c.sessionNumber === n && !notLetInIds.has(c.participantId));
      /*
       * ONE COUNT (U.5 review). The list row says "1 of 2 answered" from the check-in's own rule for
       * who is expected this session (someone whose invitation has lapsed, or who has not joined, is
       * not waited on). This sentence counted every row and said "1 of 3". Where the list gives that
       * count, it is used here, with the same people named.
       */
      const counted = g.glance?.progress;
      const useCounted = !!counted && typeof counted.ofPeople === 'number' && Array.isArray(counted.waitingOn);
      const heldOut = useCounted ? counted!.waitingOn!.filter((id) => notLetInIds.has(id)).length : 0;
      const total = useCounted ? counted!.ofPeople! - heldOut : rows.length;
      const answered = useCounted ? counted!.answeredThisRound ?? 0 : rows.filter((c) => c.status === 'COMPLETED').length;
      const waitingIds = useCounted ? counted!.waitingOn!.filter((id) => !notLetInIds.has(id)) : rows.filter((c) => c.status !== 'COMPLETED').map((c) => c.participantId);
      if (n > 0 && total > 1 && answered < total && (!line || total > line.people)) {
        const byId = new Map((g.participants ?? []).map((p) => [p.id, p]));
        const missing = waitingIds.map((id) => {
          const p = byId.get(id);
          return { name: p?.user?.firstName?.trim() || null, isMe: !!p?.userId && p.userId === reader.userId };
        });
        line = {
          people: total,
          text: answered === 0
            ? `In ${g.label}, nobody has checked in for ${theSession(n)} yet.`
            : `In ${g.label}, ${answered} of ${total} have checked in for ${theSession(n)}. ${whoHasNotYet(missing)}`,
        };
      }
    }

    /*
     * Coming up: the next check-in that opens, said as the board says it (request 97a). For somebody who
     * runs the check-in it is the team's: the first round after the one that is open, the same for every
     * person who runs it. For a person it is their own, said as theirs, because one person's next
     * check-in can be a round ahead of the team's.
     */
    if (!over) {
      const future = sessions
        .filter((c) => (mayName ? c.sessionNumber > teamRound : me && c.participantId === me.id))
        .filter((c) => {
          const t = time(c.availableFrom);
          /* A session somebody has started has opened; it is not "coming up" (request 86). */
          return t !== null && t > at && t <= at + AHEAD && c.status !== 'IN_PROGRESS' && c.status !== 'COMPLETED';
        })
        .sort((a, b) => (time(a.availableFrom) ?? 0) - (time(b.availableFrom) ?? 0))[0];
      if (future) {
        comingUp.push({
          at: new Date(time(future.availableFrom)!).toISOString(),
          what: mayName ? `${cap(theCheckIn(future.sessionNumber))} for ${g.label} opens.` : `${yourCheckIn(future.sessionNumber)} for ${g.label} opens.`,
          to: `/grounds/${g.id}`,
        });
      }
      const ends = time(g.endsAt);
      if ((iRunIt || me) && ends !== null && ends > at && ends <= at + AHEAD) {
        comingUp.push({ at: new Date(ends).toISOString(), what: `${g.label} ends.`, to: `/grounds/${g.id}` });
      }
    }
  }

  /* Only an admin is given the queue. Said here as well, so nobody else is ever shown one. */
  if (isAdmin) {
    for (const w of waiting) {
      decisions.push({
        key: `approve-${w.id}`,
        kind: 'decide',
        title: `${w.label} is waiting for you to approve it`,
        detail: `${w.createdBy} set it up. Nothing goes out until you approve it.`,
        action: { label: 'Look at it', to: `/grounds/${w.id}` },
        groundId: w.id,
        organizationId: w.organizationId ?? reader.organizationId,
      });
    }
  }

  decisions.push(...toApprove);
  const needs = [...firstTurns, ...lateTurns, ...reports, ...decisions, ...otherTurns, ...ownReports];
  const said = (line as { text: string } | null)?.text ?? (myOpenTurn ? `Your check-in for ${myOpenTurn} is open.` : null);
  return {
    needs,
    count: needs.length,
    line: said,
    comingUp: comingUp.sort((a, b) => time(a.at)! - time(b.at)!).slice(0, 5),
  };
}
