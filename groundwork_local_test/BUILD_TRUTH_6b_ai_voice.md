# BUILD_TRUTH_6b — the AI's actual conversational voice

Second language pass. The first pass (`BUILD_TRUTH_6_language.md` — not yet
written; see `SESSION_STATE.md`) was going to look at the prompt *templates*.
This one looks at what the model actually *said*, pulled from two real,
live, in-browser check-in transcripts run this session against the running
app (not read from `prompt-library.ts`). Bar: a calm adult explaining
something to a teenager — plain, concrete, never sounding like software or
an assistant.

**Method note, stated plainly:** this is two transcripts, not a large
sample. Both are single-session, both are the initiator/admin side (no
participant-side transcript was captured this pass — that's a real gap, not
an oversight; see "What this pass didn't cover" at the end). Findings below
are illustrative, not exhaustive — treat this as "here is real evidence of
the pattern," not "here is every instance of it."

---

## Transcript A — "Pre-meeting team briefing check" (COHORT_CHECK-adjacent)

Captured twice: once before the sequential-narration fix (commit `21f24f4`),
once after, same scenario, same inputs. Full turn-by-turn quotes below are
verbatim from the live app.

### Onboarding phase

| # | What the AI said | Verdict |
|---|---|---|
| 1 | "Got it, this is for a one-time check with your team before an important meeting. What is your role in relation to the team?" | ✅ Plain, concrete, no jargon. This is close to the bar. |
| 2 | "Okay, you're the manager for these three team members. You mentioned a briefing and meeting notes for them to review. You can upload or paste those here so they are kept with your account." | ✅ Good — restates a specific fact ("three team members"), plain ask. |
| 3 | "Okay, you want to be sure the team has really absorbed the briefing before the meeting in two days. I have everything needed to prepare this for you. Your next step will be to add the three team members involved." | ⚠️ Mild software-narrator note: "I have everything needed to prepare this for you" describes the AI's own internal readiness state rather than just moving the conversation forward. A person wouldn't announce "I have what I need" as a discrete status update — they'd just ask the next thing, or say "Okay — let's get the three of them in." |
| 4 | "Thanks for providing their names. You will be able to add Alice, Ben, and Priya in the next step. After that, you can end this session to generate your report." | ⚠️ "You will be able to add... in the next step" and "generate your report" are software-flow language — narrating the UI/process rather than talking like a person handing off next steps. A calm person would say "Great — next you'll add them, then you're done for now." "Generate your report" in particular is the AI describing a system action to the user in system terms. |

### Step 6 + check-in opening

| # | What the AI said | Verdict |
|---|---|---|
| 5 | **Before fix:** "This ground is for confirming that Alice, Ben, and Priya are prepared for the client meeting in two days... I will open a check in with each of them and ask the same question... Their independent answers will go into their records. You will see exactly how each person is articulating the response, and where any gaps are, before you walk into the room. **I will start with Alice.**" | ❌ Confirmed finding (already fixed). "Their independent answers will go into their records" and "articulating the response" are stiff, report-writing register, not spoken language. "I will start with Alice" states an order that doesn't exist in the architecture — the core finding from earlier this session. |
| 6 | **After fix:** "Instead, I am opening parallel check-ins with Alice Chen, Ben Okafor, and Priya Nair right now. I will ask each of them this specific question: [...] Their answers will come in independently. You will see what each person retained as the priority, not just if they did the reading." | ⚠️ **The ordering claim is now correct, but a residual case of the same disease survives.** "I am opening parallel check-ins with [names] right now" is still the AI narrating its own system action in system language — a person telling their manager what they're about to do would say something like "I'll check with all three separately and let you know what each one says," not describe themselves "opening... check-ins." The fix corrected *what* is claimed (parallel, not sequential) but not *how it's said* (as a system process rather than as a person's plan). Worth a smaller follow-up pass. |
| 7 | "That is a clear and verifiable standard. It moves confirmation from a feeling to a fact." (from an earlier admin-side exchange in this same scenario family) | ✅ Genuinely good — concrete, no jargon, reads like something a sharp colleague would actually say. This is the target register. |
| 8 | "Understood. I will flag any response that is general in nature or does not specifically mention the revised timeline." | ⚠️ Minor: "general in nature" is a formal/legalistic phrase. A person would say "if someone's vague or skips the timeline" — not wrong, just slightly stiffer than necessary. The commitment itself (flagging vague answers) is clear and concrete, which is what matters most and what survived correctly.

---

## Transcript B — "Team member not delivering" (DRIFT-adjacent, individual accountability)

New scenario, live, this pass. Manager preparing to talk to a direct report
(Marcus) about three missed deadlines.

| # | What the AI said | Verdict |
|---|---|---|
| 1 | "Okay, this can help you prepare for that conversation. What is your role in relation to this team member?" | ✅ Plain, on-topic. |
| 2 | "Got it, you're the manager and Marcus is an engineer on your team. Has this been an ongoing issue or did something specific just happen?" | ✅ Good — restates the actual fact given (Marcus, engineer), asks a real next question. |
| 3 | **"Thank you for clarifying the timeline."** What is making you decide to formally address this at this point? | ❌ **Chatbot register.** "Thank you for clarifying" is customer-service/assistant phrasing — the exact shape the audit brief called out ("Great question", "I'd be happy to"). A calm human manager-coach wouldn't thank someone for "clarifying a timeline" — they'd just respond to the content: "Two months, three deadlines in a row — that's a real pattern." This is a genuine instance of the "sounds like an assistant" failure mode, live in production output, not hypothetical. |
| 4 | **"Okay, so creating a clear record is an important step for you."** What do you hope to get out of this process? | ⚠️ **Therapist-paraphrase register, not concrete acknowledgment.** Compare against the product's own rule (`ENGINE_RULES`, ACKNOWLEDGE BEFORE PROBE): acknowledgment should be "something specific that exists in what they just said" — e.g. "You resolved a blocker..." Here the AI restates the user's *motivation* in analytical third-person-observer language ("is an important step for you") instead of naming the specific fact (wanting it on record before escalating to HR). This is the same shape problem noted in the first language pass for `postReportGuide`-style text: describing the person's situation back at them rather than just responding to it plainly. |
| 5 | "One last thing. Are you one of the people involved in this, or are you setting this up on their behalf?" | ✅ Plain, direct, no jargon — good example of a structurally-necessary question asked like a person would ask it. |
| 6 | "This record is for getting the full picture before you speak with Marcus. Let's focus on the first of the two client deliverables that slipped. What was written down to define what needed to be delivered and when — a ticket, a brief, or an email?" | ✅ **Best line in either transcript.** Concrete (names "Marcus," "two client deliverables"), plain ("a ticket, a brief, or an email" — exactly how a person would list possibilities), zero jargon, directly useful. This is the bar the rest of the product should be judged against. |

---

## Cross-transcript patterns

### What's genuinely working (the "what good looks like" ask)

- **No literal chatbot filler appeared in either transcript.** No "Great question!", no "I'd be happy to help you explore that," no "Let's dive in." The `BANNED WORDS AND PHRASES` / `FILLER PHRASE BAN` rules in `ENGINE_RULES` appear to actually hold at the model layer in live output — that's worth confirming positively, not just assuming from the prompt text.
- **No raw product-internal jargon reached the user's face.** No "synthesize," "record entry," "artifact," "party," "surfaced," "cross-reference," "trust state" — the term-substitution table (`prompt-library.ts:1140-1149`) is doing its job in these two transcripts. The only system word used was "record," which is explicitly on the allowed list (`prompt-library.ts:295`).
- **Concrete restatement of facts is consistently strong.** Both transcripts repeatedly named the actual specifics given (Marcus, engineer; Alice/Ben/Priya; two client deliverables; two months) rather than abstracting them away. This is the product's stated core discipline and it's visibly showing up in real output, not just in the prompt.
- **The single best line found** ("This record is for getting the full picture before you speak with Marcus...") shows the product can hit the calm-adult-to-teenager bar exactly — plain words, concrete nouns, no performance.

### What's still wrong, and it's a narrower, more specific failure than "sounds robotic" generally

1. **Thank-you/acknowledgment phrasing drifts into service-desk register** ("Thank you for clarifying the timeline") even though the underlying rule (`ACKNOWLEDGE BEFORE PROBE`) explicitly bans generic acknowledgment and demands something specific. The rule is right; the live output sometimes doesn't follow it as tightly as the DRIFT/CRISIS/RECOGNITION packs' own hand-authored example lines do (compare: the *authored* examples in `prompt-library.ts` are reliably concrete — "You resolved a blocker that had stopped another team for two weeks" — but the model's own live improvisation during onboarding, which has no equivalent hand-authored line to fall back on, is noticeably weaker).
2. **The onboarding phase (before the scenario pack proper kicks in) is the weakest stretch in both transcripts.** Lines like "I have everything needed to prepare this for you," "you will be able to add [names] in the next step," and "creating a clear record is an important step for you" all show up during onboarding, not during the actual check-in. The check-in phase (once `buildScenarioPackForParty` engages) is measurably more concrete and less software-flavored than the onboarding phase. **This suggests the onboarding system prompt (`ONBOARD_SYSTEM` in `entry.service.ts`) is where a plain-language pass would have the most impact** — it currently has none of the hand-authored acknowledgment examples the scenario packs have.
3. **The sequential-narration fix corrected the factual claim but not the self-narration habit.** "I am opening parallel check-ins with [names] right now" is still the AI describing its own system action rather than speaking as a person planning to do something. This is the same underlying tendency (the assistant narrating itself/the process) surfacing in a new spot after the first spot was patched — worth watching for elsewhere, since the fix targeted the specific wrong claim ("sequential") rather than the more general habit (self-narration).

### Templates vs. actual output — where they diverge

The user's framing for this pass was explicit: "where they diverge is the finding." Two diverges found:

- **`ENGINE_RULES`'s ACKNOWLEDGE BEFORE PROBE rule is well-designed and mostly not followed as tightly during onboarding as during check-in.** The rule and its authored examples are concrete; live onboarding output ("thank you for clarifying," "an important step for you") is looser than the rule asks for. This isn't a template problem — the template is right — it's a live-generation gap specifically in the onboarding phase, which has weaker scaffolding than the scenario packs.
- **The multi-contributor-invites fix changed the claim, not the register.** The new approved phrasing baked into `ENGINE_RULES:289` ("I'm opening check-ins with all of them now...") is itself written in slightly software-narrator language, and the model's actual output ("I am opening parallel check-ins with Alice Chen, Ben Okafor, and Priya Nair right now") tracks the template closely — meaning **the template itself, not just the model's improvisation, could be plainer.** A revision candidate: "I'll check in with Alice, Ben, and Priya separately, and their answers will come in independently as each responds" — same content, no "opening... check-ins" software framing.

---

## What this pass didn't cover (say so plainly, don't paper over it)

- **No participant-side transcript.** Both transcripts here are the initiator/admin voice. The participant's experience (`PARTICIPANT_PREAMBLE`, the plain-language register-shift rule) was not observed live this pass — only read as a template in the first language pass. That's a real gap in this audit, not a "nothing to report" — someone should run a participant-side check-in and look at the actual output the same way.
- **No report-synthesis output observed live.** `REPORT_SYNTHESIS`'s actual generated text (what a real report reads like) wasn't captured this pass — only the prompt template was read earlier. The report is arguably the highest-stakes artifact (it's what both parties actually read at the end) and hasn't been voice-audited against real output yet.
- **Sample size is two transcripts, one scenario family variant + one drift variant, both single-session.** Multi-session continuity language (`CHECK_IN_TWO_OPENING`, "Welcome back," cross-reference framing) was not observed live this pass.
- **Streaming was extremely slow during this session** (heavy background load from concurrent research agents) — some exchanges took over a minute to fully render, which is a real user-facing latency concern independent of voice/language, noted here since it was directly observed but is out of scope for a language audit.

## Bottom line

The product's authored scenario-pack language (DRIFT, CRISIS, RECOGNITION, the check-in-phase openers) is genuinely close to the calm-adult bar and holds up well under live observation — concrete, jargon-free, no chatbot filler. The **onboarding phase** is the weaker link: it has no hand-authored acknowledgment examples to anchor against, and it's where "thank you for clarifying," "an important step for you," and "I have everything needed" all showed up. If one thing gets fixed from this pass, it's giving `ONBOARD_SYSTEM` (`entry.service.ts`) the same kind of concrete, hand-authored acknowledgment scaffolding the scenario packs already have.
