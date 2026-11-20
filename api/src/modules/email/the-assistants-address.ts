/**
 * THE ADDRESS AN ORGANISATION'S TEAM WRITES TO, AND THE ONE PLACE IT IS DECIDED.
 *
 * Every organisation's assistant has one address, `assistant+<organisation slug>@<domain>`, on the
 * product's own domain (myground.work). Nothing else builds it, reads it or compares against it:
 * the Reply-To on our own mail, the route that recognises incoming mail, and the local test
 * injector all ask here. If the shape ever changes, it changes in this file.
 *
 * `hello@myground.work` is NOT one of these. It is the company's own inbox for prospects, who have
 * not agreed to be read by anything, and it keeps its own path (a-message-sent-to-us.ts).
 */

const DEFAULT_DOMAIN = 'myground.work';
const LOCAL_PART = 'assistant';
/* A slug is lower-case letters, digits and hyphens (Organization.slug). Anything else is not ours. */
const SLUG = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

type Env = Record<string, string | undefined>;

/** The domain mail to an assistant arrives on. Configurable only so a local run can use its own. */
export function theAssistantMailDomain(env: Env = process.env): string {
  return (env.ASSISTANT_MAIL_DOMAIN || DEFAULT_DOMAIN).trim().toLowerCase();
}

/** The address a team member writes to, and the Reply-To of the mail we send them. */
export function theAssistantsAddress(organisation: { slug: string }, env: Env = process.env): string {
  return `${LOCAL_PART}+${organisation.slug.toLowerCase()}@${theAssistantMailDomain(env)}`;
}

/**
 * Which organisation an incoming address means, by slug, or null when it is not an assistant's
 * address at all (hello@, another domain, a lookalike domain, a plus-tag of something else).
 * Nothing is looked up here: the slug still has to belong to a real organisation.
 */
export function whichOrganisationWasWrittenTo(address: string | null | undefined, env: Env = process.env): string | null {
  const raw = (address ?? '').trim().toLowerCase();
  const angled = raw.match(/<([^>]+)>\s*$/);
  const bare = (angled ? angled[1] : raw).trim();
  const at = bare.lastIndexOf('@');
  if (at < 0) return null;
  const local = bare.slice(0, at);
  const domain = bare.slice(at + 1);
  if (domain !== theAssistantMailDomain(env)) return null;
  const prefix = `${LOCAL_PART}+`;
  if (!local.startsWith(prefix)) return null;
  const slug = local.slice(prefix.length);
  return SLUG.test(slug) ? slug : null;
}

/** The first of the addresses a message was sent to that is an assistant's, so a message copied to several people is still found. */
export function whichOrganisationAmongThese(addresses: Array<string | null | undefined>, env: Env = process.env): { slug: string; address: string } | null {
  for (const a of addresses) {
    const slug = whichOrganisationWasWrittenTo(a, env);
    if (slug) return { slug, address: String(a).trim().toLowerCase() };
  }
  return null;
}
