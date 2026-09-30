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
  | 'freshness'
  | 'next_step'
  | 'source';

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

/**
 * SOMETHING TO GO AND DO, AS A BLOCK RATHER THAN A PATH INSIDE A SENTENCE.
 *
 * Accepting a suggested conversation used to answer with the words "Open /grounds/new?scenario=... to
 * set it up". In the product that path works. In the EMBEDDED PANEL it is read on the customer's own
 * page, where a relative path resolves against THEIR origin and 404s — and made absolute it walks
 * somebody out of their own system into ours, which is the opposite of what the panel is for.
 *
 * The panel decides what to do with this. A customer whose own application has a place to set up a
 * check-in points at it; one who has not gets our page. Neither is decided here, because this code
 * cannot know which application it is being read inside.
 *
 * `href` is a path within the Groundwork product and stays relative for that reason - it is not a
 * URL to follow blindly, it is where OUR page for this is. A panel rendering it verbatim as a link
 * is the one thing the shape is meant to stop.
 */
export interface NextStepBlock {
  type: 'next_step';
  /** What doing it accomplishes, in words a person reads. */
  label: string;
  /** Where this lives in the Groundwork product. Relative on purpose. */
  href: string;
  /**
   * The kind of thing, so a customer's own page can route it.
   *
   * `set_up_a_check_in` is a page to open. The other two are ACTS on a record
   * that already exists, named separately because a customer routing these is
   * doing something different with each: one opens their own setup screen, the
   * other two call a route.
   */
  kind: 'set_up_a_check_in' | 'confirm_a_check_in' | 'open_a_check_in' | 'upload_a_document';
  /** The record it acts on, for the two kinds that act on one. */
  id?: string;
  /** Carried so a customer's setup screen can prefill what we already know. */
  context?: Record<string, string>;
}

/**
 * WHERE AN ANSWER CAME FROM, AS A LINK-LIKE BLOCK (week 17).
 *
 * An answer built from a record the reader may already read says which record, in a plain sentence
 * in the text ("This is from Femi's check-in of 24 September on Sales team, Q3.") and again here, as
 * something the panel can turn into a link. `label` is the link's own words, `says` is that same
 * sentence, and `href` is a path within the Groundwork product, relative on purpose, exactly as for
 * `next_step`. The record it points at is one this reader could already open: nothing is named here
 * that the reader's own reads do not serve them.
 */
export interface SourceBlock {
  type: 'source';
  /** The link's words, such as "Femi's check-in of 24 September on Sales team, Q3". */
  label: string;
  /** The whole plain sentence, the same one the text carries. */
  says: string;
  /** Where that record lives in the Groundwork product. Relative on purpose. */
  href: string;
  kind: 'check_in' | 'report' | 'to_dos' | 'commitments' | 'today';
  /** The check-in the record is on, where it is on one. */
  id?: string;
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
  | PickerBlock | FindingListBlock | FreshnessBlock
  | NextStepBlock | SourceBlock;

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
  /** The stored prompt version that actually ran, when a stored prompt wrote part of the reply (week 19). */
  promptVersionId?: string | null;
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
  picker: true, finding_list: true, freshness: true, next_step: true, source: true,
};
