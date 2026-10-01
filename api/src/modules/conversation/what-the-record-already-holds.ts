/**
 * WHAT THE RECORD ALREADY HOLDS ABOUT THIS PERSON, PUT IN FRONT OF THE CONVERSATION.
 *
 * THE CHAT HAS BEEN A ONE-WAY STREET. It writes down what people say; the board and the reports
 * work out what it means - what is in the way, who is being waited on, how long, what nobody has
 * raised since. None of that has ever come back the other way, so every session starts from
 * nothing.
 *
 * Watched on a real check-in: a salesperson with a target of 35 on the board was asked "what are
 * your top two or three objectives for this period?" He said he was waiting on finance, had been
 * three weeks, and had emailed twice. The conversation took it at face value, promoted it to "your
 * most critical dependency" and moved on. Next week it will ask him from scratch again, and the
 * three weeks will become four without anybody noticing that nothing was tried in between.
 *
 * THE FIX IS NOT ANOTHER RULE IN THE PROMPT. The prompt is 927 lines and 273 imperatives; a rule
 * added there competes with everything else and loses. This gives the model FACTS instead: the
 * number this person is being read against, what they have already said is in their way, who owns
 * it, how long it has sat, and whether anybody escalated. A model that knows the blocker is three
 * weeks old does not need to be told to ask about it.
 *
 * WHAT IT NEVER DOES. It does not invent, it does not summarise anybody else's words, and it does
 * not tell the model what to conclude. Every line is a fact already on this check-in's own record,
 * and the target lines are the ones the person is shown on their own screen anyway.
 */

/** A number this check-in is being run against, as the board holds it. */
export interface TargetOnRecord {
  name: string;
  target: number | null;
  count: number;
  /** True where this target belongs to the person being interviewed. */
  yours?: boolean;
  /** True where they said it themselves; false where the lead set it for them. */
  setByThem?: boolean;
}

/** Something this person said is in their way, as the record holds it. */
export interface InTheWay {
  /** What they have said they did about it, where the record knows. See the blocker module. */
  tried?: Effort;
  /** A date they committed to chasing by, where they gave one. */
  chaseBy?: Date | null;
  what: string;
  /** Who it is on - a person's label, or free text where it is outside the check-in. */
  on: string | null;
  /** When they first raised it. */
  since: Date;
  /** Whether anybody has escalated it, which is the difference between waiting and chasing. */
  escalated: boolean;
  /** What they said happens once it clears, where they said. */
  then?: string | null;
}

import { stillToAsk, waysThrough, type Effort } from './a-blocker-is-not-a-blocker-until-you-have-tried';
/* Numbers as a person reads them, "120 million" rather than 120000000 (decision 69, the board's own wording). */
import { aNumberPeopleCanRead as readable } from '../board/an-aim-is-a-sentence-about-somebody';

export const A_DAY = 24 * 60 * 60 * 1000;

/** Whole days since something was raised. Never negative; a thing raised today is 0. */
export function daysSince(since: Date, now: Date): number {
  return Math.max(0, Math.floor((now.getTime() - since.getTime()) / A_DAY));
}

/**
 * HOW LONG IS TOO LONG TO STILL BE ONLY WAITING.
 *
 * Not a judgement about the person and not a deadline: it is the point past which "I am waiting on
 * someone" stops being a description of a situation and starts being a description of a habit. A
 * fortnight is the shortest span over which somebody could reasonably have chased twice and had a
 * second silence, on any cadence this product runs.
 */
export const WAITED_LONG_ENOUGH_TO_ASK = 14;

/**
 * THE LINE THAT NAMES THE OWNER PROBLEM.
 *
 * "Waiting on finance" is not waiting on anybody. A function cannot answer an email, cannot be
 * chased and cannot be escalated past - and a blocker with no person on it is the single most
 * common shape an excuse takes, because there is nobody to have failed to call.
 */
export function sayOneThingInTheWay(row: InTheWay, now: Date): string {
  const days = daysSince(row.since, now);
  const on = row.on?.trim() ? `on ${row.on.trim()}` : 'on nobody named';
  const age = days === 0 ? 'raised today' : days === 1 ? 'raised yesterday' : `${days} days old`;
  const chased = row.escalated ? 'has been escalated' : 'nobody has escalated it';
  return `- "${row.what}" ${on}, ${age}, ${chased}.${row.then?.trim() ? ` They said once it clears: ${row.then.trim()}` : ''}`;
}

/**
 * THE BLOCK, OR NOTHING.
 *
 * Returns an empty string when the record holds none of this, so the caller can drop it rather
 * than send the model a heading with nothing under it - which reads as an absence of facts rather
 * than an absence of block, and invites the model to fill it.
 */
/** Words that make a line about something that happened into bad news, or no news. */
const NOT_GOOD_NEWS = /\b(not|n't|no|never|nothing|still (?:waiting|pending)|delayed|late|failed|lost|missed|stuck|blocked|cancel+ed|rejected|declined|behind|overdue|short of)\b/i;

/** Of the lines that record something that happened, the ones that are good news. */
export function theGoodNewsIn(rows: { text: string; type?: string | null }[]): string[] {
  return (rows ?? [])
    .filter((r) => r?.type === 'PROGRESS' && !NOT_GOOD_NEWS.test(r.text ?? ''))
    .map((r) => String(r.text ?? '').replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

export function whatTheRecordAlreadyHolds(input: {
  targets: TargetOnRecord[];
  inTheWay: InTheWay[];
  /** What this person themselves said last session, oldest first. Their own words only. */
  saidLastTime: string[];
  /**
   * The lines from last session that record something that happened and is not bad news, in their
   * own words. Task 2.4 (week 3): good news first, when there is some. Empty when there is none.
   */
  wentWellLastTime?: string[];
  now: Date;
  /**
   * WHETHER THIS CHECK-IN EXPECTS PEOPLE TO HAVE TRIED, which is a decision its lead makes.
   *
   * On for most work. Off where chasing was never theirs to do - a cohort of new starters with no
   * standing to escalate, an outside party who cannot go over somebody's head inside another
   * company, a crisis session that exists to hear what happened. Asking what somebody tried when
   * trying was not available to them is the fastest way to make a check-in feel like an
   * interrogation, and the blocker still gets recorded either way.
   */
  expectThemToUnblock?: boolean;
}): string {
  const { targets, inTheWay, saidLastTime, now } = input;
  const expectThemToUnblock = input.expectThemToUnblock !== false;
  const parts: string[] = [];

  const withNumbers = targets.filter((t) => t.target != null);
  if (withNumbers.length > 0) {
    /*
     * THEIRS FIRST, AND ON ITS OWN.
     *
     * Ten salespeople each saw all ten targets, top to bottom, on their own screen. Whatever that
     * is, it is not this person's check-in: their number is the one thing here that is about them,
     * and burying it eighth in a league table is how a conversation ends up asking somebody what
     * they are aiming for while the answer sits above it.
     *
     * The rest still go in where there are any - a person's own number means nothing without the
     * whole it is part of - but as context underneath, not as the subject.
     */
    const mine = withNumbers.filter((t) => t.yours && t.setByThem !== false);
    const setForThem = withNumbers.filter((t) => t.yours && t.setByThem === false);
    const theRest = withNumbers.filter((t) => !t.yours);
    parts.push(
      'WHAT IS ALREADY ON THE RECORD FOR THIS CHECK-IN. These numbers are set. Do not ask what ' +
      'this person is aiming for as though nobody has said - ask where they are against it, and ' +
      'what the next ones are by name.\n' +
      (mine.length
        ? `Theirs, said by them: ${mine.map((t) => `${t.name}, ${readable(t.count)} of ${readable(t.target as number)}`).join('; ')}\n`
        : '') +
      (setForThem.length
        ? `Set for them by the lead - put these to them as the lead's expectation, in the lead's name, never as "you said" and never as something "the opener set": ${setForThem.map((t) => `${t.name}, ${readable(t.count)} of ${readable(t.target as number)}`).join('; ')}\n`
        : '') +
      (theRest.length
        ? 'Set for the whole check-in, not said by this person. The count on it is EVERYBODY\'S together, never this person\'s standing: never "you are at", "the record shows you at", never a difference between it and their own number. Never put these to them as "you said": ' +
          theRest.map((t) => `${t.name}, the whole check-in is at ${readable(t.count)} of ${readable(t.target as number)}`).join('; ')
        : ''),
    );
  }

  if (inTheWay.length > 0) {
    /*
     * WHAT IS STILL TO BE ASKED ABOUT EACH ONE, worked out here rather than left to the model.
     *
     * The three facts that separate a blocked person from a stuck one - is there a person who can
     * move it, what has been tried, is there a date - are either on the record or they are not.
     * Where one is missing the conversation asks for it, and the asking is written out so it
     * cannot be crowded out by the other 273 things the prompt is asking for.
     */
    const owedQuestions = !expectThemToUnblock ? [] : inTheWay.flatMap((r) => stillToAsk({
      what: r.what, owner: r.on, days: daysSince(r.since, now), tried: r.tried ?? 'nothing', chaseBy: r.chaseBy ?? null,
    })); 
    const stale = inTheWay.filter((r) => daysSince(r.since, now) >= WAITED_LONG_ENOUGH_TO_ASK);
    const unowned = inTheWay.filter((r) => !r.on?.trim());
    parts.push(
      'WHAT THIS PERSON HAS ALREADY SAID IS IN THEIR WAY. They raised each of these themselves. ' +
      'Ask what has actually been done about them since, not whether they are still stuck.\n' +
      inTheWay.map((r) => sayOneThingInTheWay(r, now)).join('\n') +
      (stale.length
        ? `\nOf those, ${stale.length === 1 ? 'one has' : `${stale.length} have`} sat for a ` +
          'fortnight or more. Waiting that long without chasing is the thing worth asking about.'
        : '') +
      (unowned.length
        ? `\n${unowned.length === 1 ? 'One of them names' : `${unowned.length} of them name`} no ` +
          'person, only a team or nothing at all. A team cannot answer an email. Find out who the ' +
          'person is.'
        : '') +
      (owedQuestions.length
        ? '\nStill unanswered about these, and worth more than anything new:\n' +
          owedQuestions.map((q) => `- ${q}`).join('\n')
        : '') +
      (expectThemToUnblock
        ? '\nIf they are still only waiting, put the ways through to them as options rather than as a ' +
          'telling-off: ' + waysThrough({
            what: inTheWay[0].what, owner: inTheWay[0].on, days: daysSince(inTheWay[0].since, now),
            tried: inTheWay[0].tried ?? 'nothing', chaseBy: inTheWay[0].chaseBy ?? null,
          }).join(' / ')
        : '\nThis check-in does not ask people to unblock themselves. Record what is in their way ' +
          'and do not ask what they tried.'),
    );
  }

  /*
   * GOOD NEWS FIRST, WHEN THERE IS SOME. Task 2.4, week 3; the conversation standard's second point:
   * "Kariuki Butchery paid on Monday. That's a sale that counts." Their own line, said back plainly
   * as what happened. Never praise, and never more than they said: a sales judgement once praised a
   * claim the record's own numbers contradicted.
   */
  const wentWell = (input.wentWellLastTime ?? []).filter((s) => saidLastTime.includes(s)).slice(0, 2);
  if (wentWell.length > 0) {
    parts.push(
      'GOOD NEWS FROM LAST TIME, in their own words. Open with it: say what happened back to them in ' +
      'one plain sentence, before anything else, then ask your question. Say it as a fact they told ' +
      'you. Do not praise it, and do not add anything they did not say.\n' +
      wentWell.map((s) => `- "${s}"`).join('\n'),
    );
  }

  if (saidLastTime.length > 0) {
    parts.push(
      'WHAT THIS PERSON SAID LAST TIME, in their own words. If they said they would do something, ' +
      'ask whether it happened before asking anything new.\n' +
      saidLastTime.map((s) => `- "${s}"`).join('\n'),
    );
  }

  return parts.join('\n\n');
}
