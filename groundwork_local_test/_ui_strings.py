"""
THE UI COPY THIS HARNESS DEPENDS ON, IN ONE PLACE.

Every string here is text the persona suites click on or wait for in the real browser. They were
written inline, one per suite, and the product renamed one of them:

    "Save my ground →"  ->  "Save my check-in →"     (0a342b6, 26 August)

Nothing connected the button to the harness, so five suites went red and stayed red. Playwright's
`.click()` waits for an element that will never appear, throws after thirty seconds, and the step
that throws is `provision_ground` - so every suite needing a signed-in user died downstream of it.
`suite_s` reported all eighteen picker cards missing because the page had never loaded at all.

Collected here so that `client/src/lib/the-persona-harness-and-the-ui-agree.spec.ts` can check every
one against the components on each client test run. A rename now fails in seconds with the old and
new text side by side, instead of costing a thirty-second timeout in CI and an afternoon reading
browser logs.

WHEN THIS FAILS, THE HARNESS IS USUALLY WRONG AND THE PRODUCT IS USUALLY RIGHT. Copy improves; that
is not a regression. Update the string here, not the component - unless the rename was itself the
accident, which the diff will tell you.
"""

# Entry flow, /start
SAVE_MY_CHECKIN = "Save my check-in"
INVITE_AND_FINISH = "Invite & finish"
SENT_A_LINK = "We sent a link to"
GROUND_IS_SET_UP = "Your check-in is set up"
NO_SESSION_ON_DEVICE = "We couldn't find your session on this device"

# Create flow, /grounds/new. The heading is the harness's proof the page rendered at all - a
# sentinel, so if it drifts every check after it reports something misleading rather than nothing.
CREATE_PAGE_HEADING = "What is this about?"

# Post-verification. "ground" became "check-in" across these too - the same rename as the save
# button, three days later, and equally unnoticed because the harness times out rather than fails.
ONE_LAST_STEP = "One last step"
GO_TO_YOUR_GROUND = "Go to your check-in"
WAITING_TO_SEND = "Waiting to send"
INCLUDED_IN_PLAN = "Included in your plan"

# Everything the guard checks. Kept as a list rather than read by reflection so that a string can be
# added here deliberately rather than by accident.
PINNED = [
    SAVE_MY_CHECKIN,
    INVITE_AND_FINISH,
    SENT_A_LINK,
    GROUND_IS_SET_UP,
    NO_SESSION_ON_DEVICE,
    CREATE_PAGE_HEADING,
    ONE_LAST_STEP,
    GO_TO_YOUR_GROUND,
    WAITING_TO_SEND,
    INCLUDED_IN_PLAN,
]
