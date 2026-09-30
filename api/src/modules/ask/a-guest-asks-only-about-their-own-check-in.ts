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
 * WHICH QUESTION IT IS. Read from the words, in a fixed order: a request to do something first, then
 * a question about anything outside the check-in, then the five, then a plain list of what can be
 * asked. A request is checked first so "add a to-do for my next check-in" is refused rather than
 * answered as a question about the next check-in.
 */

export type AGuestsQuestion = 'agreed' | 'stuck' | 'mine' | 'report' | 'next' | 'a_request' | 'outside' | 'help';

const A_REQUEST = /\b(remind me to|to-?dos?|objectives?|add|create|make (a|an|me)|set up|invite|send|schedule|assign|delete|remove|change|edit|book)\b/i;
const OUTSIDE = /\b(company|organi[sz]ation|other check-?ins?|other teams?|list of people|staff|departments?|payroll|everybody here|everyone here|who works here)\b/i;
const NEXT = /\b(next (check-?in|session)|when (is|do|does|will|can)\b.*\b(check-?in|session)|opens?\b.*\b(check-?in|session))\b/i;
const MINE = /\b(commit(ted|ment|ments)?( to)?|promised?|i said i would|i agreed to do|my actions?|what (do|should) i (need to |have to )?do)\b/i;
const AGREED = /\b(agree[ds]?|agreements?|settled|decided)\b/i;
const STUCK = /\b(stuck|blocked|blockers?|waiting|in the way|held up|holding (us|me|it) up|delayed)\b/i;
const REPORT = /\b(report|picture|summary|how is it going|how are we doing|where (do|does) (things|it) stand)\b/i;

export function whichQuestion(message: string): AGuestsQuestion {
  const m = message ?? '';
  if (A_REQUEST.test(m)) return 'a_request';
  if (OUTSIDE.test(m)) return 'outside';
  if (NEXT.test(m)) return 'next';
  if (MINE.test(m)) return 'mine';
  if (AGREED.test(m)) return 'agreed';
  if (STUCK.test(m)) return 'stuck';
  if (REPORT.test(m)) return 'report';
  return 'help';
}

/** Which reads each question needs, so a question about the next check-in never opens the report. */
export const NEEDS_THE_REPORT: Record<AGuestsQuestion, boolean> = {
  agreed: true, stuck: true, mine: true, report: true, next: false, a_request: false, outside: false, help: false,
};

/* ------------------------------------------------------------------------------------------------
 * What a guest reads. Plain sentences, the check-in named, the reader is "you".
 * ---------------------------------------------------------------------------------------------- */

export const A_GUEST_CANNOT_ASK_FOR_THINGS =
  'You are a guest here from another organisation, so Ask Groundwork cannot do things for you here, such as adding a to-do or changing a target. It can only answer questions about your own check-in.';
export const A_GUEST_ASKS_ONLY_ABOUT_THEIR_CHECK_IN =
  'You are a guest here from another organisation, so Ask Groundwork can only answer questions about your own check-in. It cannot tell you about this organisation, its people or its other check-ins.';
export const A_GUEST_WITH_NO_CHECK_IN =
  'You are not part of any open check-in here, so there is nothing Ask Groundwork can answer for you.';
export const A_GUEST_IN_MORE_THAN_ONE =
  'You take part in more than one check-in here. Choose the one you are asking about under About, and then ask again.';

export const whatAGuestCanAsk = (label: string) =>
  `I can answer questions about ${label}, the check-in you are part of here. You can ask me what you agreed, what is stuck, what you said you would do, when your next check-in is, or what the report says.`;

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
): Reply {
  const lane = `guest_${question}`;
  if (question === 'a_request') return rules(lane, text(A_GUEST_CANNOT_ASK_FOR_THINGS));
  if (question === 'outside') return rules(lane, text(A_GUEST_ASKS_ONLY_ABOUT_THEIR_CHECK_IN));
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
