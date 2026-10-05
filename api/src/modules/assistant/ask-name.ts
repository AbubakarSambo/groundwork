/**
 * ASK IS NAMED FOR THE ORGANISATION (decision 100, 5 October).
 *
 * "Ask Coamana", "Ask NABG". Every sentence the engine writes that names Ask goes through `askName`,
 * so a reader sees the same name on the screen, on WhatsApp and in an email. "Ask Groundwork" is said
 * only where there is no organisation yet. The sentences under the name are in docs/ask-definition.md.
 */

/** The name, for an organisation name that may be missing or blank. */
export function askName(organisationName?: string | null): string {
  const name = (organisationName ?? '').replace(/\s+/g, ' ').trim();
  return name ? `Ask ${name}` : 'Ask Groundwork';
}

/** The caption under the name. */
export const ASK_CAPTION = 'Ask about the company, your work or your check-ins.';
/** The one line under the caption. */
export const ASK_ADD_LINE = 'You can also add context or documents to your check-ins here.';

/** What the first time somebody opens Ask says (docs/ask-definition.md, "The first time you open it"). */
export function askFirstWelcome(organisationName?: string | null): string {
  const name = askName(organisationName).replace(/^Ask /, '');
  return `This is Ask ${name}. You can ask me about the company, your work or your check-ins, at any time. You can also add context or a document to one of your check-ins, and ask for leave or to spend money. What you ask here stays private. If you add something to a check-in, I will say it back to you first, and it only goes in once you say yes.`;
}

/** Looks up the name of one organisation. A missing organisation gives "Ask Groundwork". */
export async function askNameOf(
  prisma: { organization: { findUnique: (a: any) => Promise<{ name: string | null } | null> } },
  organizationId?: string | null,
): Promise<string> {
  if (!organizationId) return askName(null);
  try {
    const org = await prisma.organization.findUnique({ where: { id: organizationId }, select: { name: true } });
    return askName(org?.name);
  } catch {
    return askName(null);
  }
}

/**
 * WHAT SOMEBODY CAN ASK, OFFERED AS THREE QUESTIONS (request 153 / 154 item 3).
 *
 * The screens were wording these themselves and every kind of check-in got the sales words:
 * "Ask me about Get a project back on track: a deal, a target, or what to do next." A law firm
 * matter and a government programme were offered a deal.
 *
 * THEY ARE GENERAL, NEVER ONE SET PER SITUATION (decision 101, 5 October). These five words are
 * Hafsah's, in her order, and they go to every kind of check-in - a law firm matter and a
 * government programme included. Four of them are about the reader's own record rather than the
 * kind of work, which is what lets one set serve every situation.
 *
 * SOMEBODY WITH NO CHECK-IN YET IS LEFT WITH ONE. Four of the five need a check-in to be about -
 * what they said they would do, what it is for, when the next one is, and adding something to it -
 * so for a reader with none the list is the company question on its own. That is the decision as
 * taken: one true starter rather than four invented ones.
 */
const STARTERS = [
  { line: 'What did I say I would do?', needsACheckIn: true },
  { line: 'What is my check-in for, and who reads it?', needsACheckIn: true },
  { line: 'When is my next check-in?', needsACheckIn: true },
  { line: "What are the company's priorities right now?", needsACheckIn: false },
  { line: 'Add a document or some context to my check-in.', needsACheckIn: true },
] as const;

export function askStarters(hasACheckIn: boolean): string[] {
  return STARTERS.filter((s) => hasACheckIn || !s.needsACheckIn).map((s) => s.line);
}
