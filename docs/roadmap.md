# Roadmap: next month

Hafsah decided on 10 October (decision 129) that the MVP is done. The open pull request gets two critical pieces from the original build (Context in Ask and the role interview), pattern testing, and bug fixes only. Everything below waits for next month.

Each item says what it is, where it stands, where any partial work lives, and the decisions that govern it.

## Built on `wip/next`, waiting for next month

| Item | What it is | Status | Where it lives | Decisions |
| --- | --- | --- | --- | --- |
| Reviews with rated parameters | Templates of 4 to 6 parameters, a word scale, how often per team or role, who takes part, an evidence pack with suggested levels, the self-review, colleagues' views, the manager's ratings, the person's progress on You. Ratings only inside a review, never summed, ranked or compared. | Built and tested on the test bed, privacy reviewed by Opus; the screens have drawn it. Not built: reopening ratings when an appeal changes the decision. | `wip/next`: `api/src/modules/suites/the-review-*.ts`, `the-evidence-pack.ts`, `the-suggested-levels.ts`; migration `20261009200000_reviews_with_ratings_and_budgets_by_period`; prompt `review_suggested_levels` | 125, 113, 118, 127 |
| Finance batches and budgets | Approval by role in order, budgets per team or category per month or quarter, one level up when over budget, what the approver sees, the finance lead's grouped queue, approve several, the payment-run download, mark paid, small requests approved by reply. | Built and tested; privacy reviewed; B-183 to B-186 and B-178 fixed. Open: requests 213 (items 6 to 9), 214, 215 (a "paid" state), 219 (currency). A file for the receipt or quote is not kept (storage undecided). | `wip/next`: `api/src/modules/suites/the-spending-budgets.ts`, `the-spending*.ts`, `who-may-decide.ts` | 126, 130 |
| The screens' requests 211 to 220 | Company write routes, permalinks, Today listing a member's own report, the You board's four missing sections, currency, a seeded pattern about a team member, and the rest. | Partly answered in `docs/answers-from-engine.md`; most not started. | `wip/next`, `docs/answers-from-engine.md` | 129 |

## Not started, or only sketched

| Item | What it is | Status | Where partial work lives | Decisions |
| --- | --- | --- | --- | --- |
| The learning system | Groundwork learning inside each organisation first (`docs/learning-spec.md`, stage 1). Self-learning for prompts exists and is off. | Audit of stage 1 asked for; not started. Prompt self-learning built and off (`PROPOSE_PROMPT_CHANGES`). | `docs/learning-spec.md`; `api/src/modules/learning/` | 129 |
| Several check-ins from one plan | One pasted plan setting up more than one check-in. | Setting up one check-in from a plan is built (piece 5, part F). Several from one plan is not. | `api/src/modules/documents/`, the plan-reading path | 129 |
| Links between check-ins | Asks and waits across check-ins, "asked of you" on the You board. | Request 18 built the links and the blocker trace; the screens' use is partial; the prototype's "Asked of Operations" rule needs Hafsah's confirmation. | `GET /grounds/:id/links`, `GET /grounds/:id/blocker-trace` | 129 |
| Guests using Ask in their own check-in | A guest asks only about their own check-in. | Server side built and proven (34 of 34); the screens' entry for a guest is not finished. | `api/journey/a-guest-asks-only-about-their-own-check-in.ts` | 111, 129 |
| Strategy history | Versions of the company's priorities over time. | Built (`strategy_versions`, `GET /company` carries `strategy`); not drawn on the Company page; "a sales goal still points to last quarter's strategy" not built. | `api/src/modules/company/` | 80, 129 |
| WhatsApp on an organisation's own number | An advanced, optional setting. | Built and kept out of the way; no more building is a priority. | `api/src/modules/whatsapp/`, the Connections page | 106, 112 |
| The style clean-up | Moving the screens' one-off styles onto the shared parts. | Stopped where no exact shared class exists. | `wip/prototype-ui` | U17 |
| Prompt wording | The anchor's member questions (B-11 rest), "..." in suggested replies, back-to-front lines, "they" for one named person, model-written sentences from the sweep (15 bugs in `docs/bug-log-engine.md`). Each needs a full 24-scenario run. | Listed, not started. | `api/src/modules/conversation/prompt-library.ts` | 128 |

## From `docs/known-issues.md` (not bugs)

| Item | Status |
| --- | --- |
| W9: the engagement spec's remaining parts (nudging on targets, bundling the lead's "has checked in" mails, WhatsApp forms of the new messages, the Ask link, measuring which message brought someone back) | In `docs/engagement-spec-status.md`. |
| W33: prototype parts that are not built | Listed in known-issues. |
| W34: "Ask to join" (request 159) | Needs Hafsah's answer. |
| W23: billing tried in Stripe test mode | Needs a test key; untried. |
| U11: the scenario packs' improved versions | Not started. |
| B2: WhatsApp templates approved by Meta | Hafsah and Abubakar; no new templates for now (decision 124). |
| B7 and B9: the release-night steps and hosting questions | Hafsah and Abubakar. |
| U6 and U7: decisions taken provisionally, the anchor's open decisions | Wait for Hafsah. |

🤖 Generated with [Claude Code](https://claude.com/claude-code)
