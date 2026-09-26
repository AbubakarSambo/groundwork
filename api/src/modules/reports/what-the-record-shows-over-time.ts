/**
 * THE LONGITUDINAL READ: WHAT THE RECORD SHOWS ACROSS EVERY SESSION, WRITTEN BY THE PRODUCT.
 *
 * Hafsah, 24 September 2026, on what a founder must be able to read before deciding about somebody:
 * goal, commitments, actions, evidence, progress, dependencies, patterns, gaps, contradictions,
 * unresolved issues, and the questions to clarify first. Measured against a live three-month
 * engagement, the report filled seven of those eleven and three came back empty - dependencies,
 * patterns and gaps - while the facts behind all three sat in tables the report never read.
 *
 * WHY THEY WERE EMPTY, AND IT IS NOT THE MODEL BEING LAZY. `networkPicture` is the hundred-account
 * read and correctly does not run for two people. `leadershipGaps` is a field the SYNTHESIS PROMPT
 * asks a model to route findings into, with its own instruction warning that "leadership findings
 * placed in divergences are lost" - and that is exactly what happened: both real findings went into
 * divergences, so the gaps section was empty on the one engagement that was entirely about a gap.
 * A section that exists only if a model remembers to route into it is a section that is sometimes
 * missing, and a founder cannot tell the difference between "nothing to report" and "not routed".
 *
 * SO THIS IS ARITHMETIC OVER ROWS AND NOTHING ELSE. Commitments made in check-ins, dependencies
 * between named people, pattern detections with their period history, and what the role was said to
 * be. No model is asked and no model can soften it. Where there is nothing, it says so in the same
 * words every time, which is what makes an empty section readable.
 *
 * AND IT IS NOT A VERDICT. Every line is a fact with the sessions it came from attached. "Said in
 * fortnight one, restated in three sessions, still open" is a countable thing about a promise. "He
 * is unreliable" is a judgement about a person, and this file does not produce one.
 */

export interface ACommitmentOverTime {
  participantId: string | null;
  who: string;
  what: string;
  /** Their own words for when. Never parsed into a date. */
  when: string | null;
  statedInSession: number | null;
  restatedIn: number[];
  status: string;
  /** Whether they said it themselves, or the lead said they would. */
  theySaidIt: boolean;
  /** The product's sentence about it, sessions and all. */
  say: string;
}

export interface ADependencyOverTime {
  what: string;
  from: string;
  fromParticipantId: string | null;
  /** The person it is on, where that is somebody in this check-in. */
  on: string | null;
  onParticipantId: string | null;
  sessionsWaiting: number | null;
  /**
   * Whether anybody went back about it after they first said they were waiting.
   *
   * Called `chased` and not `escalated` because this object is served whole. `overTime` is dumped
   * into the report and the board as it stands, so every key in it is on a page somebody reads, and
   * "escalated" is exactly the management word the wording rules ban. The row it comes from is
   * still `escalatedAt` in the database; this is the name it is read under.
   */
  chased: boolean;
  status: string;
  say: string;
}

export interface APatternOverTime {
  participantId: string;
  who: string;
  code: string;
  name: string;
  observation: string;
  seenInSessions: number[];
  consecutive: number;
  status: string;
  /** Whether it reached the floor, and by which count. */
  say: string;
}

export interface AGapOverTime {
  participantId: string;
  who: string;
  /** What the role was said to be, in the words somebody wrote. */
  expected: string;
  /** What the record holds about it: checkable lines, evidence, who moved it. */
  recordHolds: string;
  say: string;
}

export interface WhatTheRecordShowsOverTime {
  sessions: number;
  commitments: ACommitmentOverTime[];
  dependencies: ADependencyOverTime[];
  patterns: APatternOverTime[];
  gaps: AGapOverTime[];
  /** Named by somebody, never closed by anybody. */
  stillOpen: string[];
  /** What a reader may not conclude from any of it. */
  cannotTellYou: string[];
  /** What to settle before deciding anything about anybody. Questions, never conclusions. */
  toSettleFirst: string[];
}

export const NOTHING_OF_THIS_KIND = {
  commitments: 'Nobody has said they would do anything specific in a check-in yet.',
  dependencies: 'Nobody here has said they are waiting on anybody.',
  patterns: 'Nothing has been observed often enough to be a pattern.',
  gaps: 'No role here was defined, so there is nothing to read the record against.',
  stillOpen: 'Nothing was left open.',
};

/* ------------------------------------------------------------------------------------------------
 * COMMITMENTS - what somebody said they would do, and what happened to it
 * ---------------------------------------------------------------------------------------------- */

export interface ACommitmentRow {
  participantId: string | null;
  text: string;
  whenSaid: string | null;
  explicit: boolean;
  status: string;
  source: string;
  statedInSession: number | null;
  saidAgainIn: number[];
}

export function commitmentsOverTime(
  rows: ACommitmentRow[],
  labelOf: (participantId: string | null) => string,
  sessionsSoFar: number,
): ACommitmentOverTime[] {
  return (rows ?? []).map((c) => {
    const restatedIn = [...(c.saidAgainIn ?? [])].sort((a, b) => a - b);
    const stated = c.statedInSession ?? null;
    const open = String(c.status).toUpperCase() === 'UNKNOWN';
    const sessionsOpen = stated !== null ? Math.max(0, sessionsSoFar - stated) : null;

    const parts: string[] = [];
    if (stated !== null) parts.push(`said in session ${stated}`);
    else if (c.source === 'PASTE') parts.push('from what the lead pasted in');
    if (c.whenSaid) parts.push(`by their own timing, "${c.whenSaid}"`);
    if (restatedIn.length) {
      parts.push(`said again in ${restatedIn.length === 1 ? `session ${restatedIn[0]}` : `sessions ${restatedIn.join(', ')}`}`);
    }
    if (!open) parts.push(`somebody marked it ${String(c.status).toLowerCase()}`);
    else if (sessionsOpen !== null && sessionsOpen > 0) parts.push(`open ${sessionsOpen} ${sessionsOpen === 1 ? 'session' : 'sessions'}, nobody has said whether it happened`);
    else parts.push('nobody has said whether it happened');
    if (!c.explicit) parts.push('the lead said they would, not them');

    return {
      participantId: c.participantId,
      who: labelOf(c.participantId),
      what: c.text,
      when: c.whenSaid ?? null,
      statedInSession: stated,
      restatedIn,
      status: c.status,
      theySaidIt: !!c.explicit,
      say: `${labelOf(c.participantId)}: "${c.text}" - ${parts.join('; ')}.`,
    };
  });
}

/**
 * THE ONES WORTH A FOUNDER'S EYE FIRST: open, and either old or said more than once.
 *
 * Not a ranking of people. A commitment restated three times and never closed is the single most
 * checkable thing in a record, whoever it belongs to.
 */
export function theOnesStillOpen(all: ACommitmentOverTime[]): ACommitmentOverTime[] {
  return all
    .filter((c) => String(c.status).toUpperCase() === 'UNKNOWN')
    .sort((a, b) => (b.restatedIn.length - a.restatedIn.length) || ((a.statedInSession ?? 99) - (b.statedInSession ?? 99)));
}

/* ------------------------------------------------------------------------------------------------
 * DEPENDENCIES - who is waiting on whom, in sessions rather than weeks
 * ---------------------------------------------------------------------------------------------- */

export interface ADependencyRow {
  what: string;
  fromParticipantId: string;
  onParticipantId: string | null;
  onLabel: string | null;
  status: string;
  escalatedAt: Date | null;
  /** The session the person was in when they first said it. */
  statedInSession?: number | null;
}

export function dependenciesOverTime(
  rows: ADependencyRow[],
  labelOf: (participantId: string | null) => string,
  sessionsSoFar: number,
): ADependencyOverTime[] {
  return (rows ?? [])
    .filter((d) => String(d.status).toUpperCase() !== 'CLEARED')
    .map((d) => {
      const on = d.onParticipantId ? labelOf(d.onParticipantId) : (d.onLabel ?? null);
      const from = labelOf(d.fromParticipantId);
      const stated = d.statedInSession ?? null;
      const sessionsWaiting = stated !== null ? Math.max(0, sessionsSoFar - stated) : null;
      /*
       * FULL SENTENCES, ONE IDEA EACH, AND NOT A ROW OF FRAGMENTS JOINED BY SEMICOLONS.
       *
       * This line was the single most-repeated thing the product wrote. It appears on every
       * dependency of every report and board, and again in `stillOpen`, and it read:
       *
       *   Femi Okonkwo is waiting on Ngozi Eze for "their bank statements"; 2 sessions; nothing on
       *   record about escalating it; this is work Ngozi Eze owes Femi Okonkwo, not the other way
       *   round.
       *
       * Two problems, both of them the wording rules. "Escalating" is management jargon, and it was
       * on the page 163 times in one twenty-four-scenario run - more than every other banned word
       * put together. And the semicolons are the clipped shape the rules ban: four fragments where
       * three sentences say the same thing and read like a person wrote them.
       */
      const howLong = sessionsWaiting !== null && sessionsWaiting > 0
        ? ` for ${sessionsWaiting} ${sessionsWaiting === 1 ? 'session' : 'sessions'} now`
        : '';
      const sentences = [
        `${from} is waiting on ${on ?? 'somebody outside this check-in'} for "${d.what}"${howLong}.`,
        d.escalatedAt
          ? 'Somebody went back about it after that.'
          : 'Nothing on record says anybody has chased it since.',
      ];
      /*
       * THE DIRECTION IS THE FINDING, AND IT IS SAID PLAINLY BECAUSE IT KEEPS BEING READ BACKWARDS.
       * A lead waiting on somebody inside the check-in is not a lead with a communication problem.
       */
      if (d.onParticipantId) sentences.push(`This is work ${on} owes ${from}, not the other way round.`);
      return {
        what: d.what,
        from,
        fromParticipantId: d.fromParticipantId,
        on,
        onParticipantId: d.onParticipantId,
        sessionsWaiting,
        chased: !!d.escalatedAt,
        status: d.status,
        say: sentences.join(' '),
      };
    });
}

/* ------------------------------------------------------------------------------------------------
 * PATTERNS - the period history, said out loud
 * ---------------------------------------------------------------------------------------------- */

export interface APatternRow {
  participantId: string;
  code: string;
  observationText: string | null;
  seenInSessions: number[];
  periodsObserved: number;
  lastPeriodNumber: number | null;
  status: string;
}

export function patternsOverTime(
  rows: APatternRow[],
  nameOf: (code: string) => string,
  labelOf: (participantId: string | null) => string,
  sessionsSoFar: number,
): APatternOverTime[] {
  return (rows ?? [])
    .filter((p) => (p.observationText ?? '').trim())
    .map((p) => {
      const seen = [...(p.seenInSessions ?? [])].sort((a, b) => a - b);
      const howMany = seen.length || p.periodsObserved || 1;
      const surfaced = String(p.status).toUpperCase() === 'SURFACED';
      const where = seen.length ? `sessions ${seen.join(', ')}` : `${howMany} ${howMany === 1 ? 'session' : 'sessions'}`;
      const consecutive = p.periodsObserved >= 3 ? ', consecutively' : seen.length >= 3 ? ', not consecutively' : '';
      const say = surfaced
        ? `Seen in ${where} of ${sessionsSoFar}${consecutive}. Enough sessions to be a pattern rather than an incident.`
        : `Seen in ${where} of ${sessionsSoFar}. One or two sessions of something is not yet a pattern, and it is here so a reader can see what it was.`;
      return {
        participantId: p.participantId,
        who: labelOf(p.participantId),
        code: p.code,
        name: nameOf(p.code),
        observation: (p.observationText ?? '').trim(),
        seenInSessions: seen,
        consecutive: p.periodsObserved,
        status: p.status,
        say,
      };
    })
    .sort((a, b) => (b.status === 'SURFACED' ? 1 : 0) - (a.status === 'SURFACED' ? 1 : 0) || b.seenInSessions.length - a.seenInSessions.length);
}

/* ------------------------------------------------------------------------------------------------
 * GAPS - the role as somebody wrote it, against what the record holds
 * ---------------------------------------------------------------------------------------------- */

export interface APersonsRecord {
  participantId: string;
  label: string;
  /** The role, in the words the lead used. Empty where nobody defined one. */
  expected: string;
  /** Lines taken from what they said. */
  lines: number;
  /** Of those, the ones with a name, a number or a date in them. */
  checkable: number;
  /** Of those, the ones a document backs. */
  documented: number;
  /** Open commitments of their own. */
  openCommitments: number;
  /** Things other people here are waiting on THEM for, uncleared. */
  owedToOthers: number;
  sessions: number;
}

export function gapsOverTime(people: APersonsRecord[]): AGapOverTime[] {
  return (people ?? [])
    .filter((p) => (p.expected ?? '').trim())
    .map((p) => {
      const holds = [
        `${p.sessions} ${p.sessions === 1 ? 'session' : 'sessions'} on record`,
        `${p.lines} ${p.lines === 1 ? 'line' : 'lines'} of what they said`,
        `${p.checkable} with a name, a number or a date in them`,
        `${p.documented} backed by a document`,
      ];
      if (p.openCommitments) holds.push(`${p.openCommitments} of their own commitments still open`);
      if (p.owedToOthers) holds.push(`${p.owedToOthers} ${p.owedToOthers === 1 ? 'thing' : 'things'} somebody else here is waiting on them for`);
      /*
       * THE SENTENCE IS THE COMPARISON AND NOT A CONCLUSION FROM IT. What the role was said to be,
       * and what the record holds. A reader draws the conclusion; that is the whole point of
       * putting the two next to each other.
       */
      /*
       * AND THE ROLE NAME IS NOT A DESCRIPTION OF THE ROLE.
       *
       * First run of this section printed "Government Liaison Consultant was taken on for:
       * Government Liaison Consultant", because `roleAsDescribed` is a job title and the sentence
       * assumed it was a remit. Where the only thing on record is the title, the sentence says so
       * plainly instead of reading it back as though it explained anything.
       */
      const expected = p.expected.trim();
      const titleOnly = expected.toLowerCase().replace(/[.\s]+$/, '') === p.label.toLowerCase().replace(/[.\s]+$/, '')
        || expected.split(/\s+/).length <= 5;
      const ended = /[.!?]$/.test(expected) ? expected : `${expected}.`;
      return {
        participantId: p.participantId,
        who: p.label,
        expected,
        recordHolds: holds.join(', '),
        say: titleOnly
          ? `${p.label} is down as "${expected.replace(/[.\s]+$/, '')}" and nothing on record says what that covers. What the record holds: ${holds.join(', ')}.`
          : `${p.label} was taken on for: ${ended} What the record holds about it: ${holds.join(', ')}.`,
      };
    });
}

/* ------------------------------------------------------------------------------------------------
 * AND WHAT NONE OF IT CAN TELL A READER
 * ---------------------------------------------------------------------------------------------- */

export function whatThisCannotTellYou(o: {
  documentsAttached: number;
  peopleWhoAnswered: number;
  peopleInvited: number;
  anybodyAskedWhoArrangedThings: boolean;
}): string[] {
  const out: string[] = [];
  if (!o.documentsAttached) {
    out.push('Nothing here is backed by a document. Every line is what somebody said, and none of it has been checked against anything outside this check-in.');
  }
  if (o.peopleWhoAnswered < o.peopleInvited) {
    out.push(`${o.peopleInvited - o.peopleWhoAnswered} of ${o.peopleInvited} people have not given their account, so anything about them is missing rather than absent.`);
  }
  if (!o.anybodyAskedWhoArrangedThings) {
    out.push('Nobody on record has said who arranged the meetings that happened, so this cannot tell you who secured them.');
  }
  out.push('Most of what anybody did is not in here. This is what was said in the sessions, and nothing else.');
  return out;
}

/**
 * WHAT TO SETTLE BEFORE DECIDING ANYTHING, WRITTEN BY THE PRODUCT.
 *
 * She asked for this by name: "questions for the founder - what the founder should clarify before
 * making a decision". What the report had was one model-written central question, and on the
 * engagement that was entirely about a consultant who secured nothing, it asked: "what was the
 * single most useful action that led to the meeting with the Permanent Secretary's office" - a
 * meeting the client's own team had arranged, handed to him as an achievement.
 *
 * These come from rows instead, so they are the same questions every time the same facts are true.
 * Every one is answerable by a person in a sentence, and not one of them contains a conclusion.
 */
export function toSettleFirst(o: {
  commitments: ACommitmentOverTime[];
  dependencies: ADependencyOverTime[];
  patterns: APatternOverTime[];
  documentsAttached: number;
  anybodySaidWhoArrangedThings: boolean;
}): string[] {
  const out: string[] = [];

  const restated = theOnesStillOpen(o.commitments).filter((c) => c.restatedIn.length >= 2);
  if (restated.length) {
    const first = restated[0];
    out.push(`"${first.what}" has been said again in ${first.restatedIn.length} sessions and nobody has said whether it happened. Ask ${first.who} what it is waiting on, and decide whether it is still wanted.`);
  }

  const inside = o.dependencies.filter((d) => !d.chased && d.onParticipantId);
  if (inside.length) {
    out.push(`${inside.length === 1 ? 'One thing is' : `${inside.length} things are`} waiting on somebody in this check-in, and nothing on record says anybody has gone back about it. Ask whether it was raised outside the sessions, because the record cannot tell you.`);
  }

  const outside = o.dependencies.filter((d) => !d.onParticipantId && !d.chased);
  if (outside.length) {
    out.push(`${outside.length === 1 ? 'One thing is' : `${outside.length} things are`} waiting on somebody outside this check-in, and nothing on record says anybody has chased it. Ask what has been tried beyond writing to them.`);
  }

  if (!o.anybodySaidWhoArrangedThings) {
    out.push('Nobody on record has said who arranged the meetings that happened. Ask who secured each one before crediting anybody with them.');
  }

  if (!o.documentsAttached) {
    out.push('Nothing here is backed by a document. Ask for one thing in writing that you could check yourself.');
  }

  const surfaced = o.patterns.filter((p) => String(p.status).toUpperCase() === 'SURFACED');
  for (const p of surfaced.slice(0, 2)) {
    out.push(`${p.observation} Seen in ${p.seenInSessions.length} sessions. Ask ${p.who} what they have changed about it since the first time.`);
  }

  const noRole = o.commitments.length === 0;
  if (noRole) out.push('Nobody has said in a check-in what they would do next. Ask for one thing, with a date, from each person.');

  return out;
}

export function theRecordOverTime(o: {
  sessions: number;
  commitments: ACommitmentOverTime[];
  dependencies: ADependencyOverTime[];
  patterns: APatternOverTime[];
  gaps: AGapOverTime[];
  stillOpen: string[];
  cannotTellYou: string[];
  toSettleFirst: string[];
}): WhatTheRecordShowsOverTime {
  return {
    sessions: o.sessions,
    commitments: o.commitments,
    dependencies: o.dependencies,
    patterns: o.patterns,
    gaps: o.gaps,
    stillOpen: o.stillOpen,
    cannotTellYou: o.cannotTellYou,
    toSettleFirst: o.toSettleFirst,
  };
}

/**
 * AND A PARTICIPANT SEES ONLY THEIR OWN ROWS OF IT.
 *
 * Caught on a four-person sales ground, 24 September 2026, in the same session this section was
 * built. The board gates it correctly (`overTime: isInitiator ? ... : null`), and the REPORT does
 * not - the read returns the whole row - so a relationship officer opening his own report found
 * this in it:
 *
 *   "Relationship officer, Ikeja. Target 14 approved facilities this quarter. is waiting on the
 *    credit committee and the Head of Credit for the eleven complete files"
 *
 * That is his colleague's pipeline, her escalation and her label, on his page. On a four-person
 * team the role label names her as surely as her name would. Every other read in this file was
 * built for the lead, who may see all of it; nothing narrowed it for anybody else.
 *
 * WHAT A PARTICIPANT KEEPS. What they themselves said they would do, and what they themselves are
 * waiting on, because those are their own words coming back. Everything that is a read ABOUT people
 * - the patterns, the role-against-record gaps, the questions for the lead to settle, the list of
 * what is still open across everybody - is the lead's, and a participant gets none of it.
 *
 * FAIL CLOSED ON AN UNKNOWN READER. No participantId means no rows, not all rows.
 */
export function overTimeForThisReader(
  it: WhatTheRecordShowsOverTime | null | undefined,
  viewer: { isLead: boolean; participantId: string | null },
): WhatTheRecordShowsOverTime | null {
  if (!it) return null;
  if (viewer.isLead) return it;
  const mine = viewer.participantId;
  if (!mine) return null;
  return {
    sessions: it.sessions,
    commitments: (it.commitments ?? []).filter((c) => c.participantId === mine),
    dependencies: (it.dependencies ?? []).filter((d) => d.fromParticipantId === mine || d.onParticipantId === mine),
    /* Reads about people, all of them the lead's. */
    patterns: [],
    gaps: [],
    stillOpen: [],
    toSettleFirst: [],
    /* What none of it can tell anybody is true for every reader, and identifies nobody. */
    cannotTellYou: it.cannotTellYou ?? [],
  };
}
