# The conversation worth coming back to

Written 14 September 2026, after a lead walked a live check-in and called it "absolutely terrible",
"repeat and going around in circles", and the report "a bit rude".

## The diagnosis

The conversation is **extractive**. The lead answers eight questions and receives a report about the
answers they just gave. Nothing comes back while they are in it. Every symptom she hit follows from
that: restating her answer (nothing else to give her), refusing to drop a question (the interview is
the point), a report listing what she did not cover (completeness is the measure).

**A conversation people come back to is a trade.** Every answer buys something back inside the same
turn. That is the whole redesign.

## The five things that make it worth returning to

### 1. It tells you something you did not know

Today the product knows things the lead never sees in the moment: who is blocked on whom, who has
gone quiet, what keeps recurring, what two people believe differently. All of it is computed and
held for a report.

**Give it back mid-conversation.** "You are the third person this week to name the aggregation
point." "Amir said the same thing about that handoff, in different words." A lead who learns
something in the conversation comes back to the conversation.

This needs no new engine. `PatternDetection`, `GroundDependency`, the divergence read and the
contribution read already exist. They are wired to reports, not to turns.

### 2. You leave with something that did not exist before

A target on the board. A handoff with an owner. A question for the next meeting. **Named, in the
close, in their words.** "That is on your board" is a different ending from "here is your report".

### 3. It remembers, visibly

Session 4 should open with what changed since session 3, not with a fresh interview. "Last time the
aggregation point was the hold-up and you were waiting on Kunle. Still?" The prior-session context
already reaches the prompt, compressed to 800 characters and mostly unused.

### 4. It gets sharper, and it earns the right to

Session 1 is generous. By session 6 it knows this person's pattern, what they overstate, what they
leave out, and it can say so. Difficulty that rises with familiarity is most of what makes anything
worth returning to.

### 5. It says the thing nobody else will

Carefully, and about the work, never the person. "Everybody has named the same blocker for three
weeks and nobody owns it." That is the product's whole claim and it is currently confined to reports
that only the lead reads, long after the moment.

## The trade, turn by turn

| The lead gives | They get back, in the same turn |
|---|---|
| An objective with a number | It appears as a target, confirmed out loud |
| Somebody's name | Whether that person has already said something bearing on this |
| A blocker | Who else named it, or that they are the first |
| A date | What else is landing that week |
| A worry | Whether it is recurring, from the pattern detector |
| Nothing new | A short close, not more questions |

Nothing in that table needs a new engine. All of it exists and is pointed at reports.

## Every prompt surface, and what changes

| Surface | Today | Becomes |
|---|---|---|
| Base prompt (116,527 chars) | Sent to everything, holds a whole interview | Identity, voice and safety only. Everything else fires on a trigger. |
| 22 scenario packs (~1,400 each) | A thin steer that loses to the base prompt | ~4,000 each: opening, follow-ups, two examples in that situation's own nouns, what a good answer looks like, what "set" means here |
| Entry setup | Classifies, then hands off | Also carries what it learnt, so the check-in never re-asks |
| Check-in turn | Asks, records, asks | Asks, records, **gives something back**, asks |
| Close | Summarises the conversation | Names what now exists, and asks whether that is what they came for |
| Entry report | Lists what was and was not covered | Answers their first message: did you get what you came for |
| Session report | Describes the session | What changed since last time, and what to do about it |
| Shared report | Where people differ | Plus: what to settle, who has to be in the room, what it costs to leave it |
| Board | What is on record | What needs the lead today, and what happens if nobody acts |
| Coaching | Fires when there is a step | Unchanged. Already conditional, already right. |
| Patterns | A probe when one is surfaced | Also a gift back mid-conversation, per the trade above |

## What "set" means, per scenario family

Every scenario ends with something existing. No conversation closes without one.

- **Targets** (OKR, delivery, cohort, contract): name, number, owner, date.
- **An agreement** (new hire, handover, cofounder, advisor): what both sides take to be true.
- **A shared read** (pulse, sensing, crisis, convening): what is going on, where people differ, what
  to settle and who must be there.

## Order

**Wave 1, the product working.** Keep the number when a target is spoken. Drop the once-only gate.
Per-person owners. Confirm at the close. Close measured against their own first message.

**Wave 2, the trade.** Give something back on every turn, from engines that already exist. This is
the wave that changes how it feels.

**Wave 3, the prompt.** Instrument which blocks fire, move shape into code, decompose the base
prompt, rebuild the 22 packs on the freed budget.

**Wave 4, memory and edge.** Session-over-session continuity that shows, and difficulty that rises
with familiarity.

Wave 1 is small and makes it work. Wave 2 is what makes it worth returning to. Wave 3 is what stops
it being annoying. Wave 4 is what makes it hard to leave.

## How we know

Not test counts. A small set of real transcripts, rated before and after each wave, against one
question the lead set herself:

> Did the lead get what they came for, and would they come back next week without being chased?
