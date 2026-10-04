/**
 * WHAT THE RELEASE HIDES, AND THE THREE SETTINGS THAT HIDE IT (decisions 78, 88 and 90).
 *
 * Each is one row in `platform_settings`, read here and nowhere else, and each has a safe default for
 * a database with no row at all. Hafsah turns one on by writing the row (docs/deploy.md, "Hidden at
 * release"). Nothing here hides something an existing client uses today: it only decides what is
 * OFFERED to something new.
 *
 *  - `release.boardKindsOffered`        { "kinds": [ ... ] }  the kinds of work a NEW check-in may be given
 *  - `release.contextInAskGroundwork`   { "on": false }       the setup and context lanes in Ask Groundwork
 *  - `release.planAndBillingNewParts`   { "on": false }       the WhatsApp add-on's price, use and limit
 *  - `release.anchorScenario`           { "on": false }       whether a new anchor check-in can be started (docs/anchor-scenario-plan.md, section 3)
 *
 * A bad or unreadable row reads as the default, never as "everything on".
 */
import { KINDS_OF_WORK, type KindOfWork } from '../board/the-kind-of-work';

export const BOARD_KINDS_OFFERED_KEY = 'release.boardKindsOffered';
export const CONTEXT_IN_ASK_GROUNDWORK_KEY = 'release.contextInAskGroundwork';
export const PLAN_AND_BILLING_NEW_PARTS_KEY = 'release.planAndBillingNewParts';
export const ANCHOR_SCENARIO_KEY = 'release.anchorScenario';

/**
 * The kinds of work a NEW check-in may be given at release (decision 91, item 3). The paid client
 * needs sales, onboarding and projects. Of the eleven kinds a board keeps records for, two serve
 * them: "sales org" (deals) and "engineering release" (the project board's tasks and releases, the
 * prototype's engineering example). Onboarding and project boards are chosen by the situation
 * (NEW_HIRE, NEW_MANAGER, NEW_ADVISOR and NEW_PROJECT, see board-families.ts), not by a kind, so a
 * new onboarding or project check-in gets its board whether or not it holds a kind. Every other kind
 * stays hidden until the screens workspace marks its board done.
 */
export const KINDS_OFFERED_AT_RELEASE: readonly string[] = ['sales org', 'engineering release'];

type Reader = { platformSetting?: { findUnique: (a: any) => Promise<{ value: unknown } | null> } } | any;

async function theRow(prisma: Reader, key: string): Promise<unknown> {
  try {
    const row = await prisma?.platformSetting?.findUnique({ where: { key } });
    return row?.value ?? null;
  } catch {
    return null;
  }
}

/** The names a NEW check-in may be given. Only names among the eleven matter to the board. */
export async function theKindsOfWorkOffered(prisma: Reader): Promise<string[]> {
  const v = (await theRow(prisma, BOARD_KINDS_OFFERED_KEY)) as { kinds?: unknown } | null;
  const kinds = Array.isArray(v?.kinds) ? (v!.kinds as unknown[]).filter((k): k is string => typeof k === 'string') : null;
  return kinds ? kinds : [...KINDS_OFFERED_AT_RELEASE];
}

/** Of the eleven, those a new check-in may be given. */
export async function theBoardKindsOffered(prisma: Reader): Promise<KindOfWork[]> {
  const offered = (await theKindsOfWorkOffered(prisma)).map((k) => k.trim().toLowerCase());
  return KINDS_OF_WORK.filter((k) => offered.includes(k.toLowerCase()));
}

/**
 * Whether this kind may be given to a check-in. A check-in that already has it is never asked: the
 * caller passes what the check-in holds now, and keeps it.
 */
export async function aKindMayBeGiven(prisma: Reader, kind: string, whatItHoldsNow?: string | null): Promise<boolean> {
  if (whatItHoldsNow && whatItHoldsNow.toLowerCase() === kind.toLowerCase()) return true;
  return (await theBoardKindsOffered(prisma)).some((k) => k.toLowerCase() === kind.toLowerCase());
}

async function aSwitch(prisma: Reader, key: string): Promise<boolean> {
  const v = (await theRow(prisma, key)) as { on?: unknown } | boolean | null;
  if (typeof v === 'boolean') return v;
  return v?.on === true;
}

/** Off unless Hafsah has written `{ "on": true }`. */
export const contextIsInAskGroundwork = (prisma: Reader) => aSwitch(prisma, CONTEXT_IN_ASK_GROUNDWORK_KEY);
export const theNewBillingPartsAreShown = (prisma: Reader) => aSwitch(prisma, PLAN_AND_BILLING_NEW_PARTS_KEY);

/**
 * Whether a NEW anchor check-in can be started (docs/anchor-scenario-plan.md, section 3). Off unless
 * the row says `{ "on": true }`; a missing or broken row reads as off. Every later anchor piece calls
 * this one function and nothing else. A check-in already started as an anchor one keeps behaving as
 * one when this is turned off, so the caller asks this only for something new.
 */
export const theAnchorScenarioIsOn = (prisma: Reader) => aSwitch(prisma, ANCHOR_SCENARIO_KEY);
