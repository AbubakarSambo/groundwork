import { A_REAL_CHECK_IN, A_REAL_SESSION, inRange } from '../prompts/what-the-platform-has-actually-done';

/**
 * THE ACTIVATION FUNNEL (engagement spec sections 2, 34 and 35): how far each customer check-in has got towards being useful, counted from rows that
 * already exist. Nothing is written for it and nothing is a column, so it is true for every check-in there has ever been, and opening it rebuilds nothing.
 *
 *   created -> people added -> first response -> enough to write a report -> first insight (the report released) -> the lead acted -> a second round
 *
 * "Created" is not "activated" (spec section 2): a check-in counts as activated only at its first insight. Where a check-in is now, besides how far it
 * ever got, is read apart: a test (nobody besides the lead was ever added, a week on), abandoned before value, abandoned after value, active. A check-in
 * that was reopened by an engagement message is not told apart here, because nothing records which message a person answered; that needs the click or
 * the reply to be recorded, and email opens are deliberately not (spec section 35).
 *
 * AND WHAT WAS NOT SENT IS NOT WHAT WAS IGNORED (spec sections 34 and 35). `emails` counts the mail Groundwork decided to send by what became of it, and a
 * message held back or stopped because the person had asked not to get it is its own count: it was never delivered, so it is not an unanswered message and
 * must never be read as one.
 */
export interface TheActivationFunnel {
  since: Date | null;
  /** How many check-ins ever reached each stage, in order. Each is a count of check-ins that began in the range. */
  reached: { created: number; peopleAdded: number; firstResponse: number; enoughToReport: number; firstInsight: number; leadActed: number; secondRound: number };
  /** Where each is now. A check-in is in at most one of these. */
  now: { test: number; abandonedBeforeValue: number; abandonedAfterValue: number; active: number };
  /** Leads with a second check-in, which is repeat use: the count of leads, not check-ins. */
  leadsWhoCameBack: number;
  /**
   * THE PEOPLE, NOT THE CHECK-INS (participant activation spec, section 1 and 5: "know exactly where each participant is stuck"). The same rows, counted for each person who
   * was added to a customer's check-in: invited, reached, verified, engaged, and in a habit, and where those who are not stand.
   */
  participants: TheParticipantStages;
  /**
   * What became of the mail Groundwork decided to send. `notSentOnPurpose` is mail stopped because the person had stopped these emails or had already been
   * sent their one for the day, and `held` is mail kept for the morning: neither was delivered, so neither is an ignored message.
   */
  emails: { delivered: number; failed: number; held: number; notSentOnPurpose: number };
}

/**
 * A person added to a live customer check-in (not the lead, not somebody who only manages, not an open link's placeholder, not our own organisations), counted by how far
 * they have got. Each stage is a count of people who reached it, so each is no more than the one before it, bar "reached", which a bounced invitation takes people out of.
 *   added      somebody put them on a check-in
 *   invited    an invitation was sent, or they came in through the link
 *   reached    the invitation did not bounce
 *   verified   they have an account: they opened the link
 *   engaged    they started a check-in
 *   inAHabit   they finished two or more, the latest in the last fortnight
 * and where those who stopped are standing now, which never overlap:
 *   notInvited, invitedNotVerified, verifiedNeverStarted, startedNotFinished, answeredOnceNotReturned, wentQuiet.
 * A person who is waiting for a seat is not "never invited": the invitation waits for the seat, and is sent when it comes.
 */
export interface TheParticipantStages {
  reached: { added: number; invited: number; reached: number; verified: number; engaged: number; inAHabit: number };
  stuck: { notInvited: number; invitedNotVerified: number; verifiedNeverStarted: number; startedNotFinished: number; answeredOnceNotReturned: number; wentQuiet: number };
}

const NONE: TheParticipantStages = {
  reached: { added: 0, invited: 0, reached: 0, verified: 0, engaged: 0, inAHabit: 0 },
  stuck: { notInvited: 0, invitedNotVerified: 0, verifiedNeverStarted: 0, startedNotFinished: 0, answeredOnceNotReturned: 0, wentQuiet: 0 },
};

export async function theParticipantStages(prisma: any, since: Date | null, now: Date = new Date()): Promise<TheParticipantStages> {
  const fortnightAgo = new Date(now.getTime() - A_QUIET_FORTNIGHT);
  const rows: any[] = await Promise.resolve(prisma.$queryRaw`
    WITH p AS (
      SELECT gp.id, gp.invited_at, gp.user_id, gp.invite_delivery_status, gp.awaiting_seat
      FROM ground_participants gp
      JOIN grounds g ON g.id = gp.ground_id
      JOIN organizations o ON o.id = g.organization_id
      WHERE gp."partyType" = 'PARTICIPANT' AND gp.managing_only = false AND gp.left_at IS NULL AND o.is_internal = false
        AND gp.email NOT LIKE '%@unclaimed.invalid'
        AND g.status NOT IN ('STALLED', 'CLOSED', 'RESOLVED', 'AWAITING_APPROVAL')
        AND (${since}::timestamp IS NULL OR g.created_at >= ${since}::timestamp)
    ), c AS (
      SELECT participant_id,
        COUNT(*) FILTER (WHERE status IN ('IN_PROGRESS', 'COMPLETED'))::int AS started,
        COUNT(*) FILTER (WHERE status = 'COMPLETED')::int AS done,
        MAX(completed_at) FILTER (WHERE status = 'COMPLETED') AS last_done
      FROM check_ins WHERE is_setup = false GROUP BY participant_id
    ), x AS (
      SELECT p.*, COALESCE(c.started, 0) AS started, COALESCE(c.done, 0) AS done, c.last_done
      FROM p LEFT JOIN c ON c.participant_id = p.id
    )
    SELECT
      COUNT(*)::int AS added,
      COUNT(*) FILTER (WHERE invited_at IS NOT NULL)::int AS invited,
      COUNT(*) FILTER (WHERE invited_at IS NOT NULL AND COALESCE(invite_delivery_status, '') NOT IN ('BOUNCED', 'COMPLAINED'))::int AS reached,
      COUNT(*) FILTER (WHERE user_id IS NOT NULL)::int AS verified,
      COUNT(*) FILTER (WHERE started >= 1)::int AS engaged,
      COUNT(*) FILTER (WHERE done >= 2 AND last_done >= ${fortnightAgo}::timestamp)::int AS in_a_habit,
      COUNT(*) FILTER (WHERE invited_at IS NULL AND NOT awaiting_seat)::int AS not_invited,
      COUNT(*) FILTER (WHERE invited_at IS NOT NULL AND user_id IS NULL)::int AS invited_not_verified,
      COUNT(*) FILTER (WHERE user_id IS NOT NULL AND started = 0)::int AS verified_never_started,
      COUNT(*) FILTER (WHERE started >= 1 AND done = 0)::int AS started_not_finished,
      COUNT(*) FILTER (WHERE done = 1 AND last_done < ${fortnightAgo}::timestamp)::int AS answered_once_not_returned,
      COUNT(*) FILTER (WHERE done >= 2 AND last_done < ${fortnightAgo}::timestamp)::int AS went_quiet
    FROM x`).catch(() => []);
  const r = rows?.[0];
  if (!r || r.added === undefined) return NONE;
  const n = (k: string) => Number(r[k] ?? 0);
  return {
    reached: { added: n('added'), invited: n('invited'), reached: n('reached'), verified: n('verified'), engaged: n('engaged'), inAHabit: n('in_a_habit') },
    stuck: {
      notInvited: n('not_invited'), invitedNotVerified: n('invited_not_verified'), verifiedNeverStarted: n('verified_never_started'),
      startedNotFinished: n('started_not_finished'), answeredOnceNotReturned: n('answered_once_not_returned'), wentQuiet: n('went_quiet'),
    },
  };
}

export const ENGAGEMENT_SENDERS = [
  'sendLeadFirstCheckIn', 'sendWaitingOnThePeople', 'sendTestCheckInMovesOn', 'sendHeresWhatIsNew', 'sendYourWeek', 'sendTheReportFollowUp', 'sendWhoHasGoneQuiet', 'sendTheLeadsWeeklyLetter', 'sendTheLeadsDailyNudge',
  'sendNudge', 'sendReportReady', 'sendRoundDigest',
];

const DAY = 86_400_000;
export const A_WEEK = 7 * DAY;
export const A_QUIET_FORTNIGHT = 14 * DAY;

export async function theActivationFunnel(prisma: any, since: Date | null, now: Date = new Date()): Promise<TheActivationFunnel> {
  const aGround = { ...A_REAL_CHECK_IN, ...inRange('createdAt', since) };
  const aSession = { ...A_REAL_SESSION, status: 'COMPLETED' as const };
  const fortnightAgo = new Date(now.getTime() - A_QUIET_FORTNIGHT);
  const weekAgo = new Date(now.getTime() - A_WEEK);
  const notStopped = { status: { notIn: ['STALLED'] } };
  const recently = { OR: [{ startedAt: { gte: fortnightAgo } }, { completedAt: { gte: fortnightAgo } }] };
  const count = (where: any) => prisma.ground.count({ where });
  const [created, peopleAdded, firstResponse, enoughToReport, firstInsight, acted, secondRound, test, active, beforeValueQuiet, afterValueQuiet, leads, outcomes] = await Promise.all([
    count(aGround),
    count({ ...aGround, participants: { some: { partyType: 'PARTICIPANT' } } }),
    count({ ...aGround, checkIns: { some: { ...aSession, participant: { partyType: 'PARTICIPANT' } } } }),
    count({ ...aGround, report: { isNot: null } }),
    count({ ...aGround, report: { releasedAt: { not: null } } }),
    /* The lead acted: after the first picture went out a later session was opened, or something people said they would do was marked done. */
    count({ ...aGround, report: { releasedAt: { not: null } }, OR: [{ checkIns: { some: { ...A_REAL_SESSION, sessionNumber: { gt: 1 } } } }, { commitments: { some: { status: 'DONE' } } }] }),
    count({ ...aGround, checkIns: { some: { ...aSession, sessionNumber: { gte: 2 } } } }),
    /* A test: a week on, nobody besides the lead was ever added (a-test-check-in-moves-on). */
    count({ ...aGround, createdAt: { ...(since ? { gte: since } : {}), lte: weekAgo }, participants: { none: { partyType: 'PARTICIPANT' } } }),
    count({ ...aGround, ...notStopped, checkIns: { some: { ...A_REAL_SESSION, ...recently } } }),
    /* Abandoned before value: made over a fortnight ago, someone besides the lead was added, no report went out, and no session has moved in a fortnight. */
    count({ ...aGround, createdAt: { ...(since ? { gte: since } : {}), lte: fortnightAgo }, participants: { some: { partyType: 'PARTICIPANT' } }, OR: [{ report: null }, { report: { releasedAt: null } }], checkIns: { none: { ...A_REAL_SESSION, ...recently } } }),
    /* Abandoned after value: the picture went out, and nothing has moved since. */
    count({ ...aGround, report: { releasedAt: { not: null, lte: fortnightAgo } }, checkIns: { none: { ...A_REAL_SESSION, ...recently } } }),
    prisma.$queryRaw`
      SELECT COUNT(*)::int AS n FROM (
        SELECT g.initiator_id FROM grounds g JOIN organizations o ON o.id = g.organization_id
        WHERE o.is_internal = false GROUP BY g.initiator_id HAVING COUNT(*) >= 2
      ) t`.then((r: any) => Number(r?.[0]?.n ?? 0)).catch(() => 0),
    prisma.notification.groupBy({
      by: ['outcome'],
      where: { channel: 'email', sender: { in: ENGAGEMENT_SENDERS }, ...inRange('createdAt', since) },
      _count: { id: true },
    }).catch(() => []),
  ]);
  const of = (names: string[]) => (outcomes as any[]).filter((r) => names.includes(r.outcome)).reduce((n, r) => n + (r._count?.id ?? 0), 0);
  /* The three ways a check-in stands now never overlap: active wins, then the two quiet ones; a test is a test and is taken out of both quiet ones. */
  const abandonedBefore = Math.max(0, beforeValueQuiet);
  return {
    since,
    reached: { created, peopleAdded, firstResponse, enoughToReport, firstInsight, leadActed: acted, secondRound },
    now: { test, abandonedBeforeValue: abandonedBefore, abandonedAfterValue: afterValueQuiet, active },
    leadsWhoCameBack: leads,
    participants: await theParticipantStages(prisma, since, now),
    emails: { delivered: of(['sent']), failed: of(['failed']), held: of(['held']), notSentOnPurpose: of(['suppressed']) },
  };
}
