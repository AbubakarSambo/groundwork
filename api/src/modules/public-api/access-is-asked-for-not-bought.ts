import { ApiAccessStatus } from '@prisma/client';

/**
 * ACCESS TO THE INTEGRATION API IS ASKED FOR AND GRANTED, NOT BOUGHT.
 *
 * It used to be sold: a live subscription held a working machine token and
 * everybody else was refused. That gate had two problems and only one of them
 * was about money.
 *
 * The first: every integration test waited on a billing state, so the first
 * thing a customer met when connecting was a paywall rather than anything about
 * their integration.
 *
 * The second, and the reason it changed: we could not use our own API in our own
 * back office without paying ourselves. Running Groundwork inside our own
 * company's system IS the acceptance test for this product, and it was failing
 * on a subscription row. A gate that stops us proving the thing we sell is a
 * gate pointed at the wrong target.
 *
 * WHAT A CUSTOMER PAYS FOR AND WHAT A CUSTOMER MAY CONNECT TO ARE TWO
 * DECISIONS. Tied together, neither could move without the other. Separated,
 * approving somebody costs nothing and says nothing about their bill.
 *
 * STILL CHECKED AT THE TOKEN EXCHANGE, not at credential issue, and for the
 * same reason as before: access withdrawn after a credential was issued has to
 * stop working, and tokens are short-lived — so a withdrawal takes effect
 * within one token lifetime rather than waiting for somebody to remember to
 * revoke a credential.
 */

export interface AccessFacts {
  status: ApiAccessStatus;
}

export function mayUseTheApi(request: AccessFacts | null | undefined): boolean {
  return request?.status === ApiAccessStatus.APPROVED;
}

/**
 * WHY NOT, IN WORDS THAT SAY WHAT WOULD CHANGE IT.
 *
 * Four different situations that a single refusal used to flatten into one.
 * "You have not paid" could not tell an organisation that had asked and was
 * waiting from one that had never asked at all — and those need opposite things
 * done about them.
 *
 * None of them says anything about the credential, because in every one of
 * these cases the credential is fine. Somebody debugging a 403 should be sent
 * to the right place.
 */
export function whyTheApiIsRefused(request: AccessFacts | null | undefined): string {
  switch (request?.status) {
    case ApiAccessStatus.APPROVED:
      /* Unreachable through the gate, and answered anyway: a function that
         throws on its own success case is one somebody has to work around. */
      return 'Access is approved.';

    case ApiAccessStatus.PENDING:
      return (
        'This organisation has asked for API access and it has not been decided yet. '
        + 'Nothing is wrong with the credential - it will work as soon as the request is approved.'
      );

    case ApiAccessStatus.DECLINED:
      return (
        'This organisation asked for API access and it was declined. '
        + 'Nothing else about the credential is wrong. Ask again with what changed.'
      );

    case ApiAccessStatus.WITHDRAWN:
      return (
        'API access for this organisation was granted and has since been withdrawn. '
        + 'Nothing else about the credential is wrong.'
      );

    default:
      return (
        'This organisation has not been given API access yet. It is asked for rather than bought: '
        + 'say what you intend to build and somebody will read it. Nothing else about the credential is wrong.'
      );
  }
}

/** Kept for callers that only need the commonest refusal. */
export const NOT_APPROVED = whyTheApiIsRefused(null);

/**
 * Why somebody's request cannot be recorded yet.
 *
 * The one thing asked of the person asking: say what you intend to build. It is
 * read by whoever decides, and a request with nothing in it is one that either
 * gets approved without thought or sits in a queue nobody can act on.
 */
export const SHORTEST_USEFUL_REQUEST = 30;

export function whyThisRequestCannotBeRecorded(whatFor: string | null | undefined): string | null {
  const said = whatFor?.trim() ?? '';
  if (said.length < SHORTEST_USEFUL_REQUEST) {
    return 'Say what you intend to build with it. Somebody reads this and decides, and a request with nothing in it is one that gets waved through or sits in a queue nobody can act on.';
  }
  return null;
}
