/**
 * EACH SESSION'S TEAM PICTURE IS RELEASED ON ITS OWN (decision 76, item 4, 2 October 2026).
 *
 * A report is one row per check-in, and every session's synthesis rewrites it. It was released
 * once, for the whole check-in: `releasedAt` was stamped at the first release and never again. So a
 * participant who could read session 1's picture went on reading the same row as it grew into
 * session 2, while session 2 had not been shared with anybody (the review of "Sales team, Q3",
 * request 111 d and 112 c).
 *
 * Hafsah chose the more private option: each session's picture is released on its own. The report
 * keeps which sessions have been released (`releasedSessions`), and whoever reads only what is
 * released (a participant, the person reviewed on an evaluation check-in included) reads the team's
 * picture of a released session only. Whoever runs the check-in, and an admin, read as before.
 *
 * This file holds the rule and its sentences, so the report, the session report, the rounds, the
 * check-in page, the list and the board all ask the same question the same way.
 */

/** The fields a read needs to answer "is this session released". */
export const WHAT_A_RELEASE_IS_READ_FROM = { releasedAt: true, releasedSessions: true } as const;

export type AReleasable = { releasedAt?: Date | string | null; releasedSessions?: number[] | null } | null | undefined;

/**
 * The sessions whose picture has been released, smallest first.
 *
 * Every stored report has the column: the migration that added it marked every report already
 * released as released for the sessions it held at its release, and every release since writes it.
 * A read that did not select the column gets null, and is treated as the report was before this
 * change (released as a whole once `releasedAt` is set), never as more than that.
 */
export function releasedSessionsOf(report: AReleasable): number[] | null {
  if (!report) return [];
  const list = (report as any).releasedSessions;
  if (!Array.isArray(list)) return null;
  return [...new Set(list.filter((n: unknown) => Number.isInteger(n) && (n as number) > 0) as number[])].sort((a, b) => a - b);
}

/** Whether the team's picture of this session has been released. */
export function isThisSessionReleased(report: AReleasable, sessionNumber: number): boolean {
  if (!report?.releasedAt) return false;
  const list = releasedSessionsOf(report);
  if (list === null) return true;
  return list.includes(sessionNumber);
}

/** The latest session whose picture has been released, or null when none has. */
export function theLatestReleasedSession(report: AReleasable, heldSession: number): number | null {
  if (!report?.releasedAt) return null;
  const list = releasedSessionsOf(report);
  if (list === null) return heldSession;
  return list.length ? list[list.length - 1] : null;
}

/**
 * THE SESSION THE STORED REPORT HOLDS NOW: the highest session anybody has finished. The report is
 * written again each time somebody finishes, so this is the session its picture has reached. The
 * same count `release()` has always used for "this round". A setup conversation is not a session.
 */
export async function theSessionTheReportHolds(prisma: any, groundId: string): Promise<number> {
  const r = await (prisma?.checkIn?.aggregate?.({
    where: { groundId, status: 'COMPLETED', isSetup: false },
    _max: { sessionNumber: true },
  }) ?? Promise.resolve(null)).catch(() => null);
  return (r?._max?.sessionNumber as number | null | undefined) ?? 1;
}

/**
 * WHETHER THE TEAM'S PICTURE AS IT STANDS NOW IS SHARED, for a reader who reads only what is
 * released. The board's `teamPicture.shared` asks exactly this: "Today's team picture is not shared
 * yet." until the session the report now holds has been released.
 */
export async function isTheTeamPictureNowShared(prisma: any, groundId: string, report: AReleasable): Promise<boolean> {
  if (!report?.releasedAt) return false;
  const list = releasedSessionsOf(report);
  if (list === null) return true;
  return list.includes(await theSessionTheReportHolds(prisma, groundId));
}

/** What releasing says back to the lead, before and after: the session, and who it goes to. */
export function whatReleasingThisSessionDoes(sessionNumber: number): string {
  return `This shares the team's picture of check-in ${sessionNumber} with everyone in the check-in.`;
}

/** What somebody who reads only what is released is told while a session's picture is not shared. */
export function thisSessionIsNotSharedYet(sessionNumber: number): string {
  return `The team's picture of check-in ${sessionNumber} is not shared yet.`;
}

/** And what they are told when they can read an earlier session's picture meanwhile. */
export function youAreReadingAnEarlierSession(released: number, held: number): string {
  return `You are reading the team's picture of check-in ${released}. The team's picture of check-in ${held} is not shared yet.`;
}

/** The sessions released, with this one added. */
export function withThisSessionReleased(report: AReleasable, sessionNumber: number): number[] {
  const list = releasedSessionsOf(report) ?? [];
  return [...new Set([...list, sessionNumber])].sort((a, b) => a - b);
}

/**
 * THE STORED REPORT, AS THE RELEASED SESSION HAD IT.
 *
 * The picture of a released session is the one kept when that session closed (`ReportRound`): its
 * shared picture, what people agreed on, where they differed, and the question it left. Everything
 * else on the stored row was written from later sessions too, so it is left out rather than shown
 * beside an older picture: the opening, the findings, the judgement, the closing read, the counts
 * table, the direction, the marks on its lines and every other read the row holds. Only each
 * person's own guide to the next conversation stays, which was written for them at the release.
 */
export function asTheReleasedSessionHadIt(report: any, kept: { sharedPicture: string; agreements: unknown; divergences: unknown; centralQuestion: string }) {
  const engagement = report?.engagement && typeof report.engagement === 'object' ? report.engagement : {};
  return {
    ...report,
    sharedPicture: kept.sharedPicture,
    agreements: kept.agreements,
    divergences: kept.divergences,
    centralQuestion: kept.centralQuestion,
    theOpening: null,
    findings: null,
    inferences: null,
    finalSynthesis: null,
    leadershipGaps: null,
    networkPicture: null,
    theJudgement: null,
    theTable: null,
    direction: null,
    arcSignals: null,
    engagement: engagement.postReportGuides ? { postReportGuides: engagement.postReportGuides } : null,
  };
}
