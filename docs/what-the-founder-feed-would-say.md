# The founder's feed, as the prompt described it

Lifted out of `ENGINE_RULES` on 15 September 2026 and kept here word for word.

## Why it moved

Three sections - conversation triggers, the feed's narrative briefing, and the conversation prep
card - described output for the FOUNDER'S surface, and they were sitting in the prompt used for one
person's own check-in. That prompt has exactly one consumer: `conversation.service.ts`, the
check-in. It never renders a feed, never writes a briefing, and never produces a prep card.

They also describe something the product does not have. There is no trigger table, no trigger
entity and no generator anywhere in the codebase; the feed on the board renders the pattern
signals, not a three-sentence briefing.

So this is a specification, not a prompt. It was being sent to the model on every turn of every
check-in, where it could only compete with the instructions that had something to do with the
conversation actually happening.

Nothing here is rejected. If the feed briefing or the prep card gets built, this is the brief for
it, and the examples are good ones - the F1 trigger sentence in particular is the product's own
best statement of how to name a gap without making an accusation.

## The text, unchanged

```
═══════════════════════════════════════════════════════════
CONVERSATION TRIGGERS: when to generate them
═══════════════════════════════════════════════════════════

A conversation trigger is generated when any of the following are detected across two or more periods:

F1 Insight Without Operation: composite signature present.
F2 Vision Execution Gap: team record diverges from senior person's record.
F3 Equity Comfort: specificity declining while equity vesting.
D1 False Completion Reporting: four or more instances.
E1 Equity Without Contribution: two or more periods.
B4 Founder Backstop Dependency: three or more periods.
Cofounder Burden Asymmetry: consistent across three periods.
Milestone miss: evidence definition deadline passed with no matching output.

A conversation trigger is one specific sentence the founder can use verbatim. It is not a summary. It is not a report. One sentence.

It always has three properties:
1. Does not make an accusation. References the record, not a feeling.
2. Invites a shared reading rather than delivering a verdict.
3. Acknowledges something real before naming the gap.

Example for F1: "Your record shows genuine contribution to how the team thinks and decides: the team confirms it. What the record does not show is the operational infrastructure the role was hired to build. I want to look at both together."

Example for False Completion: "Your record has described this platform as complete for three periods and I want to make sure we are both seeing the same picture: can we look at it together?"

Example for milestone miss: "Your evidence definition for [goal] was [their exact words] by [date]. We are past that date. Can we look at where the record stands?"

Generate the trigger. Provide it in the alignment feed. The founder decides whether and when to use it.

═══════════════════════════════════════════════════════════
ALIGNMENT FEED: narrative briefing replaces signal dashboard
═══════════════════════════════════════════════════════════

The alignment feed opens with a narrative briefing before any individual signals.

The briefing is three sentences. Not a list. A paragraph that reads like a briefing from a trusted advisor.

Sentence 1: What is moving. Name who and what specifically.
Sentence 2: What needs a conversation this week. The most important gap or risk.
Sentence 3: The one thing most likely to cause a problem if left unaddressed.

Example: "The engineering team is delivering and the payment integration is on track for the June launch. Sales is showing a third period of pipeline activity without named contract progress: this is the conversation that cannot wait. The infrastructure platform remains the most significant unaddressed risk: Kwame's record claims completion but Amara and David's records describe active workarounds."

Forward signal framing: drift indicators are strategic risk not just behavioural observation:
Not: "Kwame is showing executor to noise drift."
Yes: "If the infrastructure pattern holds, the June launch is at risk."
Not: "Marcus is showing specificity decline."
Yes: "Sales has no named contract at any stage. June 30 is the deadline. The record shows no movement toward it."

After the briefing, show individual signals in the usual format.

═══════════════════════════════════════════════════════════
CONVERSATION PREP CARD: when a flagged conversation is imminent
═══════════════════════════════════════════════════════════

Before any conversation that has been triggered, provide the founder with three things:

1. The positive anchor: the specific strongest contribution from the person's record that should be acknowledged first. Not generic. From the record. "Start with: your work on [specific thing] is in your record and it is real."

2. The one gap: not a list of problems. The single most important gap the conversation should address. "The conversation is about: [specific named gap]."

3. The one question: the question from the record that cannot be answered with a deflection. "Ask: [specific question that requires a named output or named explanation]."

The founder walks in knowing exactly what to say. The awkwardness of not knowing where to start is removed.
```
