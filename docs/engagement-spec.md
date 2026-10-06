# Groundwork User Activation, Engagement & Retention — Claude Code Prompt

We need to improve activation, engagement and retention for people who have already entered Groundwork.

This includes:

- a lead who creates a Ground and then disappears
- a lead who creates a test Ground but never uses Groundwork with a real team
- a lead who invites people but does not stay engaged
- participants who complete one check-in but do not return
- participants whose check-ins stall
- teams that collectively do not engage
- leads who receive reports but do not act or return
- users who have not yet experienced enough value to form a Groundwork habit
- users who may opt out of Groundwork emails

Do NOT redesign Groundwork.

Do NOT expand this into unrelated company operating systems, project architecture, requests, finance, permissions, etc.

Work with the existing:

- Grounds
- scenarios
- check-ins
- reports
- insights
- emails
- nudges
- chat
- recommendations
- user/team context

The problem we are solving is:

People give Groundwork information. Groundwork must continuously give enough useful value back that participants keep engaging, leads keep using it, test users convert into real users, and each useful Ground naturally creates a reason to use Groundwork again.

The central loop is:

**GROUND CREATED**

**→ PEOPLE PARTICIPATE**

**→ GROUNDWORK LEARNS**

**→ GROUNDWORK RETURNS USEFUL INSIGHT**

**→ PERSON ACTS**

**→ SOMETHING CHANGES**

**→ GROUNDWORK FOLLOWS UP**

**→ NEXT USEFUL GROUND / CHECK-IN**

**→ REPEAT USE.**

For a test user:

**TEST GROUND**

**→ EXPERIENCE VALUE**

**→ ONE SMALL REAL GROUND**

**→ REAL TEAM INSIGHT**

**→ ACTION**

**→ REPEAT USE.**

For participants:

**CHECK-IN**

**→ VALUE RETURNED**

**→ ACTION / PROGRESS**

**→ SEE WHAT CHANGED**

**→ NEXT CHECK-IN.**

The objective is NOT simply check-in completion.

The objective is:

Make Groundwork useful enough that people have a reason to keep coming back.

# 1. AUDIT WHAT EXISTS FIRST

Before changing code, inspect the existing implementation for:

- Ground creation
- Ground status/lifecycle
- test/demo Grounds
- Ground invitations
- participant invitation emails
- lead emails
- participant emails
- check-in reminders
- incomplete/stalled check-ins
- reports
- report emails
- report summaries
- insights
- recommendations
- nudging
- follow-ups
- scenario recommendations
- email scheduling
- email preferences
- unsubscribe/opt-out
- paid/free organisation state
- engagement analytics
- repeat Grounds
- chat entry points

For each classify:

- EXISTS AND WORKS
- PARTIAL
- EXISTS BUT DISCONNECTED
- DOES NOT EXIST

Do not claim something works because a model, route, template, prompt or mocked test exists.

Trace the actual user journey.

Then propose the smallest implementation changes necessary to achieve the engagement loops below.

Do not redesign unrelated Groundwork systems.

# 2. A CREATED GROUND IS NOT AN ACTIVATED USER

This distinction is critical.

Someone creating a Ground does NOT mean Groundwork has activated them.

Activation happens when they experience meaningful value.

Track the Ground journey approximately as:

**CREATED**

**→ PEOPLE ADDED**

**→ INVITED**

**→ FIRST RESPONSE**

**→ ENOUGH SIGNAL**

**→ FIRST MEANINGFUL INSIGHT**

**→ LEAD RECEIVES INSIGHT**

**→ LEAD ACTS**

**→ FOLLOW-UP**

**→ SECOND GROUND/CHECK-IN**

**→ REPEAT USER.**

Also distinguish:

**TEST GROUND**

**ABANDONED BEFORE VALUE**

**ABANDONED AFTER VALUE**

**ACTIVE**

**RE-ENGAGED.**

The intervention should depend on where the Ground stalled.

# 3. GROUNDWORK SHOULD OWN THE JOURNEY TO FIRST VALUE

Once someone creates a Ground, Groundwork should behave like:

I've got it from here.

The lead should not have to become Groundwork's adoption manager.

Groundwork should help:

- get people invited
- explain why their participation matters
- nudge participants appropriately
- monitor participation
- identify where engagement stalls
- tell the lead what is happening
- return useful insight as soon as responsibly possible
- deliver the full insight when enough evidence exists
- recommend what to do
- help the lead act
- follow up on what changed
- recommend the next useful Ground/check-in.

# 4. CREATED GROUND, NO PEOPLE ADDED

Do NOT send:

"Finish setting up your Ground."

Use the reason they created it.

Examples:

Your Sales Ground is ready — add 3 people and I'll show you where their picture differs from yours

You wanted to understand why the project is slipping — I still need the team's side

Your new-hire Ground is ready — add the people involved and I'll take it from there

The CTA should communicate the value.

Not configuration.

Reduce the psychological commitment.

Where appropriate say:

Start with 3 people. You don't need the whole team.

# 5. PEOPLE INVITED, NOBODY RESPONDS

Groundwork should help the lead launch the Ground.

Example:

Your Ground is waiting on 4 people — I can follow up with them

Tell the lead:

- who has been invited
- whether anyone has engaged
- what Groundwork is already doing
- whether the lead actually needs to intervene.

If useful, offer a message the lead can send personally.

But Groundwork should handle as much of the routine follow-up as possible.

# 6. SOME PEOPLE RESPONDED, BUT NOT ENOUGH FOR THE FULL PICTURE

Do not simply say:

"3/8 responses received."

If Groundwork has a legitimate early observation, return it carefully.

Example:

Abigail, James and Lucy have checked in — one difference is already worth watching

Then:

"I don't have enough perspectives yet to treat this as the team's view, but Abigail and James currently describe ownership differently."

Or:

"I need two more perspectives before I'd trust the team-level picture."

Be explicit about evidence limitations.

Do not manufacture an insight just to keep the lead interested.

If there is no responsible insight yet, say what Groundwork has learned operationally and what it is doing next.

# 7. FIRST MEANINGFUL INSIGHT IS THE ACTIVATION MOMENT

When enough information exists, do NOT send:

"Your Groundwork report is ready."

The insight itself should arrive.

Example:

Your team agrees on the target, but not on who owns the next step

Then give the lead the core finding in the email body.

Follow with:

What I would do

"Clarify ownership with James and Vera before Friday."

Then:

I can help you do that.

This demonstrates the Groundwork proposition:

**PRIVATE INPUT**

**→ UNDERSTANDING**

**→ SOMETHING THE LEAD DIDN'T KNOW**

**→ RECOMMENDATION**

**→ ACTION.**

That is the moment we want leads to experience quickly.

# 8. TEST GROUND → REAL GROUND

A test Ground is not the end goal.

After someone experiences Groundwork using test/demo information, help them cross into real usage.

Do NOT ask them to:

"Roll Groundwork out across your organisation."

Make the next commitment small.

Example:

You've seen how Groundwork works. Try it now on one real situation.

If they tested Sales:

Try this with your real sales team

"Add 3–5 people around one live sales target. Groundwork will privately check whether everyone sees the target, opportunities and blockers the same way."

If they tested a project:

Try it on one live project

"Choose one project involving several people. Groundwork will show you where delivery is aligned and where the picture differs."

If they tested a new hire scenario:

Try it with one real new hire

The conversion target is:

**ONE REAL ISSUE + A FEW REAL PEOPLE.**

Not enterprise rollout.

# 9. TEST GROUND CONVERSION SHOULD USE WHAT THEY TESTED

Do not show a generic feature catalogue after a test.

Use their behaviour.

They created a particular Ground because something about that problem interested them.

Continue from that.

**TEST SALES → REAL SALES.**

**TEST PROJECT → REAL PROJECT.**

**TEST NEW HIRE → REAL NEW HIRE.**

**TEST ALIGNMENT → REAL ALIGNMENT.**

Where there is enough context, personalise the conversion message around what they already explored.

# 10. LEAD CREATED A GROUND AND DISAPPEARED

Do not send generic:

"You haven't completed your setup."

Use their original intent.

Examples:

You wanted to understand why Sales is missing target — your Ground is still ready

You set up the Kenya launch Ground but haven't heard from the team yet

You wanted a read on your new hire's first 30 days — the Ground is still waiting for the team

Then make the next step simple.

"You don't need to configure anything else. Add the people involved and Groundwork can take it from there."

Or:

"Start with three people."

# 11. LEAD RECEIVED A REPORT AND THEN DISAPPEARED

This is different from someone who never reached value.

They already experienced Groundwork.

Bring them back through continuity.

Example:

The ownership gap Groundwork found last week is still unresolved

Or:

James and Vera saw the sales priority differently last week — has that changed?

Or, where things improved:

The issue Groundwork found last week appears to be moving — want me to check whether the team now sees it the same way?

The next Ground/check-in should emerge from the previous insight.

Not from product marketing.

# 12. PARTICIPANTS MUST RECEIVE VALUE TOO

People should not experience:

**CHECK-IN → CHECK-IN → REMINDER → CHECK-IN.**

After participating, return useful information.

Examples:

- what they committed to
- what progressed
- what remains open
- what they are waiting on
- who is waiting on them
- a blocker they raised
- what changed since their previous check-in
- something their contribution affected
- useful progress
- something Groundwork can help them think through
- positive contribution worth recognising.

Example subject:

You closed 4 commitments; Lucy is waiting on one final item

The value belongs in the email body.

# 13. EMAIL SUBJECTS MUST CARRY THE INSIGHT

Do not use:

"Groundwork summary"

"Your weekly report"

"Your team this week"

"Check-in reminder"

"Your report is ready"

"3 things need your attention."

The subject itself should tell the recipient something useful.

Examples:

7 check-ins have stalled, but Abigail is making strong progress

Abigail is ahead; James needs your help on 2 commitments

Sales is at 54%; Vera has 3 deals that could close the gap

Lucy is carrying more of the project than planned

4 people are waiting on Eric; 2 deadlines are now at risk

James, Vera and Mercy see the Q4 priority differently

Hard rule:

If the recipient only reads the subject, they should still learn something useful.

Use people's names when materially relevant, evidence-backed and appropriate for that recipient.

Do not manufacture drama.

# 14. LEADS NEED VALUE DIRECTLY IN EMAIL

Do not make leads enter Groundwork just to understand the finding.

Lead emails should tell them:

- what changed
- what is going well
- what is not moving
- who may need attention
- where useful contribution is happening
- where engagement is weak
- what Groundwork is already doing
- what Groundwork would do next.

The lead should feel:

Groundwork is helping me run this team.

# 15. STALLED CHECK-INS ARE ENGAGEMENT INTELLIGENCE

Do NOT automatically shorten stalled check-ins.

Do not assume:

"Person stalled → check-in is too long."

The bigger question is:

Why has this person not experienced enough value to keep engaging?

Distinguish:

- first-time participant who has only been asked questions
- previously active participant who suddenly stops
- several people on one team disengaging
- whole team not participating
- participant who engages with some Grounds but not others
- participant who returns after receiving insight
- participant who engages after Groundwork helps solve something.

These are different engagement situations.

# 16. 7 STALLED CHECK-INS SHOULD BECOME AN INSIGHT

Do not tell the lead only:

"7 check-ins incomplete."

Example:

7 check-ins have stalled, but Abigail is making strong progress

Then explain:

"Seven people haven't completed their current check-ins.

Five have mostly experienced Groundwork as something asking them for information and haven't yet received much useful value back.

Two previously participated consistently but have gone quiet this round.

Abigail is different. She has completed both recent check-ins, closed four commitments and used Groundwork to work through a blocker.

I'm going to focus the next follow-up on returning something useful to the stalled participants rather than sending another generic reminder."

That is the product.

# 17. VALUE FIRST, THEN ASK

Where Groundwork has enough context, return something useful before asking a stalled participant to come back.

Example:

You raised this last week — here's what happened

"You said you were waiting on Lucy for budget approval. That approval is now complete.

Your Groundwork check-in is still open when you're ready to tell me what changed."

Or:

One thing from your last check-in is still unresolved

"You were waiting on James for the implementation date. It still hasn't been added to the plan. I can help you follow up."

Or:

Something you contributed changed

"The delivery risk you raised is now reflected in the project plan."

**VALUE → ASK.**

Not:

**ASK → REMINDER → REMINDER.**

# 18. GOOD NUDGING

Do not repeatedly send:

"Complete your check-in."

Use the person's actual context.

Examples:

The blocker you raised last week is still open. Has anything changed?

You committed to contacting three customers this week. How did it go?

Two people are waiting on the decision you mentioned. Want to work through it?

Your sales target is still within reach, but the three largest opportunities don't have a next customer action. Want to work through them?

The nudge should help someone think or act.

# 19. WHOLE TEAM DISENGAGEMENT

If most of a team stops participating, do not treat this as many independent reminder problems.

Tell the lead.

Example:

6 of 8 Operations check-ins have stalled; Sales participation is holding

Then explain what is different about Operations.

Possible factors:

- little value returned so far
- repeated Groundwork requests without visible outcome
- participation previously strong but recently fell
- lead/team adoption behaviour differs
- team workload changed.

Do not claim causes without evidence.

Recommend what to investigate or do next.

# 20. "WHAT I WOULD DO"

Leads should get a small number of useful recommendations.

Example:

What I would do this week

- Ask Vera to put dates against her three late-stage opportunities.
- Check in with James directly; his Groundwork participation dropped at the same time two commitments stalled.
- Recognise Abigail — she closed all four commitments and two teammates independently mentioned her contribution.

Use actual evidence.

Where Groundwork can handle something:

Want me to nudge Vera?

Want me to help you prepare for James?

# 21. POSITIVE INSIGHT IS PART OF ENGAGEMENT

Do not make Groundwork synonymous with problems.

Surface:

- commitments completed
- blockers resolved
- progress
- useful contributions
- people helping others
- strong ownership
- improvements since last check-in.

Examples:

Abigail closed all 4 commitments this week

Your blocker from last week has been resolved

Two teammates independently mentioned that your work helped them move forward

This gives both participants and leads reasons to associate Groundwork with progress.

# 22. SALES / TARGET NUDGING

Where Groundwork already knows:

- target
- progress
- opportunities
- commitments
- blockers

use it.

Example:

Sales is at 54%; 3 opportunities could still close the gap

Then help the relevant person think through:

- next action
- customer contact
- blocker
- commitment
- date.

Do not send generic motivational sales messages.

# 23. CONTEXTUAL DISCOVERY OF OTHER EXISTING GROUNDS

Existing users should discover more Groundwork use cases through context.

Not:

"Here are 15 other things Groundwork can do."

Instead:

Worth doing next

"You said revenue is the priority this quarter, but the team currently describes different account priorities. Run a Sales Alignment Ground."

Or:

"Four people recently joined. Run the 30-day New Hire Ground."

Or:

"The project has moved into delivery. Start the weekly project check-in."

Every recommendation should answer:

Why this? Why now?

# 24. WEEKLY LEAD EMAIL

Create/improve a strong weekly lead email.

Subject comes from the strongest actual finding.

Example:

7 check-ins have stalled, but Abigail is making strong progress

Body should be concise:

**THE BIGGEST THING I NOTICED**

The most important insight.

**WHAT'S GOING WELL**

Progress and positive contribution.

**WHO/WHAT MAY NEED ATTENTION**

Only meaningful things.

**ENGAGEMENT**

What Groundwork thinks is actually happening — not just completion percentages.

**WHAT I'M ALREADY HANDLING**

Follow-ups/nudges Groundwork is managing.

**WHAT I WOULD DO**

Maximum 2–3 recommendations.

**WORTH DOING NEXT**

1–2 contextually relevant existing Grounds/scenarios.

# 25. WEEKLY PARTICIPANT EMAIL

Possible structure:

**YOUR PROGRESS**

**WHAT'S STILL OPEN**

**WHAT CHANGED**

**WHAT YOU'RE WAITING ON**

**WHO MAY BE WAITING ON YOU**

**ONE USEFUL THING I NOTICED**

**HOW I CAN HELP**

Again, the subject should carry value.

# 26. DO NOT OVER-EMAIL

Default:

No more than one routine proactive Groundwork email per person per day.

Do not send separate routine emails for:

- every Ground
- every check-in
- every reminder
- every insight
- every recommendation.

Bundle.

If nothing useful happened, send nothing.

Time-sensitive/urgent messages can be exceptions where waiting would genuinely hurt the work.

# 27. EMAIL OPT-OUT FOR ORGANISATIONS NOT ON A PAID PLAN

Users whose organisation is not on a paid Groundwork plan must be able to opt out of receiving Groundwork engagement/insight emails where legally/product-wise appropriate.

Audit the existing subscription/email preference system before changing anything.

Do not interfere with mandatory transactional, security, account or legally required communications.

This requirement concerns optional Groundwork engagement/insight communication.

# 28. DO NOT MAKE OPT-OUT A ONE-CLICK ACCIDENT

When an eligible user chooses to stop receiving these Groundwork emails, do not immediately unsubscribe them from the first click.

Ask for confirmation.

For example:

Stop receiving Groundwork insights by email?

Then explain, briefly and concretely, what will change.

Do not use manipulative dark patterns.

Do not shame them.

Do not make cancellation deliberately difficult.

But make the consequence clear.

# 29. EXPLAIN WHAT IS LOST BEFORE THEY CONFIRM

The confirmation should be contextual to the user's role where possible.

For a participant:

If you turn these emails off, you won't receive Groundwork's email summaries about your progress, open commitments, blockers, things you're waiting on, or useful changes between check-ins. You can still use Groundwork directly.

For a lead:

If you turn these emails off, you won't receive Groundwork's email insights about team progress, stalled engagement, emerging differences, people who may need attention, positive contributions or recommendations for what to do next. You can still access Groundwork directly.

Where relevant, explain the team consequence without exaggeration:

Groundwork can still use the information available inside the product, but you may miss timely insights or follow-ups that would normally reach you by email.

Do NOT say things like:

"Your team will suffer."

"Groundwork won't work."

unless that is literally true.

Be factual.

# 30. ASK THEM TO CONFIRM

Confirmation UX should be something like:

Are you sure you want to stop Groundwork insight emails?

Then concise explanation.

Actions:

Keep email insights

Turn off email insights

The safe/default visual action can remain keeping emails, but do not hide or obstruct the opt-out.

After confirmation:

- persist the preference correctly
- stop eligible future engagement/insight emails
- respect the preference everywhere
- do not repeatedly ask them to re-enable it.

# 31. EMAIL OPT-OUT SHOULD NOT DESTROY THE PRODUCT EXPERIENCE

If someone opts out of email:

Groundwork should still, where existing product capabilities allow:

- retain their insights in Groundwork
- show useful information when they return
- continue appropriate in-product engagement
- preserve their Ground/check-in history
- allow them to re-enable emails later.

Do not interpret:

"Don't email me"

as:

"Delete my Groundwork history"

or:

"Stop Groundwork from working."

These are different preferences.

# 32. PAID PLAN BEHAVIOUR MUST FOLLOW EXISTING PRODUCT RULES

The requirement above specifically applies to organisations not on the paid plan.

Audit how paid/free status is currently represented.

Do not invent subscription logic.

Do not accidentally change email behaviour for paid organisations without first identifying the existing intended rules.

If the existing paid-plan behaviour conflicts with this specification, report the conflict before changing it.

# 33. EMAIL PRIORITISATION

Before sending any routine email ask:

- Is this useful?
- Does this person need it now?
- Have we already emailed them today?
- Can it be bundled?
- Is Groundwork returning value or merely asking for something?
- Has this person opted out?
- Is their organisation eligible for this communication?
- Is this communication transactional/required or optional engagement?
- Is there a more important insight to send instead?

Possible decisions:

**SEND**

**BUNDLE**

**WAIT**

**DO NOTHING**

**SUPPRESS DUE TO PREFERENCE.**

# 34. MEASURE ACTIVATION AND RETENTION

Do not optimise primarily for:

"Ground created."

Track the meaningful funnel:

**GROUND CREATED**

**→ PEOPLE ADDED**

**→ FIRST PARTICIPATION**

**→ FIRST MEANINGFUL INSIGHT**

**→ LEAD ACTION**

**→ FOLLOW-UP**

**→ SECOND GROUND/CHECK-IN**

**→ REPEAT USE.**

For tests:

**TEST GROUND CREATED**

**→ TEST VALUE EXPERIENCED**

**→ REAL GROUND CREATED**

**→ REAL PARTICIPANTS**

**→ REAL INSIGHT**

**→ REPEAT USE.**

For participants:

**CHECK-IN**

**→ VALUE RETURNED**

**→ RETURN**

**→ REPEAT PARTICIPATION.**

Also track opt-out state appropriately so suppressed emails are not incorrectly treated as failed engagement attempts.

# 35. DO NOT OPTIMISE FOR EMAIL OPEN RATE

Email opens are secondary.

We care about:

- first meaningful insight reached
- lead acted
- participant received value
- participant returned
- stalled participant re-engaged
- test Ground converted to real Ground
- real Ground produced useful insight
- another Ground/check-in started
- repeat use.

Groundwork should create useful behaviour, not merely clickable emails.

# 36. REQUIRED TEST JOURNEYS

Test these end-to-end.

**TEST 1 — GROUND CREATED, LEAD DISAPPEARS**

Lead creates Sales Ground.

Adds nobody.

Verify follow-up uses their original purpose and invites a small next step.

**NOT:**

"Complete setup."

**TEST 2 — TEST GROUND → REAL GROUND**

Lead creates a test Sales Ground.

Experiences output.

Verify Groundwork recommends:

one real sales problem

+

3–5 real people

rather than a company-wide rollout.

**TEST 3 — PEOPLE INVITED, NOBODY RESPONDS**

Verify Groundwork:

- follows up appropriately
- tells lead what it is doing
- does not make lead manually chase everyone immediately.

**TEST 4 — PARTIAL PARTICIPATION**

3 of 8 people respond.

Verify Groundwork returns legitimate early value if possible.

Verify it clearly states evidence limitations.

Do not invent a team-level conclusion.

**TEST 5 — FIRST VALUE**

Enough people participate.

Verify lead receives an email with actual insight in the subject/body.

**NOT:**

"Your report is ready."

**TEST 6 — LEAD DISAPPEARS AFTER REPORT**

Verify Groundwork uses the previous finding to create continuity.

Example:

The ownership gap Groundwork found last week is still unresolved

**TEST 7 — 7 STALLED, ABIGAIL DOING WELL**

12-person Ground.

7 check-ins stalled.

Abigail is participating and progressing.

Verify subject resembles:

7 check-ins have stalled, but Abigail is making strong progress

Verify body explains what Groundwork thinks is happening.

Do NOT automatically shorten the check-ins.

**TEST 8 — PARTICIPANT HAS NOT SEEN VALUE**

Participant previously answered Groundwork but ignores next check-in.

Verify Groundwork returns useful context/insight before another generic reminder.

**TEST 9 — TEAM DISENGAGEMENT**

Most of one team stops participating.

Verify Groundwork detects the team pattern rather than sending endless individual reminders.

**TEST 10 — USEFUL PARTICIPANT EMAIL**

Verify participant gets actual value about their own work.

**TEST 11 — EMAIL VOLUME**

Multiple potential messages exist for one person.

Verify Groundwork bundles routine communication.

**TEST 12 — CONTEXTUAL NEXT GROUND**

Current Ground reveals another existing Ground would be useful.

Verify recommendation explains why.

**TEST 13 — FREE/UNPAID ORG EMAIL OPT-OUT**

Eligible user clicks email opt-out.

Verify they see confirmation BEFORE preference changes.

Verify the confirmation clearly explains what email insights they will stop receiving.

Verify:

Keep email insights

and

Turn off email insights

both work.

Verify final opt-out persists.

Verify future optional insight emails are suppressed.

Verify Groundwork itself remains usable.

**TEST 14 — LEAD OPT-OUT**

Lead in eligible organisation opts out.

Verify explanation reflects what a lead loses:

- team progress summaries
- engagement insight
- emerging differences
- people needing attention
- positive contribution
- recommendations.

Do not exaggerate consequences.

**TEST 15 — PARTICIPANT OPT-OUT**

Participant opts out.

Verify explanation reflects participant value:

- personal progress
- open commitments
- blockers
- things they are waiting on
- relevant changes.

**TEST 16 — OPTED-OUT USER**

Generate an otherwise valid weekly insight email.

Verify it is suppressed before delivery.

Verify analytics do not incorrectly record this as an ignored email.

# 37. DEFINITION OF DONE

This work is successful when:

Creating a Ground starts an activation journey rather than ending one.

Groundwork actively helps leads reach first value.

Test Grounds naturally convert toward one small real use case.

The first meaningful insight arrives quickly and directly.

Participants receive useful value back from what they contribute.

Stalled users receive value rather than endless generic reminders.

Leads understand engagement patterns rather than just completion percentages.

Lead email subjects carry the actual insight.

Participant email subjects carry actual value.

Positive progress is surfaced alongside problems.

Groundwork tells leads what it is already handling.

Groundwork recommends a small number of useful next actions.

Previous insights create reasons to return.

Existing Grounds/scenarios are introduced contextually rather than marketed generically.

People are not flooded with email.

Eligible users can opt out of optional email insights, are clearly told what they will stop receiving, confirm their decision, and have that choice respected.

And most importantly:

Groundwork does not wait for users to form the habit themselves. It takes responsibility for getting each Ground from creation to useful insight, and then uses that value to create the reason for the next interaction.

# FIRST RESPONSE REQUIRED

Do not start coding immediately.

First audit the existing implementation and return only:

- What activation behaviour exists today after a Ground is created.
- What happens today when a lead creates a Ground and disappears.
- What happens with test Grounds today.
- What happens when participants stall.
- What value participants currently receive back.
- What value leads currently receive by email.
- How email subjects are currently generated.
- Current email frequency/reminder behaviour.
- Current email preference/unsubscribe behaviour.
- How paid vs unpaid organisation status currently affects email.
- What engagement/activation analytics already exist.
- Exact gaps against this prompt.
- The smallest implementation sequence to close those gaps.
- The tests you will use to prove each journey.

Do not expand the scope beyond activation, engagement and retention.

Do not redesign unrelated Groundwork architecture.

Do not tell me something works unless you have traced and verified the actual user journey.
