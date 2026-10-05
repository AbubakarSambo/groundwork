# Plain names for the 49 patterns

**Approved by Hafsah, 29 September 2026 (decision 52), with B5 as written here (the code's meaning)
and eight names reworded from the 26 September draft: B3, B8, B11, E1, E3, E5, F3 and F4.** The
internal names and codes are untouched. Hafsah, 26 September 2026: "keep the internal names. Write
a plain name for each of the 49 patterns, for use on screens." The approved names live in one place
the product reads, `api/src/modules/patterns/plain-pattern-names.ts`, copied here word for word;
`plain-pattern-names.spec.ts` checks the two match. Patterns are now switched on
(`PATTERNS_ARE_SERVED = true`), and are served only under the rules in
`api/src/modules/patterns/who-reads-a-pattern.ts`.

## What a plain name has to do

The internal names were written for whoever is reading the detector. Several of them are **labels
on a person** — "Blame Shifting", "CEO-Pleasing", "Defensive Leadership", "Extractive Behaviour" —
and the product's own rule is that no label goes on a person: say what happened, why, and what
would change it. So a plain name here describes **what the record shows happening**, never what
somebody is. That is why most of them are a short sentence rather than a noun phrase.

Two of them, E4 and F5, are on `ALIGNMENT_FEED_ONLY_CODES` and are **never named to either person
directly**. They have plain names here for completeness and for an internal screen only. They are
marked, and they must not appear on anything a participant or a lead reads.

## A1, reworded after you flagged it (PROVISIONAL)

You approved "Does the coordinating other people skipped" and then found it reads as a broken
sentence inside a line, which it does: "the coordinating other people skipped" is a reduced
relative clause, fine on a label and dense in the middle of a sentence.

**Changed to "Takes on coordination other people left undone."** It reads as a label on its own and
inside a sentence: "Amani takes on coordination other people left undone." Marked provisional
because it replaces wording you had already approved - say the word and it goes back, or say a
better one.

The other forty-eight were checked for the same fault. They begin with a plain verb and an ordinary
object, which reads either way round; A1 was the only one with a clause hanging off its object.

## One place where your example and the code disagree

You gave "Coordination Without Leverage" → "Coordinates without being in charge". The code means
something different by leverage: B5 is *"heavy communication, no reduction in blockers"* — a lot of
coordinating that does not unblock anything, regardless of authority. Being coordinator without
authority is a real and different thing, and often not a fault at all.

I wrote B5 to the code's meaning and left your sentence below it. **Settled, decision 52: B5 stays
as written here, the code's meaning.**

## Good news (8)

| Code | Internal name | Plain name | What the record shows |
| --- | --- | --- | --- |
| R3 | Named Collaborator | Credits somebody else by name | They named another person's specific contribution. |
| M1 | Directional Executor | Delivers what was agreed, with proof | Specific outputs against stated goals, backed by something checkable. |
| M2 | Velocity Multiplier | Makes other people faster | Their work repeatedly lets other people move quicker. |
| M3 | Catalyst | Made several things move at once | One change they introduced sped up several pieces of work. |
| M4 | Invisible Backbone | Holds something up that nobody notices | Work only noticed when it stops. |
| C1 | Alignment Creator | Helps people agree | Removes ambiguity so other people share an understanding. *(your wording)* |
| C2 | Dependency Manager | Keeps on top of what the work needs from others | Actively manages what they need and what others need from them. |
| C3 | Synthesis Contributor | Turns scattered information into something clear | Makes a mess of information into something people can act on. |

## Carrying (3)

| Code | Internal name | Plain name | What the record shows |
| --- | --- | --- | --- |
| A1 | Coordination Debt Absorber | Takes on coordination other people left undone | Which makes those people look more effective than they are. |
| A2 | Execution Rescuer | Steps in to stop things failing | Failures that should never have reached them. |
| A3 | Contributor Suppression | Doing less than they used to, after a change | A strong contributor working below their previous level following a management or structural change. |

## Worth the lead's attention (36)

| Code | Internal name | Plain name | What the record shows |
| --- | --- | --- | --- |
| D1 | False Completion Reporting | Said it was finished, the next team says it was not | |
| D2 | Demo-Ready Shipping | Works in a walkthrough, not in real use | |
| D3 | Scope Rewriting | What counts as success changed part-way through | And the change was never said out loud. |
| D4 | Strategy Theater | Plenty of planning, nothing written down to work from | |
| D5 | Half-Built Product | The screens are there, what sits behind them is not | |
| D6 | Dependency Creation | Only one person can run it or explain it | |
| D7 | Complexity Inflation | The time asked for does not match the work | |
| D8 | Operational Fragility | Keeps breaking after it was called finished | |
| B1 | CEO-Pleasing | Reports upward more brightly than the team describes it | |
| B2 | Confidence Without Delivery | Presents well, delivers late, more than once | |
| B3 | Claimed Work Inflation | Others describe doing work they described as theirs | |
| B4 | Founder Backstop Dependency | The founder keeps stepping in to fix things | |
| B5 | Coordination Without Leverage | A lot of communicating, nothing unblocked | *Your wording was "Coordinates without being in charge", which is a different thing. See the note above.* |
| B6 | Exploration Without Action | The research keeps going and no decision comes | |
| B7 | Burn Without Outcomes | Costs a lot, little has moved because of it | |
| B8 | Defensive Leadership | When delivery is questioned, the answer points elsewhere | |
| B9 | Team Without Direction | The team each name a different priority | And a different one again from their leader. |
| B10 | Meeting Dependency | The work stops until there is another call | |
| B11 | Blame Shifting | Problems are mostly put down to things outside the team | |
| B12 | Stage Mismatch | The way of working does not fit the size of the company | |
| K1 | Sales Documentation Avoidance | Decks and proposals instead of conversations with named buyers | |
| K2 | Passive Finance Leadership | Spending is tracked and waste is not challenged | |
| K3 | Reporting Without Intervention | The same problem is raised again and never fixed | |
| K4 | Tactical Busyness | The inbox wins over the important work | |
| K5 | Activity Without Outcome Logic | Tasks are described without saying what they are for | |
| E1 | Equity Without Contribution | Holds equity, and the record shows little delivered recently | |
| E2 | Intro Evasion | The introductions are always about to happen | |
| E3 | Selective Presence | Present for the big moments, less so for the day-to-day work | |
| E5 | Extractive Behaviour | Asks for more than the record shows being given back | |
| R1 | Dependency Bottleneck | Several people are waiting on the same person | And it has not been resolved. |
| R2 | Ambiguity Generator | Their work keeps leaving other people unclear | |
| R4 | Relationship Drift | Two people who used to mention each other have stopped | |
| F1 | Insight Without Operation | Good ideas, not much built | The ideas are genuinely good. This is usually the wrong role, not dishonesty. |
| F2 | Vision Execution Gap | The strategy is clear at the top and absent in the team | The team describe working to their own priorities. |
| F3 | Equity Comfort | Check-ins have become less specific while equity continues to vest | |
| F4 | Relationship Without Leverage | Well regarded, and their areas haven't moved faster | |

## Never named to a person (2)

These two are on `ALIGNMENT_FEED_ONLY_CODES`. They feed the engine and must never appear on a
report, a board or anything either person reads. A plain name makes them **more** likely to be put
on a screen by mistake, so they are kept apart here rather than in the table above.

| Code | Internal name | Plain name, for an internal screen only | What the record shows |
| --- | --- | --- | --- |
| E4 | Founder Burden Imbalance | One founder carries the operational load | Consistently, for the other. |
| F5 | Cofounder Burden Asymmetry | One cofounder does the operating, the other the talking | One record shows operational work, absorption and rescue; the other shows strategic narrative. |

## What happened next

Approved 29 September 2026 (decision 52). The names went into the one place the screens read,
`plain-pattern-names.ts`; the codes stay exactly as they are, and every internal name stays where it
is for whoever is reading the detectors. Patterns are switched on.
