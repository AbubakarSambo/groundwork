/**
 * THE API TERMS, IN PLAIN WORDS, ACCEPTED AT THE POINT OF ASKING.
 *
 * Short on purpose. They are shown on the Connect page above the request form, and the request
 * cannot be recorded until they are ticked. The version is written on the request, so when they
 * change we know who agreed to what. A lawyer should read these before a paying customer does;
 * until then they are our plain statement of what the API is for and what it is not for.
 */
export const API_TERMS_VERSION = '2026-09-10';

export const API_TERMS = {
  version: API_TERMS_VERSION,
  title: 'Groundwork API terms',
  says: 'What you may do with the API, and what you may not. Short, and meant to be read.',
  terms: [
    {
      heading: 'What it is for',
      body: 'The API connects your own systems to Groundwork for your own organisation: your people, your objectives, your check-ins and the reports they produce. That is the whole permitted use.',
    },
    {
      heading: 'What it is not for',
      body: 'You may not use the API, its responses, the panel, the WhatsApp check-in or anything Groundwork produces to build, train, tune, benchmark or improve a product or service that competes with Groundwork, or to help anybody else do so. This includes collecting reports, transcripts, questions or wording to study how the engine works.',
    },
    {
      heading: 'Automated access',
      body: 'Machines reach Groundwork through the API with a credential we issued, and nowhere else. Scraping the application, the panel or the marketing site, and driving the product with automated agents outside the API, is not permitted.',
    },
    {
      heading: 'Credentials',
      body: 'A credential belongs to your organisation and the system it was issued for. Do not share it, resell it, or let a third party call the API through it. Revoke it the moment you think it has leaked.',
    },
    {
      heading: 'Pace',
      body: 'Each credential may make up to 300 authenticated calls a minute. Above that, calls are refused until the minute passes. If your integration genuinely needs more, ask on the Connect page.',
    },
    {
      heading: 'We watch, and we may withdraw',
      body: 'Every authenticated call is recorded. Use that looks like collection rather than integration is flagged for a person here to look at. We may throttle or withdraw access, with a note saying why, and you can ask again with what changed.',
    },
    {
      heading: "Your people's words",
      body: 'What a person says in a check-in is theirs. The API gives you reports and records, never the raw words of somebody who did not choose to share them, and you agree not to try to reconstruct them.',
    },
    {
      heading: 'Changes',
      body: 'These terms have a version. When they change you will be told on the Connect page and asked to accept the new version before issuing new credentials.',
    },
  ],
};
