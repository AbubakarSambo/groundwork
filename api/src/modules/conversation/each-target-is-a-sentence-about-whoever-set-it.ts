/**
 * EACH TARGET, IN A CHECK-IN, IS A SENTENCE ABOUT WHOEVER SET IT (decision 69, 1 October 2026).
 *
 * The board found it: the brief a check-in is served, and the targets its model is given, were the
 * stored names as they were written. The names are written by the extraction that reads the lead's
 * own session, so "I" in them is whoever set the target. Ngozi's check-in was given "I'm aiming for
 * N120 million disbursed this quarter." as one of its objectives, which reads as her own aim, and
 * "approved facilities (target 14)" with nobody's name on it. Nothing read who set a target
 * (`setByParticipantId`) or whether it was an aim to reach or a limit not to go over (`direction`).
 *
 * This uses the board's own wording, so the two never disagree: `anAimAsASentence` writes the
 * sentence about whoever set it and whoever holds it, with numbers a person can read ("120 million
 * naira"), and `withNames` makes the reader "you", with its verb. Where the lead has said which way
 * a target goes, the sentence says it.
 *
 * It decides nothing about who may read a target. The caller passes only the targets this reader may
 * read (targetsFor and the untold-goal wall); this only words them.
 */
import { anAimAsASentence, yourOwnWhereYouAreTheSubject, aNumberPeopleCanRead, anAimTheHolderSet } from '../board/an-aim-is-a-sentence-about-somebody';
import { asADirection, theListsWordsFor } from '../board/an-aim-or-a-limit';
import { withNames } from '../reports/party-labels';

export interface ATargetToWord {
  name: string;
  target: number | null;
  ownerParticipantId?: string | null;
  setByParticipantId?: string | null;
  direction?: string | null;
}

export interface WhoIsInIt {
  /** The person in this check-in. */
  readerId: string | null;
  /** Their first name, which becomes "you". */
  readerFirstName: string | null;
  /** The participant row of whoever runs the check-in, for a target with nobody recorded as setting it. */
  leadId: string | null;
  /** A person's first name, or null where this reader may not be told who they are. */
  firstNameOf: (participantId: string) => string | null;
}

/** "a colleague" where a name may not be said. */
const A_COLLEAGUE = 'a colleague';

export function theTargetAsASentence(o: ATargetToWord, who: WhoIsInIt): string {
  const nameFor = (id: string | null | undefined): string | null => {
    if (!id) return null;
    if (id === who.readerId) return who.readerFirstName?.trim() || 'You';
    return who.firstNameOf(id)?.trim() || A_COLLEAGUE;
  };
  const setBy = o.setByParticipantId ?? o.ownerParticipantId ?? who.leadId;
  const direction = asADirection(o.direction);
  const inNames = anAimAsASentence(o.name ?? '', {
    speaker: nameFor(setBy),
    holder: o.ownerParticipantId ? nameFor(o.ownerParticipantId) : null,
    target: o.target ?? null,
    direction,
    /* A person's own aim is theirs, never a number the lead set for them (decision 75, item 37). */
    setByTheHolder: anAimTheHolderSet(o, who.leadId),
  });
  const reader = who.readerFirstName?.trim();
  const toThem = reader ? withNames(inNames, new Map(), [reader], { viewerLabel: reader }) : inNames;
  const sentence = yourOwnWhereYouAreTheSubject(toThem, []);
  /* Which way it goes, where the lead said and the sentence does not already say it. */
  if (!direction || o.target == null) return sentence;
  if (direction === 'LIMIT' && /\bno more than\b/i.test(sentence)) return sentence;
  if (direction === 'AIM' && /\baim(?:ing)?\b/i.test(sentence)) return sentence;
  /* Each of the other kinds in its own words (decision 75, item 17). */
  if (direction === 'RATE') return sentence.includes(`${aNumberPeopleCanRead(o.target)}%`) ? sentence : `${sentence} The share to keep at or above is ${aNumberPeopleCanRead(o.target)}%.`;
  if (direction === 'ZERO') return /\bat zero\b/.test(sentence) ? sentence : `${sentence} This should stay at zero, so any at all is a breach.`;
  if (direction === 'DEADLINE') return /\bdate to meet\b/.test(sentence) ? sentence : `${sentence} It is a date to meet.`;
  return `${sentence} The number ${aNumberPeopleCanRead(o.target)} is ${theListsWordsFor(direction)}.`;
}
