# Privacy and AI: internal audit

**Internal. Not for the marketing site.** Traced against the code on 7 September 2026.

The marketing copy is the company's position, written with "may" — what Groundwork is permitted to
do. This document's job is to make the architecture true of it, and to name anything that is not.
Where the two conflict the answer is a change to the code, not a smaller sentence.

Method: read the code, not the docs. Every outbound destination customer content can reach was
enumerated from the source; every claim below names the file that proves or disproves it.

**Verdicts:** claim 1 VERIFIED for every product surface, with one infrastructure gap that has to be
FIXED rather than worded around. Claim 2 VERIFIED, with the configuration it rests on now covered by
a test. Claim 3 VERIFIED. Four things were FIXED during the audit. One question cannot be answered
from the repository and is flagged.

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

The three protections are written with **"may"** — what Groundwork is permitted to do — not "does
today". So the test each one has to pass is *does anything in the architecture contradict it*, not
*is it already implemented*. An earlier version of this audit got that wrong and shrank the copy to
this week's implementation; the copy is the company's position and the code has to be true of it.

### Claim 1 — "Groundwork staff cannot access your OKRs, check-ins, team performance, evidence, or underlying organizational data. We only see information you deliberately send to us."

**Product surfaces: VERIFIED. Infrastructure: MUST BE FIXED.**

Verified, with evidence:

- `admin.service.ts`'s `getGroundSupportView` — the only view staff can open on a customer's
  check-in — returns state, billing, roster, check-in status and report *existence*. A guard,
  `admin/ground-support-view.spec.ts`, asserts no excluded field appears in the returned shape even
  when present on the raw row. The exclusion list is explicit: conversation turns, record-entry
  text, every report content field, lead context notes, document content.
- Reports enforce a per-party reveal gate; documents enforce `canSeeDocument`; assistant reads are
  organisation-scoped. There is no export, no admin content screen and no support tool that shows
  customer content.
- **FIXED during this audit** (three ways staff could read content that were not screens):
  PostHog `autocapture` was sending the text of clicked elements; four log lines wrote fragments of
  what people wrote into the application log; a production deployment without WhatsApp credentials
  logged message bodies. All closed, all covered by tests.

**The one genuine contradiction — and the fix is infrastructure, not wording:**

Conversation turns are stored unencrypted in Postgres. `grep` for `encrypt`, `cipher`, `kms` across
`api/src` and the schema: no matches. Anybody holding `DATABASE_URL` can read every check-in, and
`package.json` ships `prisma:studio` as a convenience for doing exactly that.

So the claim is true of everything Groundwork *built* and not yet true of the database underneath
it. **This is the work to do** — see "What has to happen for claim 1" below. Until it lands, the
sentence is a statement of intent that the product enforces and the infrastructure does not
technically prevent.

### Claim 2 — "Groundwork may use leading AI providers… including OpenAI, Anthropic (Claude), Google (Gemini)… protected API infrastructure and configurations where customer data is not used to train or improve these providers' public/general-purpose models."

**VERIFIED for the provider in use. The permission is sound; the constraint on future providers is
now enforced by a test.**

- Today exactly one provider is called: Google, via **Vertex AI** — `new GoogleGenAI({ vertexai:
  true, … })` in `anthropic.service.ts` (the filename is historical). That flag is what selects
  Google Cloud's enterprise service over the consumer API at `generativelanguage.googleapis.com`,
  whose data-use terms are the ones that permit product improvement. It is the whole of "protected
  API infrastructure and configurations" in this sentence.
- No API-key path exists anywhere. `grep`: no `GEMINI_API_KEY`, no `generativelanguage`.
- No other provider is reachable: nothing imports `openai` or `@anthropic-ai/sdk`, and nothing
  posts to `api.openai.com` or `api.anthropic.com`. **FIXED:** `@anthropic-ai/sdk` and
  `@google-cloud/vertexai` were installed and imported nowhere; removed, because an unused provider
  SDK is a path somebody takes by accident rather than by decision.
- **The test that keeps the claim true as providers are added:**
  `a-public-model-never-sees-it.spec.ts` fails if any client is built without `vertexai: true`, if
  an API-key path appears, if a provider SDK is installed or imported, or if provider hostnames turn
  up in the source. Bite-checked by deleting the flag. **When OpenAI or Anthropic is added, this
  test is where the enterprise/no-training tier gets asserted** — the claim then holds by
  construction rather than by memory.
- **Not claimed anywhere, correctly:** that a provider retains nothing. Vertex's published
  behaviour includes abuse monitoring, and zero retention is a separate arrangement. The copy says
  data is not used to train public models, which is a different and supportable statement.

**Open, and not answerable from the repository: whether the project runs on promotional credits and
whether that changes the applicable terms.** Billing state is not in the code. Needs one check in
the Cloud console. Flagged for Hafsah.

### Claim 3 — "Groundwork may use permitted, privacy-preserving signals to improve Groundwork's own internal systems and models. That learning stays within Groundwork and is not contributed to OpenAI, Claude, Gemini, or other public AI models for training."

**VERIFIED. Nothing contradicts it, and the second sentence is enforced today.**

- The load-bearing half is "not contributed to public models for training", and that is true by
  construction: the only outbound AI call is a Vertex inference request. There is no export, no
  dataset build, no upload path, and no fine-tuning API in the tree — `grep` for `fine-tun`,
  `finetune`, `trainModel`: no matches.
- The first half is a permission for work not yet built. Nothing trains a Groundwork model today
  (there are no embeddings either — `knowledge.service.ts` says so explicitly and explains why), so
  there is nothing to contradict. **This is intended future work**, and what it needs in order to
  stay inside this sentence is set out below.

---

## What has to happen for claim 1 to be true at the infrastructure level

In order. (1) is the blocker.

1. **Encrypt the content columns at rest, with keys Groundwork staff do not hold in the clear.**
   `ConversationTurn.content`, `RecordEntry.text`, the `Report` content fields,
   `GroundDocument.content`, `LeadContextNote.text`, `soloArtifact`. Application-level encryption
   with a KMS-held key, so a database dump is not a transcript. This is the change that turns "no
   screen shows it" into "reading it is not available to us".
2. **Take raw production database access off the everyday path.** Remove `prisma:studio` from the
   production-capable scripts, put reads behind a break-glass credential, and log every use of it
   somewhere a customer could be shown.
3. **Say what happens on a support request.** Today the support view cannot show content, which is
   right. If a customer ever needs us to look at their record, that should be an explicit,
   time-boxed grant they make — not a capability we hold quietly.

## What claim 3 needs when Groundwork's own models get built

Decide these before the first training job, not after:

1. **What a "permitted, privacy-preserving signal" is, concretely, and where it is derived.** The
   safe shape is aggregate or structural: which questions produced a specific answer, where people
   abandoned, how long a record took, whether a report was read. Raw turns must not leave the
   database boundary for a training set.
2. **A basis for using it.** Terms that say so, and — if it is ever per-customer rather than
   aggregate — an opt-out that is honoured in code, the same way `WHAT_EACH_MAIL_IS` honours the
   email one.
3. **A test that the training path cannot reach content.** The mirror of
   `a-public-model-never-sees-it.spec.ts`: whatever assembles a training set asserts what it may
   read, so the claim holds by construction.

## Still to confirm, outside the code

- **The Vertex terms in force for this project, including whether credits alter them.** One check in
  the Cloud console. Everything else in claim 2 rests on it.
- **Provider retention, logging and human-review posture**, in writing, for the file. Published
  behaviour is not the same as a term we can point a customer at.
- **Backups.** Whoever operates the database backups holds unencrypted content today; item 1 above
  fixes that at source, and until then the backup posture is part of the same gap.

## Fixed while auditing

| Finding | Fix |
|---|---|
| **PostHog `autocapture` was on** (library default). Autocapture sends the text of clicked elements: a suggestion chip carrying a question about somebody's work, a paragraph of a shared report, a name in a roster. Customer content, to a third party, readable by any member of staff with a PostHog login. | `autocapture: false`, session recording explicitly disabled rather than relying on a dashboard default, masking set so a future toggle cannot become an incident. Page URLs and identity still sent. |
| **Four log lines wrote customer prose into the application log** — up to 120 characters of a quoted phrase, the person's own words that had been shortened, and invented causal claims, on both the check-in and entry paths. Logs are staff-readable. | Counts and lengths, never the text. The lines existed to make a *rate* knowable and a rate does not need the sentence. |
| **A production deployment with no WhatsApp credentials logged message bodies.** The branch was "the channel is off", not "this is a laptop". | The body is logged outside production only; production records that a send was attempted, to whom, and its length. |
| **`@anthropic-ai/sdk` and `@google-cloud/vertexai` installed and imported nowhere.** | Removed. An unused provider SDK is a path somebody can take by accident. |
