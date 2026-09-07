# Privacy and AI: internal audit

**Internal. Not for the marketing site.** Traced against the code on 7 September 2026, before any
claim was written. Where a claim could not be verified it was not published — the page says less
than this document, deliberately.

Method: read the code, not the docs. Every outbound destination customer content can reach was
enumerated from the source; every claim below names the file that proves or disproves it.

---

## The trace: customer → Groundwork → AI provider → Groundwork → customer

**One AI provider, and it is the enterprise one.**

`api/src/modules/conversation/anthropic.service.ts` (the file name is historical) builds
`new GoogleGenAI({ vertexai: true, project, location })`. That single flag is load-bearing: it
selects Google Cloud **Vertex AI** rather than the consumer Gemini API at
`generativelanguage.googleapis.com`. The two have different data-use terms, and the consumer one is
the one that may use submitted data to improve Google's products.

- Project: `gemini.projectId`, default `groundwork-500011`. Location: `us-central1`.
- Credentials: a Google service-account JSON, from `GOOGLE_SERVICE_ACCOUNT_JSON` or
  `credentials/service-account.json`. No API-key path exists anywhere in the codebase.
- `grep` for `generativelanguage`, `api.openai.com`, `api.anthropic.com`: **no matches.**

**What is sent to it:** check-in turns, the entry-chat conversation (including before anybody has an
account), document text extracted at upload, and the assembled synthesis corpus. That is the
product working; there is no path that sends more.

**Two SDKs are installed and imported nowhere:** `@anthropic-ai/sdk` and
`@google-cloud/vertexai`. No customer data can reach Anthropic or OpenAI because no code calls
them — but an unused provider SDK in `package.json` is a latent path and a supply-chain surface.
See FIXED below.

**Every other outbound destination customer content can reach:**

| Destination | What reaches it | Where |
|---|---|---|
| Google Vertex AI | check-in text, entry chat, document text, synthesis corpus | `anthropic.service.ts`, `ops/what-a-reading-of-it-says.ts` |
| Resend | email bodies: labels, names, who has not started. Never check-in content | `email/email.service.ts` |
| Meta (`graph.facebook.com`) | WhatsApp message bodies, only when the channel is enabled | `whatsapp/whatsapp.service.ts` |
| Slack / Teams webhooks | a notice: what happened, a label, a link. **Structurally cannot carry content** — `Notice` has no field for it | `workspace/what-a-channel-may-be-told.ts` |
| PostHog (browser) | page URLs (opaque ids) and identity | `client/src/lib/posthog.ts` |
| Customer-named URLs | outbound fetch of a document the customer asked us to read, SSRF-checked per hop | `documents/whether-we-can-read-it.ts` |

---

## Claim by claim

### Claim 1 — "Groundwork staff cannot access your OKRs, check-ins, team performance, evidence, or underlying organizational data."

**CANNOT CURRENTLY CLAIM AS WORDED.**

What is true and enforced:

- The platform-admin support view is structurally limited. `admin.service.ts`'s
  `getGroundSupportView` returns state, billing, roster, check-in status and report *existence* —
  and a guard, `admin/ground-support-view.spec.ts`, asserts that no excluded field appears in the
  returned shape even when present on the raw row. The excluded list is explicit: conversation
  turns, record-entry text, every report content field, lead context notes, document content.
- Reports enforce a per-party reveal gate; documents enforce `canSeeDocument`; the assistant's
  reads are org-scoped.

What is **not** true:

- Turns are stored **unencrypted** in Postgres. `grep` for `encrypt`, `cipher`, `kms` across
  `api/src` and the schema: no matches. Anyone holding `DATABASE_URL` can read every conversation —
  and `package.json` ships `prisma:studio` as a convenience for exactly that.
- So the honest boundary is: **no in-product surface exposes customer content to staff, and
  infrastructure access is not technically prevented.**

The product already refuses the stronger claim, in `client/src/pages/chat/ChatPage.tsx`:

> *"AND WHAT IS DELIBERATELY NOT SAID: 'we cannot see your conversations'. Turns are stored
> unencrypted and transcripts go to Google for processing. One technical question from a founder or
> an investor finds that out, and a privacy claim caught being false costs more than one never
> made."*

A marketing page contradicting the product's own screen is worse than a weaker page. **The page
says what is enforced and does not say the rest.** Making the strong claim true is real work —
field-level encryption, or an access path that logs and alerts on raw reads — and is listed under
"what would let us say more".

### Claim 2 — "Public AI models do not learn from your data… OpenAI, Anthropic (Claude), Google (Gemini), and others."

**VERIFIED in substance. THE PROVIDER LIST IS WRONG AND WAS NOT PUBLISHED.**

- Only Google is called, only through Vertex AI. Naming OpenAI and Anthropic would tell customers
  their data goes to three providers when it goes to one — a *worse* disclosure than saying
  nothing, and untrue.
- `vertexai: true` is what places these calls under Google Cloud's terms rather than the consumer
  API's. This is the single configuration on which the claim rests, so it is now covered by a test:
  `a-public-model-never-sees-it.spec.ts` fails if the flag is dropped, if an API-key path appears,
  or if another provider SDK is imported.
- **Not claimed:** that Google retains nothing. Vertex's published behaviour includes abuse
  monitoring, and a zero-retention arrangement is a separate agreement. The page says data is not
  used to train the provider's public models; it does not say nothing is retained.

**One item this audit cannot settle from the code: whether the project runs on promotional credits,
and whether that changes the applicable terms.** Billing state is not in the repository. The
wording was chosen to survive either answer, but it needs confirming in the Cloud console before
anybody repeats it in a contract. Flagged for Hafsah.

### Claim 3 — "Groundwork may use permitted, privacy-preserving signals to improve Groundwork's own internal systems and models."

**CANNOT CURRENTLY CLAIM.** Nothing in the codebase trains or fine-tunes any model.

- `grep` for `fine-tun`, `finetune`, `trainModel`: no matches.
- There are no embeddings. `knowledge.service.ts` says so explicitly and explains why: *"NOT
  EMBEDDINGS, AND THIS IS WHERE THAT IS SAID."*
- What does exist is prompt versioning (`PromptVersion`, stamped per ground) and outcome recording.
  That is measurement, not learning, and calling it "models" would be a claim about a pipeline that
  does not exist.

The page therefore describes what is real — the product improves from what people deliberately send
us and from aggregate use — and states the part that matters to a customer either way: **nothing
goes to a public model for training.**

---

## Fixed while auditing

| Finding | Fix |
|---|---|
| **PostHog `autocapture` was on** (library default). Autocapture sends the text of clicked elements: a suggestion chip carrying a question about somebody's work, a paragraph of a shared report, a name in a roster. Customer content, to a third party, readable by any member of staff with a PostHog login. | `autocapture: false`, session recording explicitly disabled rather than relying on a dashboard default, masking set so a future toggle cannot become an incident. Page URLs and identity still sent. |
| **Four log lines wrote customer prose into the application log** — up to 120 characters of a quoted phrase, the person's own words that had been shortened, and invented causal claims, on both the check-in and entry paths. Logs are staff-readable. | Counts and lengths, never the text. The lines existed to make a *rate* knowable and a rate does not need the sentence. |
| **A production deployment with no WhatsApp credentials logged message bodies.** The branch was "the channel is off", not "this is a laptop". | The body is logged outside production only; production records that a send was attempted, to whom, and its length. |
| **`@anthropic-ai/sdk` and `@google-cloud/vertexai` installed and imported nowhere.** | Removed. An unused provider SDK is a path somebody can take by accident. |

## What would let us say more

1. **Encryption at rest for conversation turns**, or a raw-access path that logs and alerts. This is
   the one blocking claim 1's stronger form.
2. **Confirm the Vertex terms in force for this project**, including whether credits alter them.
3. **A retention statement for live organisations.** Retention is enforced today for people who
   leave (`departure.service.ts`, 180 days by default, a daily cron deletes turns past the window).
   There is no general policy for an active organisation, so the page says nothing about retention.
