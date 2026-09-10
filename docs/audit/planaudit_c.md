# Audit of `fixplan_part_c.md` (the client, 20 batches, 127 findings)

Read-only pass. Every batch checked against `client/src` as it stands on
`fix/the-brief-is-yours-and-the-context-chat-takes-work`.

The plan is well-built: the diagnoses are mostly real, the four reference patterns are
mostly real, and it refuses two findings correctly. Its defects cluster in three places —
**sweep membership** (the thing you asked to be checked hardest, and the thing most often
wrong), **specs that cannot pass on the day they are written**, and **line-number drift**.

---

## The two things you asked about specifically

### 1. The naming decision, and the rename table

**The decision is right. One of its two justifications is not.**

- `components/gw/AppShell.tsx:43` is `label: 'All check-ins'` → `to: '/grounds'`. Verified. Real evidence for check-in = engagement.
- `api/prisma/schema.prisma:766` `model Ground`, `:1177` `model CheckIn`, `:1254` `@@unique([participantId, sessionNumber])`. All verified. The `CheckIn` doc-comment at `:1181` itself uses "check-in" in the engagement sense ("a managing-only lead — somebody who runs a check-in"), which supports the plan.
- **But** the plan says `components/gw/two-things-called-check-ins.spec.ts` "locks it with a comment explaining the choice". It does not. That spec's comment is about the *rail* listing check-ins above a *nav item* of the same name — a redundancy problem. It asserts three things, none about engagement-vs-session. The plan should say: the decision rests on AppShell's route and the schema; the spec is a convenient host for the new assertions, not prior authority for the rule.

**Rows that are wrong:**

| Row | Problem |
|---|---|
| `GroundAdminPage.tsx:594` `aria-label="Check-in cadence"` | The aria-label is at **:2758**. `:594` is a `toast.success` string. Off by 2,164 lines. |
| `GroundAdminPage.tsx:596` `… final check-in.` | Actually **:594** (inside that toast). The two rows are transposed. |
| `AdminDashboardPage.tsx:371` `Total sessions` | The string is at **:398**. |
| `AdminDashboardPage.tsx:374` `First check-in (legacy)` | **:375**. |
| `GroundParticipantPage.tsx:787 / 795 / 845` | Actually **:786 / :806 / :827**. |
| `BillingPage.tsx:461` `Create up to {n} check-ins…` | That sentence is at **:464**; `:461` is a different one. |
| `InvitePage.tsx:143 / 189`, `ChatPage.tsx:1166 / 1171`, `SessionReportPage.tsx:428` | All off by one. |
| `components/PostSessionPanel.tsx:44-88` — "the same three strings, duplicated", "same three edits" | Only **two** are there (`:57`, `:79`). "Your initiator has been notified" is not in this file. Two edits, not three. |
| `AdminPage.tsx:747` event labels — "map in `fmt()`" | **This would not work.** The event labels render at **:751**, but `fmt()` (`:15-17`) is a generic title-caser also used at `:520` (status), `:626` (scenario) and `:642` (status). A key→label map inside `fmt()` leaks into three unrelated renderings. Put the map at the event call site. |

**User-facing occurrences the table missed** — this is the significant one:

| File | Missed | Sense |
|---|---|---|
| `pages/grounds/CreateGroundPage.tsx` | **44 occurrences** in `desc:` / `tests:` / `agreed:` card copy — "Each **check-in** then tests what they are doing against that", ×22 cards | session. This is the situation catalogue read on `/start` by every new customer, and `EntryChatPage.tsx:11` imports `SCENARIOS` from it, so it renders on both doors. |
| `components/gw/SituationCard.tsx:146` | `<dt>Check-ins</dt><dd>{sessions}</dd>` | session. The exact collision, on the product's first screen, in the same file Batch 19 edits. |
| `components/gw/SituationCard.tsx:113, :142` | "What the **check-ins** test", "One check-in" | session |
| `pages/admin/AdminPage.tsx:498` | `label="Check-ins done"` over `dash.checkIns.totalCompleted` | session — and it sits **one line below** `:497` `label="Total check-ins"` over `dash.grounds.total`. Both words, both senses, adjacent, unfixed. |
| `pages/admin/AdminPage.tsx:507` | `label="Check-ins"` over `dash.checkIns.completedLast7Days` | session |
| `pages/admin/AdminPage.tsx:585` | `"Stalled check-ins (>7d)"` — `stalledCheckIns` is `prisma.checkIn.count` (`api/src/modules/prompts/prompts.service.ts:166`) | session |
| `pages/admin/AdminPage.tsx:590` | `"Avg days to first check-in"` — SQL joins `check_ins ci … WHERE ci.session_number = 1` (same file, `:175-179`) | session |
| `pages/grounds/GroundsListPage.tsx:174` | `"No check-ins yet"`, gated on `(g.checkIns ?? []).some(c => c.status === 'COMPLETED')` | session |

**Consequence for effort.** Batch 8 is costed at "half a day for the strings". With `CreateGroundPage`'s 44 lines of prose plus `SituationCard`, this is a copy rewrite of the catalogue and needs a product-owner read, not a find-and-replace. **Off by well over 2x.**

### 2. The two refusals — **correct, plainly.**

`components/gw/account-is-not-the-word.spec.ts:15-18` says, verbatim:

> WHAT IS BANNED IS THE SENSE, NOT THE STRING. "Create your account", "already have an account", "everyone with a Groundwork account counts toward your plan" are all correct and stay. So this cannot be a grep for the word

and its final `it()` block *asserts* `AuthPage` contains `'Create your account'` and `'Already have an account'`, and that `PricingPage` matches `/Groundwork account in your organisation/`. The strings P5-091 and BR-012 flag are the login sense:
`BillingPage.tsx:338` "Everyone with an account here" and `:388` "More people have accounts here than this plan covers" — both about seats. Changing them would break a written decision **and fail a shipped test**. The refusal is right, the reasoning is right, and the plan's proposal to record the review in that spec's comment is the right disposition. The BR-012 half that is kept ("organisation" vs "workspace") is a real defect.

---

## Sweep integrity — checked hardest, and this is where the plan is weakest

**Batch 2 — the worst one.** The plan claims `includes('@')` at "nine call sites, one rule".
Reality: **~30 occurrences across 11 files.** Unlisted: `GroundsListPage:491,496,497`,
`CreateGroundPage:1306`, `GroundAdminPage:1985,1990,2447,2448,2469,2475`,
`OrgMembersPage:233,432,436`, `OrgSetupPage:28,107,111`, `EntryChatPage:2172,2194,3819`,
`AuthPage:307,316`, `TheAssistantAsACustomerSeesIt:550,981`, `JoinPage:132`.

It is also **not one shape**. Three: (a) guard-then-message; (b) silent `return`;
(c) `disabled={…!x.includes('@')}` *paired with a matching `opacity` ternary* — two
expressions per site. And `EntryChatPage:3819`
(`.filter(e => e.includes('@') && !inviteAdded.some(…))`) is **not validation at all** — it
filters model-extracted mentions. Applying `looksLikeAnAddress` there would silently drop
legitimate extractions. That is precisely the failure mode you asked about: a member lumped
into a sweep that needs a different fix.

The spec makes it worse: it asserts `includes('@')` appears **zero times** in `pages/` and
`components/` outside the helper. With nine sites converted, ~21 remain and the spec fails on
day one. **Effort: 2-3 days, not a day.**

**Batch 1** — "ten independent mutation definitions". Only **five** are mutations missing
`onError`. The other five are a wrong `onError` body, an env constant, a deliberate
fall-through, a missing `else`, a queue reset, and two **queries**. Its proposed spec sweeps
all 153 `useMutation(` sites; 20-40 lack `onError` app-wide, so the allowlist is the batch.

**Batch 3** — "six call sites with the same two-step shape". Four genuinely share it.
`BillingPage:432` already *has* a confirm (wrong words — a copy fix). `ResolutionPanel` needs a
consequence list, which the plan itself says to copy from a *different* pattern. Also missed:
`SaveCard.tsx:136` is a **second** identical unguarded `onClick={onClear}` "Start over"
alongside the `:298` one the plan names.

**Batch 9** — 23 `<span|div onClick>` sites exist. Missed *inside files this batch already
edits*: `EntryChatPage:3933` (a second identical "Not now" `<div onClick>`),
`EntryChatPage:2287` and `GroundAdminPage:1160` (two more `<span onClick>← Check-ins</span>`,
identical to the `GroundParticipantPage:403` defect it does name). Its sweep would fail
immediately on three of its own files.

**Batch 10** — the two counts are right (2 `aria-live`, 8 `.gw-er`) but **the membership list
is wrong**: there is **no `gw-er` in `EntryChatPage`**; the eighth is `TalkToUsPage.tsx:128`.
`SaveCard`'s second is `:208`, not `:205`.

**Batch 14** — "three sites, one bug shape". There are **eight**:
`GroundAdminPage:649, 666, 3064`, `EntryChatPage:2164`, `MagicVerifyPage:331`,
`CodeShareCard:26, 35` on top of the four named. The helper would land beside four unfixed copies.

**Batch 6** — nine sites, all real, but self-contradictory: "five Setup writes … verified at
all four line numbers". There are four raw `.update` calls; the fifth (the radio, `:2605-2629`)
calls `groundsApi.setPeopleWorkTogether`. Missed member of the same shape:
`ReportPage:1485` disables *every* session-download button at once.

---

## Proposals based on a misread of the code

| Batch | Plan says | Code says | Should say |
|---|---|---|---|
| **5** | `EntryChatPage` renders "This is a check-in for the PIP." and "…your record for this PIP." — "a scenario key is being printed into user-facing copy" | **Neither string exists anywhere in `client/src` or `api/src`.** They are model output, quoted from `browser_findings.md:14`. | The client leak is real but elsewhere: `EntryChatPage:922-932` `fallbackGroundName` hand-rolls `PIP` → `"Pip"` into the ground label; `EntryChatPage:3743-3745` a hardcoded `notices` map keyed on `PIP` prints *"Performance improvement check-ins document a process…"*. The second directly breaks the written decision at `lib/scenario-catalog.ts:30-32` ("keeps the word 'performance' out of the product, a decision already taken … and quietly broken here"). The fix is to import the existing `scenarioLabel()`, which `scenario-catalog.spec.ts:18` already asserts maps `PIP` → "Someone's work is off track". |
| **5** | "Every situation card has a human name (`every-situation-card-has-a-name.spec.ts` already asserts this) — use that name" | That spec asserts a card's **accessible name** in `SituationCard.tsx`. It says nothing about key → display name. | Cite `lib/scenario-catalog.ts` and `scenario-catalog.spec.ts`. |
| **4** | `EntryChatPage:1663-1675` — "the button's own comment ('The engine does not yet extract cadence') is now false — delete that stale comment" | **That string does not exist anywhere in the repo.** | Drop the instruction. The rest of BR-003 (the `title="Edit number of sessions"` chip at `:2356`) is real. |
| **4** | `GroundParticipantPage:456-458` prints `Session n of total` **unconditionally** | `:462` already reads `{totalSessions != null && (…)}`. | Not unconditional. Only the `opensLater` half is a defect. |
| **4** | "the same value gates the resolution panel (`MyRecord.tsx:80`) … when null that gate must be closed, not guessed open" | `MyRecord.tsx:81` **already** reads `totalSessions != null && completedCount >= totalSessions - 1`. `MyRecord:26`, `MyParticipation:29` and `WhatYourRecordCanSupport:89` **already type it `number \| null`**. | The stated "medium risk, highest of any batch" is overstated — the type is already nullable downstream. The one real unnamed member is `MyParticipation.tsx:87`, which prints `{completedCount} of {totalSessions}` and would render "3 of null". |
| **4** | `ReportPage` "line 1112 … '3 of 5 answered this session'" | `:1112` reads `**Picture forming** - {progress.completed} of {progress.total} checked in.` | Misquoted. The improvement is still reasonable; quote the real string. |
| **7 & the reference table** | "`whatWentWrong` / `whyYouCannotSeeThis` are in `ReportPage.tsx`; **lift them** to `components/gw/why-you-cannot-see-this.ts`" | They are **already** a separate module: `pages/report/why-you-cannot-see-this.ts:20,25`, imported at `ReportPage.tsx:12`, with its own spec `pages/report/why-you-cannot-see-this.spec.ts`. | The central work item of Batch 7 is already done. `BoardPage` and `SessionReportPage` need one `import` line each. Moving the file to `components/gw/` would orphan the existing spec's relative import for no gain. Effort drops. |
| **3** | "the one existing `window.confirm` (`BillingPage.tsx:432`) is itself a finding" | **Four** in product code: `AppShell:1139`, `IntegrationsPage:722`, `OrgMembersPage:735`, `BillingPage:432`. | And `switching-organisation-is-not-a-stray-click.spec.tsx` **asserts `window.confirm` must be there** on AppShell. "Never `window.confirm`" is not a rule this codebase holds. Scope the claim to these destructive cases and leave AppShell alone. |
| **3** | `ResolutionPanel.tsx:71` is `onClick={() => picked && proposeMut.mutate(picked)}` | `:71` is **blank**. The onClick is at `:149` and already has `disabled={!picked \|\| proposeMut.isPending}` and a pending label. `:70` is the `if (isLoading \|\| error \|\| !data) return null` the plan assigns to Batch 7. | The two citations are swapped. Only the confirm is missing. |
| **6** | `AdminDashboardPage` "the add-admin submit has no guard"; "clear it in `onConfirm`'s success path only" | `handleSubmit` (`:548-552`) **fires no network call** — it only opens `OtpModal`. The real double-submit is `OtpModal.handleConfirm` (`:185-197`), which **is** guarded by `loading`, and which calls `onClose()` itself on success. | "Clear in onConfirm's success path" is not expressible at the call site; it needs a new `onSuccess` prop. Rewrite the bullet. |
| **11** | `ChoosePasswordPage:63` — "**verify first** whether `/grounds?welcome=1` renders anything keyed on `welcome`; if it does, this is not a finding" | It **does**: `GroundsListPage:195` reads it and `:633-637` renders "You are in." — but that banner sits inside the `!isAdmin` branch of the `isAdmin ?` ternary at `:404`. Self-serve signup creates an ADMIN, who never sees it. Navigate is at `:71`, not `:63`. | Record the answer: the copy already exists, so **no new words are needed**. Move the banner above the ternary. This turns a freeze-adjacent copy addition into a two-line move. |
| **11** | BR-011: "add `sessions`, `cadence` and `timelineDays` to the persisted session" | The store holds only `groundName` and `sessions`; `cadence` (`:1182`) and `timelineDays` (`:1664`) are local `useState` in `EntryChatPage`, not store fields — and `groundName` is lost on reload too. | Name `groundName`; say which two values have to be promoted to the store first. |
| **11** | "Clear it wherever `error` is cleared — five `onChange` handlers and the three `setView` calls" | **Seven** `onChange` (368, 380, 445, 468, 484, 541, 572) and **six** `setView` (423, 425, 519, 553, 586, 604) plus `onUseDifferent` at 615. | Fourteen sites, not eight. |
| **1** | `GroundParticipantPage:176-179` — `createSubscriptionMut.onSuccess` | `:176-179` is `claimFreeExtensionMut`. `createSubscriptionMut` is `:185-189` and **already has** `onError`. | Cite `:185-189`; the gap is only the missing `else` at `:187`. |
| **1** | `inviteTheQueue.onSuccess` → `setQueuedToAdd(failed.map(f => f.email))` | `failed` is `{email, because}[]` but `queuedToAdd` holds `{email, note}` objects (`:741`, `:2496`). | **Will not compile as written.** Also the real lines are `:756-767`, not `:2506-2513`. |
| **12** | `BillingPage:630-635` Enterprise mailto — "One word." | `:631` is `mailto:${user?.email ?? 'support@myground.work'}`. Two defects: the `user?.email` primary *and* a fallback that disagrees with `PricingPage:175`'s `hello@myground.work`. | Two edits. |
| **13** | `ChatPage` `accept` "offers 22 extensions" against a 10-item allowlist | **23** at `:1267`. And the label's `title` at `:1255` advertises a **third**, 9-item list. | Three lists to unify, not two. |
| **18** | `SaveCard.tsx:172, 275` carries `you@company.com` | It is at **`:114` and `:202`**. `:277` is a *different* placeholder (`them@company.com`) correctly left alone. | Wrong lines, right finding. |
| **18** | BR-009 — "`pages/home/HomePage.tsx` / the test-build root" | `HomePage.tsx` is **unreferenced dead code**. The screen described is `AFrontDoorOfItsOwn`, inline at `App.tsx:201-232`, rendered from `RootRoute:264`. | Wrong file. And the plan already self-flags this as its weakest justification — recommend dropping it: it is demo scaffolding, and Batch 12's own principle ("a permanently disabled control is scaffolding, not a state") argues against dressing it up. |
| **18** | `ApiAccessPage:67` "1 writes". Pluralise. | `:67` is `{…}.calls calls, {…}.reads reads, {…}.writes writes` — **three** hard plurals. | Three. |
| **18** | "Check needed: whether the token-exchange plan gate in `the-api-is-a-paid-thing.ts` is still live" | **That file does not exist in this repo.** It survives only as a reference in `IntegrationsPage.tsx:296`'s comment. | The comment is stale; that is the finding. The gate question is server-side, not answerable here. |
| **19** | BR-005 — "make each label+value one flex child (`SituationCard.tsx`) so they wrap together" | `SituationCard.tsx:131-149` **already** wraps each `<dt>/<dd>` pair in its own `<div>`, and `index.css:692` sets `.cg-meta > div { flex: 1 }`. | **The proposed fix is a no-op.** The cause is CSS: `.cg-meta dt { min-height: 24px }` (`index.css:695`) is the anti-misalignment device and it fails once a label wraps to three lines at ~1150px; the `@media (max-width: 620px)` block (`:709-714`) drops it entirely. Wrong file, wrong fix. |

---

## Proposals that break a written decision

1. **Batch 2 → `JoinPage`.** The plan says "Enable the button; validate on submit". `JoinPage.tsx:121-126` is a written decision: *"No asterisk; the copy says why it is asked **and the button waits for it**."* The plan quotes the asterisk half approvingly and silently reverses the other half. This needs the product owner, not an engineer. **Cite: `client/src/pages/join/JoinPage.tsx:125`.**

2. **Batch 7 → `ChoosePasswordPage`.** "Map the three known cases — expired, already used, too weak." `components/gw/LinkProblem.tsx:24-28` states the opposite as a decision: *"WHY IT DOES NOT SAY WHICH TOKEN FAILED. 'No token in the URL' and 'this token has expired' and 'this token was already used' are the same instruction to the person reading it, and telling an unauthenticated caller which of the three it was is a small oracle about links they do not hold."* Expired-vs-already-used is exactly what that refuses. The `JoinConfirmPage` `detail=` fix is also a (smaller) move against that stance and should say so rather than present itself as a pure deletion. **Cite: `client/src/components/gw/LinkProblem.tsx:24-28`.**

3. **Batch 4 → the specificity meter.** `specificity-shows-as-what-it-is-made-of.spec.ts` records as decided that what may not come back is *"a bar out of five, and a grade word standing on its own."* The plan deletes the grade word and the tooltip but **keeps the five-dot bar** (`EntryChatPage:3205`). Half-obeys. Delete the bar too, or get the call.

4. **Batch 3 → `AppShell`.** Covered above: `switching-organisation-is-not-a-stray-click.spec.tsx` requires the `window.confirm` the plan's blanket statement condemns.

5. **Batch 5 → BR-007, the 23rd card.** Called "content, not a screen change… the cheapest thing in this batch". It touches `lib/scenario-catalog.ts`, whose own comment notes the marketing use-cases page is a **separate static build** — so a new card either desynchronises the two or requires a marketing change, which is out of bounds. Not cheap and not free.

---

## Contradictions between batches

- **Batch 19 vs Batch 20.** Batch 20 declares `BoardPage` (P5-076) a correct reference pattern for narrow viewports. But `BoardPage` carries `minWidth: 160` (`:447`), `200` (`:531`), `110` (`:1065`), `92` (`:465, :470`) on plain flex rows **outside** any scroll container — the exact shape Batch 19 flags in `AdminDashboardPage`. Batch 19's proposed sweep would fire on the file Batch 20 blesses. One of the two is wrong; P5-076 is mis-cleared.
- **Batches 6 and 9** both edit `BoardPage.tsx:474-484` with no cross-reference (Batch 3↔9 and 6↔15 are cross-referenced; these two are not).
- **Batch 14** edits `IntegrationsPage.tsx:507`, which Batches 3 and 10 also touch; only 3↔10 are cross-referenced.

---

## Specs that would not catch a regression

| Batch | Spec | Problem |
|---|---|---|
| 1 | `a-failure-is-never-a-success.spec.ts` | Sweeps all 153 `useMutation(` sites; 20-40 lack `onError` app-wide. The allowlist is larger than the batch. |
| 2 | `one-test-for-an-address.spec.ts` | Asserts zero `includes('@')` outside the helper while converting 9 of ~30. Fails on day one. |
| 4 | `a-number-is-a-measurement.spec.ts` | Grep-only. Catches `?? 6` and `"Total sessions"`; cannot catch the `opensLater` case, the `oneSided` recount, or that BoardPage's replacement actually counts *done* sessions rather than merely not printing the old string. |
| 9 | extend `an-icon-is-not-a-target.spec.ts` — "it already owns this rule" | **It does not.** That spec owns tap-target *size*, reads only `index.css` and `AppShell.tsx`, and guards itself with `expect(CSS.length).toBeGreaterThan(10000)`. Bolting a multi-file JSX sweep onto it contradicts its premise — and the sweep fails immediately on `EntryChatPage`, `GroundAdminPage` and `BillingPage`. |
| 10 | `the-page-says-what-it-is-doing.spec.ts` | The `gw-er` half is good. The second half's bare `/Loading\|Getting your\|…/` matches **221** source lines, almost all `isLoading`/`setLoading` identifiers. Anchored (`/>\s*(Loading\|…)/`) it still finds ~23 rendered sites against the eight fixed, and cannot see JSX text on its own line. |
| 12 | "no `disabled` literal on a `gw-btn`-weight control" | The control it is meant to catch (`GroundAdminPage:2942`) is **not** a `gw-btn` — it is inline-styled. The spec would not catch its own regression. |
| 19 | `nothing-scrolls-sideways.spec.ts` | **Not implementable as written.** It needs cross-component ancestry (`C` and `SL` are style constants; the offending `<Bar>` is a separate component) from a regex over inline style objects. It would false-positive on BoardPage (blessed by Batch 20) and false-negative on anything using a style constant. Replace with a Playwright `document.scrollingElement.scrollWidth` assertion at 375px and 1150px. |

---

## Effort estimates off by more than ~2x

| Batch | Stated | Actual |
|---|---|---|
| 2 | day | **2-3 days** — ~30 sites, three shapes, plus the unsatisfiable spec |
| 1 | day | **~2 days**, almost all of it the allowlist the spec demands |
| 8 | half a day for strings | **days** — `CreateGroundPage`'s 44 lines of card prose plus `SituationCard` make this a catalogue rewrite needing a product read |
| 19 | hours | the AdminDashboard wrap is minutes; the spec is not hours, and BR-005's fix has to be re-diagnosed |
| 9 | half a day | closer to a day — needs a `TextAction` style prop (see below), a new spec file, and 8-10 unnamed sites |
| 7 | day | **lower** — the "lift" is already done |
| 4 | day | about right (1-1.5); its "medium/highest risk" label is overstated |

Also, one factual error inside Batch 9's risk note: *"`TextAction` is already styled to render identically"* — **false.** `TextAction` uses `font: 'inherit'`; the `LinkSentPanel` spans set `fontSize: 12`/`12.5` + `fontWeight: 600`, and `GroundParticipantPage:403` sets `fontSize: 13, color: var(--gw-muted)`. Swapping it in changes size and colour on a frozen screen. It needs a `style` prop before it can be lifted.

---

## Freeze and marketing

- **No proposal in this slice edits any file under `marketing/`.** Confirmed by inspection of every batch. The closest is Batch 5's 23rd situation card, flagged above.
- **No proposal adds a page or a route.** Confirmed.
- **Explanatory copy added without sufficient justification:** two, both minor and both self-flagged by the plan. (a) Batch 2's `SaveCard` "Add one person now; you can add the rest once you have saved." — justified as preventing silent data loss; acceptable. (b) Batch 18's BR-009 sentence on the root screen — recommend **drop**, and note it targets a dead file anyway.
- Batch 11's `?welcome=1` item, which reads as copy-addition, turns out to need **no new words** — see above.

---

## Things verified sound and worth saying so

- The four reference patterns are real: `GroundAdminPage:2969-2992` (two-step confirm, names the object in quotes, "Keep it", pending label, inline `deleteError`) — exactly as described; `GroundAdminPage:1856` per-row pending; `ChatPage`'s decline (four consequences as `<li>` at `:1069-1074`, `disabled` while pending, settled post-state); `LinkProblem`'s `detail` prop at `:30`. Only the citation ranges drift (the `<li>` block is `1060-1091`, not `1076-1109`).
- Batch 1's two headline claims are exact and important: `SaveCard.tsx:55-71` `onError` is byte-for-byte `onSuccess` — verified; and `VITE_APP_URL` is referenced once in the whole repo (`SaveCard.tsx:18`, `?? ''`) and set in no env file, so **every invite link copied off that card today is origin-less and unopenable**. The upgrade to Blocker is right.
- Batch 13's claims are exact: zero `autoComplete` in the auth/join/password flow; `{trap.field}` twice at `SaveCard:107-108` and zero in the admin form; `a-field-nobody-can-see.tsx:21` does carry `aria-hidden`; `ChoosePasswordPage` has no `<form>` and Enter is bound only to the confirm field while `autoFocus` is on the password field.
- Batch 14's bug analysis is technically correct: `?.` short-circuits only the member access, so `undefined.then` throws, and `SessionReportPage:438`'s good `.catch` is genuinely dead code. `BillingPage:248`'s "no optional chain" claim is also correct.
- Batch 12's destination claims are all exact, including `AdminDashboardPage:941-952`, `AuthPage:145`, `App.tsx:384`, and that `RootRoute` (`App.tsx:234-266`) really does `window.location.replace(MARKETING_URL)` for a signed-out decliner.
- Batch 16's BR-017 is exact — with one addition: the plan says "the roster block below carries its own heading, so nothing is orphaned", but that block (`GroundChat.tsx:143`) is gated on `peersHidden`. With no brief and `peersHidden` false the card is an **empty white box**. Gate the whole card.
- Batch 11's cross-slice dependency is exact: `client/src/api/conversation.ts:16` carries `checkIn: { status, sessionNumber, groundId }` and no `isFinal`/`isInitiator`. "Do not ship the client half alone" is right.
- Batch 20's P5-057 and P5-063 spot-checks hold. P5-076 does not (above).
- Batch 17 correctly frames itself as a product-owner decision and correctly refuses the third option.

---

## Verdict per batch

| Batch | Verdict |
|---|---|
| 1 | sound with corrections — four wrong citations, one fix that will not compile, spec under-scoped, "ten mutations" is five |
| 2 | **unsound** — sweep is ~30 sites not 9, three shapes not one, one member needs a different fix, spec unsatisfiable, and it reverses `JoinPage:125` |
| 3 | sound with corrections — "one `window.confirm`" is false and conflicts with a shipped spec; six members are four; `ResolutionPanel` citations swapped; `SaveCard:136` missed |
| 4 | sound with corrections — one instruction targets a comment that does not exist; two "verified" claims overstate the defect; risk overstated; half-obeys the specificity decision |
| 5 | **unsound as written** — the two client strings it is built on do not exist; the real client leaks are different (and genuine) |
| 6 | sound with corrections — "five … all four" is self-contradictory; the `AdminDashboardPage` bullet targets the wrong function; one missed member |
| 7 | sound with corrections — its central "lift" is already done; the `ChoosePasswordPage` mapping breaks `LinkProblem`'s written decision |
| 8 | **unsound as scoped** — the rename table misses `CreateGroundPage` (44 strings), `SituationCard:146`, four `AdminPage` labels and `GroundsListPage:174`; the `fmt()` instruction would leak into three unrelated renderings; `PostSessionPanel` has two strings not three; effort off by several times |
| 9 | sound with corrections — right fixes; sweep incomplete, spec host wrong, `TextAction` does not render identically |
| 10 | sound with corrections — counts right, 8th `gw-er` site wrong, one wrong line cite, sweep regex unanchored |
| 11 | sound with corrections — the `?welcome=1` verification comes back "already exists but gated behind `!isAdmin`"; BR-011's field list is wrong; the clearing sites are 14 not 8 |
| 12 | sound with corrections — `BillingPage` is two edits; `ChatPage` cite should be `:604`; the spec would not catch its own regression |
| 13 | sound with corrections — 23 extensions not 22; three `accept` lists to unify |
| 14 | sound with corrections — eight clipboard sites, not four |
| 15 | sound — not deeply challenged; both overlays verified as described |
| 16 | sound with corrections — gate the whole `GroundChat` card, not just the heading |
| 17 | sound — correctly framed as a decision, correctly refuses the third option |
| 18 | sound with corrections — **both refusals are right**; BR-009 targets a dead file and should be dropped; `the-api-is-a-paid-thing.ts` no longer exists; `ApiAccessPage` is three plurals |
| 19 | **unsound** — BR-005's fix is a no-op against the current structure (belongs in `index.css`); the sweep is not implementable and contradicts Batch 20 |
| 20 | sound with corrections — P5-076 is wrongly cleared; its off-table flex rows carry the defect Batch 19 flags |

**Coverage table:** checked. 127 IDs, each appearing exactly once, none dropped. That part is accurate.

**One systemic note for whoever implements this.** Roughly a third of all line citations are wrong — most by 1-5 lines, a dozen by 40-2,000, and about six point at a different symbol entirely. Grep the symbol, never open the line.
