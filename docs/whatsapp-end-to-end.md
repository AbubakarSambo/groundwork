# WhatsApp end to end, for the first client (decision 81, item 1)

Read from the code on 2 October 2026, branch `wip/plain-reports`. Nothing was run against WhatsApp: no test talks to Meta, and nothing here was tried on a real number.

## What works today

- **Every kind of check-in the client needs works over WhatsApp:** a sales team's check-in, company planning (objectives), onboarding and probation, performance plans, recognition and renewals, and project check-ins. A person can open one, answer it, send a photo or a document, say "finish", and get the report back on their phone, in their own language.
- **Ask Groundwork works over WhatsApp, but only when the person has no check-in open.** It is the same Ask Groundwork as in the app: the same questions, memory, "what did I say", to-dos, deadlines, and leave, hours and spending requests said back and confirmed with a yes before anything is written.
- **Leave, hours and spending requests** go to the right approver: the line manager if they lead or are an admin, otherwise an admin; spending over the limit goes to the person the rule names.
- **Safety:** every incoming message's signature is checked; "stop" stops messages; the same message twice gets one answer.

## What is missing, or works only in the app

1. **Approving or declining leave and spending is only in the app**, and **nobody is told**: not the approver when a request is made, not the person when it is decided.
2. **Ask Groundwork is blocked while any check-in is open.** "I want leave on 20 October" then becomes an answer in the check-in. There is no word to switch from a check-in to Ask Groundwork, or from one check-in to another.
3. **Ask Groundwork's leave, hours and spending lanes are skipped** when the person's roster entry is matched to their sign-in by email rather than linked.
4. **Performance management around the check-in is app-only:** the person's side, their appeal, the admin's decision on an appeal, and agreeing how a check-in ends.
5. **Fixed (2 October).** The "keep this check-in off the phone" setting is now kept everywhere: the session-ready message, the opening notice, the report sent to the phone when a session closes, and messages coming in. A message to a check-in kept in the app is not taken into it, and the person reads: "Your check-in "Performance plan for Amina" is kept in the Groundwork app, so I cannot take your answers to it here. Please open Groundwork and answer it there." Tested on a performance plan. Still to check: Ask Groundwork on WhatsApp answers "what did I say" from the person's own check-ins, and it has not been checked whether that leaves out a check-in kept in the app. That is Ask Groundwork's own code, outside the WhatsApp code, so it is a question for Hafsah.
6. **Fixed (2 October).** One function tidies every number into the form WhatsApp sends, with a plus in front ("+2348012345678"), in Settings, in an admin's roster entry, and before every send. A local number starting with 0 takes the organisation's country, read from its own WhatsApp number or from the numbers already kept for its people when they all share one country code. With no country known it is refused, and the person reads: "Please write the whole number with the country code at the start, for example +234 801 234 5678." Every lookup matches a number already stored in either form, the whole number or the local one, and a local one only in its own country. Still open: the roster import (SCIM, and the people route through it) keeps its own tidying in `people/scim.service.ts`, outside the WhatsApp code; it already takes out spaces and dashes, and a local number it kept is now matched, but it does not refuse a local number with no country. It should call `tidyANumberFor` too.
7. **On Groundwork's own number, the first session is never announced on WhatsApp**, and there are no reminders or nudges by WhatsApp at all (the "nudge" has no template and nothing sends it).
8. **Fixed (2 October).** A reply always goes from the number the person wrote to: a message to Groundwork's number is answered on Groundwork's number, even for an organisation with its own, and the report after a session closes goes on the number the person last wrote to. Every message that comes in is recorded with the number it came in on, and the 24-hour window is measured on the number a message goes from. An organisation with its own number gets its notices only from that number; Groundwork's number no longer sends it a second one.
9. **The opening notice says "what you say is released with everybody else's"**, which is wrong for a one-to-one check-in such as a performance plan or probation.
10. **Suggested answers are dropped** on WhatsApp; boards and reports beyond the text summary say "There is more on this in Groundwork."
11. **Silence when WhatsApp is held** by the paid add-on or the monthly limit: the person writes and hears nothing on WhatsApp (item 71 of the morning report).
12. **A number in two organisations** on Groundwork's number keeps its first pick for good, with no way to switch.

## What can only be tested once hosted

- The webhook handshake and the signature on the real body, for Groundwork's number and each organisation's own.
- Whether WhatsApp waits for a reply that takes several model calls.
- The three message templates approved, in English, within WhatsApp's length limit, and whether a template accepts the line breaks the report and the session notice contain (probably not).
- List taps, photo and document download with the organisation's token, and the relay through a customer's own system.
