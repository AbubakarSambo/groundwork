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

/**
 * What the first time somebody opens Ask says (docs/ask-definition.md, "The first time you open it").
 *
 * IT SAYS THE SCOPE FIRST, because the scope was the thing being misread (Hafsah, 5 October). Ask
 * covers the whole organisation and the person's own work by default; one check-in is a focus they
 * may pick, never the thing Ask is about. The screens had read it the other way round and the
 * Company page's "Ask about the whole organisation" opened a chat about a check-in.
 *
 * Then what it can do, in the five areas she named - the company, their work, their check-ins,
 * adding context or a document, and leave or spending - and then the two halves of the privacy
 * line, which are different promises and must not be run together. A question stays private, full
 * stop. Something they choose to add is said back, confirmed, and then is part of that check-in.
 */
export function askFirstWelcome(organisationName?: string | null, contextIsHere = true): string {
  const name = askName(organisationName).replace(/^Ask /, '');
  /* While adding context or a document is hidden at release (`release.contextInAskGroundwork`), the welcome neither offers it nor explains it. */
  return `This is Ask ${name}. I answer about the whole organisation and about your own work, and you can point me at one of your check-ins whenever you want to. `
    + (contextIsHere
      ? `Ask me about the company, about your work, or about your check-ins. You can add context or a document to one of your check-ins here, and ask for leave or to spend money. `
      : `Ask me about the company, about your work, or about your check-ins. You can also ask me for leave or to spend money. `)
    + `What you ask me stays private.`
    + (contextIsHere ? ` Anything you choose to add to a check-in works differently. I say it back to you first, it goes in only once you say yes, and from then on it is part of that check-in.` : '');
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
  /*
   * THE SIXTH IS LEAVE AND SPENDING, and it is an addition to decision 101 rather than part of it.
   * Hafsah's five were decided before she said the suggestions must also cover leave or spending
   * (5 October). Her five keep her order, this goes after them, and it is written up as mine to
   * be overruled. It needs no check-in, so it is the second thing somebody with none is offered.
   */
  { line: 'Ask for leave, or to spend money.', needsACheckIn: false },
] as const;

export function askStarters(hasACheckIn: boolean, contextIsHere = true): string[] {
  /* While adding context is hidden at release, the starter that offers it is left out too. */
  return STARTERS.filter((s) => (hasACheckIn || !s.needsACheckIn) && (contextIsHere || !/context/i.test(s.line))).map((s) => s.line);
}
