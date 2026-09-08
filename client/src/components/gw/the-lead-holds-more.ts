/**
 * A PARTICIPANT IS TOLD THEY ARE NOT SEEING EVERYTHING. G26's "visibly absent".
 *
 * Somebody should know the lead holds context they cannot read, rather than believing they are
 * looking at all of it. With CONTEXT_ENABLED off, `canSeeDocument` returns `isMine` and ignores the
 * visibility column entirely - every document is private to whoever uploaded it - so a participant
 * is definitely looking at less than the lead is, and that is exactly the state where nothing used
 * to admit it.
 *
 * IT LIVES ALONE NOW BECAUSE THE BLOCK AROUND IT WAS DELETED. It used to be exported from
 * `ContextStrength`, the "what this check-in can tell you" read, which is gone - and a promise to a
 * person must not be deleted as a side effect of removing the panel it happened to sit in.
 */
export const LEAD_HOLDS_MORE =
  'The lead may hold context for this check-in that is not shown here. That is by design, and it never includes anything you have said.'
