# Participant activation and engagement

> From Hafsah. Build as the participant half of the engagement work (docs/engagement-spec.md), without duplication, within her recorded decisions: Groundwork's own WhatsApp number is the main one; at most one routine proactive message per person per day across email and WhatsApp; no rankings or labels on people; existing users only ever get better.

Groundwork needs a participant activation and engagement engine that works independently of the lead or administrator. Once someone is added to an organisation, Groundwork should take responsibility for getting them verified, into their first meaningful interaction, and eventually into a habit of checking in.

The important distinction is that verification is not engagement, and engagement is not habit formation. We need to solve all three.

## 1. The participant journey Groundwork should manage

1. Invited
2. Reached
3. Verified
4. Engaged
5. Habit

Groundwork should identify exactly where each participant is stuck and respond differently at each stage.

## 2. Strategies for each bottleneck

| Participant state | What Groundwork should do |
| --- | --- |
| Added but never invited | Automatically send an invitation through the available channel. Don't wait for the lead. |
| Invited but not verified | Send a short, personalised reminder with a direct verification link. Explain the immediate benefit. |
| Email invitation ignored | Try WhatsApp once the channel is available and consent requirements are met. |
| Number exists but WhatsApp notification was never sent | Automatically detect and queue an introductory WhatsApp message when the integration goes live. |
| WhatsApp message failed | Detect delivery failure, retry where appropriate, and offer another channel. |
| Verified but never checked in | Invite them directly into their first relevant conversation, rather than a generic product tour. |
| Started but abandoned check-in | Resume from the exact point they stopped, preserving their answers. |
| Completed one check-in but never returned | Follow up with a relevant observation, next step, or reason to return. |
| Regular participant becoming inactive | Recognise their previous contributions and give them a specific reason to engage again. |
| Repeatedly ignores messages | Reduce frequency, offer preferences, and stop unproductive nudges. |

## 3. Ten engagement strategies to build

### A. Make verification feel worthwhile

Instead of asking people to verify their accounts as an administrative requirement, connect verification to something they care about.

For example:

> Hi Abigail, you've been added to Groundwork for the Operations team. There's a private space for you to share what you're working on, where you need support, and what would make your work easier. Verify your account to get started.

Verification should be one tap where possible. Avoid unnecessary password creation, long forms, or additional onboarding screens.

### B. Automatically activate existing phone numbers when WhatsApp goes live

This is particularly important for organisations already using Groundwork before WhatsApp is enabled.

When WhatsApp becomes operational, Groundwork should:

1. Identify participants with phone numbers who have not received a successful WhatsApp welcome message.
2. Check whether they are eligible to receive a message and whether they have already engaged through another channel.
3. Send an introductory message to eligible participants, using the appropriate approved template where required.
4. Track sent, delivered, failed, replied, and opted-out states separately.
5. Never send duplicate welcomes simply because the integration restarted.

The principle: having a phone number on record does not mean the person has been reached.

### C. Give people a reason to check in before asking for updates

A major psychological mistake is making Groundwork feel like another reporting system.

Instead of:

> You have a pending check-in. Please complete it.

Try:

> Hi David, what's one thing that would make your work easier this week? You can share it privately on Groundwork.

Or:

> Your project is moving into its next stage. Is there anything you think the team should anticipate before it becomes a problem?

These messages invite contribution, not compliance.

### D. Use unfinished conversations as the strongest re-entry point

When someone starts a check-in and leaves, Groundwork should remember where they stopped.

> Hi Mercy, you started sharing your thoughts on the new project but didn't finish. We saved your progress. You can pick up exactly where you left off.

Don't reset the check-in or make them repeat themselves.

### E. Build a sense of personal ownership

People should experience Groundwork as something that helps them do their own jobs, not just helps management understand them.

For example:

- Remind them of commitments they personally made.
- Help them prepare for an upcoming responsibility.
- Surface things they said they needed to follow up.
- Offer coaching when they describe a difficulty.
- Help them articulate a concern or recommendation.

Groundwork should become their personal work companion, not just the organisation's check-in tool.

### F. Make the first check-in extremely easy

The first interaction should require very little effort.

For example:

> What is one thing you're focused on this week?

After they answer, Groundwork can ask a useful follow-up, but it should not immediately turn into a long interrogation.

The first experience should demonstrate intelligence and usefulness within the first few exchanges.

### G. Give participants visible evidence that contributing matters

This is probably the most important long-term engagement strategy.

People stop responding when they believe nothing happens with their input.

Groundwork should periodically tell participants about legitimate outcomes from their contributions, without exposing anyone else's private responses.

For example:

> Last week you mentioned that supplier coordination was taking longer than expected. Has anything improved since then?

Or, when supported by actual evidence:

> The team has now agreed on a clearer handover process. Has that helped with the coordination issues you raised?

This creates a feedback loop: I contributed → something happened → Groundwork remembered → my contribution mattered.

### H. Recognise contributions without turning them into rankings

Groundwork can positively reinforce behaviours such as following through on commitments, offering solutions, helping colleagues, and identifying risks early.

Recognition should be specific, evidence-based, and appropriate for the participant's privacy expectations.

For example:

> Your suggestion about coordinating deliveries earlier helped shape the team's next steps. Would you like to help develop it further?

Not generic gamification like points for completing check-ins.

### I. Make nudges context-aware rather than calendar-driven

Someone working on a live project may need more frequent engagement than someone participating in a quarterly strategy review.

Groundwork should consider the person's responsibilities, upcoming milestones, unresolved commitments, current scenario, and previous response patterns.

A message should ideally be triggered because something relevant happened, not merely because three days have passed.

### J. Learn what actually motivates each participant

Different people will engage for different reasons.

Some want their concerns heard. Others want clarity, recognition, less friction, coaching, or help coordinating with colleagues.

Groundwork should learn which legitimate benefits and message formats lead to meaningful participation, without creating invasive psychological profiles.

It should adapt the message, timing, and level of support accordingly.

## 4. A proposed automated activation sequence

This is a starting sequence to test, not a rigid cadence for everyone.

1. **Day 0, invitation.** Introduce Groundwork, explain the participant's role, and provide a direct verification link. Where appropriate, offer a direct path into their first check-in.
2. **Day 2, unverified participant.** If the invitation was delivered but verification is incomplete, send one short reminder focusing on personal value.
3. **Day 4, alternative channel.** If there is no engagement, use an eligible alternative channel, such as WhatsApp, rather than repeatedly sending the same email.
4. **Day 7, first useful interaction.** If verified but inactive, invite the participant to answer one meaningful question relevant to their work.
5. **Day 10, recover or reinforce.** If they abandoned a check-in, offer to resume. If they completed one, show something useful from their own contribution.
6. **Day 14 onward, adaptive engagement.** Move to context-driven nudges, reducing frequency when messages are ignored and increasing relevance when new work or commitments arise.

Every step should stop or change automatically when the participant takes the intended action.

## 5. A dedicated participant engagement engine

Implement these capabilities inside the existing system, not as another menu or dashboard that users must manage.

| Capability | Expected behaviour |
| --- | --- |
| Activation state tracking | Know exactly where each participant is in onboarding and engagement. |
| Channel readiness | Detect when email or WhatsApp becomes available and activate eligible unreached users. |
| Delivery reconciliation | Distinguish queued, sent, delivered, failed, read (where available), and replied. |
| Personalised message generation | Write nudges using the participant's actual scenario and responsibilities. |
| Conversation recovery | Resume abandoned check-ins without losing progress. |
| Engagement memory | Remember which prompts have been answered, ignored, or found useful. |
| Adaptive timing | Learn effective times and frequencies, within sensible limits. |
| Nudge fatigue protection | Prevent repeated, redundant, or excessive messages across channels. |
| Feedback and recognition | Show participants relevant outcomes from their own contributions. |
| Self-service controls | Let participants change notification preferences or opt out of optional messages. |

The engine should run automatically. It should not require the lead to remember who needs inviting, verifying, or nudging.

## 6. What Groundwork should learn from this

Track activation and engagement as distinct outcomes:

- **Reach:** were participants actually contacted?
- **Verification:** did they successfully activate access?
- **First value:** did their first interaction help them?
- **Return:** did they come back without repeated chasing?
- **Contribution:** did they share meaningful information or take action?
- **Retention:** are they still finding value over time?

The learning engine should compare which invitation messages, channels, timing patterns, check-in openings, and follow-up approaches improve these outcomes across different scenarios and roles.

It should also distinguish between someone who is unreachable, someone who doesn't understand Groundwork, someone who doesn't see value, someone who is too busy, and someone who deliberately does not want to participate. Those require different responses.

## 7. WhatsApp as the participant's natural entry point

Once WhatsApp is live, a participant should be able to reply directly to the welcome message and start using Groundwork, rather than being sent through multiple screens.

For example:

> **Groundwork:** Hi Sarah! You've been added to your team's Groundwork space. I can help you stay on top of your work and share what you need from the team. Want to get started? What's one thing you're working on this week?
>
> **Sarah:** We're preparing for the launch, but I'm waiting on the designs.
>
> **Groundwork:** That sounds like an important dependency. When do you need the designs, and is there anything I can help you coordinate?

This turns onboarding into the first useful interaction. Verification should happen seamlessly within that flow, with appropriate identity checks before exposing private organisational information.

## 8. What to build first

1. Automatic activation of unreached participants, including existing phone numbers when WhatsApp becomes operational.
2. Verification recovery, so invited participants don't remain stuck indefinitely.
3. First-check-in conversion, getting verified people into one meaningful conversation.
4. Abandoned-check-in recovery, with complete preservation of context.
5. Evidence-of-value nudges, so people see why returning matters.
6. Adaptive engagement and fatigue controls, so Groundwork learns how to retain participants without becoming annoying.

The key product principle is that Groundwork should own participant activation, but earn participant engagement.

The organisation adds people. Groundwork gets them started. But people should continue using Groundwork because it helps them think, communicate, coordinate, and take ownership of their work, not because someone keeps chasing them.

We shouldn't optimise simply for more check-ins. We should optimise for more meaningful contributions, more ownership, better follow-through, and people voluntarily returning because Groundwork is useful.
