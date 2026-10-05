import { askName } from '../assistant/ask-name';
import { rules, text, Reply } from '../assistant/a-reply-is-a-payload-not-a-string';
import { whenItWas } from '../../common/a-date-reads-the-same-everywhere';

/**
 * A GUEST ASKS ONLY ABOUT THEIR OWN CHECK-IN (decision 36).
 *
 * "Members who use Ask Groundwork may appear on their organisation's list of people. A guest from
 * another organisation is never added to the list. If a guest uses Ask Groundwork, it works only
 * within their own check-in."
 *
 * The assistant a member reaches answers one entry on the organisation's list at a time, with the
 * whole organisation in view: its to-dos, its objectives, its people, its other check-ins. None of
 * that is a guest's to read, and a guest has no entry. So a guest is not handed to it at all. They
 * get this instead: five questions, each answered from a read the product already serves to that
 * guest on their own check-in, and nothing else.
 *
 * WHAT EACH ANSWER IS BUILT FROM, AND WHY THAT IS THE WHOLE SAFETY OF IT.
 *
 *   what we agreed        the check-in's report, as served to this guest (ReportsService.get with
 *   what is stuck         their own account). That read already takes off the lead's judgement,
 *   what I said I'd do    everybody else's findings and commitments, and names people only as this
 *   what the report says  reader may read them. Here only four of its fields are ever looked at.
 *   my next check-in      their own check-ins on it (GroundsService.getMyCheckinStatus), which
 *                         refuses anybody who is not a party to it.
 *
 * No query here reads anything those two reads do not. No model is asked, so nothing can be
 * inferred beyond what the reads say. And nothing here writes to the host: a request to do
 * something is refused in plain words, not said back for a yes.
 *
 * WEEK 24 ADDS SIX MORE, each scoped the same way: what you said (your own lines on your own record),
 * what the check-in is for (what you were told, by the same function that tells a participant), who
 * reads what you say (said from the check-in's own kind, as the join page says it), what to do next
 * (from your own commitments only), and two changes to your own commitments, marking one done and
 * moving its day. A change is said back first and written only on a yes, as the week 18 lanes are, and
 * touches only a commitment the guest said themselves, in the check-in they are in. Nothing is read
 * here about the host organisation: no other check-in, no colleague's words, no directory, no company
 * page, no organisation memory and no suites.
 *
 * WHICH QUESTION IT IS. Read from the words, in a fixed order: a request to do something first, then
 * a question about anything outside the check-in, then the five, then a plain list of what can be
 * asked. A request is checked first so "add a to-do for my next check-in" is refused rather than
 * answered as a question about the next check-in.
 */

import { readAMove } from '../assistant/a-change-said-back-first';
import { GroundScenario } from '@prisma/client';
import { isEvaluationCheckIn } from '../reports/is-this-an-evaluation-check-in';

export type AGuestsQuestion =
  | 'agreed' | 'stuck' | 'mine' | 'report' | 'next' | 'a_request' | 'outside' | 'help'
  | 'said' | 'purpose' | 'who_reads' | 'next_step' | 'done' | 'move';

const A_REQUEST = /\b(remind me to|to-?dos?|objectives?|add|create|make (a|an|me)|set up|invite|send|schedule|assign|delete|remove|change|edit|book)\b/i;
const OUTSIDE = /\b(company|organi[sz]ation|other check-?ins?|other teams?|list of people|staff|departments?|payroll|everybody here|everyone here|who works here|colleagues?)\b/i;
/* The nouns that are certainly about somebody or something else. "The organisation" alone is not here, because "does the organisation read what I said" is about what they said. */
const SOMEBODY_ELSE = /\b(other check-?ins?|other teams?|list of people|staff|departments?|payroll|everybody here|everyone here|who works here|company|colleagues?)\b/i;
const NEXT = /\b(next (check-?in|session)|when (is|do|does|will|can)\b.*\b(check-?in|session)|opens?\b.*\b(check-?in|session))\b/i;
const NEXT_STEP = /\b(what (should|do|shall|can) i (do|start|work on|tackle)( first)? next|what('?s| is) next for me|where (should|do) i start|what should i (do|work on) (first|now|today))\b/i;
const MINE = /\b(commit(ted|ment|ments)?( to)?|promised?|i said i would|i agreed to do|my actions?|what (do|should) i (need to |have to )?do)\b/i;
const AGREED = /\b(agree[ds]?|agreements?|settled|decided)\b/i;
const STUCK = /\b(stuck|blocked|blockers?|waiting|in the way|held up|holding (us|me|it) up|delayed)\b/i;
const REPORT = /\b(report|picture|summary|how is it going|how are we doing|where (do|does) (things|it) stand)\b/i;
const SAID = /\b(what (did|have|had) i (say|said|tell|told|write|wrote|put)|what i (said|told|wrote)|my own words|what have i (said|told|shared)|what('?s| is) on my record)\b/i;
const PURPOSE = /\b(what is (this|the|my) check-?in (for|about)|what('?s| is) this (for|about)|why (am i|was i|are we) (in|asked|doing)|what (was|am) i (told|asked)|what was i told|purpose of (this|the) check-?in|what is (this|the) check-?in meant)\b/i;
const WHO_READS = /\b(who (reads?|sees?|can (see|read)|will (see|read)|gets? to (see|read)|has access)|what happens (with|to) (what|my|the|everything)|is (it|this|that|what i (say|said|write|wrote)) (private|confidential|secret|safe)|who is (reading|seeing)|(does|do|will|can|could) (the |my |this )?(organi[sz]ation|admins?|lead|manager|boss|others?|anyone|anybody|everyone|everybody|people in (this|the) check-?in) (see|read|get to (see|read))|how (is|are) (what i|my answers?|my words) (used|stored|kept))\b/i;
const TICK = [
  /\b(?:tick|cross|strike)\s+(?:off\s+)?(.{3,120}?)(?:\s+off)?\s*$/i,
  /^(?:done|finished|did)[:,]\s+(.{3,120})$/i,
  /\bmark\s+(.{3,120}?)\s+(?:as\s+)?done\s*$/i,
];

/** What a guest asked to be marked done, as the words they used; null when they did not ask for that. */
export function readAGuestsTick(message: string): string | null {
  for (const rx of TICK) {
    const m = rx.exec((message ?? '').trim().replace(/[.!]+$/, ''));
    if (m) return m[1].trim().replace(/^["“]|["”]$/g, '');
  }
  return null;
}

export function whichQuestion(message: string): AGuestsQuestion {
  const m = message ?? '';
  /* A change to their own commitment comes first: it is the one thing a guest may ask to be done. */
  if (readAMove(m)) return 'move';
  if (readAGuestsTick(m)) return 'done';
  if (A_REQUEST.test(m)) return 'a_request';
  if (WHO_READS.test(m) && !SOMEBODY_ELSE.test(m)) return 'who_reads';
  if (OUTSIDE.test(m)) return 'outside';
  if (NEXT_STEP.test(m)) return 'next_step';
  if (NEXT.test(m)) return 'next';
  if (SAID.test(m)) return 'said';
  if (PURPOSE.test(m)) return 'purpose';
  if (MINE.test(m)) return 'mine';
  if (AGREED.test(m)) return 'agreed';
  if (STUCK.test(m)) return 'stuck';
  if (REPORT.test(m)) return 'report';
  return 'help';
}

/** Which reads each question needs, so a question about the next check-in never opens the report. */
export const NEEDS_THE_REPORT: Record<AGuestsQuestion, boolean> = {
  agreed: true, stuck: true, mine: true, report: true, next: false, a_request: false, outside: false, help: false,
  said: false, purpose: false, who_reads: false, next_step: false, done: false, move: false,
};

/* ------------------------------------------------------------------------------------------------
 * What a guest reads. Plain sentences, the check-in named, the reader is "you".
 * ---------------------------------------------------------------------------------------------- */

export const A_GUEST_CANNOT_ASK_FOR_THINGS = (ask: string = askName(null)) =>
  `You are a guest here from another organisation, so ${ask} cannot do things for you here, such as adding a to-do or changing a target. It can answer questions about your own check-in, and it can mark one of your own commitments as done or move its day, once you say yes.`;
export const A_GUEST_ASKS_ONLY_ABOUT_THEIR_CHECK_IN = (ask: string = askName(null)) =>
  `You are a guest here from another organisation, so ${ask} can only answer questions about your own check-in, such as what you said, what you said you would do, what the check-in is for, who reads what you say, and when your next check-in is.`;
export const A_GUEST_WITH_NO_CHECK_IN = (ask: string = askName(null)) =>
  `You are not part of any open check-in here, so there is nothing ${ask} can answer for you.`;
export const A_GUEST_IN_MORE_THAN_ONE =
  'You take part in more than one check-in here. Choose the one you are asking about under About, and then ask again.';

export const whatAGuestCanAsk = (label: string) =>
  `I can answer questions about ${label}, the check-in you are part of here. You can ask me what you said, what you said you would do, what to do next, what the check-in is for, who reads what you say, what you agreed, what is stuck, when your next check-in is, or what the report says. I can also mark one of your own commitments as done, or move its day, after you say yes.`;

/** The four fields of the served report a guest's answers are built from. Nothing else is looked at. */
export interface TheReportAsServed {
  /** The served read's own answer when this reader may not see the picture yet. */
  withheld: string | null;
  opening: string | null;
  centralQuestion: string | null;
  agreements: string[];
  /** Their own, and only their own, commitments over time, as served. */
  mine: string[];
  /** What they are waiting on, or what is waiting on them, as served. */
  waiting: string[];
}

/**
 * THE ALLOWLIST. The served read has already taken off everything a participant may not read; this
 * takes four things from what is left, by name, so a field added to the report next year is never
 * reached from here even if the read forgets to take it off. Commitments and waits are narrowed
 * to this guest's own a second time, on the served object's own participant ids.
 */
export function fromTheServedReport(served: any, myParticipantId: string | null): TheReportAsServed {
  const s = served && typeof served === 'object' ? served : {};
  const sentence = (x: unknown): string | null => (typeof x === 'string' && x.trim() ? x.trim() : null);
  const titleOf = (x: unknown): string | null => {
    if (typeof x === 'string') return sentence(x);
    if (!x || typeof x !== 'object') return null;
    const o = x as Record<string, unknown>;
    for (const k of ['topic', 'title', 'area', 'summary', 'text']) {
      const v = sentence(o[k]);
      if (v) return v;
    }
    return null;
  };
  const overTime = s.overTime && typeof s.overTime === 'object' ? s.overTime : {};
  const commitments: any[] = Array.isArray(overTime.commitments) ? overTime.commitments : [];
  const dependencies: any[] = Array.isArray(overTime.dependencies) ? overTime.dependencies : [];
  const mine = !!myParticipantId;
  return {
    withheld: s.withheldUntilYouAnswer ? sentence(s.saying) : null,
    opening: sentence(s.theOpening) ?? sentence(s.sharedPicture),
    centralQuestion: sentence(s.centralQuestion),
    agreements: (Array.isArray(s.agreements) ? s.agreements : []).map(titleOf).filter(Boolean) as string[],
    mine: mine
      ? commitments.filter((c) => c && c.participantId === myParticipantId).map((c) => sentence(c.say)).filter(Boolean) as string[]
      : [],
    waiting: mine
      ? dependencies
        .filter((d) => d && (d.fromParticipantId === myParticipantId || d.onParticipantId === myParticipantId))
        .map((d) => sentence(d.say)).filter(Boolean) as string[]
      : [],
  };
}

const asASentence = (line: string) => (/[.!?]$/.test(line) ? line : `${line}.`);
const lines = (items: string[]) => items.map(asASentence).join('\n');

export const noReportYet = (label: string) =>
  `There is no report on ${label} yet. It is written once people have finished their check-ins.`;

/** One answer, from the reads the service made for it. */
export function answerAGuest(
  question: AGuestsQuestion,
  label: string,
  reads: { report?: TheReportAsServed | null; checkIns?: { sessionNumber: number; status: string; availableFrom: Date | string | null }[] },
  now: Date = new Date(),
  ask: string = askName(null),
): Reply {
  const lane = `guest_${question}`;
  if (question === 'a_request') return rules(lane, text(A_GUEST_CANNOT_ASK_FOR_THINGS(ask)));
  if (question === 'outside') return rules(lane, text(A_GUEST_ASKS_ONLY_ABOUT_THEIR_CHECK_IN(ask)));
  if (question === 'help') return rules(lane, text(whatAGuestCanAsk(label)));

  if (question === 'next') {
    const all = reads.checkIns ?? [];
    const waiting = all.find((c) => c.status === 'NOT_STARTED' || c.status === 'IN_PROGRESS');
    if (!waiting) {
      const done = all.filter((c) => c.status === 'COMPLETED').length;
      const sofar = done === 1 ? 'You have finished 1 check-in on it so far.' : `You have finished ${done} check-ins on it so far.`;
      return rules(lane, text(`There is no check-in waiting for you on ${label} now. ${sofar}`));
    }
    const opens = waiting.availableFrom ? new Date(waiting.availableFrom) : null;
    /* A check-in already started is open, whatever date it was first offered for (request 86). */
    if (opens && opens.getTime() > now.getTime() && waiting.status !== 'IN_PROGRESS') {
      return rules(lane, text(`Your next check-in on ${label} opens on ${whenItWas(opens, 'weekdayAndDay')}.`));
    }
    return rules(lane, text(waiting.status === 'IN_PROGRESS'
      ? `Your check-in on ${label} is open now, and you have already started it. You can carry on from the check-in page.`
      : `Your next check-in on ${label} is open now. You can start it from the check-in page.`));
  }

  const r = reads.report;
  if (!r) return rules(lane, text(noReportYet(label)));
  if (r.withheld) return rules(lane, text(r.withheld));

  if (question === 'agreed') {
    return rules(lane, text(r.agreements.length
      ? `The report on ${label} says you agree on these things.\n${lines(r.agreements)}`
      : `The report on ${label} does not show anything you all agree on yet.`));
  }
  if (question === 'mine') {
    return rules(lane, text(r.mine.length
      ? `This is what you said you would do in ${label}.\n${lines(r.mine)}`
      : `You have not said you would do anything specific in ${label} yet.`));
  }
  if (question === 'stuck') {
    return rules(lane, text(r.waiting.length
      ? `This is what is waiting in ${label}, for you or on you.\n${lines(r.waiting)}`
      : `In ${label}, you have not said you are waiting on anybody, and nobody has said they are waiting on you.`));
  }
  /* report */
  if (!r.opening) return rules(lane, text(noReportYet(label)));
  const q = r.centralQuestion ? `\nThe question it leaves for everybody is this one. ${asASentence(r.centralQuestion)}` : '';
  return rules(lane, text(`This is what the report on ${label} says.\n${r.opening}${q}`));
}

/* ------------------------------------------------------------------------------------------------
 * WEEK 24. What a guest says, is told, and may change, all within their own check-in.
 * ---------------------------------------------------------------------------------------------- */

/** One of the guest's own commitments, as read from their own row in this check-in. Nothing else about it is looked at. */
export interface TheirOwnCommitment { id: string; text: string; dueSaid: string | null; dueAt: Date | null; statedAt: Date }

const bare = (s: string) => s.trim().replace(/[.!]+$/, '');

/** What the guest said, as their own lines on their own record. Their words, never ours. */
export function whatTheySaid(label: string, lines: string[]): Reply {
  if (!lines.length) return rules('guest_said', text(`There is nothing from you on the record for ${label} yet. What you say in a check-in is added once you have finished it.`));
  return rules('guest_said', text(`This is what you said in ${label}, as it is on your record.\n${lines.map(asASentence).join('\n')}`));
}

/** What the guest was told about the check-in. It is the same sentence a participant is shown, or nothing but its name. */
export function whatTheCheckInIsFor(label: string, told: string | null): Reply {
  if (!told) return rules('guest_purpose', text(`You were not given anything more about ${label} than its name. If you want to know more, ask the person who invited you.`));
  return rules('guest_purpose', text(`This is what you were told about ${label}.\n${asASentence(told)}`));
}

/**
 * WHO READS WHAT THE GUEST SAYS, in the product's own plain words, the same ones the join page says
 * (InvitePage, "Who can read what you write"). The admins sentence is added only when it is true of
 * this kind of check-in, and left out where the kind is not known, which is the more private reading.
 * Nothing here is looked up about the host organisation: only the kind of check-in is read.
 */
export function whoReadsWhatTheySay(label: string, scenario: GroundScenario | null | undefined, ask: string = askName(null)): Reply {
  const admins = !scenario || isEvaluationCheckIn(scenario)
    ? ''
    : ' Admins of the organisation that runs this check-in can read every check-in.';
  return rules('guest_who_reads', text(
    `The people in ${label}, including the person who runs it, can see what you say in it.${admins} Your own report and your questions to ${ask} stay private. `
    + 'What you say is used to build the shared picture for this check-in and nothing else, and it does not train a model. '
    + 'Your answers are stored on our servers, and they are processed by Google\'s models to build the record.',
  ));
}

/** One thing to do next, from the guest's own commitments alone. Nobody else's wait or work is read. */
export function whatTheyShouldDoNext(label: string, open: TheirOwnCommitment[], now: Date = new Date()): Reply {
  if (!open.length) return rules('guest_next_step', text(`You have not said you would do anything in ${label} that is still open, so I have nothing to put first.`));
  const byDate = (a: TheirOwnCommitment, b: TheirOwnCommitment) =>
    a.dueAt && b.dueAt ? a.dueAt.getTime() - b.dueAt.getTime() : a.dueAt ? -1 : b.dueAt ? 1 : a.statedAt.getTime() - b.statedAt.getTime();
  const late = open.filter((c) => c.dueAt && c.dueAt.getTime() < now.getTime()).sort(byDate);
  const first = late[0] ?? [...open].sort(byDate)[0];
  const when = first.dueAt ? whenItWas(first.dueAt, 'dayAndMonthLong') : first.dueSaid?.trim() || null;
  const why = late[0]
    ? `You said you would do it${when ? ` by ${when}` : ''}, and the day you gave has passed. Either do it, or tell the others when it will happen.`
    : `You said you would do it${when ? `, and you said ${first.dueAt ? `by ${when}` : when}` : ''}.`;
  const left = open.length - 1;
  const rest = left > 0 ? ` After that, ${left === 1 ? 'one more thing is' : `${left} more things are`} still open in ${label}. Ask me what you said you would do to see them.` : '';
  const text1 = `Start with "${first.text.trim()}"${/[.!?]$/.test(first.text.trim()) ? '' : '.'} ${why}${rest}`;
  return rules('guest_next_step', text(`${text1}\n\nThis is from the commitments you have made in ${label}.`));
}

export const NOTHING_OF_THEIRS_TO_CHANGE = (label: string) =>
  `You have not said you would do anything in ${label} that is still open, so there is nothing of yours to change.`;
