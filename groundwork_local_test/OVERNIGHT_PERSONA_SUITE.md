# Overnight persona suite - design spec

A build brief for the autonomous overnight suite that surfaces critical
Groundwork issues, built on the existing persona harness (Suites V/M/B/L +
Phase 2 S/R/A), not from scratch.

THE GOVERNING RULE, learned the hard way: a suite you cannot trust is worse
than no suite. The original persona Action reported green for weeks while
testing nothing. Every design decision below exists to prevent that failure
mode: every guard must bite, every flake must report as flake, every run must
produce artifacts a human can see. When coverage and trustworthiness
conflict, choose trustworthiness.

## 0. Two targets: LOCAL and MAIN, run separately, LOCAL first, then diffed
- LOCAL: the working tree, on a locally-booted API + client. Run FIRST.
- MAIN: a clean checkout of origin/main HEAD, booted the same way. SECOND.
- Independent runs: own env, own fresh DB (migrate from scratch), own
  artifacts. Same seeds, fixtures, probes on both - the only variable is code.
- The MAIN checkout must be clean origin/main at HEAD (assert SHA, else abort
  red "main target is not clean origin/main").
- Report three things: LOCAL result, MAIN result, and the DIFF per finding:
  "on LOCAL only" (just-introduced regression or unmerged fix), "on MAIN
  only" (local ahead), "on BOTH" (live bug, highest priority). Print both
  SHAs at the top of every report.
- PROD is out of scope (real users, real emails - never drive adversarial
  probes at it).

## 1. What actually catches bugs (non-negotiable method)
- Drive the REAL UI, read VERBATIM rendered output. Never assert from code.
- Test across BROWSER CONTEXTS (the vanish class only appears in a fresh
  zero-storage context).
- Push the MODEL adversarially; assert the boundary holds.
- Prove every guard BITES: break -> red -> restore -> green.

### 1a. REAL-UI ENFORCEMENT (the thing that gets faked)
RULE: every critical assertion is made against the RENDERED BROWSER DOM.
The API/DB may seed state and cross-check AFTER a UI assertion, never BE the
primary assertion for a user-facing class. The self-test must prove the suite
reads the real DOM (a label changed in a fixture must change what the suite
sees; if not, the suite reads the API and is lying - abort red).

## 2. Six issue classes, severity-ranked
1. DATA-LOSS / CONVERSION (the vanish class - Suite V central; cross-context
   magic link, draft persistence, idempotent second click, legacy path).
2. WRONGFUL GATE (free session 2+ unpaywalled ON SCREEN; 10-ground gate at
   the right count; paid path still meters).
3. BEHAVIORAL / BOUNDARY (decision-push deflected; unverified claim probed;
   end-intent surfaces the end control; AI never claims actions it does not
   perform; contradictions surfaced; banned-string gates incl. em-dashes and
   "gamed").
4. FULL LIFECYCLE / FOUR ROLES (anonymous -> initiator -> lead via real
   magic link -> participant -> cohort; multi-session incl. self-correction
   and the closing round; simultaneous report release; transcript isolation;
   reminder throttle + STALLED stop).
5. EVERY SCENARIO (all 17 render with reframed labels + sub-examples, route
   via classify-intent - with the graceful-fallback canary - packs load).
6. LAYOUT MATRIX (Suite L hard: fold + overflow at 1366x768/1280x720/375x812).

## 3. Severity model
Headline is always "N critical, M findings, K flaky, S skipped-budget".
CRITICAL fails the run: any class-1 path, wrongful gate, boundary violation,
scenario render/route failure, banned string in user-facing output, report
leak/non-simultaneous release, reminders without stop.
FINDING records without failing: few-px fold misses, copy nits, slowness.
Critical never hides among findings - the report leads with the critical list
(repro + screenshot each).

## 4. Cost control
MODEL-FREE runs freely every night (classes 1, 2, 5, 6). MODEL-DRIVEN
(classes 3, 4) is capped by GW_MODEL_TURN_BUDGET; over-budget cases are
SKIPPED-BUDGET, never silently dropped. Deterministic seeds; cheapest viable
tier for probes.

## 5. Flakiness
Retry at most twice; pass-on-retry = FLAKY (its own bucket, never green).
Deterministic seeds; hard waits banned (wait on real conditions). If the
environment fails to boot (mailcatcher, API, migration), ABORT RED
"environment failed" - never green on zero tests.

## 6. The self-test that keeps it honest (runs FIRST every night)
For each CRITICAL guard, deliberately break the guarded thing, confirm the
suite reds, restore: delete the entry draft (vanish signature), re-enable a
paywall on free tier, neuter the deflection rule, inject an em-dash into a
report, break a scenario's routing, change a rendered label (the reads-real-
DOM check). Any guard that fails to bite aborts the whole run RED with
"guard N no longer bites".

## 7. Output / artifacts (never a bare pass/fail)
Timestamped artifact dir: screenshot per step, structured findings (class,
severity, repro, screenshot path), ranked CRITICAL-ISSUES report, self-test
result, Playwright traces for failures. Two modes: GW_WATCH=1 (headed +
lagged preview board - the second zero-storage context cannot be driven in
the preview panel; honest note stands) and headless cron mode.

## 8. Scheduling
Nightly cron workflow, separate from the PR gate (gate = fast subset,
overnight = deep run). RED notifies on: critical > 0, any guard failed to
bite, or environment abort. Harness-only: groundwork_local_test/ + workflows.

## 9. Staged build
- Phase A (FIRST, prove before anything): self-test meta-suite, severity +
  artifact/report output, environment-abort-red.
- Phase B: model-free critical classes (extend V, B; sweep; L hard) -
  prove-bite each.
- Phase C: model-driven (budget-capped, deterministic seeds).
- Phase D: schedule + notify + retention.
Prove-bite at every phase; every break/restore joins the nightly self-test.

## 10. The one-line contract
An overnight run either says "0 critical" with inspectable artifacts, or
"N critical" with a repro and screenshot for each - and it can PROVE, via the
self-test that runs first, that its guards still bite. It never reports green
on zero tests, never hides a critical among findings, never lets a flake pass
as green. If it cannot guarantee those, it aborts red rather than lie.
