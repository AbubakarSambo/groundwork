/**
 * A PARTICIPANT'S BOARD IS THEIR OWN (request 105; the prototype's B5, board-as-participant.txt).
 *
 * The prototype shows a participant a narrow, personal board: "Your deals, day by day. Only yours.",
 * "Your share. ... Only you and Wairimu see your share.", and the team's picture held back until it
 * is shared ("Today's team picture isn't shared yet ... Your own report is ready now."). Ours sent a
 * participant every section a lead gets, minus the lead's own controls and judgement.
 *
 * THE DEFAULT IS WHAT CHANGES, NOT ONE FIELD. A participant is served only the fields listed here, so
 * a section added to the board tomorrow reaches a participant only when somebody adds it to this list
 * on purpose. Everything else a lead gets is not sent.
 *
 *  - THE FRAME: what the check-in is, its sessions, who is on it, when the board last changed.
 *  - THEIR OWN WORK, ROW BY ROW: only the rows that are theirs (their records, their commitments,
 *    their blockers and the ones waiting on them, their own targets and the team's, their share,
 *    what they have still to answer).
 *  - THE TEAM'S PICTURE, ONLY ONCE IT IS SHARED: the report's opening, where people differ and what
 *    the answers say, the headline question and where each team target stands (request 108), after the
 *    report has been released. Before that, one sentence saying so.
 *
 * WHO THIS IS FOR. A person who checks in and does not run the check-in. Never the lead, the admin who
 * set it up, or an admin of the organisation. The person reviewed on an evaluation check-in is left as
 * they are: their board was narrowed before this, by its own rules, and stays so.
 */

/** Always served: what the check-in is, and the reader's place in it. */
const THE_FRAME = [
  'groundId', 'renders', 'mode', 'family', 'peopleWorkTogether', 'sections', 'title', 'scenario', 'kindOfWork',
  'groundStatus', 'endState', 'coverageVariant', 'startingState', 'myParticipantId', 'canEditFrame', 'readOnlyNote',
  'lastChangedAt', 'participants', 'aTeamReportComes', 'whoIsAway', 'waitingToBeLetIn', 'phaseSpine', 'whyYouOnlySeeYourself', 'poll',
  'withheldUntilYouCheckIn', 'saying', 'reason', 'howItIsGoing',
] as const;

/** Served row by row: only the rows that carry the reader's own participant id. */
const ROWS_THAT_ARE_THEIRS = ['whoOwnsWhat', 'contribution', 'patterns'] as const;

/**
 * Built for this reader from their own rows only (the board's reader is narrowed to "only you" for a
 * participant before these are built), so they are served as they come: their own commitments, the
 * waits they are in, their own history.
 */
const BUILT_FROM_THEIR_OWN = ['risks', 'workPlan', 'timeline', 'personHistory', 'blockerCheck', 'evidenceIndex', 'obligations', 'whoWaitedOnWhom', 'contradictions'] as const;

/** The team's picture: served only once the report has been released to the people in it. */
const THE_TEAMS_PICTURE = ['divergence', 'whatTheAnswersSay', 'whatTheRoomIsAbout', 'whatTheRoomIsAboutNote', 'quickRead', 'forecast', 'headline'] as const;

/** The lead's own reads: always empty for a participant, said as nothing rather than left out. */
const THE_LEADS_OWN = ['theJudgement', 'theTable', 'overTime'] as const;

export const THE_TEAM_PICTURE_IS_NOT_SHARED_YET = "Today's team picture is not shared yet.";
export const YOUR_OWN_REPORT_IS_READY = 'Your own report is ready now.';
export const ONLY_YOURS = 'Only yours.';

export function aParticipantsOwnBoard(board: Record<string, any>, reader: { meId: string; released: boolean; hasOwnReport: boolean }): Record<string, any> {
  const out: Record<string, any> = {};
  const me = reader.meId;
  for (const k of THE_FRAME) if (k in board) out[k] = board[k];

  /* The opening is the team's picture too: held back until it is shared. */
  if (out.howItIsGoing && !reader.released) out.howItIsGoing = { ...out.howItIsGoing, latestSummary: null };

  for (const k of THE_LEADS_OWN) out[k] = null;
  for (const k of BUILT_FROM_THEIR_OWN) if (Array.isArray(board[k]) && board[k].length) out[k] = board[k];

  for (const k of ROWS_THAT_ARE_THEIRS) {
    if (!Array.isArray(board[k])) continue;
    const rows = board[k].filter((r: any) => r && r.participantId === me);
    if (rows.length) out[k] = rows;
  }

  /* Their own records: "Your deals, day by day. Only yours." */
  if (Array.isArray(board.workRecords)) {
    out.workRecords = board.workRecords.map((sec: any) => {
      if (!Array.isArray(sec.rows)) return sec;
      const rows = sec.rows.filter((r: any) => r?.ownerParticipantId === me);
      return { ...sec, rows, state: rows.length ? 'filled' : 'none-yet', onlyYours: ONLY_YOURS };
    });
  }

  /* Their own targets, and the team's, which are about nobody in particular. */
  if (Array.isArray(board.objectives)) out.objectives = board.objectives.filter((o: any) => !o?.ownerParticipantId || o.ownerParticipantId === me);
  /* Where each team target stands is the team's picture too (request 108 b): held back until it is shared. */
  if (Array.isArray(out.objectives) && !reader.released) out.objectives = out.objectives.map((o: any) => ('stands' in (o ?? {}) ? { ...o, stands: null } : o));
  if (board.yourShare) out.yourShare = board.yourShare;
  if (board.yourShareSays) out.yourShareSays = board.yourShareSays;

  /* What they are waiting on, and what is waiting on them. */
  const theirs = (d: any) => d && (d.fromParticipantId === me || d.onParticipantId === me);
  if (Array.isArray(board.blockers)) {
    const rows = board.blockers.filter(theirs);
    if (rows.length) out.blockers = rows;
  }
  if (Array.isArray(board.dependencies)) out.dependencies = board.dependencies.filter(theirs);

  /* What they themselves have still to answer. */
  if (Array.isArray(board.stillUnanswered)) {
    const rows = board.stillUnanswered.filter((r: any) => r?.who === 'You');
    if (rows.length) out.stillUnanswered = rows;
  }

  if (board.coverage) {
    const reads = Array.isArray(board.coverage.reads) ? board.coverage.reads.filter((r: any) => r?.participantId === me) : [];
    if (reads.length) out.coverage = { ...board.coverage, reads };
  }

  if (reader.released) {
    for (const k of THE_TEAMS_PICTURE) if (k in board) out[k] = board[k];
    out.teamPicture = { shared: true };
  } else {
    out.teamPicture = { shared: false, says: THE_TEAM_PICTURE_IS_NOT_SHARED_YET, yourOwnReport: reader.hasOwnReport ? YOUR_OWN_REPORT_IS_READY : null };
  }
  return out;
}
