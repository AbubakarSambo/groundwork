import { HOW_MANY_ARE_OFFERED, TheReader, whatFitsThisReader } from './what-the-assistant-can-do';
/**
 * ASK IS NAMED FOR THE ORGANISATION (decision 100, 5 October).
 *
 * "Ask Coamana", "Ask NABG". Every sentence the engine writes that names Ask goes through `askName`,
 * so a reader sees the same name on the screen, on WhatsApp and in an email. "Ask Groundwork" is said
 * only where there is no organisation yet. The sentences under the name are in docs/ask-definition.md.
 */

/** The name, for an organisation name that may be missing or blank. */
/**
 * THE NAME GROUNDWORK MAKES UP WHEN NOBODY GIVES ONE: "Wanjiru's workspace", or "My workspace" (see whatTheirWorkspaceIsCalled and register). It is a placeholder
 * and not the organisation's name, so no sentence says it as one. Until a real name is given, Ask is "Ask Groundwork".
 */
export function isAMadeUpWorkspaceName(name?: string | null): boolean {
  const n = (name ?? '').replace(/\s+/g, ' ').trim();
  return /^my workspace$/i.test(n) || /^.+['\u2019]s workspace$/i.test(n);
}

/**
 * "[FIRST NAME]'S ASSISTANT" (Hafsah's standards, 2 November 2026, which replace decision 100's "Ask [organisation]"). In a sentence to the
 * reader it is "your assistant"; at the start of one, "Your assistant" (theAssistant). The organisation is named under it, as the Desk it helps
 * with (theAssistantsCaption). The argument is kept so every caller reads the one name; the organisation no longer goes into it.
 */
export function askName(_organisationName?: string | null): string {
  return 'your assistant';
}

/** The same name opening a sentence. */
export function theAssistant(): string {
  return 'Your assistant';
}

/** The name at the top of the panel: "Wairimu's assistant", or "Your assistant" with no first name on record. */
export function theAssistantsTitle(firstName?: string | null): string {
  const first = (firstName ?? '').trim().split(/\s+/)[0];
  return first ? `${first}\u2019s assistant` : 'Your assistant';
}

/** "Helps you navigate your Msingi Foods Desk" (the standards' own words), or the Desk alone with no real organisation name yet. */
export function theAssistantsCaption(organisationName?: string | null): string {
  const name = (organisationName ?? '').replace(/\s+/g, ' ').trim();
  return name && !isAMadeUpWorkspaceName(name) ? `Helps you navigate your ${name} Desk.` : 'Helps you navigate your Desk.';
}

/** The caption under the name, where no organisation is known. */
export const ASK_CAPTION = theAssistantsCaption(null);
/** The one line under the caption. */
export const ASK_ADD_LINE = 'You can also add context or documents to your check-ins here.';
/** The same line for an admin who runs no check-in: their documents are for the whole organisation (fix list, item 3). */
export const ASK_ADMIN_ADD_LINE = 'You can also add a document for the whole organisation here.';

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
export function askFirstWelcome(
  organisationName?: string | null,
  contextIsHere = true,
  /** Which of leave and spending are on here, and whether the reader is a guest: what the welcome says Ask can do is only what is true for them. */
  who: { leaveIsOn?: boolean; spendingIsOn?: boolean; isAGuest?: boolean } = { leaveIsOn: true, spendingIsOn: true },
): string {
  const name = organisationName && !isAMadeUpWorkspaceName(organisationName) ? organisationName.trim() : null;
  if (who.isAGuest) {
    return `This is your assistant${name ? ` at ${name}` : ''}. You are a guest here, so I answer you only about your own check-in.`;
  }
  const request = who.leaveIsOn && who.spendingIsOn ? 'for leave or to spend money' : who.leaveIsOn ? 'for leave' : who.spendingIsOn ? 'to spend money' : null;
  /* While adding context or a document is hidden at release (`release.contextInAskGroundwork`), the welcome neither offers it nor explains it. */
  return (`This is your assistant${name ? ` at ${name}` : ''}. I answer about the whole organisation and about your own work, and you can point me at one of your check-ins whenever you want to. `
    + (contextIsHere
      ? `Ask me about the company, about your work, or about your check-ins. You can add context or a document to one of your check-ins here${request ? `, and ask ${request}` : ''}. `
      : `Ask me about the company, about your work, or about your check-ins.${request ? ` You can also ask me ${request}.` : ''} `)
    + (contextIsHere ? `Anything you add to a check-in is said back to you first, goes in only once you say yes, and from then on is part of that check-in.` : '')).trim();
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
 * WHAT SOMEBODY IS OFFERED WHEN THEY FIRST OPEN ASK, READ FROM THE ONE GUIDE (Batch S, group S5).
 *
 * Each line is offered only when it is true for this reader, from the reader's own standing (decision 36 for a guest; the suites that
 * are on; the check-ins they can use), and their own role's lines come first. The list used to put every check-in line first and the
 * panel cut it to three, so a lead or an admin in a check-in never saw what fits their role. It is cut here, once, to a short list,
 * and the panel shows all of it.
 */
export type WhoIsAsking = TheReader;

export function askStartersFor(o: WhoIsAsking): string[] {
  return whatFitsThisReader(o).filter((g) => g.starter).slice(0, HOW_MANY_ARE_OFFERED).map((g) => g.starter as string);
}
