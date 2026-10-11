import { NotFoundException } from '@nestjs/common';
import { theAnchorScenarioIsOn } from '../admin/what-is-hidden-at-release';
import { ANCHOR_ENTRY_SCENARIO, THE_ANCHOR_FIRST_QUESTION } from '../conversation/the-anchor-lead-conversation';
import { THE_PEOPLE_STEP_RULES } from './the-anchor-people-step';
import type { ThePeopleStepRules } from './the-anchor-served-shapes';
import { STARTED_FROM_THE_ANCHOR } from '../conversation/the-anchor-weekly-check-in';

/**
 * THE ANCHOR SCENARIO'S FRONT DOOR (request 144, plan pieces 1 and 2).
 *
 * Two small reads for a visitor who is not signed in. Neither one creates anything: the entry
 * conversation is held in the visitor's browser until they save it by email, so "starting" a draft
 * here means telling the screen how to mark it, not writing a row for a stranger.
 */

/** How long the answer to "is the anchor available" is kept, so a busy landing page costs one read. */
export const THE_SWITCH_IS_KEPT_FOR_MS = 30_000;

export const THE_ANCHOR_GROUND_LABEL = 'Help my team understand';

export type TheAnchorIsAvailable = { available: boolean };

/** What the anchor entry route answers when the switch is on. The screen keeps it as the draft. */
export type TheAnchorDraftToStart = {
  available: true;
  /** The situation the conversation is started with. This is what marks the draft as an anchor one. */
  scenario: typeof ANCHOR_ENTRY_SCENARIO;
  /** What is written on the check-in when it is saved: `grounds.started_from`. */
  startedFrom: typeof STARTED_FROM_THE_ANCHOR;
  /** What the check-in is called until the lead changes it. */
  groundLabel: string;
  /** The first thing the lead is asked, in the spec's words (section 6). The opening line of the conversation is this, so the screen never has to write it. */
  firstQuestion: string;
  /** Where the link came from (the group or post it was shared in), or null. Kept in the draft's payload as `anchorSource`. */
  source: string | null;
  /** The people step's own rules and words: up to 20 people besides the lead (decision 121, item 4). */
  thePeopleStep: ThePeopleStepRules;
};

/** A source mark is a short word: letters, digits, dashes and underscores. Anything else is dropped, never stored. */
export function aSourceMark(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const s = raw.trim().toLowerCase();
  return /^[a-z0-9][a-z0-9_-]{0,39}$/.test(s) ? s : null;
}

export class TheAnchorDoor {
  private kept: { at: number; available: boolean } | null = null;
  constructor(private readonly prisma: any, private readonly now: () => number = Date.now) {}

  /** Cached briefly. A read that fails is read as off. */
  async available(): Promise<TheAnchorIsAvailable> {
    const t = this.now();
    if (this.kept && t - this.kept.at < THE_SWITCH_IS_KEPT_FOR_MS) return { available: this.kept.available };
    const available = (await theAnchorScenarioIsOn(this.prisma)) === true;
    this.kept = { at: t, available };
    return { available };
  }

  /** With the switch off, nothing is returned and nothing is created. This reads the switch fresh: it is the gate, not a hint. */
  async start(source: unknown): Promise<TheAnchorDraftToStart> {
    if (!(await theAnchorScenarioIsOn(this.prisma))) throw new NotFoundException('This way in is not open yet.');
    return { available: true, scenario: ANCHOR_ENTRY_SCENARIO, startedFrom: STARTED_FROM_THE_ANCHOR, groundLabel: THE_ANCHOR_GROUND_LABEL, firstQuestion: THE_ANCHOR_FIRST_QUESTION, source: aSourceMark(source), thePeopleStep: { ...THE_PEOPLE_STEP_RULES } };
  }
}
