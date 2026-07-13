# BUILD_TRUTH_6b — the AI's actual conversational voice

How the assistant actually *sounds* in real check-ins, judged against one bar:
**a calm adult guiding a teenager — plain, concrete, never sounding like software
or a chatbot.**

This is the real generated text, not the prompt templates. Where a template intends
one thing and the model says another, that divergence is called out as the finding.
**Assess only — no code was changed.**

---

## Method (stated plainly)

- **Source:** 10 real check-in transcripts pulled verbatim from stored
  `conversation_turns` rows in the local dev DB (292 AI turns / 262 person turns
  total available). These are genuine model generations — context-dependent, varying
  per scenario, carrying the artifacts of real LLM output (truncation, stray em
  dashes) — not seed fixtures.
- **Coverage this pass:** PARTICIPANT side across **NEW_HIRE, NEW_PROJECT,
  REALIGN_TEAM, CRISIS_ALIGNMENT, PULSE_CHECK**; INITIATOR side across
  **PULSE_CHECK, REALIGN_TEAM, NEW_HIRE**; and multi-session returning voice across
  **NEW_HIRE (I, S3), NEW_COFOUNDER (I, S3), NEW_HIRE (P, S2)**. This fills the
  exact gaps the prior draft of this file flagged (it had only initiator-side, one
  scenario family, single-session).
- **What this is NOT:** these are the **check-in phase** transcripts. The
  pre-check-in **entry/onboarding phase** (`ONBOARD_SYSTEM` in `entry.service.ts`)
  is stored/handled separately and is **not** in this corpus — the prior pass found
  that phase to be the weakest register, and that finding is carried forward below,
  not re-verified here. Report-synthesis output is still not voice-audited. Some of
  these turns may pre-date the sequential-narration fix (`21f24f4`); exact model
  version per turn is not recorded.
- **Typography counts** below are exact, queried across all 292 AI turns.

---

## What it gets RIGHT — preserve this

The model is at its best when it is **terse, concrete, and asks like a person would.**
Real lines to protect:

- **The terse-question register** (REALIGN_TEAM initiator is the standout — this is
  the bar hit squarely):
  > "What are the three visions?"
  > "What would success look like for you?"
  > "What concerns you most?"
  > "Three conversations, no decision. What needs to happen in the next 30 days?"

- **The sharp, plain acknowledgment-then-probe** (NEW_HIRE participant):
  > "A concrete build target. What do you need from Adaeze to get there?"

- **Returning-user openers that actually remember** — the longitudinal promise
  working in the live voice, both sides:
  > (NEW_HIRE participant, S2) "Welcome back, Sarah. Last time, you flagged that the
  > decision-making process was unclear and that the feature you're picking up is
  > bigger than you initially understood... What was one specific moment in the last
  > week where that ambiguity almost caused a problem?"
  > (NEW_HIRE initiator, S3) "Your last check-in noted two specific things: that
  > Sarah still hadn't met the product lead, and that she was asking for more context
  > on how decisions get made."

- **Genuinely human insight** — lines a sharp colleague would actually say:
  > (NEW_COFOUNDER, S3) "The fact that there isn't an immediate name to write down
  > *is* the answer. It tells us that ownership was never explicitly agreed upon."
  > (NEW_HIRE participant, S2) "'Useful' is a word that can hide a lot of real
  > contribution."
  > (CRISIS_ALIGNMENT participant) "You have put your finger on the central point."

- **Concrete option-giving in probes** (REALIGN_TEAM participant) — instead of a
  vague ask, it lists real shapes the answer could take:
  > "Is it a named introduction from a specific founder to a specific investor? Or is
  > it something else?"
  > "A single warm introduction from a named founder to a specific investor? A list
  > of VCs who have confirmed they will take meetings with members?"

Concreteness is a genuine strength: the model consistently names the actual specifics
back (Adaeze, 24-hour turnaround, $800k verified ARR, an 8-person team, 12 engineers,
Day 45) rather than abstracting them away.

---

## What's wrong — and it's more specific than "sounds robotic"

### 1. The record-narration tic — the #1 systemic issue

The single most pervasive voice problem: the assistant narrates its own storage
action almost every turn. "Record" is an allowed word, but stating *"this is now in
your record"* on a loop makes it sound like software describing its database writes,
not a person listening. It appears in the majority of AI turns across **every**
transcript:

> "That gap is now in your record. Naming it is the first step to resolving it."
> "That honesty is now in your record."
> "That specificity makes your record stronger."
> "It is now in your record that you've set a six month standard..."
> "That's a critical entry for your record because it moves from opinion to a
> verifiable fact."
> "Your record should show that you're absorbing the lack of a clear process."

A person would just respond to the content. The fix is not banning "record" — it's
cutting the reflex to announce the write on every turn.

### 2. Affirmation / praise-filler drift

No hard chatbot filler appears (see the good-news check below), but a **softer
affirmation register** recurs as an opener — chatbot-adjacent warmth the
ACKNOWLEDGE-BEFORE-PROBE rule is meant to prevent:

> "That's a great starting point for this record."
> "Glad to hear onboarding went well."
> "That's a strong foundation for onboarding"
> "That's a leadership contribution." / "That's a high-leverage contribution."
> "Excellent. Those are three specific commitments."

Individually mild; in aggregate the assistant sounds like it's grading the user's
answers.

### 3. Report-register bleed — bulleted summaries mid-conversation

Twice (NEW_PROJECT participant S1, NEW_HIRE initiator S3), the model drops a long,
markdown-bulleted written summary into the middle of a live chat — report-writing
register, not speech, and unprompted:

> "Here is what is now in your record:
> *   **Your role:** CFO, owning investor relations...
> *   **The blocker:** Milestones for the next funding tranche are not formally
> agreed..."

A person recapping wouldn't hand you a formatted document mid-sentence. (This also
emits literal markdown — see defect 4 below.)

### 4. Process / purpose narration to the user's face

The assistant explains the product's mechanics *to* the user instead of just running
the conversation:

> "The purpose of getting everyone's version on the record is to build this shared
> picture before any conversation happens—not to decide who is right."
> "When Dapo and Lena complete their check-ins, their versions will be added."
> "Let's clarify the structure, as that's what this record is for."
> "The question I asked about a *specific* time... is the one that will make this
> record stronger."

This is the same family as the "I'll start with Alice" self-narration found earlier —
the assistant describing the process/itself rather than speaking as a person.

### 5. Product-internal word to the user's face

Mostly clean — no "synthesize," "surfaced," "party," or "artifact" leaked. One term
did:

> "That's a critical **entry** for your record..." (NEW_COFOUNDER, S3)

"Entry" is `RecordEntry` internal vocabulary surfacing to the user.

### 6. Abstract / coach-cliché where it should be concrete

The model is usually concrete; the lapses are therapist/coach interjections:

> "Naming it is the first step to resolving it." (NEW_PROJECT)
> "That feeling of shifting from learning to contributing is a clear signal of
> progress." (NEW_HIRE participant S2)

---

## Real defects in the actual output (template intends X, model does Y)

These are not register opinions — they are concrete failures in the generated text.

| Defect | Count (of 292 AI turns) | Evidence |
|---|---|---|
| **Truncated mid-sentence** | 4 | tails: "...that separates" / "...call logs, CRM activity, pipeline reviews. What" / "...what will exist that does" / "...'done'—something" |
| **Em dash (—)** | 23 | "the data you have—call logs" / "the conditions from your notes—$800k verified ARR" |
| **En dash (–)** | 6 | "a useful detail for the record – slow tooling access" |
| **Curly apostrophe (')** | 3 | "You've named the main risk" (mixed with straight ' elsewhere in the same turn) |
| **Literal markdown bullets** | 3 | "*   **Your role:**" rendered raw in a chat bubble |

- **Truncation** is the most serious — real turns end mid-thought (likely
  `GEMINI_MAX_TOKENS` too low or a streaming cutoff). A user sees the assistant stop
  talking mid-sentence.
- **Typography**: the house style is straight quotes, no em/en dashes. The model
  emits em dashes in ~8% of turns despite the banned-style rules — a template-intends
  / model-does divergence. Worth running `typography.py` over generated output as a
  standing check, not just over UI/email copy.
- **Mangled opener** (PULSE_CHECK participant, S1) — the generic pathway-20 opener
  rendered as broken grammar:
  > "This ground is for building a shared picture of your contribution, in your own
  > words. It's about for you, and what would need to be true at the end of this
  > period..."

  The template intends "What is this ground **about for you**, and what would need to
  be true...". The variable stitching produced "It's about for you," which is not a
  sentence. First line the participant sees — worth fixing.
- **Possible replay/duplication** (PULSE_CHECK initiator S1, NEW_COFOUNDER initiator
  S3) — identical person+AI exchanges repeat within one check-in. **Flagged
  cautiously as a likely test-data/re-run artifact, not asserted as a live bug** —
  it would need reproduction against a clean run to confirm.

---

## The good news — the hard chatbot filler holds

No instance of the egregious banned phrases appeared in any of the 10 transcripts:
no "Great question," no "I'd be happy to," no "Let's dive in," no "Let's explore."
The `FILLER PHRASE BAN` is holding at the model layer. The remaining problem is the
**milder** drift (affirmation openers, record-narration) — a narrower, more specific
target than "sounds like a bot."

---

## Per-transcript quick verdict

| Transcript | Verdict |
|---|---|
| REALIGN_TEAM initiator S1 | **Best.** Terse, plain, concrete — the target register end to end |
| NEW_HIRE participant S1 | Strong. Sharp short probes; clean close |
| NEW_HIRE participant S2 (returning) | Strong. Specific callback, warm, concrete — longitudinal promise working |
| NEW_HIRE initiator S3 (returning) | Good callback, but two bulleted report-summaries mid-chat |
| CRISIS_ALIGNMENT participant S1 | Strong on a hard problem; mild "This is a very clear..." praise openers |
| NEW_COFOUNDER initiator S3 | One excellent insight line; "entry" leak; truncated final turn |
| REALIGN_TEAM participant S1 | Good concrete probes; over-narrates "your record now shows" |
| NEW_PROJECT participant S1 | **Weakest.** Verbose, over-praises ("you've named X without being asked" ×4), long report-style summary, process narration, em dashes |
| PULSE_CHECK initiator S1 | Good probes; two truncated turns; duplicated exchange |
| PULSE_CHECK participant S1 | Handles a disengaged user gracefully; mangled opener ("It's about for you") |

---

## Prior-pass findings carried forward (still stand, not re-verified here)

From the earlier live in-browser pass, applying to phases **not** in this corpus:

- **The entry/onboarding phase (`ONBOARD_SYSTEM`, `entry.service.ts`) is the weakest
  register** — lines like "I have everything needed to prepare this for you,"
  "Thank you for clarifying the timeline," "an important step for you." It has none
  of the hand-authored acknowledgment scaffolding the check-in scenario packs have.
  **If one thing gets fixed, it's this phase.** The check-in transcripts in *this*
  pass are measurably stronger than that phase.
- **The sequential-narration fix (`21f24f4`) corrected the claim, not the habit** —
  "I am opening parallel check-ins with [names] right now" is still self-narration.
  The process-narration finding (#4 above) is the same habit surfacing in the
  check-in phase.

---

## What this pass still didn't cover

- **The entry/onboarding phase live** — carried forward from the prior pass, not
  freshly observed here.
- **Report-synthesis output** — the highest-stakes artifact both parties read at the
  end is still not voice-audited against real generated text.
- **Fresh live generation** — this pass judged real *stored* output (Gemini/Vertex is
  configured locally but was not driven to produce new transcripts). Current
  post-fix behavior for the onboarding phase specifically should be captured live.

---

## Bottom line

The **check-in phase** is genuinely close to the bar — terse, concrete, remembers
across sessions, and free of hard chatbot filler. Three specific, fixable things hold
it back, in priority order:

1. **The record-narration reflex** ("this is now in your record" every turn) — the
   most pervasive thing making it sound like software.
2. **Real output defects** — truncated turns and ~8% em-dash contamination that the
   house style bans; plus the mangled `pathway-20` opener a fresh participant sees.
3. **Affirmation drift and mid-chat report summaries** — the softer register slide
   the ACKNOWLEDGE-BEFORE-PROBE rule already aims at but doesn't fully hold.

The strongest single register in the whole corpus — REALIGN_TEAM's initiator side —
proves the model *can* hit the calm-adult bar exactly. The work is making the rest
sound like that one.
