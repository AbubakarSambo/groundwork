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

/**
 * THE CHECK-IN ROW TOO (reviewer's audit, 7 October). `getTranscript` spread the whole check-in row, so a person was served `sessionPlan` (its
 * `watchFor` and `coachingPath.noticed` are built from pattern detections, and it carries the lead's brief and the role the lead described),
 * `probeSources` (`pattern:B1` and the like), `specificityLevel` and `specificityDimensions` (how their answers were rated) and `whatWeHave`
 * (the claims and challenges Groundwork holds about what they said). None is theirs to read on this route, and no screen reads it here: the
 * transcript's screens use the status, the session number and the ground. The person's own rating is served deliberately where it is served
 * (the report and the You board), not through this route.
 *
 * An allowlist, so a column added to the row later is not served until it is added here. The lead, who runs it, reads her own row whole.
 */
export const WHAT_A_PERSON_TAKING_PART_MAY_READ_OF_THEIR_CHECK_IN = [
  'id', 'groundId', 'participantId', 'sessionNumber', 'isSetup', 'status', 'availableFrom', 'startedAt', 'completedAt', 'createdAt',
  'isSelfCorrection', 'selfCorrectionTargetSession', 'isClarification', 'clarificationTarget', 'isPostSignOff', 'isFinal', 'closedReason',
  'saidWhy', 'sessionReport', 'participant', 'theirAnswerFitted',
] as const;

export function theCheckInRowAsServed<T extends Record<string, any>>(checkIn: T, runsIt: boolean): T {
  if (runsIt) return checkIn;
  const out: Record<string, any> = {};
  for (const key of WHAT_A_PERSON_TAKING_PART_MAY_READ_OF_THEIR_CHECK_IN) if (key in checkIn) out[key] = (checkIn as any)[key];
  return out as T;
}
