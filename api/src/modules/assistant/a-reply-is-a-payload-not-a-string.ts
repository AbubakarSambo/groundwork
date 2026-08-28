/**
 * A REPLY IS A TYPED PAYLOAD. THE PANEL RENDERS BY TYPE; THE ROUTER DECIDES THE TYPE.
 *
 * This exists before the router does, deliberately. Retrofitting a block schema afterwards means
 * touching every lane, and a lane that returns a string is a lane somebody will have to come back
 * to - so the shape is settled first and the lanes are written into it.
 *
 * Most types here have no lane yet. They are declared anyway because the CONTRACT is what a panel
 * is built against, and a client that has to be taught a new top-level shape later is a breaking
 * change to somebody else's code. An unimplemented type costs a line; an unplanned one costs a
 * version.
 */

export type BlockType =
  | 'text'
  | 'board'
  | 'proposal'
  | 'draft'
  | 'picker'
  | 'finding_list'
  | 'freshness';

export interface TextBlock {
  type: 'text';
  body: string;
}

/** A rendering of §7 output, inline in the conversation rather than on a page of its own. */
export interface BoardBlock {
  type: 'board';
  board: 'team_read' | 'subject_read' | 'contributions' | 'findings' | 'coverage' | 'standing_brief' | 'handover';
  rows: Record<string, unknown>[];
}

/** Anything touching another person or the record is echoed back and runs only on confirm. */
export interface ProposalBlock {
  type: 'proposal';
  proposalId: string;
  summary: string;
}

export interface DraftBlock {
  type: 'draft';
  draftId: string;
  state: Record<string, unknown>;
}

export interface PickerBlock {
  type: 'picker';
  options: { key: string; label: string }[];
}

export interface FindingListBlock {
  type: 'finding_list';
  findings: Record<string, unknown>[];
}

/**
 * WHAT IT CAN SEE AND HOW CURRENT IT IS.
 *
 * A block rather than a sentence, because it renders as one line at the top of the panel and is not
 * part of the conversation. An assistant answering confidently from three-week-old data destroys
 * trust faster than a wrong answer - a wrong answer is obviously wrong and a stale one is not.
 */
export interface FreshnessBlock {
  type: 'freshness';
  systems: { system: string; syncedAt: string; stale: boolean }[];
}

export type Block =
  | TextBlock | BoardBlock | ProposalBlock | DraftBlock
  | PickerBlock | FindingListBlock | FreshnessBlock;

/**
 * `composedBy` IS NOT DIAGNOSTICS. It is stamped on every reply so a person always knows which
 * spoke - a sentence a model wrote and a sentence the rules wrote carry different weight, and
 * hiding the difference is how somebody comes to treat a fallback as a finding.
 */
export interface Reply {
  blocks: Block[];
  composedBy: 'model' | 'rules';
  /** Which lane answered. Kept for the cost and path attribution the spec asks for. */
  lane: string;
  /** Which wording rules produced it, when a model did. Absent on a rules-composed reply. */
  styleVersion?: string;
}

export const text = (body: string): TextBlock => ({ type: 'text', body });

export const picker = (options: { key: string; label: string }[]): PickerBlock => ({ type: 'picker', options });

export function rules(lane: string, ...blocks: Block[]): Reply {
  return { blocks, composedBy: 'rules', lane };
}

/**
 * Every type in `BlockType` must have a member in the union, and the compiler cannot check that on
 * its own. This is the cheapest way to make a forgotten type a build error rather than a client
 * bug: add a `BlockType` without a shape and this stops compiling.
 */
export const BLOCK_TYPES: Record<BlockType, true> = {
  text: true, board: true, proposal: true, draft: true,
  picker: true, finding_list: true, freshness: true,
};
