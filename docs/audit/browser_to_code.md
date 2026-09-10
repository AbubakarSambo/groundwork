# Browser audit: entry points for the code audit

Every finding marked "Needs code pass: Yes", with the screen and the action that produced it.
Paste this into the code audit's "Known areas already audited" input alongside `notify_to_code.md`.

| ID | Severity | Screen | Action that produced it | What the code pass has to find |
|---|---|---|---|---|
| BR-001 | Blocker | `/start`, check-in phase and session 1 report | Described "a new hire six weeks in who is not settling", inside a six-month probation | Where a described situation is classified into a scenario, why probation resolves to PIP, and where that key reaches user-facing copy and the stored record. Also where a person's description in PEOPLE MENTIONED is written, since it carries the phrase into the invitation. |
| BR-002 | Minor | `/start` header | Read the session-count control's accessible name | The control's markup: number and word are separate nodes with only a CSS margin between them. |
| BR-003 | Minor | `/start` summary card and header | Finished setup with no cadence stated | What derives the session count, and why it is rendered as a settled fact with no provenance. |
| BR-004 | Minor | `/start` summary card, About line | Said "six weeks ago" and "three months into a six month probation" in two turns | The extractor that resolves contradictory statements, and which one it keeps. |
| BR-008 | Note | `/start` save card | Read the accessibility tree | The honeypot field: it is positioned off-screen but not hidden from assistive technology. |
| BR-010 | Major | `/auth` sign-up | Typed "not-an-email", pressed Create my account | The submit handler's validation branch: empty produces a message, malformed produces silence and no request. |
| BR-011 | Major | `/start` after reload | Setup inferred 12 sessions, reloaded the page | What is persisted for an anonymous entry session and what is not. The conversation survives; the session count does not. Then: which value is saved when the record is saved. |
| BR-014 | Major | `/admin` Usage tab | Opened the tab | The two panels' queries. "Check-ins completed 484" against "Check-ins created 243" against "Check In Completed 359". Which counts sessions, which counts grounds, and which is right. |
| BR-015 | Major | Whole product | Read BR-014 and any check-in header | The word "check-in" naming both a ground and a session, and "ground" surviving in staff copy. This is the root cause behind BR-014. |
| BR-016 | Minor | `/grounds/:id` header | Opened a check-in where one of two people had answered | The three status chips and what each is computed from. |

## Not marked for code, recorded for completeness

BR-005 card column wrapping, BR-006 tone of the second question, BR-007 the catalogue has no card
for a situation already underway, BR-009 the test build's root screen, BR-012 "account" and
"workspace" on the sign-up screen, BR-017 empty About heading, BR-018 "1 writes",
BR-019 thin data is honest, BR-020 no dead nav items.
