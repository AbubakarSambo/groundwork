# Implementation progress: fix plan parts C (client, C1-C20) and E (who may see what, E1-E6)

Read-only audit of the code as it stands on `fix/what-the-user-hit-today` (~66 commits after the
plan commit `7ea07ab`). Judged against the batch text AND the corrections in
`planaudit_c.md` / `planaudit_a_e.md`; where a batch was marked UNSOUND (C2, C5, C8, C19, E3, E4)
the correction is the standard applied.

## Summary

| Batch | Title | Verdict |
|---|---|---|
| C1 | A failure must never render the success screen | LANDED |
| C2 | One email test, no button that silently does nothing | LANDED (as corrected) |
| C3 | A destructive action asks first | LANDED |
| C4 | Numbers printed as fact that are not measurements | LANDED |
| C5 | The setup engine must use the person's own words | PARTLY |
| C6 | One in-flight guard per submit | LANDED |
| C7 | Errors that say which of the things happened | LANDED (as corrected) |
| C8 | check-in and session: one word per object | PARTLY — the missed cluster is still unrenamed |
| C9 | Every primary action is a control, and has a name | LANDED |
| C10 | Anything asynchronous is announced | LANDED |
| C11 | Arrival state seeded wrong | PARTLY — P5-051 outstanding (cross-slice) |
| C12 | The button goes where it says | LANDED |
| C13 | Forms behave like forms | LANDED |
| C14 | The clipboard failure path that can never run | LANDED (all 8 sites, not 4) |
| C15 | The two hand-rolled modals are dialogs | LANDED |
| C16 | Sections that render empty, or say three things at once | LANDED (one deviation) |
| C17 | The money screens promise what the system cannot do | SUPERSEDED (payments are live) — unconfirmed |
| C18 | Copy corrections, and two refusals | LANDED |
| C19 | Two narrow-viewport defects | PARTLY — BR-005 not done |
| C20 | No change: the reference patterns | LANDED (untouched, confirmed) |
| E1 | One rule, in one file, that every read calls | LANDED (one residual read) |
| E2 | Department captured wherever a person is added | LANDED |
| E3 | Wire the manager rule to the reads that do not use it | NOT STARTED |
| E4 | The organisation switch / the join path | SUPERSEDED — withdrawn by the plan audit |
| E5 | What a lead may read | LANDED |
| E6 | Machine reads ask the same question | LANDED |

Counts: **LANDED 18, PARTLY 5, NOT STARTED 1, SUPERSEDED 2.**

---

## Part C, per batch

**C1 LANDED.** `pages/home/SaveCard.tsx:70-80` — the cloned `onError` body is gone, replaced by
`setEmailError('That did not save - nothing has been sent. Try again.')` with the comment naming
the defect; `VITE_APP_URL` now falls back and `client/.env.example:5` carries `VITE_APP_URL=`.
`pages/billing/PricingPage.tsx:58-59` has the `subscribeMut.onError` clearing `subscribingPlan`.
Sweep spec `client/src/pages/a-failure-is-never-a-success.spec.ts` exists.

**C2 LANDED, and built to the correction, not the batch.**
`components/gw/an-address-that-can-receive-mail.ts` exports `looksLikeAnAddress` + `NOT_AN_ADDRESS`
and its header says "Thirty places asked `includes('@')`, in three shapes" — the audit's count and
shape analysis, not the plan's nine-in-one-shape. Converted across 13 files
(`AuthPage`, `EntryChatPage`, `CreateGroundPage`, `GroundAdminPage`, `GroundsListPage`, `SaveCard`,
`JoinPage`, `TheAssistantAsACustomerSeesIt`, `OrgMembersPage`, `OrgSetupPage`, `ReportPage`).
The one member that is not validation — `EntryChatPage.tsx:3886`
`.filter(e => e.includes('@') && …)` — was correctly left alone and the spec allowlists it
(`one-test-for-an-address.spec.ts:32-36`, "except the helper and the one filter"), so the spec that
would have failed on day one does not.
`noValidate` is on every form in `AuthPage`, `JoinPage`, `ChoosePasswordPage`, `BoardPage`, and
`EntryChatPage:3555` now wraps the save input in a form.
**Deviation, and the right one:** `JoinPage.tsx:145` still disables the button until email and role
are filled — the plan told the implementer to enable it, the audit said that reverses the written
decision at `JoinPage:121-126`, and the decision won.

**C3 LANDED.** `components/gw/a-second-press-before-it-is-gone.tsx` exists and is used in
`SaveCard`, `BoardPage`, `ResolutionPanel`, `IntegrationsPage`; spec
`components/gw/nothing-irreversible-happens-on-one-press.spec.tsx` exists. `BillingPage`'s
`window.confirm` is gone, replaced by `confirming: 'cancel' | 'pause'` state
(`BillingPage.tsx:231`) and pause got the same treatment (`:499` `role="dialog"`).
The audit's missed member, the second `Start over` at `SaveCard.tsx:144`, was caught — both now
render `<StartOver>` (`:144`, `:310`). `AppShell.tsx:1139`'s `window.confirm` was correctly left
(its own spec requires it), as were the two non-destructive "Forget this address" confirms.

**C4 LANDED.** `?? 6` is gone from `GroundParticipantPage`; `MyParticipation.tsx:88` prints
`{completedCount}{totalSessions != null ? ' of …' : ''}` — the audit's one real unnamed member.
`BoardPage.tsx:733` is `Sec title="Sessions this phase" src="from sessions"`. The specificity meter
obeys the written decision in full: `EntryChatPage.tsx:3258-3270` deletes the grade word *and* the
five-dot bar ("the bar out of five … is gone with the grade word"). Spec
`pages/a-number-is-a-measurement.spec.ts` exists.

**C5 PARTLY.** The harm the batch was really about was fixed on the server, out of this slice:
commit `fba75a7` + `api/src/modules/entry/which-situation-this-is.ts` make a probationer NEW_HIRE
and add a confidence floor. But the *client* half, which the audit rewrote and which is what this
batch owns, is untouched:
- `pages/enter/EntryChatPage.tsx:933-947` `fallbackGroundName` still title-cases the raw key, so a
  `PIP` classification still labels the ground "Pip".
- `pages/enter/EntryChatPage.tsx:3811` still hardcodes *"Performance improvement check-ins document
  a process…"* keyed on `PIP`, which is the string that breaks the decision recorded at
  `lib/scenario-catalog.ts` about keeping "performance" out of the product. `scenarioLabel()`
  (`lib/scenario-catalog.ts:91`) exists and is imported only by `GroundAdminPage`.
- BR-004 (the About line editable in place) — not done.
- BR-007 (the 23rd card) — not done; the catalogue is unchanged.
- The spec `pages/enter/a-scenario-key-is-not-a-word.spec.ts` does not exist under that or any
  other name.

**C6 LANDED.** `GroundAdminPage.tsx:851-860` — the five raw setup writes are now one `saveSetup`
`useMutation` plus `setWorkTogether`, with the comment naming the defect; exactly one
`groundsApi.update(id!` call remains in the file. Per-row guards are in:
`BoardPage.tsx:497,504,534` use `bumpObjective.variables?.objectiveId === o.id`;
`BillingPage.tsx:688` uses `…isPending && …variables === plan`. Specs
`pages/one-press-is-one-call.spec.tsx` and `pages/board/one-row-at-a-time.spec.tsx` exist.

**C7 LANDED, as corrected.** The "lift" the audit said was already done was left alone:
`pages/report/why-you-cannot-see-this.ts` stays where it is and `BoardPage.tsx:17,142` imports it.
`SessionReportPage.tsx:152-176` splits 403 / 404 / everything-else into three sentences with Try
again only on the third. `JoinConfirmPage.tsx:78` passes `detail={problem}`.
`ChoosePasswordPage.tsx:76-79` fixes the class-validator array shape but does **not** map
expired-vs-already-used — correct, because the audit showed that mapping breaks `LinkProblem`'s
written decision. Spec `pages/an-error-says-which-one.spec.tsx` exists.

**C8 PARTLY — this is the half-done one.** The original rename table was applied and locked:
`components/gw/two-things-called-check-ins.spec.ts` gained a second describe block sweeping nine
strings (`ChatPage` "Ready to finish this check-in"/"Finish check-in ✓", both "Starting your
check-in…", `GroundAdminPage` "final check-in" and `aria-label="Check-in cadence"` → now
`aria-label="Session cadence"` at `:2828`, `BoardPage` "Check-ins this phase", `SessionReportPage`
"Open a follow-up check-in" → "Start a new check-in", `JoinPage` "Join and start my check-in" →
"Email me my link"). All nine verified absent from the source.

The cluster the plan audit added is **entirely unrenamed**:

| Where | Still says | Sense |
|---|---|---|
| `pages/grounds/CreateGroundPage.tsx` | 75 occurrences of "check-in", incl. ~22 card `desc:`/`tests:` lines ("Each check-in then tests what they are doing against that", `:58, :61, :68, :71, :78, :81, :88, :98, :101, :108`…) | session |
| `components/gw/SituationCard.tsx:113, :144, :148` | "What the check-ins test", "One check-in", `<dt>Check-ins</dt><dd>{sessions}</dd>` | session |
| `pages/admin/AdminPage.tsx:721, :726` | "Stalled check-ins (>7d)", "Avg days to first check-in" (both computed from `checkIn` rows) | session |
| `pages/grounds/GroundsListPage.tsx:177` | "No check-ins yet", gated on a COMPLETED `checkIns` row | session |
| `components/PostSessionPanel.tsx:59` | "Add another free session and continue your Check-in" | mixed, in one sentence |
| `pages/admin/AdminDashboardPage.tsx:292` | `label="Total check-ins"` over `overview.totalGrounds` | engagement, but adjacent to the session-sense ones |

So the collision survives on `/start`, the product's first screen, and on the platform console.
The paywall block is also still duplicated (`GroundParticipantPage`'s modal at `:808` and
`components/PostSessionPanel.tsx`); the batch offered "fix both or lift" and neither was done for
the copy, though the modal did get its C15 dialog treatment.

**C9 LANDED.** `TextAction` lifted to `components/gw/kit.tsx:152` with the comment intact. Zero
`<span onClick>` and one `<div onClick>` remain in `pages/`+`components/`, and that one
(`GroundAdminPage.tsx:3088`) is a `stopPropagation` scrim, not a control. The three
`← Check-ins` exits the audit named as missed (`GroundParticipantPage:422`, `GroundAdminPage:1214`,
`EntryChatPage:2340`) are all real `<button type="button">` now. Three
`aria-label="Send message"` composers.

**C10 LANDED.** Zero `className="gw-er"` without `role="alert"`; 22 `aria-live`/`role="status"`
attributes across pages and components, up from two. Spec
`components/gw/the-page-says-what-it-is-doing.spec.ts` exists.

**C11 PARTLY.** Done: `JoinConfirmPage.tsx:45` `await authApi.me()` before the navigate;
`AuthPage.tsx:158` `clearNotices()` clears `passwordlessNotice` alongside `error`;
BR-011 fixed — `persistOnboarding` (`EntryChatPage.tsx:1377`) now saves `sessions, cadence,
cadenceChosen, groundName, plannedFrom`; the `?welcome=1` banner was *moved* above the
`isAdmin` ternary rather than reworded (`GroundsListPage.tsx:408-415`, comment cites "fix plan
C11") — exactly the audit's two-line answer.
Missing: **P5-051.** `ChatPage.tsx:128-129` still reads `isInitiator` and `isFinalSession` from
`location.state ?? false`, and `api/conversation.ts:16` `TranscriptResponse` still carries no
`isFinal`/`isInitiator`, so somebody arriving by email still writes a final account without being
told it is final. This was correctly gated on the API half (part A/B) and the API half has not
landed. The spec `pages/join/a-joined-person-is-a-real-person.spec.tsx` was not written;
`pages/enter/the-whole-setup-survives-a-reload.spec.ts` was.

**C12 LANDED.** `AdminDashboardPage.tsx:968` "Platform console →"; `BillingPage.tsx:706`
`mailto:hello@myground.work` (both defects the audit found, not one);
`ChoosePasswordPage.tsx:120, :200` `/auth?mode=member`; `next` threading has its own comment at
`AuthPage.tsx:99,136`; `GroundAdminPage.tsx:3004` records that the permanently-disabled
"Close this check-in" button was deleted; `ChatPage.tsx:1262` hides the upload label behind
`{groundId && (`.

**C13 LANDED.** `ChoosePasswordPage.tsx:152` and `BoardPage.tsx:1061` are real `<form noValidate>`;
11 `autoComplete` attributes across the auth/join flow; exactly one `{trap.field}` per form in
`SaveCard` (2 forms) and one in `JoinPage`; `ChatPage.tsx:1278` builds `accept` from
`ACCEPTED_UPLOADS.join(',')`, so the three lists are one. Spec
`pages/auth/enter-submits-the-form.spec.tsx` exists.

**C14 LANDED, to the audit's count.** `components/gw/copying-can-fail.ts` exists and is imported by
**ten** files — `SaveCard`, `MagicVerifyPage`, `GroundAdminPage`, `IntegrationsPage`,
`EntryChatPage`, `LeadsGuidePage`, `SessionReportPage`, `BillingPage`, `CodeShareCard` — so the
four extra sites the audit found were swept too. Zero raw `writeText` calls remain outside the
helper. Spec `components/gw/a-copy-that-fails-says-so.spec.ts` exists.

**C15 LANDED.** `GroundParticipantPage.tsx:808` and `AdminDashboardPage.tsx:212` both carry
`role="dialog" aria-modal="true" aria-label=…`; spec
`components/gw/a-modal-is-a-room-you-can-leave.spec.tsx` exists.

**C16 LANDED, with one deviation.** `GroundChat.tsx:113-118` gates the "About this check-in"
heading on `brief`; `IntegrationsPage.tsx:593` "No keys yet…"; `GroundAdminPage.tsx:1300-1306`
carries the "ONE STATUS, NOT THREE" comment and suppresses the `alignRead` fallback.
`pages/an-empty-section-says-it-is-empty.spec.tsx` exists; `one-status-not-three.spec.tsx` does not.
Deviation: the audit asked for the **whole card** to be gated, because the roster block below is
itself gated on `peersHidden`, so with no brief and peers shown-by-default the card can still be an
empty white box. Only the heading was gated. Smaller than asked, and the empty-box case survives.

**C17 SUPERSEDED, needs one confirmation.** The batch was written on "Stripe has no keys and there
are zero subscribers"; `docs/audit/CORRECTION-payments.md` retracts that ("Payments are live on
production"), which is the batch's own option 1 and closes it. Consistent with that, nothing was
changed: `PricingPage.tsx:164` still says "Subscribe" and `BillingPage.tsx:206` still promises
"The difference is prorated on your next invoice." The proposed spec
`pages/billing/a-price-that-can-be-paid.spec.ts` does not exist. **Worth one explicit confirmation
that proration really is what Stripe does today**, because the copy is now load-bearing.

**C18 LANDED, including both refusals.** No `you@company.com` remains in `JoinPage` or `SaveCard`;
`ApiAccessPage.tsx:71` uses `plural(…, 'write')` with the comment "\"1 writes\" was read daily by
staff"; every rendered `AdminDashboardPage` section label is sentence case and plain
("Access codes", "Who can reach this console", "What each person has done") — only source
*comments* keep the old Title Case; the "Days Left" table header is now "Days left".
`IntegrationsPage.tsx:395-399` states the commercial terms on screen ("Using the API needs approval,
not a plan") and `:367` records the audit's finding that `the-api-is-a-paid-thing.ts` is gone.
BR-009 was dropped, as the audit recommended (it targeted dead code).

**C19 PARTLY.** The AdminDashboard half landed with the audit's diagnosis quoted:
`AdminDashboardPage.tsx:406-410` — "Not minWidth 160 on a plain flex row outside any scroll
container: it produced horizontal page scroll" — now `flex: '0 1 160px', minWidth: 0`.
BR-005 is **not** done: `index.css:694-696` still carries `.cg-meta dt { … min-height: 24px }`,
which the audit identified as the actual cause of the label/value misalignment at ~1150px, and
`SituationCard.tsx:131-149` is unchanged (the plan's proposed JSX fix, correctly, was not applied —
but the CSS fix that replaces it was not applied either). The spec
`pages/nothing-scrolls-sideways.spec.ts` was not written, which is right: the audit called it not
implementable and asked for a Playwright assertion instead, and that does not exist either.

**C20 LANDED (no change, as required).** Spot-checked all five reference patterns still intact:
`ChatPage.tsx:986` two-step decline (wording moved to "session" by C8, which is the sanctioned
edit), `BoardPage.tsx:735` `overflowX: 'auto'` table, `ReportPage.tsx:889-894`
`whyYouCannotSeeThis(whatWentWrong(...))` with `canRetry`, `SessionReportPage.tsx:115`
`maxWidth: 720`, `GroundAdminPage` delete confirm. Nothing was "improved".

---

## Part E, per batch

**E1 LANDED, with one residual read.** `api/src/modules/grounds/who-may-read-this-check-in.ts`
exists, pure, in the style of `a-ground-that-has-ended.ts`, three levels (`own`/`shared`/`lead`),
and its header records the audit's correction rather than the plan's: "Fourteen places decided for
themselves … in two formulas", and it inherits Batch A2's call that the grounds formula is right.
**Call-site count: 14 today** — `adminsThisOrg` at `grounds.service.ts:1422, 1811, 2184, 2262,
2306, 3347, 3927, 3979, 4017, 4091, 4147` (11), `board.service.ts:202` (1), and
`reports.service.ts:1842` inside `isAnAdminOf`, which the four report paths (`:1864, :1957, :2518,
:3587`) all call (4 paths, one helper). The list is `groundsAViewerMayList(...)` and reproduces the
cross-org participant branch. Scanning spec `no-read-invents-its-own-answer.spec.ts` exists and
fails any of the three services that decides admin-of-this-org for itself.
**Still comparing `organizationId` itself:** `reports.service.ts:3561` —
`|| (!!requestingUserOrgId && ground.organizationId === requestingUserOrgId)` — the roleless org
test, on the no-report branch of `whereAgainstSuccess`. It has a comment arguing it says nothing a
participant list would not, and the scan spec does not catch it because it only looks for
role+organisation on one line. Worth a decision rather than a silent exception.

**E2 LANDED.** Department is optional at every door and never inferred:
`grounds/dto/add-participant.dto.ts:23`, `entry.service.ts` (`dto.department?.trim().slice(0,120)
|| null`), `public-api.controller.ts:711-714` + `a-check-in-a-customer-can-run.service.ts:417`
(through the SCIM writer, as the audit required — not a second writer), and
`JoinPage.tsx:144`. The live blank-matching bug the audit surfaced was fixed in the same batch:
`embed.service.ts:127` is now `!!person?.department && config.outOfScopeDepartments.includes(...)`
instead of `?? ''`. Specs `a-person-may-have-a-department-and-may-not.spec.ts` and
`every-door-that-adds-a-person-asks-the-same-things.spec.ts` exist.

**E3 NOT STARTED.** As corrected, E3 is "make E1's rule delegate to `whatAManagerMayRead`, which
already exists, plus the department-match case". `who-may-read-this-check-in.ts` does not import or
mention `whose-reports-a-manager-may-read.ts`; `whatAManagerMayRead` still has exactly one caller,
`reports-for-my-people.service.ts:72`, reachable only through the published interface. So the app's
own report reads still grant nothing by reporting line, and a manager still cannot see their
department's report in the product. No `Organization` column was added for the setting the audit
said should replace the non-existent settings table. The `User → Person → department` seam the
audit said E3 had to solve *was* built, but for E5 (`grounds.service.ts:3158-3165` `departmentOf`,
`leadsOfTheDepartment`), so the hard part is available and unused.

**E4 SUPERSEDED / WITHDRAWN.** The plan audit deleted this batch (the switcher already exists, the
design decision it reversed is written at `auth.service.ts:1211-1213`) and reassigned P4-B07 to
part A batch 4. Commit `e642c55` "Somebody with an account elsewhere is a guest, not a wait" is
that work, outside this slice. Nothing in E4 should have been built and nothing was.

**E5 LANDED.** `who-may-read-this-check-in.ts:57-72` — `leadsTheSameDepartment` plus the `shared`
branch in `whatTheyMayRead`; blank departments match nobody on either side. The schema invariant
the audit said must be amended in the same change **was** amended:
`api/prisma/schema.prisma:20-23` now reads "One READ is granted by role (fix plan E5, amending what
this note used to say)". Spec `a-lead-reads-what-they-run.spec.ts` exists and covers the blank case
and the MEMBER-gets-nothing case.

**E6 LANDED.** `grounds-by-api.service.ts:665` and `:844` —
`if (!mayTouch(fence, personExternalId)) throw new ForbiddenException(OUTSIDE_THE_FENCE)` — on both
person-shaped routes, and `public-api.controller.ts` passes `req.machine` through. Spec
`public-api/a-key-reads-no-more-than-a-person.spec.ts` exists. Unfenced credentials are unaffected,
as the audit said they must be.

---

## Still to do, in priority order

1. **C8, the missed rename cluster.** `CreateGroundPage` (~22 cards of `desc:`/`tests:` prose),
   `SituationCard.tsx:113/144/148`, `AdminPage.tsx:721/726`, `GroundsListPage.tsx:177`,
   `PostSessionPanel.tsx:59`. This is the product's first screen and it is where the two senses
   still collide. Needs a product-owner read of the card copy, not a find-and-replace, and the
   `two-things-called-check-ins.spec.ts` sweep should be extended to cover it.
2. **C5, the two client scenario-key leaks.** `EntryChatPage.tsx:3811`'s hardcoded "Performance
   improvement…" notice breaks a written decision and is one `scenarioLabel()` import away from
   fixed; `fallbackGroundName` (`:933`) should use the catalogue rather than title-casing a key.
   Then write `a-scenario-key-is-not-a-word.spec.ts`.
3. **E3.** Delegate E1's rule to `whatAManagerMayRead` and add the department column/setting on
   `Organization`. Everything it needs now exists; it is the only batch in either part with
   nothing built.
4. **C11 / P5-051.** Add `isFinal` and `isInitiator` to `TranscriptResponse` server-side, then the
   four-line `ChatPage` change. Until then somebody arriving by email writes a final account
   without being told.
5. **C19 / BR-005.** `index.css:695` `min-height: 24px` on `.cg-meta dt`, plus a Playwright width
   assertion at 375px and 1150px in place of the unimplementable source sweep.
6. **E1's residual.** Decide on `reports.service.ts:3561`: either route it through the rule or
   record the exception in `no-read-invents-its-own-answer.spec.ts` so it is deliberate.
7. **C17.** Confirm that proration and the "Subscribe" path are what Stripe actually does on
   production now; if so, close the batch on the record.
8. **Small gaps:** `one-status-not-three.spec.tsx` (C16), the whole-card gate in `GroundChat`
   (C16), `a-joined-person-is-a-real-person.spec.tsx` (C11), C5's BR-004 editable About line and
   BR-007's 23rd card (both optional by the batch's own text).
