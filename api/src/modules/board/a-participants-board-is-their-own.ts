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
  /* Whether the organisation has Release 1's sales board on: the rep's page draws what the lead's draws, from the same switch. */
  'releaseOneSalesBoard',
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

/**
 * Release 2's boards, served as they come: each is walled for this reader at its own read before it is put on the board (the
 * collections board: each person only the bills they follow up, the-collections-board.service; the matter board: each person
 * their own lines and only their own fee notes, the-matter-board.service). Listed here on purpose, so the default stays narrow.
 */
const WALLED_AT_THEIR_OWN_READ = ['collections', 'matter'] as const;

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
  for (const k of WALLED_AT_THEIR_OWN_READ) if (board[k]) out[k] = board[k];
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
      /* Their own lost deals only (Hafsah, 18 October: "A rep sees only their own lost deals"). */
      const lost = Array.isArray(sec.lost) ? sec.lost.filter((l: any) => l?.ownerParticipantId === me) : undefined;
      return { ...sec, rows, state: rows.length ? 'filled' : 'none-yet', onlyYours: ONLY_YOURS, ...(lost ? { lost } : {}) };
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

/*
 * A REP'S BOARD NEVER NAMES ANOTHER REP'S DEALS (Drop Access run 1, A9; switchboard.md, "A rep's board: ... never ... other reps'
 * deals"). Kevin's board read "One person is aiming to sell 30 units to Tuskys Westgate." in its aims, and "Greenfield Supermarket",
 * "Juja Hardware" and "Mama Pima Stores" in its places: Mercy's and Joseph's customers. On a sales check-in, a participant's board
 * keeps nothing that names a customer whose deal is somebody else's and not also theirs. A line in a list is left out; a wait the
 * reader is in stays, without the words about the other customer; a sentence on its own is not served. The frame (who is on the
 * check-in, its title) is never read for this. Applied after aParticipantsOwnBoard, on the board as served, so a section added
 * later is walled too.
 */
const THE_FRAME_IS_NOT_READ = new Set(['participants', 'title', 'groundId', 'myParticipantId', 'sections', 'phaseSpine', 'whoIsAway', 'waitingToBeLetIn']);

export function withoutOtherPeoplesDeals(board: Record<string, any>, me: string, othersDeals: readonly string[], namesIt: (text: string, deal: string) => boolean): Record<string, any> {
  if (!othersDeals.length) return board;
  const isMine = (o: any) => !!o && typeof o === 'object' && !Array.isArray(o) && (o.fromParticipantId === me || o.onParticipantId === me || o.ownerParticipantId === me || o.participantId === me);
  /*
   * Whether something names another person's customer. The reader's own rows inside it are not read for this: they are walled
   * field by field below. Amani's board lost its whole deal grid, her three deals with it, because her own "Mama Njeri Duka"
   * says "Duka", which starts Sade's "Duka Bora", and the section holding her rows was dropped as if it were Sade's (page audit,
   * 24 November, row 1). My work reads the same board, so it said "You have no deals on the board yet." too.
   */
  const named = (v: unknown): boolean => {
    if (typeof v === 'string') return othersDeals.some((d) => namesIt(v, d));
    if (Array.isArray(v)) return v.some(named);
    if (v && typeof v === 'object') return !isMine(v) && Object.values(v).some(named);
    return false;
  };
  /* What the reader's own row is (a wait's thing, a deal's customer) stays: it is theirs, whatever another customer's name it shares a word with. */
  const whatItIs = new Set(['what', 'id', 'name']);
  const walk = (v: any): any => {
    if (Array.isArray(v)) {
      return v.filter((x) => isMine(x) || !named(x)).map(walk);
    }
    if (v && typeof v === 'object') {
      const out: Record<string, any> = {};
      const mine = isMine(v);
      for (const [k, x] of Object.entries(v)) {
        if (typeof x === 'string') {
          /* In a wait the reader is in, what is waited for stays; another line naming somebody else's customer does not. */
          if (named(x) && !(mine && whatItIs.has(k))) { out[k] = null; continue; }
          out[k] = x;
        } else out[k] = walk(x);
      }
      return out;
    }
    return v;
  };
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(board)) out[k] = THE_FRAME_IS_NOT_READ.has(k) ? v : walk(v);
  return out;
}
