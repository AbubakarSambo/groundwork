# Groundwork API terms (version 2026-09-10)

Source of truth: `api/src/modules/public-api/the-api-terms.ts`. This copy is for legal review; the
version accepted is written on every access request. Plain-language; a lawyer should tighten the
definitions of "compete", "affiliate" and governing law before the first paying customer.

1. **What it is for.** The API connects your own systems to Groundwork for your own organisation:
   your people, your objectives, your check-ins and the reports they produce. That is the whole
   permitted use.
2. **What it is not for.** You may not use the API, its responses, the panel, the WhatsApp
   check-in or anything Groundwork produces to build, train, tune, benchmark or improve a product or
   service that competes with Groundwork, or to help anybody else do so. This includes collecting
   reports, transcripts, questions or wording to study how the engine works.
3. **Automated access.** Machines reach Groundwork through the API with a credential we issued, and
   nowhere else. Scraping the application, the panel or the marketing site, and driving the product
   with automated agents outside the API, is not permitted.
4. **Credentials.** A credential belongs to your organisation and the system it was issued for. Do
   not share it, resell it, or let a third party call the API through it. Revoke it the moment you
   think it has leaked.
5. **Pace.** Each credential may make up to 300 authenticated calls a minute. Above that, calls are
   refused until the minute passes. If your integration genuinely needs more, ask on the Connect page.
6. **We watch, and we may withdraw.** Every authenticated call is recorded. Use that looks like
   collection rather than integration is flagged for a person here to look at. We may throttle or
   withdraw access, with a note saying why, and you can ask again with what changed.
7. **Your people's words.** What a person says in a check-in is theirs. The API gives you reports and
   records, never the raw words of somebody who did not choose to share them, and you agree not to
   try to reconstruct them.
8. **Changes.** These terms have a version. When they change you will be told on the Connect page and
   asked to accept the new version before issuing new credentials.

Still to add with counsel: governing law and venue, liability cap, termination for breach,
audit/cooperation clause, and the same "no competing use" clause in the general Terms of Service
for the app and marketing site (none exists today).
