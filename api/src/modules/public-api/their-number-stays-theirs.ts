/**
 * THEIR NUMBER STAYS THEIRS, AND THEIR CUSTOMERS STAY THEIR CUSTOMERS.
 *
 * Hafsah, relaying a customer: "we dont want their customer traffic. what we want is for their team
 * to be able to use their whatsapp for business to do checkin. So there has to be some type of way
 * to do this. They use it for their customers too."
 *
 * One WhatsApp number has one webhook. Whoever holds it receives every message sent to it - orders,
 * complaints, price questions, and the team's check-ins in among them. So there are only two honest
 * arrangements, and the customer has just ruled out the first:
 *
 *   WE HOLD IT     everything arrives here, we answer the team and forward the rest to them. Their
 *                  customer conversations would pass through our systems. Ruled out, and rightly.
 *
 *   THEY HOLD IT   nothing arrives here. Their system reads every message, and when the sender is
 *                  one of their own team it hands us that one message and sends our reply back from
 *                  their number. We never see a customer, because they never hand us one.
 *
 * This is the second. Everything the check-in needs already existed for the first - the sender is
 * matched to the roster by phone, routed into whichever check-in is open, photos land as evidence,
 * "finish" completes it - and none of it cared who was holding the number. What was missing was a
 * door that returns the reply instead of sending it, and one rule about strangers.
 *
 * AND A STRANGER IS ANSWERED WITH SILENCE, NOT A SENTENCE. On our own number an unmatched sender is
 * told they are not on the roster, which is right: they messaged us. Through a relay it would be a
 * reply sent to somebody's customer, from their business, saying something about a roster they have
 * never heard of. So a stranger comes back as "not ours" and nothing is stored about them - not the
 * number, not the message, not the fact that they wrote. That is what makes this arrangement
 * honest rather than merely compliant.
 */

/** Whether we are the number's webhook, or somebody handing us one message at a time. */
export type WhoHoldsTheNumber = 'we do' | 'they do';

export interface WhatCameBack {
  /**
   * False where the sender is not on their roster. There is no reply, nothing was stored, and their
   * own system carries on with the message as though it had never asked us.
   */
  mine: boolean;
  /** What to send back from their number, where there is anything to send. */
  reply?: string;
}

/** What a stranger gets: nothing, said as plainly as possible to the system that asked. */
export const NOT_ONE_OF_YOURS: WhatCameBack = { mine: false };

/**
 * THE SENTENCES ONLY OUR OWN NUMBER MAY SAY.
 *
 * Each one tells somebody something about Groundwork - that they are not on a roster, that their
 * number is not linked to a sign-in, that an invitation is unaccepted. Every one of them is correct
 * to somebody who wrote to us and wrong to somebody who wrote to their supplier about an order.
 */
export const ONLY_ON_OUR_OWN_NUMBER = [
  /not on your organisation's roster/i,
  /does not know this number yet/i,
  /not connected to a Groundwork sign-in/i,
];

export function aStrangerHearsNothing(text: string, who: WhoHoldsTheNumber): boolean {
  return who === 'they do' && ONLY_ON_OUR_OWN_NUMBER.some((rx) => rx.test(text ?? ''));
}
