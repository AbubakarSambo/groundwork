import { STARTED_FROM_THE_ANCHOR } from './the-anchor-weekly-check-in';
import { theKindOfRequest, thePrefillFromTheirWords } from './a-request-offered-in-the-check-in';

/**
 * A REQUEST SAID IN AN ORDINARY CHECK-IN GOES TO ASK, IN ONE PLAIN SENTENCE, FROM CODE (user journeys, F-9).
 *
 * Leave and spending offered inside a check-in stay anchor-only (`release.requestOfferInTheCheckIn`). In any other check-in a person who wrote
 * "I would also like leave on 27 and 28 October" or "I need to spend KES 5,000 on printing the launch flyers" was given the next question, and
 * when they then wrote "Yes, send it." that was taken as an answer, nothing was sent, and nothing told them where the request is made.
 *
 * Now the reply says where, once, in words written here and not by the model: Ask Groundwork, and that nothing is sent from the check-in. Only
 * where that suite is on for the organisation, so the sentence is always true. And a bare "yes, send it" after that sentence is answered with it
 * again and is not taken as an answer to the check-in's question.
 *
 * NOTHING IS OFFERED, KEPT OR SENT FROM HERE. This is the one sentence and nothing else.
 */
export const WHERE_LEAVE_IS_ASKED_FOR =
  'To ask for leave, open Ask Groundwork and tell it which days you want off. Nothing is sent from this check-in.';
export const WHERE_SPENDING_IS_ASKED_FOR =
  'To ask for money to be approved, open Ask Groundwork and tell it the sum and what it is for. Nothing is sent from this check-in.';
const SENTENCES = { leave: WHERE_LEAVE_IS_ASKED_FOR, spending: WHERE_SPENDING_IS_ASKED_FOR } as const;
const SUITE_KEY = { leave: 'leave', spending: 'spend' } as const;

/** "Yes, send it." "Please send that." "Go ahead and submit it." Nothing else in the message. */
const A_BARE_SEND_IT = /^\s*(?:yes|yeah|yep|ok(?:ay)?|sure|please)?[\s,.!-]*(?:please\s+)?(?:go ahead(?: and)?\s+)?(?:send|submit|file|pass|forward)(?:\s+(?:it|that|this))?(?:\s+(?:on|through|now))?\s*[.!]*\s*$/i;

export async function whereARequestInAnOrdinaryCheckInGoes(
  prisma: any,
  a: { organizationId: string | null; startedFrom?: string | null; message: string; theLastThingWeSaid?: string | null },
): Promise<{ say: string; replaceTheReply: boolean } | null> {
  try {
    if (a.startedFrom === STARTED_FROM_THE_ANCHOR) return null;
    const last = a.theLastThingWeSaid ?? '';
    const earlier = (['leave', 'spending'] as const).find((k) => last.includes(SENTENCES[k]));
    if (earlier && A_BARE_SEND_IT.test(a.message ?? '')) return { say: SENTENCES[earlier], replaceTheReply: true };
    const kind = theKindOfRequest(a.message ?? '');
    if (!kind || !a.organizationId) return null;
    const suite = await prisma.organizationSuite?.findUnique?.({ where: { organizationId_suite: { organizationId: a.organizationId, suite: SUITE_KEY[kind] } }, select: { isOn: true } })?.catch?.(() => null);
    if (!suite?.isOn) return null;
    return { say: SENTENCES[kind], replaceTheReply: false };
  } catch {
    return null;
  }
}

/**
 * A SUM SAID ONLY TO ASK FOR IT IS NOT A GOAL (user journeys, F-9). "I need to spend KES 5,000 on printing the launch flyers." was kept as the
 * person's own target and read "You have 0 of 5,000". An amount that appears in the person's words only inside a request for money is the
 * request's, and no aim or target is kept for it. An amount they also said anywhere else, as a number they are working to, stays.
 */
export function theSumsOnlyARequestSaid(theirTurns: readonly string[]): Set<number> {
  const inRequests = new Set<number>();
  const elsewhere = new Set<number>();
  for (const t of theirTurns) {
    const asks = theKindOfRequest(t) === 'spending';
    const amount = asks ? thePrefillFromTheirWords('spending', t).amount : undefined;
    if (asks && amount) { inRequests.add(amount); continue; }
    for (const m of (t ?? '').matchAll(/\d[\d,]*(?:\.\d+)?/g)) {
      const n = Number(m[0].replace(/,/g, ''));
      if (Number.isFinite(n)) elsewhere.add(n);
    }
  }
  return new Set([...inRequests].filter((n) => !elsewhere.has(n)));
}
