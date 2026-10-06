/**
 * THE LEAD WHO MADE A CHECK-IN AND ADDED NOBODY (decision 109; spec sections 4 and 10; section 36, journey 1).
 *
 * Until now the lead was chased about her own check-in the way an invited person is ("Your check-in is waiting"), as if somebody else had asked
 * her. When nobody else is in it, she is sent this instead: it starts from what she set it up for, says she does not need to configure anything
 * else, and asks for the one next step, three people. It never says "invitation" or "complete your setup".
 */
export const LEADS_FIRST_SENDER = 'sendLeadFirstCheckIn';

export function theLeadsFirstWords(firstName: string | null | undefined, label: string, brief: string | null | undefined) {
  /* Her own words, cut to the first sentence: a long brief said back in full reads as a quotation of her. */
  const first = (brief ?? '').trim().replace(/\s+/g, ' ').split(/(?<=[.!?])\s+/)[0]?.replace(/[.!?]+$/, '').trim() ?? '';
  return {
    subject: `You set up "${label}", and nobody else is in it yet`,
    lines: [
      `Hello ${firstName?.trim() || 'there'}. Nobody else has been added to "${label}" yet.`,
      ...(first ? [`When you set up "${label}", you wrote, "${first}".`] : []),
      'You do not need to set anything else up. Add the people involved, starting with three, and Groundwork will take it from there.',
    ],
    linkLabel: 'Add the people involved',
  };
}

/** Whether anybody besides the lead can answer in this check-in: not managing only, and let in. */
export function nobodyElseIsIn(
  everyone: { userId: string | null; managingOnly?: boolean | null; user?: { awaitingOrgApproval?: boolean | null } | null }[],
  leadUserId: string | null,
): boolean {
  return !everyone.some((p) => p.userId !== leadUserId && !p.managingOnly && !p.user?.awaitingOrgApproval);
}
