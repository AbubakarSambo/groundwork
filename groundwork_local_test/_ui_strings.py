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

# Create flow, /grounds/new.
#
# CREATE_STEP_ONE is the sentinel - the proof the page rendered at all, so a drift here fails
# honestly instead of every check after it reporting something misleading. It has to be a string
# from the FIRST step, which is the mistake that was here: CREATE_PAGE_HEADING renders on step 6,
# at the end of a six step wizard, and was being used to prove that step 1 had loaded. It never
# had. The guard could not catch it either - the string does exist in the component, just not on
# the screen the harness was looking at.
# WHO CHECKS IN IS THE LAST SCREEN NOW, NOT THE FIRST, so the sentinel had to change with it.
#
# It used to be "Who is this check-in for?", asked before anything else. That question moved to the
# end on Hafsah's call - "you either set the context to checkin or set it and other checkin, you
# just look at the reports" - because asked first it was a question about org structure put to
# somebody who had not yet said what any of this was about, and it made all twenty-two situations
# open identically.
#
# So step one is the picker, and this is a string that only the picker renders.
CREATE_STEP_ONE = "Or select from the options below"

# The answer on the LAST screen. A suite that wants the picker no longer has to get past anything -
# it lands on /grounds/new and the cards are right there. A suite that wants to CREATE has to reach
# this and answer it, because this screen is what opens the check-in.
CREATE_LAST_STEP = "Last thing: do you check in on this too?"
CREATE_STEP_ONE_ANSWER = "I check in too"
# One situation card, for the suites that walk PAST the picker rather than checking all of it. It
# was typed as "New project" in suite_b - a label that has not existed for some time, and which
# failed silently because the click was guarded by a count().
#
# DELIBERATELY NOT IN PINNED. The full set of card labels is already pinned as CREATE_CARDS in
# suite_s and checked against the rendered picker there; listing one of them here as well makes the
# guard report the other suites for typing their own list, which is exactly what CREATE_CARDS is.
CREATE_PROJECT_CARD = "A new project starting"
CREATE_PAGE_HEADING = "What is this about?"

# Post-verification. "ground" became "check-in" across these too - the same rename as the save
# button, three days later, and equally unnoticed because the harness times out rather than fails.
ONE_LAST_STEP = "One last step"
GO_TO_YOUR_GROUND = "Go to your check-in"
WAITING_TO_SEND = "Waiting to send"
INCLUDED_IN_PLAN = "Included in your plan"

# The organisation gate, /org/setup. An ADMIN whose organisation has no contact email is redirected
# here from every route, so a brand-new admin meets it on the way to their first check-in. The two
# placeholders are how the fields are found: the labels here are plain text beside the input rather
# than bound to it, so get_by_label matches nothing.
ORG_SETUP_HEADING = "Set up your organisation"
ORG_SETUP_NAME_PLACEHOLDER = "Acme Inc."
ORG_SETUP_EMAIL_PLACEHOLDER = "hello@acme.com"

# Everything the guard checks. Kept as a list rather than read by reflection so that a string can be
# added here deliberately rather than by accident.
PINNED = [
    SAVE_MY_CHECKIN,
    INVITE_AND_FINISH,
    SENT_A_LINK,
    GROUND_IS_SET_UP,
    NO_SESSION_ON_DEVICE,
    CREATE_STEP_ONE,
    CREATE_LAST_STEP,
    CREATE_STEP_ONE_ANSWER,
    CREATE_PAGE_HEADING,
    ONE_LAST_STEP,
    GO_TO_YOUR_GROUND,
    WAITING_TO_SEND,
    INCLUDED_IN_PLAN,
    ORG_SETUP_HEADING,
    ORG_SETUP_NAME_PLACEHOLDER,
    ORG_SETUP_EMAIL_PLACEHOLDER,
]
