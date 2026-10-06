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
export function askFirstWelcome(
  organisationName?: string | null,
  contextIsHere = true,
  /** Which of leave and spending are on here, and whether the reader is a guest: what the welcome says Ask can do is only what is true for them. */
  who: { leaveIsOn?: boolean; spendingIsOn?: boolean; isAGuest?: boolean } = { leaveIsOn: true, spendingIsOn: true },
): string {
  const name = askName(organisationName).replace(/^Ask /, '');
  if (who.isAGuest) {
    return `This is Ask ${name}. You are a guest here, so I answer you only about your own check-in. What you ask me stays private.`;
  }
  const request = who.leaveIsOn && who.spendingIsOn ? 'for leave or to spend money' : who.leaveIsOn ? 'for leave' : who.spendingIsOn ? 'to spend money' : null;
  /* While adding context or a document is hidden at release (`release.contextInAskGroundwork`), the welcome neither offers it nor explains it. */
  return `This is Ask ${name}. I answer about the whole organisation and about your own work, and you can point me at one of your check-ins whenever you want to. `
    + (contextIsHere
      ? `Ask me about the company, about your work, or about your check-ins. You can add context or a document to one of your check-ins here${request ? `, and ask ${request}` : ''}. `
      : `Ask me about the company, about your work, or about your check-ins.${request ? ` You can also ask me ${request}.` : ''} `)
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


/**
 * WHAT SOMEBODY IS OFFERED IS WHAT ASK CAN REALLY ANSWER THEM (request from the screens; review of the starters).
 *
 * The list was fixed: leave and spending were offered to a guest and to an organisation with neither suite on, the company's priorities to a guest who is
 * refused the company page, and "when is my next check-in" and "what did I say I would do" to somebody with no check-in they can use (one held for a seat,
 * one that has ended, one they only run). Each is offered now only when it is true for this reader, from the reader's own standing.
 */
export interface WhoIsAsking {
  /** A guest from another organisation: answered only about their own check-in. */
  isAGuest: boolean;
  /** A check-in they take part in as a person, that has not ended and they are not held for a seat on. */
  takesPartInOne: boolean;
  /** Any check-in they can use, that has not ended and they are not held for a seat on. */
  hasOneToUse: boolean;
  /** They run one, and so may add context or a document to it. */
  runsOne: boolean;
  leaveIsOn: boolean;
  spendingIsOn: boolean;
  contextIsHere: boolean;
}

export function askStartersFor(o: WhoIsAsking): string[] {
  const out: string[] = [];
  if (o.takesPartInOne) out.push('What did I say I would do?');
  if (o.hasOneToUse) out.push('What is my check-in for, and who reads it?');
  if (o.takesPartInOne) out.push('When is my next check-in?');
  if (!o.isAGuest) out.push("What are the company's priorities right now?");
  if (!o.isAGuest && o.runsOne && o.contextIsHere) out.push('Add a document or some context to my check-in.');
  if (!o.isAGuest && (o.leaveIsOn || o.spendingIsOn)) {
    out.push(o.leaveIsOn && o.spendingIsOn ? 'Ask for leave, or to spend money.' : o.leaveIsOn ? 'Ask for leave.' : 'Ask to spend money.');
  }
  return out;
}
