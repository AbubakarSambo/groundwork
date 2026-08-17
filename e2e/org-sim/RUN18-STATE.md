# 18-ground org simulation: where this run got to, and how to carry it on

Read this first if you are picking the run up. It exists so the next session spends its budget
RUNNING GROUNDS rather than rediscovering the wizard, which is what this one spent it on.

## Status

| | |
| --- | --- |
| Grounds fully set up through the UI | **1 of 18** |
| Ground 1 sessions run | 0 of 12 (created, `AWAITING_PARTIES`, three session-1 check-ins `NOT_STARTED`) |
| Findings logged | 24, in `RUN18-FINDINGS.md` |
| Screenshots | `e2e/shots/org-sim/g01/` (35 files, full page) |

**Nothing about grounds 2 to 18 has been tested. Do not read this run as covering them.**

## The environment, and the three unblocks

| Unblock | State |
| --- | --- |
| Mail catcher | **WORKING.** `groundwork_local_test/mailcatcher.py` on SMTP :1025, HTTP :1080. `EmailService` already falls back to it. `GET /link?to=x&match=reset-password` returns the link, de-mangled. `POST /clear` between grounds. |
| Platform admin | **AVAILABLE, NOT YET USED.** `PLATFORM_ADMIN_BOOTSTRAP_EMAIL=staff@groundwork.test`. Sign that address up through the normal flow, then restart the API; the bootstrap runs once and logs a clear error until you do. Needed for the back-office pass on payments, usage and feedback. |
| Stripe | **BLOCKED, and she has no keys.** `STRIPE_SECRET_KEY=sk_test_...` is a literal placeholder. I set `BILLING_ENABLED=true` (was `false`) so the gate can at least fire at ground 11. Expect checkout to die at Stripe. Log it, then use the fresh-org workaround for 11 to 18 and label those grounds clearly. |

The database was **reset mid-run** and that mattered: the first attempt ran on 3 orgs, 7 users and 2
pre-existing grounds, `hafsah@meridian.test` already existed, and I nearly filed a serious bug that was
actually stale data. The ground-11 paywall counts grounds per org, so a dirty DB makes the free/paid
gate meaningless. **Reset before any re-run**, then `npx ts-node -T prisma/seed.ts` for the prompt
library.

## Accounts that exist now

| Who | Email | Password | Notes |
| --- | --- | --- | --- |
| Sahar (admin) | `sahar@meridianhealth.test` | `SimPass123!` | ADMIN of "Meridian Health". Password only exists because I drove the reset flow; signup does not set one (finding G1-01). |
| Hafsah (lead) | `hafsah@meridianhealth.test` | none | invited to ground 1, not yet activated |
| Abubakar | `abubakar@meridianhealth.test` | none | invited to ground 1, not yet activated |

Ground 1 id: `e8fc8167-3692-4f09-9a8d-82fc534190f6`

## The wizard, mapped

This is the part worth inheriting. `/grounds/new` is six steps:

1. **Scenario card.** 17 cards plus "Describe your own situation", grouped by family (Starting,
   Renewal, Recognition, Accountability, Urgent, Team, Anything else), each with 2 to 3 `e.g.` lines.
   Cards are `[role=radio]` divs, not inputs. Click the card's heading text.
2. **"Where are you in this situation?"** appears BELOW all eighteen cards, only after a card is
   picked: "At the start" / "Mid-way" / "Reaching an end". The Continue button's own microcopy says
   "(below the cards)".
3. **Explainer.** Continue only.
4. **Two `<select>`s.** Duration `7|14|30|60|90|180|365` days, cadence
   `DAILY|WEEKLY|FORTNIGHTLY|MONTHLY`. Select by VALUE, not index. 90 + WEEKLY renders "12 sessions".
5. **Add people.** `input[type=email]` + `input[placeholder*="Head of Engineering"]` (role) +
   `input[placeholder*="Looking forward"]` (note), then **"+ Add to this ground"** per person. Plus
   `input[placeholder*="responsible for here"]` for the admin's own role. Continue stays disabled
   until at least one person is added. **This is where lead and participant are added; there is no
   separate add-a-lead screen.**
6. **End state.** "What does a successful outcome look like?" Options vary by scenario; for NEW_HIRE
   they are Keep the hire / Restructure the role / Let them go / Extend evaluation period /
   Not yet, revisit with a named gap. See finding G1-16.
7. **Brief + summary.** A textarea ("0 words") and "Ground name (optional)". **"Open the ground →"
   stays disabled while the brief is empty and nothing says so** (G1-21).

## What is already written and reusable

| File | What it does |
| --- | --- |
| `e2e/org-sim/personas.ts` | 12 people with `level` (high/medium/basic), `style` (cooperative/rushed/distracted/defensive/chatty/terse), `jargon` (fluent/unsure/putOff), plus `answerFor()` and `EVIDENCE_BAIT` for the upload probe |
| `e2e/org-sim/harness.ts` | mail-catcher helpers, signup/reset/sign-in through the UI, full-page `shot()`, `note()` that appends findings to disk as it goes, `dashesIn()` |
| `e2e/org-sim/create-ground.spec.ts` | **drives ground creation end to end.** Parameterise `card`, duration, cadence, people and end state and it will do grounds 2 to 18 |
| `e2e/org-sim/walk-wizard.spec.ts` | the discovery script; keep it, it re-maps the wizard if the flow changes |
| `e2e/org-sim/ground.ts` | half-written runner from before the wizard was mapped. **Rewrite against the six steps above rather than trusting it.** |

## Do this next, in this order

1. Reset the DB, reseed prompts, clear the mail catcher.
2. Sign `staff@groundwork.test` up through the UI, restart the API, confirm the back-office is reachable.
3. Re-run Ground 1 creation (one command), then **activate Hafsah and Abubakar from the mail catcher
   and run the twelve sessions** - sessions inside one ground may run concurrently, grounds may not.
4. Capture card, full chat, full-length report and full-length board per ground, and read the report
   and board for VALUE as the person they are for, not just for rendering.
5. Then grounds 2 through 18 in strict sequence.

## Two rules from the brief that this run proved matter

- **Grounds strictly sequential, sessions concurrent.** The free/paid gate and returning-vs-new both
  depend on it.
- **A seeded shortcut is not coverage.** Everything above was driven through real screens. Where that
  was impossible I said so. Keep doing that: mark WORKED AROUND, never "covered".
