# Abubakar's defensive-guard commits, checked against our branch

Checked on `wip/prototype-ui` at commit `49117576` (8 October 2026), for Abubakar's seven client
commits made on the live branch since 20 September: `1138df4f`, `9a84afb7`, `6a4d67a1`, `18bb53e4`,
`8a73ee23`, `ba198931`, `59533562`. All seven are ancestors of our current `HEAD` (confirmed with
`git merge-base --is-ancestor`), so the question was whether a later rewrite on this branch had
quietly dropped any of his protections, not whether the commits themselves were present.

Method: every added line in each commit's diff was checked against the current file at the same, or
an equivalent, place. Pages that were rewritten (`WhoIsStillOut.tsx`, the ops/suite pages, the
`GroundAdminPage` date picker) were read in full to confirm the same protection survives in the new
structure, in our wording.

## Table

| Commit | File | What it protects against | In ours |
| --- | --- | --- | --- |
| 1138df4f | `components/gw/WhoIsStillOut.tsx` | "Who is still out" read a person as not-yet-answered from a stale local `sessionNumber` match, missing someone who had already answered because completing a round spawns everyone's next-round check-in row immediately. Fixed by reading `sessionProgress` (`missingParticipantIds`/`declinedParticipantIds`) instead, with a declined state. | **Kept, equivalent.** Rewritten into full sentences, but `progress`/`round`/`missing`/`declined`/`done`/`isDeclined`/`remindable` are all still there, with a comment that credits "staging (live main line)" for the same reasoning. |
| 1138df4f | `pages/chat/ChatPage.tsx` | Picking a file with no `groundId` in context used to silently do nothing (`if (!f \|\| !groundId) return`). Fixed to still toast an error when the context is missing. | **Kept**, verbatim, at two call sites now (`handleFileChange` and one more). |
| 1138df4f | `pages/grounds/GroundAdminPage.tsx` | The "Ends on" date picker measured the end date from "today" when a ground had no recorded start, so a reopen could compute a deadline already in the past even though the picker showed a future date. Fixed to fall back to the ground's `createdAt`, never today. | **Kept, equivalent (relocated).** The date-picker markup moved into `pages/grounds/CheckInPeopleAndSetup.tsx` (`props.createdAtOnRecord`); `GroundAdminPage.tsx:2770` still passes `createdAtOnRecord={(ground as any)?.createdAt ?? null}`, and the component still falls back to it, never to `new Date()`, before falling back to today. |
| 9a84afb7 | `pages/today/TodayPage.tsx` | `data.comingUp.length` crashed before `data` had loaded. Fixed with `const comingUp = data?.comingUp ?? []`. | **Kept**, verbatim. |
| 6a4d67a1 / 18bb53e4 | ~40 files across `components/gw/*`, `pages/admin`, `pages/billing`, `pages/board`, `pages/company`, `pages/connections`, `pages/grounds`, `pages/ops/*`, `pages/org/*`, `pages/suites/*`, `pages/you/YouPage.tsx`, `App.tsx` | `.map`/`.length`/`.find`/`.includes` called directly on a field that can be absent before the query resolves, or absent on an older/narrower answer shape (`data.x.map` → `(data.x ?? []).map`, `livePricing?.plans.find` → `livePricing?.plans?.find`, `me.data?.capabilities.includes` → `me.data?.capabilities?.includes`, and so on). | **Kept**, verbatim or equivalent, in every file checked — including the three places that read as "CHECK" on a first automated pass because the surrounding line had since been reworded (`CustomersPage.tsx`, `OnboardingBoardPage.tsx`, `TodosPage.tsx`): all three still carry `(data.x ?? [])` around every map/length/filter. |
| 8a73ee23 / 59533562 | `api/admin.ts`, `api/auth.ts`, `api/billing.ts`, `api/documents.ts`, `api/feedback.ts`, `api/grounds.ts`, `api/integrations.ts`, `api/ops.ts`, `api/participantRequests.ts`, `api/prompts.ts` | A non-array API answer (e.g. an error body) used to be returned as-is and crash the first `.map`/`.find` downstream. Fixed with `.then(r => (Array.isArray(r.data) ? r.data : []))` on every list-returning call. | **Kept**, verbatim, on every one of the ~35 call sites checked. `api/auth.ts`'s `waitingForASeat` grew two extra fields in its type (`name`, `kind`) since, but the `Array.isArray` guard around it is untouched. |
| ba198931 | `pages/org/people-here.ts` | `nameOf`/`initialsOf` crashed on a null/undefined name. Fixed with `\|\| ''` and `(name ?? '')`. | **Kept**, verbatim, including the widened `name: string \| null \| undefined` parameter type. |

**Count: 7 commits, ~90 individual guarded expressions checked. All kept or equivalent (relocated/
reworded around the same guard). None missing.** No restoration was needed, so no behaviour or
wording changed and no new fallback code was written for this task.

## Browser check

Signed in as `naomi@kijani.test` (admin) and `tendai@kijani.test` (lead), at 1440×900 and 390×844,
against the already-running dev client (5173) and API (3000), using the existing e2e sign-in helper
(`e2e/sign-in-by-email.ts`, which already enforces "at most 5 sign-in links a minute" and keeps the
signed-in state in memory for the rest of a run — nothing was written to disk outside this run, and
the one-off spec used to drive this check was deleted afterwards, not committed).

Pages opened: You, Today, Billing, Pricing, Connections, Integrations, People, Company, and the
suite boards (Customers, Equipment, Finance, Leave, Leaving, Onboarding, Reviews, Role map,
Spending, Timesheets, To-dos). GroundAdminPage and Chat need a specific ground/check-in id to open
and were checked by reading the code path above instead (the ops pages are an internal tool, not
reachable from these two seeded accounts, and were likewise checked by reading the code).

- All pages loaded for both people, at both widths, with no crash and no uncaught page error.
- Several suite pages logged a console `404` for both people at both widths (Customers, Equipment,
  Leaving, Onboarding, Role map, To-dos, and `Today`'s own `comingUp` endpoint) — these are suites
  this seeded organisation has not turned on, or an endpoint not wired up for this account, and each
  page's own code already turns a 403/404 into "Only an admin or a lead can open this board." rather
  than a crash. This is pre-existing and unrelated to Abubakar's commits.
- Forced an empty/malformed API answer with `page.route` on three pages: Billing with
  `getContributorCodes` returning `null`, Integrations with `listCredentials` returning `{}` (not an
  array), and Suite: Customers with its whole board answer replaced by `{}`. All three still
  rendered, with no crash and no new console error.

## Tests

- `npx tsc --noEmit -p .` in `client/`: clean, no errors.
- `npx vitest run` in `client/`: see commit message / final report for the pass count (run started
  alongside writing this file; no other vitest process was running at the same time).
