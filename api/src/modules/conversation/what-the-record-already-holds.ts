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
}

/** Something this person said is in their way, as the record holds it. */
export interface InTheWay {
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
export function whatTheRecordAlreadyHolds(input: {
  targets: TargetOnRecord[];
  inTheWay: InTheWay[];
  /** What this person themselves said last session, oldest first. Their own words only. */
  saidLastTime: string[];
  now: Date;
}): string {
  const { targets, inTheWay, saidLastTime, now } = input;
  const parts: string[] = [];

  const withNumbers = targets.filter((t) => t.target != null);
  if (withNumbers.length > 0) {
    parts.push(
      'WHAT IS ALREADY ON THE RECORD FOR THIS CHECK-IN. These numbers are set. Do not ask what ' +
      'this person is aiming for as though nobody has said - ask where they are against it, and ' +
      'what the next ones are by name.\n' +
      withNumbers.map((t) => `- ${t.name}: ${t.count} of ${t.target}`).join('\n'),
    );
  }

  if (inTheWay.length > 0) {
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
        : ''),
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
