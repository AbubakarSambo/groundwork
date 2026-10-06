/**
 * THE LEAD WHO MADE A CHECK-IN AND ADDED NOBODY (decision 109; spec sections 4 and 10; section 36, journey 1).
 *
 * Until now the lead was chased about her own check-in the way an invited person is ("Your check-in is waiting"), as if somebody else had asked
 * her. When nobody else is in it, she is sent this instead: it starts from what she set it up for, says she does not need to configure anything
 * else, and asks for the one next step, three people. It never says "invitation" or "complete your setup".
 */
export const LEADS_FIRST_SENDER = 'sendLeadFirstCheckIn';

export function theLeadsFirstWords(firstName: string | null | undefined, label: string, brief: string | null | undefined) {
  const wanted = (brief ?? '').trim().replace(/\s+/g, ' ').replace(/[.!?]+$/, '');
  return {
    subject: `You set up "${label}", and nobody else is in it yet`,
    lines: [
      `Hello ${firstName?.trim() || 'there'}. You set up "${label}", and nobody else has been added to it yet.`,
      ...(wanted ? [`What you told Groundwork you wanted was: "${wanted}".`] : []),
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
