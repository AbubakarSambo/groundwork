# Correction: payments are live, and several findings change severity

Recorded 10 September 2026, after the product owner corrected me.

**What I got wrong.** Parts of the audit and the fix plan state that payment is not connected. I
took that from a note dated 17 August and from the code's behaviour when no key is present. It is
not something the repository can tell you: the billing code is fully wired, and whether a
deployment can take money depends only on whether `STRIPE_SECRET_KEY` is set in that environment.
The service reads the key at construction, and refuses cleanly at the point of use when it is
absent. I could not see production and should have said so rather than asserting it.

Payments are live on production. Every line below changes as a result. The findings themselves were
read correctly; it is their consequence that was understated.

## Findings that become more serious

**P6B-011, cancelling ends the subscription immediately.** `billing.service.ts:564-577` calls
`subscriptions.cancel()`, which ends it there and then, and clears the period end locally. A
customer who cancels on the second day of a paid month loses the twenty-eight days they have
already paid for. No refund is issued and nothing tells them. This is now real money taken from a
real customer, and it moves to the top of the billing work. The fix is `cancel_at_period_end`, and
the copy alongside it must say when access actually stops.

**The webhook race.** The invoice dedupe at `billing.service.ts:938` reads with `findFirst` and then
writes, against a column that is now uniquely indexed. One path handles the resulting violation and
this one does not, so a redelivered invoice event becomes a server error. Stripe retries on a 500,
so this repeats. Live.

**P6B-012, the free allowance counts the wrong thing.** `canCreateGround` counts every check-in the
organisation has ever created against the free limit. With payment live this decides who is asked
to pay and when, so it is a billing correctness question rather than a product one.

**P5-084, the buy button has no error path.** Still a real defect, but a rarer one than the plan
implies: it now shows on a genuine card decline rather than on every press.

## Findings that shrink

**P5-085**, which said both billing screens promise an outcome the system cannot deliver, largely
dissolves. The promise is now true. What survives is the wording about proration, which should be
checked against what the code actually asks Stripe to do rather than assumed.

**Part C, batch 17** no longer needs a decision from the product owner. Wire-or-reword is settled:
it is wired. The batch reduces to the missing error path.

## What still needs confirming, and by whom

I cannot see the production environment from the repository. Somebody with access should confirm,
in this order: that `STRIPE_WEBHOOK_SECRET` is set, because without it no invoice event is trusted
and the billing record silently stops matching Stripe; that the webhook endpoint is registered and
recently delivering; and whether `POST /billing/purchase-session`, which is live and creates
charges under a comment claiming it is unreachable, has ever been called in production.

That last one matters most. If it has been called, somebody has been charged through a path the
team believes is dead.
