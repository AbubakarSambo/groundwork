/**
 * Whether a session has enough in it to be closed.
 *
 * An eighteen-ground run measured who reaches a "natural" ending, and the answer
 * was upside down: the people who said LEAST closed most reliably. Users given a
 * BASIC persona closed 94% of their sessions, articulate ones 87%, and the
 * chatty one 70%. The distracted person answering off-topic from her phone got a
 * clean ending more often than the person giving dates and numbers.
 *
 * That is the wrong way round, and the cause is structural: the engine closes
 * when the person stops producing new material, and running out of things to say
 * correlates with having had little to say. So the thinnest records get the
 * tidiest endings, and the record that would actually have been worth another
 * question is the one that gets cut.
 *
 * This does not force anyone to keep talking. Someone who genuinely has nothing
 * this week must be able to finish - a quiet week is a real answer, and trapping
 * them in a loop to extract a specific that does not exist would be worse than
 * the problem. It buys exactly ONE more question when the account is empty, and
 * then gets out of the way.
 */
import { countCheckableSpecifics } from './conversation.service';

/** A person saying, plainly, that there is nothing this time. */
const SAYS_NOTHING_TO_ADD =
  /\b(nothing (to add|much|really|this week|new)|no (real )?(update|progress|change)|not much|same as (last|before)|quiet week|nothing (has )?(happened|moved)|haven'?t (done|had) )/i;

/** Someone declining, or asking to stop. Always honoured immediately. */
const WANTS_OUT =
  /\b(that'?s (it|me|all)|i'?m done|done for now|need to go|got to go|can we (stop|finish)|later|another time|skip this)/i;

export interface CloseReadiness {
  ready: boolean;
  /** Why, in the words the log should carry. */
  reason: string;
}

/**
 * @param personTurns everything this person has said this session, in order
 * @param alreadyProbed whether a close has already been held back once
 */
export function closeReadiness(personTurns: string[], alreadyProbed: boolean): CloseReadiness {
  const said = personTurns.join(' \n ');

  // Asked to stop. Their session, their call - no gate applies.
  if (WANTS_OUT.test(personTurns[personTurns.length - 1] ?? '')) {
    return { ready: true, reason: 'the person asked to finish' };
  }

  // One held-back close is the whole budget. A second signal always lands,
  // whatever the record looks like, so nobody can be kept in a loop.
  if (alreadyProbed) {
    return { ready: true, reason: 'already held back once this session' };
  }

  // Something checkable is on the record: a name, a number, a date, an outcome.
  if (countCheckableSpecifics(said) > 0) {
    return { ready: true, reason: 'the account contains something checkable' };
  }

  // They have said outright that there is nothing. That IS the account, and it
  // is an honest one - the board reads an empty week as an empty week.
  if (SAYS_NOTHING_TO_ADD.test(said)) {
    return { ready: true, reason: 'the person said plainly there is nothing this time' };
  }

  // Nothing checkable, and they have not said there is nothing. One more
  // question is worth asking before this becomes their record for the week.
  return {
    ready: false,
    reason: 'nothing checkable yet and no statement that there is nothing - worth one more question',
  };
}
