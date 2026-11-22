/**
 * WHAT THE RELEASE HIDES, AND THE THREE SETTINGS THAT HIDE IT (decisions 78, 88 and 90).
 *
 * Each is one row in `platform_settings`, read here and nowhere else, and each has a safe default for
 * a database with no row at all. Hafsah turns one on by writing the row (docs/deploy.md, "Hidden at
 * release"). Nothing here hides something an existing client uses today: it only decides what is
 * OFFERED to something new.
 *
 *  - `release.contextInAskGroundwork`   { "on": false }       the setup and context lanes in Ask Groundwork (ON when the row is missing, from the pull request that moved Context into Ask)
 *  - `release.oldContextChat`           { "on": false }       the old context chat on the check-in page (ON when the row is missing, 22 November 2026)
 *  - `release.anchorScenario`           { "on": true }        whether a new anchor check-in can be started (on when the row is missing)
 *
 * Every one is ON when its row is missing (Hafsah, 22 November 2026: "turn the switch on, nothing switch off from now on").
 */
import { KINDS_OF_WORK, type KindOfWork } from '../board/the-kind-of-work';

export const CONTEXT_IN_ASK_GROUNDWORK_KEY = 'release.contextInAskGroundwork';
export const OLD_CONTEXT_CHAT_KEY = 'release.oldContextChat';
export const ANCHOR_SCENARIO_KEY = 'release.anchorScenario';
export const REQUEST_OFFER_IN_THE_CHECK_IN_KEY = 'release.requestOfferInTheCheckIn';
/**
 * The three WhatsApp messages for somebody who stops a check-in halfway (decision 107): the reminder to
 * carry on, the half-hour warning on the phone, and the clock's close. ON when the row is missing and
 * { "on": false } switches them off; a row that cannot be read reads as off (it fails closed). They were
 * proved on 6 October by a run that drives the real close, reminder and warning sweeps (docs/run-log.md, run 8).
 */
export const WHATSAPP_HALFWAY_MESSAGES_KEY = 'release.whatsappHalfwayMessages';

/**
 * The kinds of work a NEW check-in may be given at release (decision 91, item 3). The paid client
 * needs sales, onboarding and projects. Of the kinds a board keeps records for, these serve
 * them: "sales team" and "sales org" (deals, one sales board for both until Release 4) and "engineering release" (the project board's tasks and releases, the
 * prototype's engineering example). Onboarding and project boards are chosen by the situation
 * (NEW_HIRE, NEW_MANAGER, NEW_ADVISOR and NEW_PROJECT, see board-families.ts), not by a kind, so a
 * new onboarding or project check-in gets its board whether or not it holds a kind. Every other kind
 * stays hidden until the screens workspace marks its board done.
 */
/* Every kind of work is offered (Hafsah, 15 November 2026: everything has a board; reverses the October hide, decisions 88 and 91). */
export const KINDS_OFFERED_AT_RELEASE: readonly string[] = [...KINDS_OF_WORK];

type Reader = { platformSetting?: { findUnique: (a: any) => Promise<{ value: unknown } | null> } } | any;

async function theRow(prisma: Reader, key: string): Promise<unknown> {
  try {
    const row = await prisma?.platformSetting?.findUnique({ where: { key } });
    return row?.value ?? null;
  } catch {
    return null;
  }
}

/** The row as stored, or that it could not be read: a switch that is on by default must tell "no row" from "no answer". */
async function theRowOrAFault(prisma: Reader, key: string): Promise<{ fault: boolean; row: { value: unknown } | null }> {
  try {
    return { fault: false, row: (await prisma.platformSetting.findUnique({ where: { key } })) ?? null };
  } catch {
    return { fault: true, row: null };
  }
}

/**
 * Every kind of work is offered to a new check-in, in every organisation (Hafsah, 15 November 2026: everything has a board;
 * 22 November 2026: nothing is switched off). The `release.boardKindsOffered` row that could narrow it is no longer read.
 */
export async function theBoardKindsOffered(_prisma?: Reader, _organizationId?: string | null): Promise<KindOfWork[]> {
  return [...KINDS_OF_WORK];
}

/**
 * Whether this kind may be given to a check-in. A check-in that already has it is never asked: the
 * caller passes what the check-in holds now, and keeps it.
 */
export async function aKindMayBeGiven(prisma: Reader, kind: string, whatItHoldsNow?: string | null, organizationId?: string | null): Promise<boolean> {
  if (whatItHoldsNow && whatItHoldsNow.toLowerCase() === kind.toLowerCase()) return true;
  return (await theBoardKindsOffered(prisma, organizationId)).some((k) => k.toLowerCase() === kind.toLowerCase());
}

/** On unless the row says off. */
async function aSwitch(prisma: Reader, key: string): Promise<boolean> {
  const v = (await theRow(prisma, key)) as { on?: unknown } | boolean | null;
  if (typeof v === 'boolean') return v;
  return v?.on !== false;
}

/**
 * CONTEXT AND RESOURCES ARE DONE THROUGH ASK (decision 50, request 169, the pull request that moved them there).
 * ON when the row is missing. `{ "on": false }` switches it off. A row that cannot be read, or holds something that is neither a
 * true-or-false nor `{ on: true or false }`, reads as OFF: it fails closed, so a broken row never opens a door by guesswork.
 * (This was OFF unless the row said `{ "on": true }` until Context moved into Ask.)
 */
export const contextIsInAskGroundwork = async (prisma: Reader): Promise<boolean> => {
  const read = await theRowOrAFault(prisma, CONTEXT_IN_ASK_GROUNDWORK_KEY);
  if (read.fault) return false;
  if (read.row == null) return true;
  const v = read.row.value as { on?: unknown } | boolean | null | undefined;
  if (typeof v === 'boolean') return v;
  if (v && typeof v === 'object' && typeof (v as { on?: unknown }).on === 'boolean') return (v as { on: boolean }).on;
  return false;
};

/**
 * THE OLD CONTEXT CHAT ON THE CHECK-IN PAGE (`POST /grounds/:id/context-chat` and its confirm and decline). ON unless the row
 * says `{ "on": false }` (Hafsah, 22 November 2026: nothing is switched off). Ask Groundwork does the same work through the same
 * two methods in the engine, so both ways in stay open. It was off by default from decision 50 until this change.
 */
export const theOldContextChatIsOpen = (prisma: Reader) => aSwitch(prisma, OLD_CONTEXT_CHAT_KEY);

/**
 * THE OFFER TO ASK FOR LEAVE OR SPENDING FROM INSIDE A CHECK-IN (anchor pieces 26 and 27). It was hidden at release because its yes opens the
 * request's own form, and the form's routes did not exist. They do now (request 165: `POST /suites/leave/requests` and `POST /suites/spend/requests`
 * for the signed-in person, and the forms' choices), walked end to end on 6 October with real conversations: the offer, the yes, the form filled in
 * from what the person said, and the request on its approver's board. So it is ON unless the row says `{ "on": false }`. It is only ever made in a
 * check-in started from the anchor link, with the anchor switch on, so nothing outside the anchor changes. Leave and spending through Ask Groundwork
 * and WhatsApp are unchanged either way.
 */
export const theRequestOfferIsShown = async (prisma: Reader) => {
  const v = (await theRow(prisma, REQUEST_OFFER_IN_THE_CHECK_IN_KEY)) as { on?: unknown } | boolean | null;
  if (typeof v === 'boolean') return v;
  return v?.on !== false;
};

/**
 * Whether a NEW anchor check-in can be started (docs/anchor-scenario-plan.md, section 3). ON (Hafsah, next
 * pull request, piece 2): the anchor now uses the normal entry chat, board and reports (decision 114), and the
 * screens draw its sections through the normal pages. A missing row reads as on; `{ "on": false }` (or `false`)
 * switches it off; a row that cannot be read reads as off, so a database fault never starts one. A check-in
 * already started as an anchor one keeps behaving as one when this is turned off.
 */
export const theAnchorScenarioIsOn = async (prisma: Reader): Promise<boolean> => {
  const read = await theRowOrAFault(prisma, ANCHOR_SCENARIO_KEY);
  if (read.fault) return false;
  if (read.row == null) return true;
  const v = read.row.value as { on?: unknown } | boolean | null | undefined;
  if (typeof v === 'boolean') return v;
  return v?.on !== false;
};
export const theHalfwayMessagesAreOn = async (prisma: Reader): Promise<boolean> => {
  /* A row that is missing reads as on; a row that cannot be READ reads as off, so a database fault never sends a message. */
  let row: { value: unknown } | null;
  try {
    const key = WHATSAPP_HALFWAY_MESSAGES_KEY;
    row = await prisma.platformSetting.findUnique({ where: { key } });
  } catch {
    return false;
  }
  const v = row?.value as { on?: unknown } | boolean | null | undefined;
  if (row == null) return true;
  if (typeof v === 'boolean') return v;
  return v?.on !== false;
};
