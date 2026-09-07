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

**Product surfaces: VERIFIED. Infrastructure: ACCEPTED AS IS, by decision, 7 September 2026.**

Hafsah's call after the cost was measured: the encryption work is not being done now. That is a
defensible decision and it is recorded here rather than left looking like forgotten work, because
the claim's standing depends on it.

What it means in practice: the claim is about whether GROUNDWORK'S PEOPLE read a customer's work,
and every route a member of staff could take is closed — no screen, no export, a support view a test
proves cannot return content, and the three non-screen routes fixed during this audit. What is not
closed is that a database dump is readable, so the sentence rests on operational discipline rather
than on cryptography.

The consequence to keep in view: if a customer or an investor asks the technical question in a
security review, the honest answer is "no staff path in the product, and not encrypted at rest" —
and that answer is weaker than the one the page implies. The cost of changing it is measured below
and rises with every customer onboarded.

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

**The credits question is now answered — see "Do Google Cloud's free credits change the data-use
terms?" below.** Short version: the no-training commitment does not depend on how the account is
paid for, so this claim stands. Being on the self-serve online terms (which is what a credits
account is) does mean prompts are logged for up to 30 days for abuse monitoring, which contradicts
nothing on the page and is worth closing by request.

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

## What the encryption work costs

Measured against this codebase on 7 September 2026, not estimated in the abstract.

**It is one seam, not a sweep.** 101 call sites read or write the content tables
(78 reads, 23 writes across `ConversationTurn`, `AssistantTurn`, `RecordEntry`, `Report`,
`GroundDocument`, `LeadContextNote`). None of them has to change. Prisma is on 5.22, which supports
client extensions, so encryption goes in `PrismaService` as a query extension over a named list of
model-and-field pairs: encrypt on create/update, decrypt on read. One file, one list, and adding a
new content column later is a line in that list rather than an audit.

**Three queries break, and both of them are cheap to fix.** Only three places ask the database to
search a content column, all of them `contains` on `RecordEntry.text`:

- `patterns/patterns.service.ts:578` — looks for a name fragment in record entries
- `conversation/context.service.ts:435` and `:436` — name variants and operational words

An encrypted column cannot be searched with `contains`, so this is the real design question. It
happens to have an easy answer here: **both queries already scope by ground or organisation before
the text filter**, so the row set is small before the search matters. Drop the `contains` from SQL,
load the scoped rows, filter in application code after decryption. No blind index, no HMAC token
table, no searchable-encryption scheme. Loading a few hundred rows instead of a few is nothing next
to the Gemini call in the same request.

**Runtime cost: negligible, with one trap.** AES-GCM over a few kilobytes is microseconds against a
model call measured in seconds. The trap is calling KMS per row: unwrap the data key once per
process and cache it, and the cost is arithmetic. Per-row unwrapping would add a network round trip
to every read, which would be felt.

**Operational cost: a key becomes a thing you can lose.**

- A KMS key to create, hold and rotate. Rotation needs a key id stored beside each ciphertext, or
  re-encryption on rotation — the first is cheaper and should be decided at the start.
- **Backups stop being readable without the key.** That is the point of the exercise and it is also
  the risk: losing the key loses every check-in, and no support process recovers it.
- Support changes shape. Staff can no longer read the database to work out what happened, which is
  the goal — so the break-glass path (audit item 2) becomes necessary rather than nice, and it
  should be built in the same piece of work rather than after somebody needs it at 2am.
- `prisma:studio` stops showing content. Correct, and worth saying out loud to whoever uses it.

**What it buys:** claim 1 becomes true at the infrastructure level rather than enforced only by the
product. A database dump stops being a transcript. The backup exposure closes at source.

**What it does NOT buy, and this belongs in the same sentence as the claim:** the application
decrypts in order to work, so anybody with access to a running app server or its memory can still
read content. This defeats database dumps, backups, stolen snapshots and casual internal access. It
does not defeat a compromised application host. Saying otherwise would be the same mistake as the
copy this audit already corrected.

**Scope, honestly:** the extension and its key handling, three query rewrites, a backfill migration,
a break-glass read path, and tests that a content column never leaves the database in plaintext.
Call it a few focused days rather than a project — the estimate is small *because* the codebase
routes every content read through Prisma and searches content in only three places, and that is a
fact about this repository rather than a general truth.

**The cost rises steeply with delay, which is the argument for doing it now.** Backfilling
ciphertext across today's data is a single migration on a dev-sized database with no paying
customers. Across five hundred organisations with live check-ins it is a migration project with a
maintenance window, a rollback plan and a customer conversation. The work is the same; the risk is
not.

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

## Do Google Cloud's free credits change the data-use terms?

Checked against Google's own documentation and terms on 7 September 2026. Sources at the end of
this section.

**The no-training commitment does not depend on how the account is paid for.** Google's AI/ML
Privacy Commitment and the Service Specific Terms say Google "won't use your data to train or
fine-tune any AI/ML models without your prior permission or instruction", and Google's own
documentation states this covers managed models including **GA and pre-GA** ones. Nothing in it is
conditioned on being a paying customer, on the $300 free trial, or on promotional credits. So
claim 2 survives the credits question.

**But the ACCOUNT TYPE changes prompt logging, and a credits account is the type that gets logged.**
Two facts together:

1. Google logs prompts and responses **for up to 30 days** for abuse monitoring. That data is
   explicitly not used to train or fine-tune models.
2. Prompt logging for abuse monitoring applies to customers **whose use is governed by the Google
   Cloud Platform Terms of Service** — the online click-through terms, which is exactly what a
   self-serve account on free credits is on. Customers with a negotiated **Google Cloud Master
   Agreement are exempt from prompt logging by default**, and an exception can be requested for a
   named account.

So the credits do not weaken the training promise; they mean we are on the terms where prompts are
retained for up to 30 days rather than the terms where they are not. **Nothing on the marketing
page says a provider retains nothing, so this contradicts no published claim** — and it is a real
difference worth closing.

**What to do about it, in order:**

1. **Ask Google for the abuse-logging exception for this project.** It is a request against a named
   account and it costs nothing to make.
2. **When there is a contract, get a Master Agreement rather than staying on the online terms.**
   That removes prompt logging by default rather than by exception.
3. **Do not treat "up to 30 days" as a secret.** If a customer asks what a provider holds, the
   answer is a retention window for abuse monitoring, not training - and that is a defensible
   answer given in full.

**FIXED while checking this — a Pre-GA hole nobody would have noticed.** The Service Specific Terms
say of Pre-GA Offerings: *"no data processing terms (including the Cloud Data Processing Addendum)
apply to Pre-GA Offerings and Customer should not use Pre-GA Offerings to process personal data or
other data subject to legal or regulatory compliance requirements."* The model is one environment
variable, `GEMINI_MODEL`. So `GEMINI_MODEL=gemini-3.0-pro-preview` would have moved every check-in
in the product outside the DPA, silently, while everything kept working - and check-ins carry
personal data by definition. The service now refuses to start on a model whose terms have not been
read: `a-preview-model-has-no-data-terms.ts` holds the list, and adding to it is a deliberate act.
Driven: booting with a preview model exits with the reason.

Sources:

- Google Cloud AI/ML Privacy Commitment - https://cloud.google.com/blog/products/ai-machine-learning/google-cloud-unveils-ai-and-ml-privacy-commitment
- Vertex AI data governance and zero data retention - https://docs.cloud.google.com/vertex-ai/generative-ai/docs/data-governance
- Abuse monitoring, 30-day logging, and the account-type distinction - https://docs.cloud.google.com/vertex-ai/generative-ai/docs/learn/abuse-monitoring
- Service Specific Terms, Pre-GA Offerings clause - https://cloud.google.com/terms/service-terms
- Google Cloud Free Trial and free credits - https://cloud.google.com/free

## Still to confirm, outside the code

- **Whether the abuse-logging exception has been granted for this project.** The request is the
  action; the answer is the thing to file.
- **Provider retention, logging and human-review posture in writing, for our file.** Published
  documentation is what this audit read, and it is not the same as a term with our account named on
  it. Get it with the Master Agreement.
- **Backups.** Whoever operates the database backups holds unencrypted content today; item 1 above
  fixes that at source, and until then the backup posture is part of the same gap.

## Fixed while auditing

| Finding | Fix |
|---|---|
| **PostHog `autocapture` was on** (library default). Autocapture sends the text of clicked elements: a suggestion chip carrying a question about somebody's work, a paragraph of a shared report, a name in a roster. Customer content, to a third party, readable by any member of staff with a PostHog login. | `autocapture: false`, session recording explicitly disabled rather than relying on a dashboard default, masking set so a future toggle cannot become an incident. Page URLs and identity still sent. |
| **Four log lines wrote customer prose into the application log** — up to 120 characters of a quoted phrase, the person's own words that had been shortened, and invented causal claims, on both the check-in and entry paths. Logs are staff-readable. | Counts and lengths, never the text. The lines existed to make a *rate* knowable and a rate does not need the sentence. |
| **A production deployment with no WhatsApp credentials logged message bodies.** The branch was "the channel is off", not "this is a laptop". | The body is logged outside production only; production records that a send was attempted, to whom, and its length. |
| **`@anthropic-ai/sdk` and `@google-cloud/vertexai` installed and imported nowhere.** | Removed. An unused provider SDK is a path somebody can take by accident. |
