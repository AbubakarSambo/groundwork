import { DocumentVisibility } from '@prisma/client';

/**
 * A DOCUMENT IS CONTEXT. IT IS NEVER SOMEBODY'S ACCOUNT. (G24)
 *
 * Four rules, and the first one is the reason the other three exist.
 *
 * 1. CONTEXT, NEVER AN ACCOUNT. A job description is the organisation's claim
 *    about a role. It is not a party's account of how the work is going. So
 *    nothing extracted from a document may be quoted as somebody's position or
 *    used as evidence inside a divergence - if it can be, the whole
 *    independent-accounts premise collapses, because the lead could win any
 *    disagreement by uploading a file.
 *
 * 2. WHO UPLOADED IT IS PART OF WHAT IT IS. A lead's role description is visibly
 *    the lead's standard, not neutral fact. "Hafsah set these conditions" and
 *    "the conditions are" read completely differently and only one of them is
 *    true.
 *
 * 3. UPLOAD ASKS WHERE IT GOES, AND DEFAULTS TO PRIVATE. Shared ground context
 *    and the lead's private context are different destinations. A performance
 *    plan dropped into shared context is the kind of thing that happens in a
 *    hurried first week and cannot be undone.
 *
 * 4. EXTRACTION IS INFERENCE, SO IT IS CONFIRMED RATHER THAN ADOPTED. The same
 *    rule the cadence already follows: propose it, show it, let them correct it.
 *    A model's read of a PDF is a suggestion about a document, not a fact about
 *    the work.
 *
 * WHY THIS IS A MODULE AND NOT A PARAGRAPH IN A PROMPT. Two prompt-only
 * guardrails on this product leaked in a single day. Rule 1 in particular is
 * worth nothing as an instruction: the model has the document text in front of
 * it and no way to remember where the text came from. So provenance travels WITH
 * the extracted claim, and the thing that decides whether a claim may be used as
 * evidence reads that provenance rather than trusting whoever assembled the
 * prompt.
 */

/** Where a claim came from. The distinction the whole file exists to preserve. */
export type ClaimSource = 'account' | 'document';

export interface ContextClaim {
  text: string;
  source: ClaimSource;
  /** Set for documents only. Rule 2: who uploaded it is part of what it is. */
  documentName?: string;
  /** Set for documents only, and never dropped in the rendering. */
  uploadedBy?: string | null;
  /** Rule 4: an extracted claim is a proposal until somebody confirms it. */
  confirmed?: boolean;
}

/**
 * RULE 1. May this claim be used as evidence that somebody holds a position?
 *
 * Only an account can. A document is what the organisation says, and a
 * divergence is about what PEOPLE say - putting a document on one side of one
 * would let anybody win a disagreement by uploading a file.
 */
export function mayBeEvidenceInADivergence(claim: ContextClaim): boolean {
  return claim.source === 'account';
}

/**
 * RULE 1, again, at the point where it is easiest to break: quoting.
 *
 * A quote is an attribution. Quoting a document as though a person said it
 * attributes the organisation's standard to whoever happens to be nearby.
 */
export function mayBeQuotedAsSomebodysWords(claim: ContextClaim): boolean {
  return claim.source === 'account';
}

/**
 * RULE 2. How an extracted claim must read wherever it is shown.
 *
 * Never bare. A document's claim always arrives with the document it came from
 * and the person who put it there, because "the conditions are" and "the lead set
 * these conditions" are different statements and only the second is true.
 */
export function attributeToItsSource(claim: ContextClaim): string {
  if (claim.source === 'account') return claim.text;

  const who = claim.uploadedBy?.trim();
  const doc = claim.documentName?.trim();
  const provenance = who && doc
    ? `from ${doc}, added by ${who}`
    : doc
      ? `from ${doc}`
      : who
        ? `added by ${who}`
        : 'from a document';

  const unconfirmed = claim.confirmed === false ? ', not yet confirmed' : '';
  return `${claim.text} (${provenance}${unconfirmed})`;
}

/**
 * RULE 3. Where a newly uploaded document goes if nobody says.
 *
 * Private. Always, and regardless of who uploaded it or what the ground is.
 *
 * The tempting version is to default a lead's upload to shared, since the lead's
 * material is usually the brief and the brief is for everybody. That is right
 * most of the time and catastrophic the once: a performance plan, a resignation
 * letter, a note about somebody's health, dropped into shared context in a
 * hurried first week by somebody who assumed it would ask. Asking is cheap. The
 * failure is not recoverable, because the other people have already read it.
 */
export function defaultVisibilityForUpload(): DocumentVisibility {
  return DocumentVisibility.OWN;
}

/**
 * RULE 4. Is this extracted claim ready to be treated as context?
 *
 * Only once a person has confirmed it. Extraction is a model reading a PDF: it
 * is inference, and inference gets proposed and corrected rather than adopted.
 * An unconfirmed claim can be SHOWN - it has to be, or nobody could confirm it -
 * but nothing downstream may build on it.
 */
export function mayShapeTheGround(claim: ContextClaim): boolean {
  if (claim.source === 'account') return true;
  return claim.confirmed === true;
}

/**
 * The whole of G24 in one call, for the places that just need a yes or no with a
 * reason attached.
 *
 * Returns null when the claim may be used for the purpose asked about, and the
 * reason it may not otherwise - so a caller can log something a person can act
 * on rather than failing silently.
 */
export function whyNot(
  claim: ContextClaim,
  purpose: 'evidence' | 'quote' | 'shape',
): string | null {
  switch (purpose) {
    case 'evidence':
      return mayBeEvidenceInADivergence(claim)
        ? null
        : 'a document is the organisation\'s claim, not a party\'s account, so it cannot be evidence that somebody holds a position';
    case 'quote':
      return mayBeQuotedAsSomebodysWords(claim)
        ? null
        : 'quoting a document as somebody\'s words attributes the organisation\'s standard to a person';
    case 'shape':
      return mayShapeTheGround(claim)
        ? null
        : 'this was read out of a document and nobody has confirmed it yet, so it is a proposal rather than context';
  }
}
