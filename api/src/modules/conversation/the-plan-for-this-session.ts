/**
 * THE PLAN FOR THIS SESSION, WRITTEN BEFORE THE FIRST QUESTION.
 *
 * Hafsah, 20 September 2026: "load the context into Gemini, so it sees the scenario, where things are
 * likely to go, and then kick off the conversation. It should also know the role and the likely
 * coaching paths and likely behavioural patterns."
 *
 * Three adversarial runs said why. The model's judgement in the moment is good; what it cannot do
 * is hold a hundred thousand characters of rules, record and transcript in even attention on every
 * turn, so it chose its opener by reflex, lost the thread, asked the same thing three times and
 * closed without the thing the session was for. A good interviewer reads the file before the
 * meeting and decides what this conversation has to get. So does this.
 *
 * One model call at the start of each session reads everything the product already holds about
 * this person - the brief, their role and its map, the record from earlier sessions, what does not
 * add up, what this session owes, the patterns seen and the coaching step in play, how they have
 * tended to answer - and writes a plan as a tool call: the one thing this session must establish,
 * the questions in order, what to watch for with this person and what to do if it shows, the
 * coaching path, when it is done, and what not to ask. Every turn then gets the plan as a short
 * block at the top, with each planned question marked asked, answered or declined by the coverage
 * read (what-this-session-has-covered), so the model sees where it is instead of re-deriving it.
 *
 * The plan is context, never a script. The model writes every sentence and follows the person
 * where they go; the plan says what matters for this person before it starts. Nothing in the plan
 * is a fact the record does not hold: the planner is told what it has and told to invent nothing.
 */
import { THE_BRIEF_IS_CONTEXT_ONLY } from './the-leads-brief-is-never-quoted-to-them';
import type { RoleMap } from '../board/role-maps';
import { sayWhatHasBeenCovered, whatThisSessionHasCovered, type ATurnInSession } from './what-this-session-has-covered';

export interface ThePlan {
  /** The one thing this session has to establish, in the product's words. */
  mustEstablish: string;
  /** The first line, before any question: what this session is about, in one sentence to the person. */
  openWith: string;
  /** Three to five, in order. `why` is for the model, not the person. */
  questions: { ask: string; why: string }[];
  /** Behaviours to watch for with this person, from their own record and the role map, and what to do if seen. */
  watchFor: { pattern: string; ifSeen: string }[];
  /** The coaching path, where there is one: what the record shows and what to coach toward. Null when nothing has recurred. */
  coachingPath: { noticed: string; toward: string; move: string } | null;
  /** What has to be on the record for this session to be done. */
  doneWhen: string;
  /** Things not to ask this person this session, with the reason. */
  doNotAsk: string[];
}

export const PLAN_TOOL = {
  name: 'the_plan',
  description: 'The plan for one check-in session with one person, written before the first question, from the record.',
  input_schema: {
    type: 'object',
    properties: {
      mustEstablish: { type: 'string' },
      openWith: { type: 'string' },
      questions: { type: 'array', items: { type: 'object', properties: { ask: { type: 'string' }, why: { type: 'string' } }, required: ['ask', 'why'] } },
      watchFor: { type: 'array', items: { type: 'object', properties: { pattern: { type: 'string' }, ifSeen: { type: 'string' } }, required: ['pattern', 'ifSeen'] } },
      coachingPath: { type: 'object', properties: { noticed: { type: 'string' }, toward: { type: 'string' }, move: { type: 'string' } }, required: ['noticed', 'toward', 'move'] },
      doneWhen: { type: 'string' },
      doNotAsk: { type: 'array', items: { type: 'string' } },
    },
    required: ['mustEstablish', 'openWith', 'questions', 'watchFor', 'doneWhen', 'doNotAsk'],
  } as any,
};

export const PLAN_PROMPT = `You are preparing ONE check-in conversation before it starts. You will run it afterwards, one turn at a time, and the plan you write now is what you will read at the top of every turn. Write it for yourself.

You are given everything the product holds about this person and this session. Use all of it and invent nothing: every fact in the plan must come from what you are given, and where the record is thin, the plan says what to find out, not what is probably true.

WHAT TO WRITE
- mustEstablish: the one thing this session has to establish for this person, given the situation, their role, the record so far and what does not add up. One sentence. If the record shows a gap between what they said this was for and what they report, or two numbers for one target, that is usually it.
- openWith: the first line, to the person, one sentence, plain, in their situation's terms. It says what this conversation is about and picks up from their own last words where there are any. No greeting words, no "hope you are well", no question mark: the first question is separate.
- questions: three to five, in the order they should come, each in the words you would say to this person. ONE question per item, one question mark, under twenty-five words: a question with two parts is two items or one of them goes. Each one earns its place: about their own work, their own numbers, their own words on record. Put the one that tests mustEstablish early. Nothing generic; nothing the record has already answered; never the scenario's guidance copied out.
- watchFor: two to four behaviours, in behaviour words not labels ("answers a question about the number with a statement about repayments", "says 'the north' when asked for a region"), taken from how this person answered before and from the role map's going-wrong signals. For each, what to do if it shows, in one line.
- coachingPath: ONLY when you were given a BEHAVIOUR SEEN section or a COACHING STEP for this person. What was noticed (from that section, not from the role map's list of risks), what to coach toward (the role map's success signal), the one move for this session. With neither section, leave coachingPath out entirely: a "potential" is not a path.
- doneWhen: what must be on the record at the close: the specific things, with a number or a date where one is possible.
- doNotAsk: things not to ask this person this session, each with its reason: declined before, asked twice before, not this role's business, already on record, a one-time session that owes no commitments.

RULES
- The person's words are quoted as they said them, marked as theirs. Nothing is attributed to them that they did not say.
- The lead's brief is an instruction to the product. Never treat it as this person's position.
- Numbers said about one person stay with that person. A number set for the whole check-in is everybody's together: its count is never this person's standing, never "they are at N71m", never a gap between it and their own number. Only a target with this person's name on it is theirs.
- Plain, direct English. No jargon, no "record", no "session", no scores, no verdicts on the person.
- Answer by calling the_plan. Nothing else.`;

/* ------------------------------------------------------------------------------------------------ */

export interface WhatThePlannerGets {
  scenarioLabel: string;
  pack: string;
  sessionNumber: number;
  sessionsPlanned: number | null;
  stage: 'first' | 'middle' | 'last';
  oneTime: boolean;
  person: { firstName: string | null; roleAsDescribed: string | null; isLead: boolean };
  roleMap: RoleMap | null;
  leadBrief: string | null;
  recordAlreadyHolds: string;
  doesNotAddUp: string;
  owed: string[];
  declinedOrAskedTwice: string[];
  earlier: { session: number; type: string; text: string }[];
  patterns: { code: string; name: string; observation: string | null; periods: number; probe: string | null }[];
  coachingStep: string | null;
  howTheyAnswer: string | null;
}

const clip = (s: string, n: number): string => (s.length > n ? `${s.slice(0, n - 3).trimEnd()}...` : s);

/** The brief the planner reads: everything, compact, with headings that say what each thing is. */
export function theBriefForThePlanner(w: WhatThePlannerGets): string {
  const parts: string[] = [];
  parts.push(`THE SITUATION: ${w.scenarioLabel}. Session ${w.sessionNumber}${w.sessionsPlanned ? ` of ${w.sessionsPlanned}` : ''} (${w.stage}).${w.oneTime ? ' A ONE-TIME session: nobody here owes a commitment or a next step.' : ''}`);
  parts.push(`THE PERSON: ${w.person.firstName ?? 'no name given'}${w.person.roleAsDescribed ? `, who described their role as: "${w.person.roleAsDescribed}"` : ''}. ${w.person.isLead ? 'THIS IS THE LEAD: they set this check-in up and run it. Their session is about their own part - what they have told people, set up, decided and seen - never a report on the others.' : 'A participant: their session is about their own work, in their own words.'}`);
  if (w.roleMap) {
    const m = w.roleMap;
    parts.push(
      `THE ROLE MAP (${m.label}). On track means: ${m.onTrackMeans} Going wrong looks like: ${m.goingWrongLooksLike} Protect against: ${m.protectAgainst}` +
        (m.failureSignals?.length ? ` Signals it is going wrong: ${m.failureSignals.slice(0, 5).join('; ')}.` : '') +
        (m.successSignals?.length ? ` What it looks like going right: ${m.successSignals.slice(0, 5).join('; ')}.` : '') +
        (m.neutralProbes?.length ? ` Neutral questions for this role: ${m.neutralProbes.slice(0, 4).join(' | ')}` : ''),
    );
  }
  if (w.leadBrief) parts.push(`THE LEAD'S BRIEF TO THE PRODUCT (an instruction to you, not this person's words): ${clip(w.leadBrief, 900)}${w.person.isLead ? '' : ` ${THE_BRIEF_IS_CONTEXT_ONLY} Never put its sentences in the plan as words to say.`}`);
  if (w.recordAlreadyHolds) parts.push(w.recordAlreadyHolds);
  if (w.doesNotAddUp) parts.push(w.doesNotAddUp);
  if (w.earlier.length) {
    parts.push(
      'WHAT THIS PERSON SAID IN EARLIER SESSIONS (their words, by session and kind):\n' +
        w.earlier.slice(-40).map((e) => `- s${e.session} ${e.type}: ${clip(e.text, 220)}`).join('\n'),
    );
  }
  if (w.owed.length) parts.push('WHAT THIS SESSION STILL OWES (things nobody has said yet, for this role at this stage):\n' + w.owed.map((o) => `- ${o}`).join('\n'));
  if (w.declinedOrAskedTwice.length) parts.push('DECLINED OR ASKED TWICE BEFORE - do not ask again:\n' + w.declinedOrAskedTwice.map((o) => `- ${o}`).join('\n'));
  if (w.patterns.length) {
    parts.push(
      'BEHAVIOUR SEEN IN THIS PERSON\'S EARLIER SESSIONS (from the pattern read; behaviours, not verdicts):\n' +
        w.patterns.map((p) => `- ${p.name}${p.periods > 1 ? `, seen ${p.periods} periods running` : ''}: ${p.observation ?? p.code}${p.probe ? ` (a natural question about it: "${p.probe}")` : ''}`).join('\n'),
    );
  }
  if (w.coachingStep) parts.push(`THE COACHING STEP IN PLAY: ${w.coachingStep}`);
  if (w.howTheyAnswer) parts.push(`HOW THEY HAVE ANSWERED BEFORE: ${w.howTheyAnswer}`);
  parts.push(`THE SCENARIO'S OWN GUIDANCE:\n${clip(w.pack, 3500)}`);
  return parts.join('\n\n');
}

/**
 * HOW THEY HAVE ANSWERED BEFORE, counted off their earlier turns. Behaviour, not a label: how long the
 * answers ran, how often they carried something checkable, how often they declined.
 */
export function howTheyAnswered(earlierPersonTurns: string[], checkable: (t: string) => boolean, declined: (t: string) => boolean): string | null {
  const turns = earlierPersonTurns.filter((t) => t?.trim());
  if (turns.length < 3) return null;
  const words = turns.map((t) => t.trim().split(/\s+/).length);
  const mean = Math.round(words.reduce((a, b) => a + b, 0) / words.length);
  const withCheckable = turns.filter(checkable).length;
  const declines = turns.filter(declined).length;
  const short = words.filter((w) => w <= 6).length;
  const bits = [`${turns.length} answers over the earlier sessions, ${mean} words each on average`];
  if (short / turns.length >= 0.5) bits.push(`half or more were six words or fewer`);
  bits.push(`${withCheckable} carried a number, a date or a name`);
  if (declines) bits.push(`${declines} declined the question outright`);
  return bits.join('; ') + '.';
}

/** What comes back, tidied: strings trimmed, lists bounded, nothing empty kept. */
export function tidyThePlan(raw: any, may: { coach?: boolean } = { coach: true }): ThePlan | null {
  if (!raw || typeof raw !== 'object') return null;
  const str = (v: unknown, max = 400): string => (typeof v === 'string' ? clip(v.replace(/\s+/g, ' ').trim(), max) : '');
  /* One question per item. A stacked item ("Who did you hire? What does success look like? What would
     have to exist?") is the pack copied out; the first question is kept and the rest go. */
  const oneQuestion = (ask: string): string => {
    const parts = ask.split(/(?<=\?)\s+/).filter(Boolean);
    return parts.length > 1 ? parts.find((p) => /\?$/.test(p)) ?? parts[0] : ask;
  };
  const questions = (Array.isArray(raw.questions) ? raw.questions : [])
    .map((q: any) => ({ ask: oneQuestion(str(q?.ask, 300)), why: str(q?.why, 200) }))
    .filter((q: any) => q.ask)
    .slice(0, 5);
  const watchFor = (Array.isArray(raw.watchFor) ? raw.watchFor : [])
    .map((x: any) => ({ pattern: str(x?.pattern, 200), ifSeen: str(x?.ifSeen, 200) }))
    .filter((x: any) => x.pattern)
    .slice(0, 4);
  /* No behaviour seen and no coaching step means no coaching path, whatever the planner wrote: a path from
     the role map's list of risks is a guess about a person, which is the thing this product refuses to make. */
  const cp = may.coach !== false && raw.coachingPath && typeof raw.coachingPath === 'object' ? { noticed: str(raw.coachingPath.noticed, 200), toward: str(raw.coachingPath.toward, 200), move: str(raw.coachingPath.move, 200) } : null;
  const plan: ThePlan = {
    mustEstablish: str(raw.mustEstablish),
    openWith: str(raw.openWith, 300),
    questions,
    watchFor,
    coachingPath: cp && cp.noticed && cp.toward ? cp : null,
    doneWhen: str(raw.doneWhen),
    doNotAsk: (Array.isArray(raw.doNotAsk) ? raw.doNotAsk : []).map((x: unknown) => str(x, 200)).filter(Boolean).slice(0, 6),
  };
  if (!plan.mustEstablish || plan.questions.length === 0) return null;
  return plan;
}

/**
 * THE BLOCK EVERY TURN READS. The plan, with where the session has got to in it, worked out from the
 * turns by the same reader the owed list uses. Facts and the plan's own words; the model writes the turn.
 */
export function sayThePlan(plan: ThePlan, turns: ATurnInSession[], forTheOpener: boolean): string {
  const things = plan.questions.map((q, i) => ({ id: `plan-${i + 1}`, what: q.ask }));
  const covered = sayWhatHasBeenCovered(things, whatThisSessionHasCovered(things, turns));
  const status = new Map<string, string>();
  for (const a of covered.answered) status.set(a.thing.id, `answered - they said "${clip(a.answer.replace(/\s+/g, ' '), 120)}"`);
  for (const v of covered.vague) status.set(v.thing.id, v.answer ? `asked once, no specific yet - ask once more for the specific, then leave it` : 'asked, not yet answered');
  for (const l of covered.leave) status.set(l.thing.id, `${l.why} - leave it`);
  const lines: string[] = [
    'THE PLAN FOR THIS SESSION, written before it started from everything on record about this person. Context, not a script: follow the person where they go, and come back to this.',
    `MUST ESTABLISH: ${plan.mustEstablish}`,
  ];
  if (forTheOpener && plan.openWith) lines.push(`OPEN WITH, then the first question: ${plan.openWith}`);
  lines.push('THE QUESTIONS, IN ORDER' + (forTheOpener ? '' : ' (with where this session has got to)') + ':');
  plan.questions.forEach((q, i) => {
    const st = status.get(`plan-${i + 1}`);
    lines.push(`  ${i + 1}. ${q.ask}${q.why ? ` [${q.why}]` : ''}${st && !forTheOpener ? ` -> ${st}` : ''}`);
  });
  const next = covered.notAsked[0];
  if (!forTheOpener) lines.push(next ? `NEXT IN THE PLAN, when the current thread is done: ${next.what}` : 'EVERY PLANNED QUESTION HAS BEEN PUT. Check DONE WHEN, then close.');
  if (plan.watchFor.length) lines.push('WATCH FOR, WITH THIS PERSON:', ...plan.watchFor.map((w) => `  - ${w.pattern}${w.ifSeen ? ` -> ${w.ifSeen}` : ''}`));
  if (plan.coachingPath) lines.push(`COACHING PATH: noticed ${plan.coachingPath.noticed}. Toward: ${plan.coachingPath.toward}. This session's move: ${plan.coachingPath.move}`);
  lines.push(`DONE WHEN: ${plan.doneWhen}`);
  if (plan.doNotAsk.length) lines.push('DO NOT ASK:', ...plan.doNotAsk.map((d) => `  - ${d}`));
  return lines.join('\n');
}
