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
 * These are deliberately NOT one set per situation. A set of starters per situation is wording
 * nobody has decided, and inventing twenty-two of them would be writing product copy on a guess.
 * These three are true in every check-in because they are about the reader's own record rather
 * than about the kind of work: what they said they would do, what the check-in is for, and when
 * they are next asked. Hafsah can replace them with per-situation wording whenever she wants to.
 */
export function askStarters(hasACheckIn: boolean): string[] {
  if (!hasACheckIn) {
    return [
      'What is this organisation working on?',
      'Who can start a check-in here?',
      'What can I ask you?',
    ];
  }
  return [
    'What did I say I would do?',
    'What is my check-in for, and who reads what I say?',
    'When is my next check-in?',
  ];
}
