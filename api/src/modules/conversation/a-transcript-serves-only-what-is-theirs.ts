/**
 * WHAT A PERSON'S OWN TRANSCRIPT SERVES OF THEIR PARTICIPANT ROW (decision 30, requests 167 and 168).
 *
 * The transcript was served with the whole participant row spread into it, so a person taking part read what the lead had typed about
 * them ("What do they do, and why are they part of this?"), the lead's expectation of them, their own invitation token, and more. None
 * is drawn on a screen, but all of it was on the wire. The role a lead described is the lead's: it goes only to whoever runs the
 * check-in, and the same words reach `theirAnswerFitted.kind` when the model had nothing else to call the person's kind of work.
 *
 * THE DEFAULT, NOT ONE FIELD: somebody who is not the lead is served an allowlist of what is theirs. A field added to the row later is
 * not served to them until it is added here.
 */
export const WHAT_A_PERSON_TAKING_PART_MAY_READ_OF_THEIR_ROW = [
  'id', 'groundId', 'userId', 'email', 'partyType', 'managingOnly', 'nameGiven', 'organisationGiven', 'department', 'language',
  'wantsTheReport', 'awaitingSeat', 'cameThroughTheLink', 'user',
] as const;

export function theParticipantAsServed<T extends Record<string, any> | null | undefined>(participant: T, runsIt: boolean): T {
  if (!participant || runsIt) return participant;
  const out: Record<string, any> = {};
  for (const key of WHAT_A_PERSON_TAKING_PART_MAY_READ_OF_THEIR_ROW) if (key in participant) out[key] = (participant as any)[key];
  return out as T;
}

/** The fitted answer, without the kind when it could be the lead's words about the person, for anybody who does not run the check-in. */
export function theFitAsServed<T extends Record<string, any> | null | undefined>(fit: T, runsIt: boolean): T {
  if (!fit || runsIt || typeof fit !== 'object') return fit;
  const { kind: _theLeadsWords, ...rest } = fit as Record<string, any>;
  return rest as T;
}
