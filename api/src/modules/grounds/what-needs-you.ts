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

export type NeedKind = 'ready' | 'decide' | 'look';

export interface Need {
  key: string;
  /** The coloured edge: ready to read, a decision or a thing to do, or something to look at. */
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
  participants?: { id: string; userId?: string | null; user?: { firstName?: string | null } | null }[];
  checkIns?: {
    id: string;
    participantId: string;
    sessionNumber: number;
    status: string;
    availableFrom?: string | Date | null;
    completedAt?: string | Date | null;
    isSetup?: boolean | null;
  }[];
  glance?: { progress?: { roundsDone?: number; roundsPlanned?: number | null } } | null;
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
}

const DAY = 86_400_000;
/** After this long an open session has been waiting a while, and the row says for how long. */
const A_WHILE = 7;
/** How far ahead "Coming up" looks. */
const AHEAD = 14 * DAY;

const time = (d: string | Date | null | undefined) => (d ? new Date(d).getTime() : null);
const firstSentence = (text: string | null | undefined) => (text ? sentencesIn(text)[0]?.trim() || null : null);

function isOver(g: ListedCheckIn) {
  return isShut(g.status) || !!g.closedAt || !!g.resolvedAt;
}

function sessionsOf(g: ListedCheckIn) {
  return (g.checkIns ?? []).filter((c) => !c.isSetup);
}

/** The latest session that has opened. A session scheduled for later already has its rows. */
function openSession(g: ListedCheckIn, now: number): number {
  const open = sessionsOf(g).filter((c) => (time(c.availableFrom) ?? 0) <= now);
  return open.length ? Math.max(...open.map((c) => c.sessionNumber)) : 0;
}

/** "Omar", "Omar and Brian", "you", or a count when there are more, or no names on record. */
function whoHasNotYet(missing: { name: string | null; isMe: boolean }[]): string {
  const said = missing.map((m) => (m.isMe ? 'you' : m.name));
  if (missing.length <= 2 && said.every(Boolean)) {
    const [a, b] = said as string[];
    const who = b ? `${a} and ${b}` : a;
    const onlyOne = missing.length === 1 && !missing[0].isMe;
    return `${who} ${onlyOne ? 'hasn’t' : 'haven’t'} yet`;
  }
  return missing.length === 1 ? '1 person hasn’t yet' : `${missing.length} people haven’t yet`;
}

export function whatNeedsYou(
  list: ListedCheckIn[],
  reader: Reader,
  waiting: WaitingForApproval[] = [],
  now: Date = new Date(),
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

    /* Your turn: the earliest open session of yours that is not done. Being two behind is one thing to do. */
    if (!over && me) {
      const next = sessions
        .filter((c) => c.participantId === me.id && c.status !== 'COMPLETED' && (time(c.availableFrom) ?? 0) <= at)
        .sort((a, b) => a.sessionNumber - b.sessionNumber)[0];
      if (next) {
        const opened = time(next.availableFrom);
        const days = opened ? Math.floor((at - opened) / DAY) : 0;
        const need: Need = {
          key: `turn-${g.id}`,
          kind: 'decide',
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
    if (g.reportWaitingForMe) {
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
    if (me) {
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
      const n = openSession(g, at);
      const rows = sessions.filter((c) => c.sessionNumber === n);
      const answered = rows.filter((c) => c.status === 'COMPLETED').length;
      if (n > 0 && rows.length > 1 && answered < rows.length && (!line || rows.length > line.people)) {
        const byId = new Map((g.participants ?? []).map((p) => [p.id, p]));
        const missing = rows
          .filter((c) => c.status !== 'COMPLETED')
          .map((c) => {
            const p = byId.get(c.participantId);
            return { name: p?.user?.firstName?.trim() || null, isMe: !!p?.userId && p.userId === reader.userId };
          });
        line = {
          people: rows.length,
          text: answered === 0
            ? `In ${g.label}, nobody has checked in for session ${n} yet.`
            : `In ${g.label}, ${answered} of ${rows.length} have checked in for session ${n}; ${whoHasNotYet(missing)}.`,
        };
      }
    }

    /* Coming up: the next session that opens, for you, or for everybody when you run it. */
    if (!over) {
      const future = sessions
        .filter((c) => (me && c.participantId === me.id) || mayName)
        .filter((c) => {
          const t = time(c.availableFrom);
          return t !== null && t > at && t <= at + AHEAD;
        })
        .sort((a, b) => (time(a.availableFrom) ?? 0) - (time(b.availableFrom) ?? 0))[0];
      if (future) {
        comingUp.push({
          at: new Date(time(future.availableFrom)!).toISOString(),
          what: `${g.label}, session ${future.sessionNumber} opens`,
          to: `/grounds/${g.id}`,
        });
      }
      const ends = time(g.endsAt);
      if ((iRunIt || me) && ends !== null && ends > at && ends <= at + AHEAD) {
        comingUp.push({ at: new Date(ends).toISOString(), what: `${g.label} ends`, to: `/grounds/${g.id}` });
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

  const needs = [...firstTurns, ...lateTurns, ...reports, ...decisions, ...otherTurns, ...ownReports];
  const said = (line as { text: string } | null)?.text ?? (myOpenTurn ? `Your check-in for ${myOpenTurn} is open.` : null);
  return {
    needs,
    count: needs.length,
    line: said,
    comingUp: comingUp.sort((a, b) => time(a.at)! - time(b.at)!).slice(0, 5),
  };
}
