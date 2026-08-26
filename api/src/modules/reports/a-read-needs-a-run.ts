import { GroundMoment } from '@prisma/client';

/**
 * WHAT A REPORT MAY NOT CONCLUDE FROM A SINGLE ROUND.
 *
 * Three fields in the synthesis read a RUN rather than a session: `concernFlags` ("this party's
 * follow-through is notably thinner"), `hiddenContributors`, and the contribution comparison the
 * narrative draws from how much each person wrote. Nothing gated them on there being a run to read.
 *
 * So on the first session of a ground opened at the start - where by design nothing has happened yet,
 * because the whole point of that session is to agree what success would look like - the report could
 * tell a lead that somebody's contribution was thin. That is a judgement formed from an absence the
 * product itself created, and it is the exact thing this product exists not to do: a record
 * accumulating toward a conclusion before there is anything to conclude from.
 *
 * THIS RULE ALREADY EXISTS HERE, ONCE, AND THIS IS THE SECOND PLACE IT BELONGS. From the specificity
 * trend in grounds.service.ts: "Under three sessions there is no trend, only noise, and telling
 * somebody their record is 'falling' off two numbers is a verdict dressed as an observation." Same
 * argument, one round instead of three.
 *
 * WHY IT IS STRUCTURAL AND NOT AN INSTRUCTION. The synthesis prompt could be told to skip these on a
 * first session, and a prompt rule is a request. This is a decision about what may reach a reader, so
 * it is enforced on the object after synthesis, where it cannot be talked out of.
 *
 * WHAT IS NOT SUPPRESSED, deliberately. Agreements, divergences, the shared picture, the central
 * question and at-stake are all readable from one round - they are what two independent accounts of
 * an intention actually produce, and they are the reason the session was worth running.
 */
export const RUN_ONLY_FIELDS = ['concernFlags', 'hiddenContributors'] as const;

/**
 * A first round only counts as "nothing has happened yet" when the ground OPENED at the start.
 *
 * A ground opened mid-way or at the end has a history behind it that its first session is asking
 * about, so a thin contribution there is a real read of real work. The absence only means "too early"
 * where the product itself put the start of the work after the start of the ground.
 */
export function isBaselineRound(input: {
  moment: GroundMoment | null | undefined;
  highestCompletedSession: number;
}): boolean {
  return input.moment === GroundMoment.STARTING && input.highestCompletedSession <= 1;
}

/**
 * Remove what a single round cannot support. Returns the fields actually removed, so the caller can
 * log it: a silent removal is indistinguishable from a model that happened to return nothing.
 */
export function withoutWhatOneRoundCannotShow<T extends Record<string, any>>(
  engagement: T,
): { engagement: T; removed: string[] } {
  const out: T = { ...engagement };
  const removed: string[] = [];
  for (const field of RUN_ONLY_FIELDS) {
    if (field in out && out[field] != null) {
      const value = out[field];
      const isEmpty = Array.isArray(value) ? value.length === 0 : false;
      if (!isEmpty) removed.push(field);
      delete (out as any)[field];
    }
  }
  return { engagement: out, removed };
}
