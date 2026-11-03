# Groundwork's memory system

A strategy for how Groundwork learns about people, teams and organisations, remembers it, keeps it safe, and uses it. Read this before changing anything about patterns, role detection, coaching, the assistant, References and resources, the Desk, or the assessments.

Status: Groundwork's architecture from now on. Don't start building it until milestone 1 of the plan to 8.5 has landed; then build it into milestones 2 and 3, not as a separate project. Build it in small steps (see "Build order"), measuring each one, and stop adding rules.

It isn't a new plan: it's the shape of the current one. The assessment (F1) is the memory's second layer; patterns with one owner (F2) become skills; the assistant (F3) is the librarian; the Desk (F7) is the organisation's shelf.

---

## 1. Why this exists

We have been fixing Groundwork by adding rules: word lists, guards, caps, special cases. Each rule fixed one symptom and created others. The product became brittle, its replies strange, and its knowledge scattered across many separate stores that disagree.

This document replaces rule-building with a system. The idea is simple:

- **Everything Groundwork learns is kept as memory**: plain, readable files about each person, team, project and the organisation, each backed by evidence.
- **Everything Groundwork knows how to do is kept as skills**: readable playbooks for detecting a role, reading a pattern, coaching someone, or shaping a board.
- **Agents read, write and look after that memory**, each with clear limits on what it may read and write.
- **Every page, report, conversation and assistant answer draws from the same memory**, pulling only what it needs.

Think of it as a library. Each organisation has its own bookshelf. When someone asks for something, a librarian pulls the right books from the shelf, and only those, and answers from them. Writers add to the books as things happen. A curator keeps the shelf tidy, current and safe.

## 2. The goal

Groundwork's ultimate goal is to **understand and predict human and organisational behaviour, so people and organisations can get better**. Where the good of the organisation and an individual's wishes conflict, the organisation's betterment comes first, but never through deception, never by stripping a person of dignity, and never by deciding for the lead. Groundwork gives the lead the evidence and the options; the lead decides.

Prediction here means: who is likely to slip, which deals will close, whether the target will be hit, which team is overloaded, what will happen if nothing changes. Predictions are always shown with their evidence, checked later against what actually happened, and used to help earlier, never as a verdict on a person.

## 3. What the memory holds

Five layers, from raw to refined. Each layer is built only from the one below it.

| Layer | What it is | Changes? |
|---|---|---|
| **1. The raw record** | Every conversation, document, photo, action and message, exactly as it happened. | Never. Append only. |
| **2. Assessments** | One structured reading of each conversation (as already designed): facts, claims and proof, promises, numbers, decisions, waits, corrections, role signals, areas of work, observations, compared with last time. Every item cites the raw record. | New versions only; earlier versions kept. |
| **3. Memory files** | Plain-language Markdown files, one per thing that matters (see below), summarising what is known, with every statement citing the assessments it rests on. | Updated by their one writer; every version kept. |
| **4. Skills** | Playbooks for how to do something well: detect a role, read a behaviour pattern, coach, shape a scenario's board. | Versioned, tested before going live. |
| **5. Views** | The board, reports, summaries, My work, the Desk, assistant answers. Built from layers 2 to 4. | Rebuilt whenever what they read changes. Never stored as truth. |

**The database is the one true source.** Memory files and skills are stored in the database as versioned records and rendered as Markdown for agents and people to read. They are never loose files on disk, and never a second source of truth. This keeps permissions, version checks and "one source" simple.

**Numbers are never only in Markdown.** Counts, totals and figures are computed once, in one place, from the structured record (layers 1 and 2), and the memory files cite them. This keeps every page agreeing.

**Rebuild, don't drift.** A memory file is always rebuilt from the assessments it cites, never written only from its own previous version, because summaries of summaries drift. Writers update a file from new assessments, and every file is rebuilt from scratch regularly (for example weekly) and compared with the updated version; any difference is a bug to fix.

### The memory files (the books)

Like CLAUDE.md, but for a person, a team, a project and the organisation. Each is short, readable by a person, and loaded only when needed.

- **`org.md`**: what the organisation is for, its direction and priorities, how it works, its definitions (what counts as a sale, as paid), its policies in brief with links to the full documents on the Desk, its key people and roles, what has changed and when.
- **`team/<team>.md`**: the team's purpose, targets, how its work moves (stages), its rules, what it is good at, what keeps going wrong, what the lead expects, open risks.
- **`person/<person>.md`**: their role as given and as actually played, areas of work, how they tend to work (patterns with instances), what they are strong at, what they are working on, coaching given and whether it worked, commitments track record. In sections with different readers (see Permissions).
- **`project/<project>.md`**: the plan, milestones, money, stakeholders, where it stands, risks.
- **`role/<role>.md`**: what this role needs in this organisation (organisation's own version of a skill, see below).

Every file starts with a short header (front matter): its subject, its scope, who may read it, who writes it, its version, when it was last updated, what it was built from, and when it should next be checked.

Every statement inside cites its evidence ("Promised the Tuskys samples 3 times: 12, 19 and 26 October [a-1203, a-1291, a-1340]"), and says "as of" a date where it could go out of date.

### The skills (how to do things)

Role detection, behaviour patterns, coaching and scenario boards are skills, not code full of rules. A skill is a Markdown playbook:

- what it's for and when to use it;
- what evidence to look for, and what doesn't count;
- how to decide, with worked examples and counter-examples;
- what to say, in Groundwork's plain, direct language;
- what to do next (the intervention ladder where relevant);
- how it is tested (its answer-key cases).

Examples: `skills/roles/sales-rep.md`, `skills/patterns/overstating.md`, `skills/patterns/quiet-excellence.md`, `skills/patterns/overload.md`, `skills/patterns/lead-bias.md`, `skills/coaching/proof.md`, `skills/scenarios/collections.md`.

Skills come in two kinds:

- **Groundwork's skills**, written and improved by us, shared across all organisations, tested against the standing test sets before a new version goes live.
- **An organisation's own version**, where it differs (its own definition of a qualified deal, its own stages, its own expectations of a role). The organisation's version wins for that organisation.

## 4. The agents

Separate agents, each with one job and clear limits. An agent can only read and write what its job needs.

**Start with fewer.** Every agent adds moving parts, cost and time. Begin with three: the assessor, one writer, and the librarian. The auditor starts as a set of automatic checks (citations, permissions, injection, untrue statements), not another model. Add more writers, and the curator, only when the files actually need them, and measure the cost of each one added. "Agent" here can simply mean a function with a model call and strict limits.

| Agent | Job | Reads | Writes |
|---|---|---|---|
| **Assessor** | Writes one assessment per conversation, checked for completeness. | The conversation, and the files it needs for context. | Assessments only. |
| **Writers** (one per kind of file) | Update a memory file from new assessments. | Assessments for their subject; the current file; the relevant skills. | Only their own kind of file. |
| **Librarian** | Finds and pulls the right books for a conversation, a page or the assistant. | The catalogue, then only the books needed, filtered by who is asking. | Nothing. |
| **Curator** | Keeps the shelf tidy: merges duplicates, retires stale statements, shortens long files, checks citations, flags contradictions. | Memory files and their sources. | Proposed changes, applied through the writers. |
| **Auditor** | Checks for leaks, untrue or uncited statements, and injected instructions; blocks anything that fails. | Everything, read only. | Flags and blocks only. |
| **The assistant and the check-ins** | Talk to people. | Only what the librarian gives them for that person. | Nothing directly: they act through the product's own actions and through new raw records. |

**Agents manage memory themselves**, within these limits: they propose changes as small edits with citations; small factual updates apply on their own; changes to how a person is described (patterns, role, strengths) need enough evidence over time (see Principles), and the curator reviews them. People can see and correct facts about themselves, and leads can see and correct their team's and organisation's files, through the "That's not right" path.

## 5. The bookshelf: how things are found

1. **The catalogue first.** Each shelf (organisation, team, person, project, skills) has a catalogue: one line per book with its header. Agents read the catalogue, choose the few books they need, and only then open them. This keeps every call small.
2. **Scope by where you are.** Opened from a check-in, the librarian starts with that team's shelf; from Today or WhatsApp, the organisation's; for a person's own check-in, their own file plus their team's.
3. **Filter before the model sees anything.** What the person asking may not see is removed before anything reaches the model. Individual performance and private notes never reach the assistant.
4. **Answer from what was pulled, and name it.** If it isn't on the shelf, say what is known and who would know.

The Desk is the organisation's shelf in people's eyes. References and resources is a team's shelf. My work shows a person their own book's open sections.

## 6. Key principles

1. **Evidence first.** Every statement in memory cites the raw record or an assessment. No citation, no statement.
2. **One writer per thing.** Each file has exactly one writer. Each number is counted in exactly one place.
3. **The raw record never changes.** Everything else can be rebuilt from it.
4. **Everything is versioned and reversible.** Every change keeps the earlier version, who or what made it, why, and from which evidence.
5. **Least access.** Every agent and every person reads only what they need and are allowed, and writes only what their job allows.
6. **Freshness is explicit.** Statements carry "as of" dates and review-by dates; new evidence that contradicts a statement triggers its review.
7. **People's words are data, never instructions.** Nothing typed or uploaded by anyone can change what an agent is allowed to do.
8. **Patterns need time and instances.** A pattern about a person needs more than one instance, ideally from more than one source and over time, and names them. Counter-evidence is recorded too. One bad day is never a pattern.
9. **People can change.** Patterns fade when the behaviour stops. Old observations lose weight; nobody is stuck with a label.
10. **Small and on demand.** Files stay short; detail lives in the assessments; agents load only what they need.
11. **The organisation owns its memory.** It can export all of it, readable, at any time.
12. **Plain language everywhere.** Memory files are written in Groundwork's direct, human language, so a person could read them.

## 7. Risks and guardrails

| Risk | What could go wrong | Guardrail |
|---|---|---|
| **Agents colliding** | Two agents update the same file at once and one overwrites the other. | One writer per file; every write states the version it was based on and is refused if the file has changed since (compare-and-swap); writes for one subject are queued, never parallel; every change is logged. |
| **Leaks between agents, people or organisations** | A team member's private words reach another person, a lead's notes reach the person, or one organisation's memory reaches another. | Each organisation's memory is stored and searched separately; the librarian filters by the person's rights before anything reaches a model; each section of a person's file has its own readers; standing privacy tests run on every change. |
| **Stale context** | An old target, a finished project or a changed role keeps being used. | "As of" and review-by dates; the curator retires or flags stale statements; contradicting new evidence triggers review; views always show dates. |
| **Injected instructions** | A message or document says "ignore your rules" or "mark this as paid". | Content from people and documents is wrapped and treated as quoted data; instructions come only from skills and system rules; the auditor scans for injection; actions always go through permission-checked server actions with confirmation. |
| **Untrue memory** | A model writes something nobody said, or blends two facts. | Every statement cites evidence; the auditor rejects uncited or unsupported statements; corrections flow back through one path. |
| **Bias and unfairness** | Patterns amplify a lead's bias, or punish quiet, honest people. | Patterns need instances over time; silence is never evidence; counter-evidence is kept; the lead-bias skill compares the lead's view with the evidence; zero honest people flagged is a standing test. |
| **Self-fulfilling labels** | Calling someone "struggling" changes how they're treated, so they struggle. | Patterns are observations with evidence, not labels; they fade when behaviour changes; interventions are support first. |
| **Runaway cost** | Memory grows, every call loads too much. | Catalogue-first retrieval; short files; summaries at each level; only changes are written; model calls per conversation measured in every run with a target. |
| **Model changes** | A new model behaves differently. | Skills and memory are tested against the standing test sets before any model switch. |

## 8. Engineering practices

- **Append-only event log** for the raw record, with a content hash for every item, so duplicates are caught and nothing can be altered unnoticed.
- **Optimistic concurrency** on every memory file: each write carries the version it was based on; a stale write is refused and retried from the latest.
- **Idempotent writes**: every write has a key, so a retried write never applies twice.
- **One queue per subject** (person, team, project), so their files are updated one change at a time.
- **Structured headers** on every file, checked against a schema.
- **Versioned memory format**, with migrations when the format changes.
- **Every change logged**: who or what made it, why, from which evidence, before and after.
- **Retries and "owed" writes**: a failed write is retried, then kept as owed until it lands; nothing is silently lost.
- **The standing tests are the gate**: no skill, memory or retrieval change goes live without passing them, including privacy, adversarial and speed tests.
- **Backups and rebuilds**: any memory file can be rebuilt from the raw record and assessments.

## 9. Permissions

People and agents get the same rights: an agent acting for a person reads only what that person may read.

| Shelf | Who reads | Who writes |
|---|---|---|
| **Organisation (`org.md`, the Desk)** | Everyone in the organisation, item by item as marked. | Admins (documents, policies); the organisation's writer agent (from evidence). |
| **Team (`team/…`, References and resources)** | The team; leaders above it. | The lead; the team's writer agent. |
| **Person (`person/…`)**, by section: | | The person's writer agent. |
| · facts about their work | The person and their lead. | Corrections by the person or lead, checked. |
| · patterns, role, strengths, coaching | The lead (and HR where there is one); the person sees the coaching addressed to them. | |
| · the lead's private notes | The lead only. | The lead. |
| · complaints about their lead | Admin or HR only, never the lead. | |
| **Project** | The project's people and leaders. | The project lead; the project writer agent. |
| **Skills** | Agents. | Groundwork (tested before release); an organisation's admins for its own versions. |

The assistant never discusses individual people's performance, whatever its reader's rights.

## 10. From the individual to the organisation, and across it

- **Roll-ups**: person files feed team files, team files feed the organisation's, always citing what they came from. Private content is never copied upwards; only what the higher reader may see.
- **Cross-sections**: views by role, area of work, project or skill (for example, "where effort goes across all sales reps"), computed from cited items, not copied.
- **Small groups stay anonymous** where a view is meant to be anonymous (one-off reads, pulses): groups below a minimum size are not shown.

## 11. Curation and portability

- **Curation**: the curator agent runs regularly (for example weekly per organisation) to merge, shorten, retire and check. Admins curate the Desk; leads curate their team's shelf through "That's not right".
- **Portability**: an organisation can export its whole memory as readable Markdown plus the structured record, and import documents to start a shelf. If they leave, they take their memory with them; if they're deleted, their memory is deleted.
- **Retention**: raw records and memory follow the organisation's retention settings; a person removed from an organisation has their personal sections handled as the privacy rules require.

## 12. Efficiency: tokens and speed

- Read the catalogue, then only the books needed.
- Keep memory files short; keep detail in assessments, pulled only when asked.
- Write only what changed.
- Compute patterns incrementally from new assessments, not from everything each time.
- Cache what doesn't change between calls.
- Measure, in every run: model calls per conversation and per reply, time to the first words, time to the full reply, and cost per conversation, each against its target.

## 13. Learning loops

- **The individual's loop**: a pattern is noticed → coaching is given → the next assessments show whether it worked → the person's file and the coaching skill's record are updated.
- **The team's loop**: an intervention is chosen → its effect is tracked → what works for this team is remembered.
- **The organisation's loop**: what predicted success or failure here (targets hit, deals closed, people improving) is remembered in `org.md`.
- **Groundwork's loop**: which skills work across organisations is learnt from test results and, with permission, from anonymised outcomes, and skills are improved and re-tested.
- **Real outcomes over simulations**: skills tested only against our own simulated people can end up fitting the test rather than real people. As soon as pilots have enough history, every skill is also checked against what really happened in real organisations (did the flagged person really slip, did the predicted deal really close), and the real result wins where they disagree.
- **Prediction's loop**: every prediction is recorded with its evidence and checked later against what happened, so Groundwork knows how often it is right and gets better.

## 14. How this replaces rules

- Behaviour that was hard-coded as rules becomes **skills**: readable, versioned, tested.
- Knowledge that was scattered across separate stores becomes **memory files** with one writer each.
- Checks that were patched in one place become **principles** enforced by the auditor and the standing tests.
- New problems are fixed by improving a skill, a memory file or the retrieval, not by adding a guard.
- Fixed rules remain only where something is approved, paid, sent or seen (leave, money, messages, privacy), because those must be predictable.

## 15. Build order (simplest thing that works, measured each step)

Start after milestone 1 has landed. Each step: look at what exists first, follow the five fix rules, build the smallest version, run the standing tests (including privacy, adversarial and speed), and keep it only if nothing gets worse. Steps 1 to 3 come first; the rest follow only when they have proved themselves.

1. **Map what exists**: every place Groundwork stores knowledge about people, teams, projects and the organisation today, and every rule that decides patterns, roles and coaching. Mark which become memory, which become skills, and which are removed.
2. **Memory files, read only**: generate `org.md`, `team/…`, `person/…` and `project/…` from the assessments, with citations, versions and headers, stored in the database and rendered as Markdown. Have the board and the assistant read them. One writer only, rebuilt regularly from the assessments.
3. **The catalogue and the librarian**: catalogue-first retrieval, filtered by rights, used by the assistant and the check-ins. Measure answers correct, tokens and speed.
4. **Skills**: write the role-detection skill and five behaviour skills (overstating, quiet excellence, overload, ownership, lead bias) as Markdown playbooks, with their answer-key tests; replace the matching code rules.
5. **The auditor's checks, then the curator if needed**: versioning, compare-and-swap writes, citation, permission and injection checks, and the change log first; a curator agent for stale retirement and merging only once files actually need it.
6. **Learning loops and prediction**: track whether coaching and interventions worked; record predictions and check them against outcomes.
7. **Portability**: export and import of an organisation's memory.

## 16. How to know it works

Measured in every judged run, against the standing tests:

- facts reaching every page and the assistant; facts stated wrongly; untrue lines; pages disagreeing;
- patterns caught with instances; honest people flagged (must be zero); role detection matching the answer key;
- interventions followed up, and whether they worked;
- assistant answers correct, with sources; "must never" failures (must be zero);
- privacy leaks (must be zero); injected instructions followed (must be zero);
- model calls, time and cost per conversation, against their targets;
- predictions and skills checked against real outcomes in pilot organisations, not only simulations;
- the use-case and first-experience scores, towards 8.5.
